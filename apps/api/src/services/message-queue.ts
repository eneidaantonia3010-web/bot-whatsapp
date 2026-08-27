// ============================================
// Message Queue System (Sender Concurrency + Anti-Ban Global Outbound Gap)
// ============================================

const senderQueues = new Map<string, Promise<any>>();

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

// Global Outbound Queue (Ensures at least 1s gap between WhatsApp outgoing messages)
let globalOutboundChain: Promise<any> = Promise.resolve();
let lastOutboundTimestamp = 0;
const MIN_OUTBOUND_GAP_MS = 1000; // 1 segundo entre envíos para máxima fluidez

export function enqueueGlobalOutbound<T>(task: () => Promise<T>): Promise<T> {
  const nextTask = globalOutboundChain.then(async () => {
    const now = Date.now();
    const elapsed = now - lastOutboundTimestamp;

    if (elapsed < MIN_OUTBOUND_GAP_MS) {
      const waitTime = MIN_OUTBOUND_GAP_MS - elapsed;
      console.log(`⏳ Anti-Ban Queue: Espaciando envío por ${waitTime}ms para mantener la distancia de 5s...`);
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
    console.error('❌ Anti-Ban Queue task error:', err);
  });

  return nextTask;
}
