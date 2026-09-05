import { describe, it, expect } from 'vitest';
import { cn, formatPrice, formatDuration, formatDate, formatTime } from './utils';

describe('Frontend Utils Library', () => {
  describe('cn (classNames helper)', () => {
    it('merges tailwind classes and conditional expressions', () => {
      expect(cn('px-2 py-1', 'bg-red-500')).toContain('bg-red-500');
      expect(cn('text-sm', true && 'font-bold', false && 'italic')).toBe('text-sm font-bold');
      expect(cn('p-4', 'p-2')).toBe('p-2'); // twMerge precedence
    });
  });

  describe('formatPrice', () => {
    it('formats price in Argentine currency representation', () => {
      const formatted = formatPrice(25000);
      expect(formatted).toMatch(/25\.000|\$25/);
    });
  });

  describe('formatDuration', () => {
    it('formats minutes below 60', () => {
      expect(formatDuration(45)).toBe('45min');
    });

    it('formats exact hours', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30min');
    });
  });

  describe('formatDate and formatTime', () => {
    const testDate = new Date('2026-09-10T14:30:00.000Z');

    it('formats date to localized text', () => {
      const formatted = formatDate(testDate);
      expect(formatted.toLowerCase()).toContain('2026');
      expect(formatted.toLowerCase()).toContain('septiembre');
    });

    it('formats time to 24h format', () => {
      const formatted = formatTime(testDate);
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });
  });
});
