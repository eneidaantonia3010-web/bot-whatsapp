// ============================================
// Baileys Native Socket & In-App WhatsApp Test Suite
// Covers: Status Reporting, Message Enqueuing, Sender Serialization,
// Global Outbound Gap & PostgreSQL Session Auth Store.
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNativeStatus,
  getNativeQRBase64,
  sendNativeWhatsAppMessage,
  messageStoreCache,
  msgRetryCounterCache,
  cacheSentMessage,
  shouldIgnoreOldMessages,
  isProtocolSignal,
  getConsecutiveDecryptionFailures,
  resetConsecutiveDecryptionFailures,
  forceAuthSyncAndReconnect,
} from '../src/services/whatsapp-native';
import {
  enqueueForSender,
  enqueueGlobalOutbound,
  enqueuePersistentMessage,
} from '../src/services/message-queue';
import { usePrismaAuthState } from '../src/services/baileys-store';
import { prisma } from '../src/services/prisma';
import * as messageQueue from '../src/services/message-queue';

describe('Baileys Native Socket & Queuing System', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNativeStatus & getNativeQRBase64', () => {
    it('should return native WhatsApp status with expected schema', () => {
      const status = getNativeStatus();

      expect(status).toHaveProperty('configured', true);
      expect(status).toHaveProperty('instanceName', 'glow-studio-native');
      expect(status).toHaveProperty('phone');
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('hasQR');
      expect(typeof status.hasQR).toBe('boolean');
    });

    it('should return null or string for getNativeQRBase64', () => {
      const qr = getNativeQRBase64();
      expect(qr === null || typeof qr === 'string').toBe(true);
    });
  });

  describe('sendNativeWhatsAppMessage', () => {
    it('should fallback to persistent DB queue when socket is not open', async () => {
      const enqueueSpy = vi.spyOn(messageQueue, 'enqueuePersistentMessage').mockResolvedValueOnce({
        id: 'msg_1',
      } as any);

      const success = await sendNativeWhatsAppMessage('5491112345678', 'Hola! Tu turno está confirmado.');

      expect(success).toBe(true);
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jid: '5491112345678@s.whatsapp.net',
          message: expect.objectContaining({
            text: expect.any(String),
          }),
          priority: 2,
        })
      );
    });

    it('should return false if enqueuePersistentMessage throws an error', async () => {
      vi.spyOn(messageQueue, 'enqueuePersistentMessage').mockRejectedValueOnce(new Error('DB Connection error'));

      const success = await sendNativeWhatsAppMessage('5491112345678', 'Hola error');

      expect(success).toBe(false);
    });
  });

  describe('enqueueForSender (Per-Sender Concurrency Serialization)', () => {
    it('should process tasks sequentially for the same sender', async () => {
      const executionOrder: number[] = [];

      const task1 = () =>
        new Promise<number>((resolve) => {
          setTimeout(() => {
            executionOrder.push(1);
            resolve(1);
          }, 30);
        });

      const task2 = () =>
        new Promise<number>((resolve) => {
          setTimeout(() => {
            executionOrder.push(2);
            resolve(2);
          }, 5);
        });

      // Launch concurrently for same sender 'sender_A'
      const [res1, res2] = await Promise.all([
        enqueueForSender('sender_A', task1),
        enqueueForSender('sender_A', task2),
      ]);

      expect(res1).toBe(1);
      expect(res2).toBe(2);
      expect(executionOrder).toEqual([1, 2]);
    });

    it('should allow concurrent tasks for different senders without blocking', async () => {
      const executionOrder: string[] = [];

      const senderATask = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => {
            executionOrder.push('A');
            resolve('A');
          }, 40);
        });

      const senderBTask = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => {
            executionOrder.push('B');
            resolve('B');
          }, 10);
        });

      const [resA, resB] = await Promise.all([
        enqueueForSender('sender_A', senderATask),
        enqueueForSender('sender_B', senderBTask),
      ]);

      expect(resA).toBe('A');
      expect(resB).toBe('B');
      // sender B should complete first since different senders are not serialized together
      expect(executionOrder).toEqual(['B', 'A']);
    });
  });

  describe('enqueueGlobalOutbound (Anti-Spam Throttling Gap)', () => {
    it('should execute queued tasks in order without dropping any task', async () => {
      const results: number[] = [];

      const p1 = enqueueGlobalOutbound(async () => {
        results.push(1);
        return 1;
      });

      const p2 = enqueueGlobalOutbound(async () => {
        results.push(2);
        return 2;
      });

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe(1);
      expect(r2).toBe(2);
      expect(results).toEqual([1, 2]);
    });
  });

  describe('usePrismaAuthState (PostgreSQL Session Storage)', () => {
    it('should initialize auth creds when no record exists in DB', async () => {
      vi.spyOn(prisma.baileysSession, 'findUnique').mockResolvedValueOnce(null);

      const { state, saveCreds, clearState } = await usePrismaAuthState();

      expect(state).toHaveProperty('creds');
      expect(state.creds).toHaveProperty('noiseKey');
      expect(state).toHaveProperty('keys');
      expect(typeof saveCreds).toBe('function');
      expect(typeof clearState).toBe('function');
    });

    it('should call prisma upsert when saveCreds is invoked', async () => {
      vi.spyOn(prisma.baileysSession, 'findUnique').mockResolvedValueOnce(null);
      const upsertSpy = vi.spyOn(prisma.baileysSession, 'upsert').mockResolvedValueOnce({} as any);

      const { saveCreds } = await usePrismaAuthState();
      await saveCreds();

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'baileys_creds' },
        })
      );
    });

    it('should call prisma deleteMany when clearState is invoked', async () => {
      vi.spyOn(prisma.baileysSession, 'findUnique').mockResolvedValueOnce(null);
      const deleteSpy = vi.spyOn(prisma.baileysSession, 'deleteMany').mockResolvedValueOnce({ count: 5 } as any);

      const { clearState } = await usePrismaAuthState();
      await clearState();

      expect(deleteSpy).toHaveBeenCalledWith({});
    });
  });

  describe('Message Caching & Anti-Decryption Error Store', () => {
    it('should store and retrieve sent messages by ID for retry handling', () => {
      const msgId = 'test_msg_id_123';
      const fakeMessage = { conversation: 'Hola! Mensaje de prueba' };

      cacheSentMessage(msgId, fakeMessage as any);

      const retrieved = messageStoreCache.get(msgId);
      expect(retrieved).toBeDefined();
      expect(retrieved).toEqual(fakeMessage);
    });

    it('should manage retry count cache and TTL correctly', () => {
      msgRetryCounterCache.set('msg_retry_1', 1);
      expect(msgRetryCounterCache.get('msg_retry_1')).toBe(1);

      msgRetryCounterCache.set('msg_retry_1', 2);
      expect(msgRetryCounterCache.get('msg_retry_1')).toBe(2);

      msgRetryCounterCache.del('msg_retry_1');
      expect(msgRetryCounterCache.get('msg_retry_1')).toBeUndefined();
    });
  });

  describe('Old Message Filtering (shouldIgnoreOldMessages)', () => {
    it('should ignore null, undefined, or outbound messages', () => {
      expect(shouldIgnoreOldMessages(null)).toBe(true);
      expect(shouldIgnoreOldMessages(undefined)).toBe(true);
      expect(shouldIgnoreOldMessages({ key: { fromMe: true } })).toBe(true);
    });

    it('should ignore messages older than 180 seconds to protect Event Loop', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const oldMsg = {
        key: { fromMe: false, id: 'old_123' },
        messageTimestamp: nowSec - 250,
        message: { conversation: 'Mensaje viejo' },
      };
      expect(shouldIgnoreOldMessages(oldMsg)).toBe(true);
    });

    it('should NOT ignore fresh messages with valid body', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const freshMsg = {
        key: { fromMe: false, id: 'fresh_123' },
        messageTimestamp: nowSec - 5,
        message: { conversation: 'Hola quiero un turno' },
      };
      expect(shouldIgnoreOldMessages(freshMsg)).toBe(false);
    });

    it('should ignore messages with cryptographic error stubs (e.g. CIPHERTEXT = 2)', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const stubMsg = {
        key: { fromMe: false, id: 'stub_123' },
        messageTimestamp: nowSec - 10,
        messageStubType: 2,
      };
      expect(shouldIgnoreOldMessages(stubMsg)).toBe(true);
    });

    it('should ignore messages older than 30s that failed decryption', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const cryptoFailMsg = {
        key: { fromMe: false, id: 'empty_123' },
        messageTimestamp: nowSec - 45,
        message: {},
      };
      expect(shouldIgnoreOldMessages(cryptoFailMsg)).toBe(true);
    });
  });

  describe('Protocol Signal Filtering (isProtocolSignal)', () => {
    it('should identify internal protocol messages and reactions', () => {
      expect(isProtocolSignal({ protocolMessage: { key: 'test' } })).toBe(true);
      expect(isProtocolSignal({ reactionMessage: { text: '👍' } })).toBe(true);
      expect(isProtocolSignal({ senderKeyDistributionMessage: {} })).toBe(true);
      expect(isProtocolSignal({ conversation: 'Hola!' })).toBe(false);
      expect(isProtocolSignal(null)).toBe(false);
    });
  });

  describe('Crypto Failure Recovery & Safe Auth Sync', () => {
    it('should track and reset consecutive decryption failure counts', () => {
      resetConsecutiveDecryptionFailures();
      expect(getConsecutiveDecryptionFailures()).toBe(0);
    });

    it('should trigger auth state refresh without deleting PostgreSQL session credentials', async () => {
      const deleteSpy = vi.spyOn(prisma.baileysSession, 'deleteMany');
      vi.spyOn(prisma.baileysSession, 'findUnique').mockResolvedValueOnce(null);

      await forceAuthSyncAndReconnect();

      expect(getConsecutiveDecryptionFailures()).toBe(0);
      // Verify credentials were NOT wiped
      expect(deleteSpy).not.toHaveBeenCalled();
    }, 15000);
  });
});
