import { numberFormatter, type LocaleInput } from './intl.js';

/** Binary byte units, largest last. */
export const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
export type ByteUnit = (typeof BYTE_UNITS)[number];

/**
 * Formats a byte count in binary units (1 KB = 1024 B) for a locale: whole bytes, and at most
 * one fraction digit above them, as in `2.4 MB`. Negative, non-finite and missing values format
 * as an empty string.
 */
export function formatBytes(value: number, locale?: LocaleInput): string {
  if (!Number.isFinite(value) || value < 0) return '';
  const index = Math.min(
    BYTE_UNITS.length - 1,
    Math.floor(Math.log(Math.max(value, 1)) / Math.log(1024)),
  );
  const formatted = numberFormatter(locale, { maximumFractionDigits: index ? 1 : 0 }).format(
    value / 1024 ** index,
  );
  return `${formatted} ${BYTE_UNITS[index]}`;
}

const SIZE = /^\s*(\d+(?:\.\d+)?)\s*(b|kb|kib|k|mb|mib|m|gb|gib|g|tb|tib|t)?\s*$/i;

/**
 * Reads a byte count from a number or from text with an optional binary unit (`512`, `10MB`,
 * `2.5 GiB`). Returns `null` for empty, negative or unreadable input so callers can treat it as
 * "no limit" and report a diagnostic.
 */
export function parseByteSize(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? input : null;
  if (typeof input !== 'string') return null;
  const match = SIZE.exec(input);
  if (!match) return null;
  const unit = (match[2] ?? 'b').toLowerCase()[0]!;
  const power = { b: 0, k: 1, m: 2, g: 3, t: 4 }[unit] ?? 0;
  return Math.round(Number(match[1]) * 1024 ** power);
}
