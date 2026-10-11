import { describe, expect, it } from 'vitest';
import { formatBytes, parseByteSize } from './format-bytes.js';

describe('formatBytes', () => {
  it('uses binary units with one fraction digit above bytes', () => {
    expect(formatBytes(0, 'en')).toBe('0 B');
    expect(formatBytes(512, 'en')).toBe('512 B');
    expect(formatBytes(1536, 'en')).toBe('1.5 KB');
    expect(formatBytes(2.4 * 1024 ** 2, 'en')).toBe('2.4 MB');
    expect(formatBytes(10 * 1024 ** 3, 'en')).toBe('10 GB');
    expect(formatBytes(3 * 1024 ** 5, 'en')).toBe('3,072 TB');
  });

  it('formats for the locale', () => {
    expect(formatBytes(1536, 'de')).toBe('1,5 KB');
  });

  it('formats invalid input as empty text', () => {
    expect(formatBytes(-1, 'en')).toBe('');
    expect(formatBytes(Number.NaN, 'en')).toBe('');
    expect(formatBytes(Number.POSITIVE_INFINITY, 'en')).toBe('');
  });
});

describe('parseByteSize', () => {
  it('reads numbers and unit text', () => {
    expect(parseByteSize(2048)).toBe(2048);
    expect(parseByteSize('512')).toBe(512);
    expect(parseByteSize('10MB')).toBe(10 * 1024 ** 2);
    expect(parseByteSize('2.5 GiB')).toBe(Math.round(2.5 * 1024 ** 3));
    expect(parseByteSize('25 mb')).toBe(25 * 1024 ** 2);
    expect(parseByteSize('1k')).toBe(1024);
  });

  it('rejects unreadable input', () => {
    expect(parseByteSize('')).toBeNull();
    expect(parseByteSize('ten')).toBeNull();
    expect(parseByteSize(-4)).toBeNull();
    expect(parseByteSize('5 PB')).toBeNull();
    expect(parseByteSize(undefined)).toBeNull();
  });
});
