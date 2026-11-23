import { describe, it, expect } from 'vitest';
import {
  formatVND,
  formatDateVN,
  formatTime,
  formatTimeVN,
  formatDateTimeVN,
  formatNumber,
  formatPhoneNumber,
  formatCurrency,
  formatVnd,
  formatDate,
  formatDateTime,
} from '../utils/formatters';

describe('formatters utility module', () => {
  describe('formatVND', () => {
    it('formats a normal positive number to VND string with symbol ₫', () => {
      const result = formatVND(8500000);
      expect(result).toBe('8.500.000 ₫');
    });

    it('formats a string representation of a number', () => {
      const result = formatVND('15000000');
      expect(result).toBe('15.000.000 ₫');
    });

    it('formats zero correctly', () => {
      const result = formatVND(0);
      expect(result).toBe('0 ₫');
    });

    it('returns default fallback for null, undefined, and empty string', () => {
      expect(formatVND(null)).toBe('0 ₫');
      expect(formatVND(undefined)).toBe('0 ₫');
      expect(formatVND('')).toBe('0 ₫');
    });

    it('returns custom fallback when provided', () => {
      expect(formatVND(null, 'Chưa báo giá')).toBe('Chưa báo giá');
      expect(formatVND('invalid', '—')).toBe('—');
    });

    it('handles negative numbers', () => {
      const result = formatVND(-500000);
      expect(result).toContain('500.000');
      expect(result).toContain('₫');
    });
  });

  describe('formatDateVN', () => {
    it('formats ISO date string to DD/MM/YYYY', () => {
      const result = formatDateVN('2026-11-24T03:45:00.000Z');
      expect(result).toMatch(/\d{2}\/\d{2}\/2026/);
    });

    it('formats YYYY-MM-DD date string', () => {
      const result = formatDateVN('2026-12-01');
      expect(result).toMatch(/\d{2}\/12\/2026/);
    });

    it('formats Date object', () => {
      const d = new Date(2026, 10, 24); // Month 10 is November (0-indexed)
      expect(formatDateVN(d)).toBe('24/11/2026');
    });

    it('returns fallback for null, undefined, empty string or invalid date', () => {
      expect(formatDateVN(null)).toBe('—');
      expect(formatDateVN(undefined)).toBe('—');
      expect(formatDateVN('')).toBe('—');
      expect(formatDateVN('not-a-date')).toBe('—');
      expect(formatDateVN('invalid', 'Chưa có')).toBe('Chưa có');
    });
  });

  describe('formatTime', () => {
    it('formats Date object to HH:mm', () => {
      const d = new Date(2026, 10, 24, 9, 5);
      expect(formatTime(d)).toBe('09:05');
    });

    it('formats string datetime', () => {
      const result = formatTime('2026-11-24T14:30:00');
      expect(result).toBe('14:30');
    });

    it('returns fallback for null, undefined or invalid date', () => {
      expect(formatTime(null)).toBe('—');
      expect(formatTime(undefined)).toBe('—');
      expect(formatTime('invalid', 'N/A')).toBe('N/A');
    });
  });

  describe('formatDateTimeVN', () => {
    it('formats Date object to HH:mm DD/MM/YYYY', () => {
      const d = new Date(2026, 10, 24, 14, 30);
      expect(formatDateTimeVN(d)).toBe('14:30 24/11/2026');
    });

    it('formats ISO string correctly', () => {
      const result = formatDateTimeVN('2026-11-24T14:30:00');
      expect(result).toMatch(/\d{2}:\d{2} \d{2}\/\d{2}\/2026/);
    });

    it('returns fallback for null, undefined, or invalid date', () => {
      expect(formatDateTimeVN(null)).toBe('—');
      expect(formatDateTimeVN('invalid')).toBe('—');
      expect(formatDateTimeVN(null, 'N/A')).toBe('N/A');
    });
  });

  describe('formatNumber', () => {
    it('formats number with Vietnamese thousands separator', () => {
      expect(formatNumber(1250000)).toBe('1.250.000');
      expect(formatNumber('4500')).toBe('4.500');
      expect(formatNumber(0)).toBe('0');
    });

    it('returns fallback for null, undefined, empty, or NaN', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber('')).toBe('0');
      expect(formatNumber('abc', '—')).toBe('—');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats 10-digit phone number with spacing', () => {
      expect(formatPhoneNumber('0901234567')).toBe('0901 234 567');
    });

    it('handles phone with existing dashes or non-digits', () => {
      expect(formatPhoneNumber('090-123-4567')).toBe('0901 234 567');
    });

    it('returns fallback for empty phone', () => {
      expect(formatPhoneNumber(null)).toBe('—');
      expect(formatPhoneNumber('')).toBe('—');
    });
  });

  describe('Aliases', () => {
    it('exports aliases that match primary formatters', () => {
      expect(formatCurrency).toBe(formatVND);
      expect(formatVnd).toBe(formatVND);
      expect(formatDate).toBe(formatDateVN);
      expect(formatDateTime).toBe(formatDateTimeVN);
      expect(formatTimeVN).toBe(formatTime);
    });
  });
});
