import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { PwaRegister } from './PwaRegister';

describe('PwaRegister Component', () => {
  const originalEnv = process.env.NODE_ENV;
  let mockRegister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn().mockResolvedValue({ scope: '/' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('registers service worker in production environment', async () => {
    (process.env as any).NODE_ENV = 'production';
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(<PwaRegister />);

    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
    await vi.waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ PWA Service Worker registered with scope:',
        '/'
      );
    });

    consoleLogSpy.mockRestore();
  });

  it('does not register service worker in development environment', () => {
    (process.env as any).NODE_ENV = 'development';

    render(<PwaRegister />);

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('logs warning if service worker registration fails', async () => {
    (process.env as any).NODE_ENV = 'production';
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const registrationError = new Error('SW failed');
    mockRegister.mockRejectedValueOnce(registrationError);

    render(<PwaRegister />);

    await vi.waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ PWA Service Worker registration failed:',
        registrationError
      );
    });

    consoleWarnSpy.mockRestore();
  });
});
