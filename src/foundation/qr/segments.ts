import { MAX_VERSION, dataCodewords } from './tables.js';
import type { QrErrorCorrection, QrMode } from './types.js';

/** The 45 characters of alphanumeric mode, in code order. */
const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const NUMERIC_PATTERN = /^[0-9]*$/u;
const ALPHANUMERIC_PATTERN = /^[0-9A-Z $%*+\-./:]*$/u;

const MODE_INDICATOR: Record<QrMode, number> = { numeric: 0x1, alphanumeric: 0x2, byte: 0x4 };
// Character count indicator widths for versions 1–9, 10–26 and 27–40.
const COUNT_BITS: Record<QrMode, readonly [number, number, number]> = {
  numeric: [10, 12, 14],
  alphanumeric: [9, 11, 13],
  byte: [8, 16, 16],
};

/** An append-only bit sequence. */
export class BitBuffer {
  readonly bits: number[] = [];

  get length(): number {
    return this.bits.length;
  }

  append(value: number, length: number): void {
    for (let bit = length - 1; bit >= 0; bit--) this.bits.push((value >>> bit) & 1);
  }

  /** Packs the bits, most significant first, into bytes; the length must be a multiple of 8. */
  toBytes(): number[] {
    const bytes: number[] = new Array(Math.ceil(this.bits.length / 8)).fill(0);
    this.bits.forEach((bit, index) => {
      bytes[index >>> 3]! |= bit << (7 - (index & 7));
    });
    return bytes;
  }
}

/** The most compact mode that represents every character of `text`. */
export function qrSegmentMode(text: string): QrMode {
  if (NUMERIC_PATTERN.test(text)) return 'numeric';
  if (ALPHANUMERIC_PATTERN.test(text)) return 'alphanumeric';
  return 'byte';
}

/** UTF-8 bytes of `text`; unpaired surrogates become U+FFFD. */
export function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** A data segment ready for placement: its mode, character count and payload bits. */
export interface QrSegment {
  readonly mode: QrMode;
  /** Characters (numeric, alphanumeric) or bytes (byte). */
  readonly count: number;
  readonly data: BitBuffer;
}

export function makeSegment(text: string, mode: QrMode = qrSegmentMode(text)): QrSegment {
  const data = new BitBuffer();
  if (mode === 'numeric') {
    for (let index = 0; index < text.length; index += 3) {
      const group = text.slice(index, index + 3);
      data.append(Number(group), group.length * 3 + 1);
    }
    return { mode, count: text.length, data };
  }
  if (mode === 'alphanumeric') {
    for (let index = 0; index + 1 < text.length; index += 2) {
      data.append(
        ALPHANUMERIC.indexOf(text[index]!) * 45 + ALPHANUMERIC.indexOf(text[index + 1]!),
        11,
      );
    }
    if (text.length % 2 === 1) data.append(ALPHANUMERIC.indexOf(text[text.length - 1]!), 6);
    return { mode, count: text.length, data };
  }
  const bytes = utf8Bytes(text);
  for (const byte of bytes) data.append(byte, 8);
  return { mode, count: bytes.length, data };
}

export function modeIndicator(mode: QrMode): number {
  return MODE_INDICATOR[mode];
}

/** Width of the character count indicator for a mode in a version. */
export function countBits(mode: QrMode, version: number): number {
  return COUNT_BITS[mode][version <= 9 ? 0 : version <= 26 ? 1 : 2];
}

/** Bits a segment needs in a version, or `Infinity` when its count overflows the indicator. */
export function segmentBits(segment: QrSegment, version: number): number {
  const width = countBits(segment.mode, version);
  if (segment.count >= 2 ** width) return Infinity;
  return 4 + width + segment.data.length;
}

/** The most characters (or bytes) a mode holds at a level in a version. */
export function qrCapacity(
  mode: QrMode,
  errorCorrection: QrErrorCorrection,
  version: number = MAX_VERSION,
): number {
  const available = dataCodewords(version, errorCorrection) * 8 - 4 - countBits(mode, version);
  if (mode === 'numeric') {
    const rest = available % 10;
    return Math.floor(available / 10) * 3 + (rest >= 7 ? 2 : rest >= 4 ? 1 : 0);
  }
  if (mode === 'alphanumeric') {
    return Math.floor(available / 11) * 2 + (available % 11 >= 6 ? 1 : 0);
  }
  return Math.floor(available / 8);
}
