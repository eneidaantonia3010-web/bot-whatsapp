// ============================================
// Message Queue System (Sender Concurrency + Persistent Outbound Queue + Anti-Ban Gap)
// ============================================

import { prisma } from './prisma';

const senderQueues = new Map<string, Promise<any>>();

/**
 * Ensures sequential in-memory processing per sender to prevent race conditions.
 */
export function enqueueForSender<T>(senderId: string, task: () => Promise<T>): Promise<T> {
  const currentQueue = senderQueues.get(senderId) || Promise.resolve();

  const taskPromise = currentQueue.then(async () => {
    return await task();
  });

  const chainPromise = taskPromise.catch((err) => {
    console.error(`❌ Queue execution error for sender ${senderId}:`, err);
  });

  senderQueues.set(senderId, chainPromise);

  chainPromise.finally(() => {
    if (senderQueues.get(senderId) === chainPromise) {
      senderQueues.delete(senderId);
    }
  });

  return taskPromise;
}

// Global Outbound Queue (Ensures spacing between immediate WhatsApp outgoing messages)
let globalOutboundChain: Promise<any> = Promise.resolve();
let lastOutboundTimestamp = 0;
const MIN_OUTBOUND_GAP_MS = 1500;

export function enqueueGlobalOutbound<T>(task: () => Promise<T>): Promise<T> {
  const nextTask = globalOutboundChain.then(async () => {
    const now = Date.now();
    const elapsed = now - lastOutboundTimestamp;

    if (elapsed < MIN_OUTBOUND_GAP_MS) {
      const waitTime = MIN_OUTBOUND_GAP_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    try {
      const result = await task();
      return result;
    } finally {
      lastOutboundTimestamp = Date.now();
    }
  });

  globalOutboundChain = nextTask.catch((err) => {
    console.error('❌ Global Outbound Queue task error:', err);
  });

  return nextTask;
}

// ============================================
// Persistent Database Queue for WhatsApp Messages
// ============================================

let isProcessingQueue = false;
let queuePausedUntil: number | null = null;
let activeSocketGetter: (() => any) | null = null;
let activeConnectionStateGetter: (() => string) | null = null;

export function registerSocketForQueue(getSocket: () => any, getConnectionState: () => string) {
  activeSocketGetter = getSocket;
  activeConnectionStateGetter = getConnectionState;
}

/**
 * Enqueues an outgoing message to the database for reliable delivery.
 */
export async function enqueuePersistentMessage(params: {
  jid: string;
  message: string | object;
  priority?: number; // 1=Normal, 2=High (reminders), 3=Critical
  platform?: 'WHATSAPP' | 'INSTAGRAM' | 'WEB';
}) {
  const payload = typeof params.message === 'string' ? params.message : JSON.stringify(params.message);
  
  const created = await prisma.messageQueue.create({
    data: {
      jid: params.jid,
      message: payload,
      priority: params.priority || 1,
      platform: params.platform || 'WHATSAPP',
      status: 'PENDING',
      nextRetryAt: new Date(),
    },
  });

  // Trigger immediate drain check
  triggerQueueDrain();

  return created;
}

/**
 * Processes queued messages from PostgreSQL.
 */
export async function processPersistentQueue(): Promise<void> {
  if (isProcessingQueue) return;

  // Check 403 backoff pause
  if (queuePausedUntil && Date.now() < queuePausedUntil) {
    const remainingMins = Math.ceil((queuePausedUntil - Date.now()) / 60000);
    console.warn(`⏳ WhatsApp Message Queue is paused due to safety backoff (${remainingMins}m remaining).`);
    return;
  }

  const socket = activeSocketGetter ? activeSocketGetter() : null;
  const connectionState = activeConnectionStateGetter ? activeConnectionStateGetter() : 'close';

  if (!socket || connectionState !== 'open') {
    return;
  }

  isProcessingQueue = true;

  try {
    const pendingMessages = await prisma.messageQueue.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        nextRetryAt: { lte: new Date() },
        attempts: { lt: 5 },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 10,
    });

    for (const item of pendingMessages) {
      // Re-verify connection before each item
      const currentConn = activeConnectionStateGetter ? activeConnectionStateGetter() : 'close';
      if (currentConn !== 'open') break;

      // Mark as PROCESSING
      await prisma.messageQueue.update({
        where: { id: item.id },
        data: { status: 'PROCESSING' },
      });

      try {
        let content: any;
        try {
          content = JSON.parse(item.message);
        } catch {
          content = { text: item.message };
        }

        // If content is just a string, convert to standard text message object
        if (typeof content === 'string') {
          content = { text: content };
        }

        // Simulate natural human typing presence
        try {
          await socket.presenceSubscribe(item.jid);
          await socket.sendPresenceUpdate('composing', item.jid);
        } catch {
          // Non-fatal
        }

        // Anti-ban human delay (1.5s - 3s)
        const delayMs = 1500 + Math.floor(Math.random() * 1500);
        await new Promise((r) => setTimeout(r, delayMs));

        await socket.sendMessage(item.jid, content);

        try {
          await socket.sendPresenceUpdate('paused', item.jid);
        } catch {
          // Non-fatal
        }

        // Mark as SENT
        await prisma.messageQueue.update({
          where: { id: item.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        console.log(`✅ Persistent Queue: Message ${item.id} sent to ${item.jid}`);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        const newAttempts = item.attempts + 1;
        const isMax = newAttempts >= item.maxAttempts;

        // Exponential backoff for retry (2^attempts seconds up to 1h)
        const backoffSec = Math.min(Math.pow(2, newAttempts) * 10, 3600);
        const nextRetry = new Date(Date.now() + backoffSec * 1000);

        console.error(`❌ Persistent Queue failed for message ${item.id} (attempt ${newAttempts}/${item.maxAttempts}): ${errorMsg}`);

        await prisma.messageQueue.update({
          where: { id: item.id },
          data: {
            status: isMax ? 'FAILED' : 'PENDING',
            attempts: newAttempts,
            lastError: errorMsg,
            nextRetryAt: nextRetry,
          },
        });

        // 403 Safety Pause (1 hour)
        if (errorMsg.includes('403') || errorMsg.includes('forbidden') || errorMsg.includes('logged out')) {
          console.warn('🚨 Status 403 / Forbidden detected. Pausing Message Queue for 1 hour for anti-ban safety.');
          queuePausedUntil = Date.now() + 3600000;
          break;
        }
      }
    }
  } catch (loopErr: any) {
    console.error('⚠️ Error running persistent queue processor loop:', loopErr.message);
  } finally {
    isProcessingQueue = false;
  }
}

let queueInterval: NodeJS.Timeout | null = null;

export function startPersistentQueueWorker(intervalMs: number = 10000) {
  if (queueInterval) return;
  
  queueInterval = setInterval(() => {
    processPersistentQueue().catch((err) => {
      console.error('Queue worker tick error:', err);
    });
  }, intervalMs);

  console.log('🚀 Persistent Message Queue Worker started.');
}

export function triggerQueueDrain() {
  setImmediate(() => {
    processPersistentQueue().catch(() => {});
  });
}

