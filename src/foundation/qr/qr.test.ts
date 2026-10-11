import { describe, expect, it } from 'vitest';
import { assembleData, encodeQr, interleave, isDarkModule } from './encode.js';
import { linePenalty, penaltyScore } from './mask.js';
import { formatBits, versionBits } from './matrix.js';
import { qrPathData } from './path.js';
import { gfMultiply, rsGenerator, rsRemainder } from './reed-solomon.js';
import { makeSegment, qrCapacity, qrSegmentMode, utf8Bytes } from './segments.js';
import { alignmentPositions, dataCodewords, totalCodewords } from './tables.js';
import { QrCapacityError, type QrCode, type QrErrorCorrection, type QrMask } from './types.js';

const LEVELS: QrErrorCorrection[] = ['L', 'M', 'Q', 'H'];
const MASKS: QrMask[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** α^i in GF(256) with α = 2. */
const exp = (() => {
  const table = [1];
  for (let index = 1; index < 255; index++) table.push(gfMultiply(table[index - 1]!, 2));
  return table;
})();

const hamming = (a: number, b: number) => {
  let x = a ^ b;
  let count = 0;
  while (x) {
    count += x & 1;
    x >>>= 1;
  }
  return count;
};

describe('GF(256)', () => {
  it('reduces by x^8 + x^4 + x^3 + x^2 + 1 and has inverses', () => {
    expect(exp[8]).toBe(29);
    expect(new Set(exp).size).toBe(255);
    for (let a = 1; a < 256; a++) {
      expect(exp.some((b) => gfMultiply(a, b) === 1)).toBe(true);
    }
  });

  it('builds the generator polynomials of ISO/IEC 18004 Annex A', () => {
    expect(rsGenerator(7)).toEqual([87, 229, 146, 149, 238, 102, 21].map((power) => exp[power]));
    expect(rsGenerator(10)).toEqual(
      [251, 67, 46, 61, 118, 70, 64, 94, 32, 45].map((power) => exp[power]),
    );
  });
});

describe('codewords', () => {
  it('encodes "01234567" at 1-M as in ISO/IEC 18004 Annex I', () => {
    const data = assembleData(makeSegment('01234567'), 1, 'M');
    expect(data).toEqual([
      0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec,
      0x11,
    ]);
    expect(rsRemainder(data, rsGenerator(10))).toEqual([
      0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55,
    ]);
  });

  it('encodes "HELLO WORLD" at 1-M and 1-Q', () => {
    const medium = assembleData(makeSegment('HELLO WORLD'), 1, 'M');
    expect(medium).toEqual([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]);
    expect(rsRemainder(medium, rsGenerator(10))).toEqual([
      196, 35, 39, 119, 235, 215, 231, 226, 93, 23,
    ]);
    const quartile = assembleData(makeSegment('HELLO WORLD'), 1, 'Q');
    expect(quartile).toEqual([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236]);
    expect(rsRemainder(quartile, rsGenerator(13))).toEqual([
      168, 72, 22, 82, 217, 54, 156, 0, 46, 15, 180, 122, 16,
    ]);
  });

  it('interleaves short blocks before long ones (5-Q: 2 × 15 and 2 × 16 data codewords)', () => {
    const data = Array.from({ length: 62 }, (_, index) => index);
    const result = interleave(data, 5, 'Q');
    expect(result).toHaveLength(134);
    expect(result.slice(0, 8)).toEqual([0, 15, 30, 46, 1, 16, 31, 47]);
    expect(result.slice(56, 62)).toEqual([14, 29, 44, 60, 45, 61]);
  });
});

describe('tables', () => {
  it('counts codewords per version and level (ISO/IEC 18004 Table 7)', () => {
    expect([1, 2, 7, 40].map(totalCodewords)).toEqual([26, 44, 196, 3706]);
    const expected: Record<number, number[]> = {
      1: [19, 16, 13, 9],
      2: [34, 28, 22, 16],
      3: [55, 44, 34, 26],
      4: [80, 64, 48, 36],
      5: [108, 86, 62, 46],
      6: [136, 108, 76, 60],
      7: [156, 124, 88, 66],
      8: [194, 154, 110, 86],
      9: [232, 182, 132, 100],
      10: [274, 216, 154, 122],
      40: [2956, 2334, 1666, 1276],
    };
    for (const [version, counts] of Object.entries(expected)) {
      expect(LEVELS.map((level) => dataCodewords(Number(version), level))).toEqual(counts);
    }
  });

  it('places alignment patterns as in ISO/IEC 18004 Annex E', () => {
    expect(alignmentPositions(1)).toEqual([]);
    expect(alignmentPositions(2)).toEqual([6, 18]);
    expect(alignmentPositions(7)).toEqual([6, 22, 38]);
    expect(alignmentPositions(14)).toEqual([6, 26, 46, 66]);
    expect(alignmentPositions(22)).toEqual([6, 26, 50, 74, 98]);
    expect(alignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
    expect(alignmentPositions(36)).toEqual([6, 24, 50, 76, 102, 128, 154]);
    expect(alignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
  });

  it('holds the character capacities of ISO/IEC 18004 Table 7', () => {
    const at = (version: number) =>
      (['numeric', 'alphanumeric', 'byte'] as const).map((mode) =>
        LEVELS.map((level) => qrCapacity(mode, level, version)),
      );
    expect(at(1)).toEqual([
      [41, 34, 27, 17],
      [25, 20, 16, 10],
      [17, 14, 11, 7],
    ]);
    expect(at(40)).toEqual([
      [7089, 5596, 3993, 3057],
      [4296, 3391, 2420, 1852],
      [2953, 2331, 1663, 1273],
    ]);
  });
});

describe('format and version information', () => {
  it('matches the format strings of ISO/IEC 18004 Table C.1 and keeps a distance of 7', () => {
    expect(formatBits('L', 0).toString(2).padStart(15, '0')).toBe('111011111000100');
    expect(formatBits('M', 0).toString(2).padStart(15, '0')).toBe('101010000010010');
    expect(formatBits('Q', 0).toString(2).padStart(15, '0')).toBe('011010101011111');
    expect(formatBits('H', 0).toString(2).padStart(15, '0')).toBe('001011010001001');
    expect(formatBits('L', 7).toString(2).padStart(15, '0')).toBe('110100101110110');
    expect(formatBits('H', 7).toString(2).padStart(15, '0')).toBe('000100000111011');
    const all = LEVELS.flatMap((level) => MASKS.map((mask) => formatBits(level, mask)));
    expect(new Set(all).size).toBe(32);
    for (const a of all)
      for (const b of all) if (a !== b) expect(hamming(a, b)).toBeGreaterThanOrEqual(7);
  });

  it('matches the version information of ISO/IEC 18004 Annex D', () => {
    expect(versionBits(7)).toBe(0x07c94);
    expect(versionBits(8)).toBe(0x085bc);
    expect(versionBits(40)).toBe(0x28c69);
    const all = Array.from({ length: 34 }, (_, index) => versionBits(index + 7));
    for (const a of all)
      for (const b of all) if (a !== b) expect(hamming(a, b)).toBeGreaterThanOrEqual(8);
  });
});

describe('segments', () => {
  it('chooses the most compact mode', () => {
    expect(qrSegmentMode('0123456789')).toBe('numeric');
    expect(qrSegmentMode('HELLO WORLD $%*+-./:')).toBe('alphanumeric');
    expect(qrSegmentMode('hello')).toBe('byte');
    expect(qrSegmentMode('https://tweakpad.github.io')).toBe('byte');
  });

  it('encodes byte mode as UTF-8 with U+FFFD for lone surrogates', () => {
    expect(utf8Bytes('Grüße')).toHaveLength(7);
    expect([...utf8Bytes('\uD800')]).toEqual([0xef, 0xbf, 0xbd]);
    expect(makeSegment('😀').count).toBe(4);
  });
});

/** Reads the 15 format bits back from the copy around the top-left finder. */
function readFormat(code: QrCode): number {
  let bits = 0;
  const set = (index: number, x: number, y: number) => {
    if (isDarkModule(code, x, y)) bits |= 1 << index;
  };
  for (let index = 0; index <= 5; index++) set(index, 8, index);
  set(6, 8, 7);
  set(7, 8, 8);
  set(8, 7, 8);
  for (let index = 9; index < 15; index++) set(index, 14 - index, 8);
  return bits;
}

/** Reads the second copy, beside the top-right and bottom-left finders. */
function readFormatCopy(code: QrCode): number {
  let bits = 0;
  for (let index = 0; index < 8; index++)
    if (isDarkModule(code, code.size - 1 - index, 8)) bits |= 1 << index;
  for (let index = 8; index < 15; index++)
    if (isDarkModule(code, 8, code.size - 15 + index)) bits |= 1 << index;
  return bits;
}

describe('encodeQr', () => {
  it('chooses the smallest version and honors the level exactly', () => {
    expect(encodeQr('a'.repeat(17), { errorCorrection: 'L' }).version).toBe(1);
    expect(encodeQr('a'.repeat(18), { errorCorrection: 'L' }).version).toBe(2);
    expect(encodeQr('a'.repeat(14)).version).toBe(1);
    expect(encodeQr('a'.repeat(14)).errorCorrection).toBe('M');
    expect(encodeQr('a'.repeat(2953), { errorCorrection: 'L' }).version).toBe(40);
    expect(encodeQr('1', { minVersion: 5 }).version).toBe(5);
  });

  it('switches the character count width between versions 9 and 10', () => {
    expect(encodeQr('a'.repeat(230), { errorCorrection: 'L' }).version).toBe(9);
    expect(encodeQr('a'.repeat(231), { errorCorrection: 'L' }).version).toBe(10);
  });

  it('throws a capacity error past version 40 and range errors for invalid options', () => {
    expect(() => encodeQr('a'.repeat(2954), { errorCorrection: 'L' })).toThrow(QrCapacityError);
    try {
      encodeQr('a'.repeat(2400), { errorCorrection: 'M' });
    } catch (error) {
      expect(error).toMatchObject({
        code: 'qr-capacity',
        mode: 'byte',
        capacity: 2331,
        length: 2400,
      });
    }
    expect(() => encodeQr('x', { errorCorrection: 'X' as QrErrorCorrection })).toThrow(RangeError);
    expect(() => encodeQr('x', { minVersion: 0 })).toThrow(RangeError);
    expect(() => encodeQr('x', { mask: 9 as QrMask })).toThrow(RangeError);
  });

  it('draws finders, timing, the dark module and two equal format copies', () => {
    for (const version of [1, 7, 21]) {
      const code = encodeQr('x', { minVersion: version, errorCorrection: 'Q', mask: 5 });
      expect(code.size).toBe(version * 4 + 17);
      for (const [cx, cy] of [
        [3, 3],
        [code.size - 4, 3],
        [3, code.size - 4],
      ]) {
        expect(isDarkModule(code, cx!, cy!)).toBe(true);
        expect(isDarkModule(code, cx! - 2, cy!)).toBe(false);
        expect(isDarkModule(code, cx! - 3, cy!)).toBe(true);
      }
      for (let index = 8; index < code.size - 8; index++) {
        expect(isDarkModule(code, index, 6)).toBe(index % 2 === 0);
        expect(isDarkModule(code, 6, index)).toBe(index % 2 === 0);
      }
      expect(isDarkModule(code, 8, code.size - 8)).toBe(true);
      expect(readFormat(code)).toBe(formatBits('Q', 5));
      expect(readFormatCopy(code)).toBe(formatBits('Q', 5));
    }
  });

  it('picks the mask with the lowest penalty, the lowest number on ties, deterministically', () => {
    for (const text of ['HELLO WORLD', 'https://tweakpad.github.io/', '0'.repeat(120)]) {
      const auto = encodeQr(text);
      const penalties = MASKS.map((mask) => {
        const code = encodeQr(text, { mask });
        return penaltyScore(code.modules, code.size);
      });
      const best = Math.min(...penalties);
      expect(auto.mask).toBe(penalties.indexOf(best));
      expect(encodeQr(text).modules).toEqual(auto.modules);
      expect(encodeQr(text, { mask: 3 }).mask).toBe(3);
    }
  });
});

describe('penalty', () => {
  it('scores runs, blocks and balance', () => {
    expect(penaltyScore(new Uint8Array(25), 5)).toBe(10 * 3 + 16 * 3 + 9 * 10);
    const checker = new Uint8Array(25).map((_, index) =>
      ((index % 5) + Math.floor(index / 5)) % 2 === 0 ? 1 : 0,
    );
    expect(penaltyScore(checker, 5)).toBe(0);
  });

  it('counts a finder-like pattern once for each light side', () => {
    const line = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    expect(linePenalty(line.length, (index) => line[index]!)).toBe(2 * 40);
    const runs = [1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0];
    expect(linePenalty(runs.length, (index) => runs[index]!)).toBe(3 + 1);
  });
});

describe('qrPathData', () => {
  it('draws horizontal runs offset by the quiet zone', () => {
    const code = { size: 3, modules: Uint8Array.from([1, 1, 0, 0, 0, 0, 1, 0, 1]) } as QrCode;
    expect(qrPathData(code)).toBe('M0 0h2v1h-2zM0 2h1v1h-1zM2 2h1v1h-1z');
    expect(qrPathData(code, 4)).toBe('M4 4h2v1h-2zM4 6h1v1h-1zM6 6h1v1h-1z');
  });
});
