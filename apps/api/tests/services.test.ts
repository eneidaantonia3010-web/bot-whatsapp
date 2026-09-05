// ============================================
// Service & Utility Unit Tests
// ============================================

import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { withRetry } from '../src/utils/retry';
import { verifyMetaSignature } from '../src/services/webhook-security';
import { staffSeedData } from '../src/services/seed-staff';
import { config } from '../src/config';

describe('Utility: withRetry', () => {
  it('should resolve immediately when the operation succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and resolve when a subsequent attempt succeeds', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error('Temporary network glitch');
      }
      return 'recovered';
    });

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw when maximum retry limit is reached', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Persistent DB connection error'));

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow('Persistent DB connection error');

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('Service: verifyMetaSignature', () => {
  it('should return true for valid HMAC SHA-256 signature', () => {
    const testSecret = 'meta_test_app_secret_12345';
    (config as any).META_APP_SECRET = testSecret;

    const payload = JSON.stringify({ object: 'page', entry: [{ id: '12345' }] });
    const signature =
      'sha256=' + crypto.createHmac('sha256', testSecret).update(payload).digest('hex');

    const mockReq: any = {
      headers: {
        'x-hub-signature-256': signature,
      },
      body: payload,
    };

    const isValid = verifyMetaSignature(mockReq);
    expect(isValid).toBe(true);
  });

  it('should return false when signature header is missing and secret is set', () => {
    (config as any).META_APP_SECRET = 'meta_test_app_secret_12345';
    const mockReq: any = {
      headers: {},
      body: { test: 123 },
    };

    const isValid = verifyMetaSignature(mockReq);
    expect(isValid).toBe(false);
  });

  it('should return false when signature hash does not match payload', () => {
    (config as any).META_APP_SECRET = 'meta_test_app_secret_12345';
    const mockReq: any = {
      headers: {
        'x-hub-signature-256': 'sha256=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      },
      body: JSON.stringify({ message: 'tampered payload' }),
    };

    const isValid = verifyMetaSignature(mockReq);
    expect(isValid).toBe(false);
  });
});

describe('Staff Seed Definitions', () => {
  it('should have 4 predefined staff members with required fields and valid email/phone', () => {
    expect(staffSeedData).toBeDefined();
    expect(staffSeedData.length).toBe(4);

    const emails = staffSeedData.map((s) => s.email);
    expect(emails).toContain('sofia@glowstudio.com');
    expect(emails).toContain('camila@glowstudio.com');
    expect(emails).toContain('valentina@glowstudio.com');
    expect(emails).toContain('lucia@glowstudio.com');

    for (const staff of staffSeedData) {
      expect(staff.name).toBeTruthy();
      expect(staff.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(staff.phone).toMatch(/^\+549/);
      expect(Array.isArray(staff.specialties)).toBe(true);
      expect((staff.specialties as string[]).length).toBeGreaterThan(0);
      expect(staff.active).toBe(true);
      expect(staff.avatarUrl).toMatch(/^https:\/\//);
    }
  });
});
