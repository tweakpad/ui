import type { QrErrorCorrection } from './types.js';

const LEVEL_INDEX: Record<QrErrorCorrection, number> = { L: 0, M: 1, Q: 2, H: 3 };

/** Format information level bits (ISO/IEC 18004 Table 12): L 01, M 00, Q 11, H 10. */
export const FORMAT_LEVEL_BITS: Record<QrErrorCorrection, number> = { L: 1, M: 0, Q: 3, H: 2 };

// ISO/IEC 18004 Table 9, indexed [level][version]; index 0 is unused.
// prettier-ignore
const ECC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

// prettier-ignore
const ERROR_CORRECTION_BLOCKS: readonly (readonly number[])[] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

export const MIN_VERSION = 1;
export const MAX_VERSION = 40;

/** Modules per side of a version, without the quiet zone. */
export function symbolSize(version: number): number {
  return version * 4 + 17;
}

/** Error correction codewords in each block. */
export function eccCodewordsPerBlock(version: number, level: QrErrorCorrection): number {
  return ECC_CODEWORDS_PER_BLOCK[LEVEL_INDEX[level]]![version]!;
}

/** Number of error correction blocks. */
export function errorCorrectionBlocks(version: number, level: QrErrorCorrection): number {
  return ERROR_CORRECTION_BLOCKS[LEVEL_INDEX[level]]![version]!;
}

/** Modules left for codewords and remainder bits after every function pattern. */
export function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignments = Math.floor(version / 7) + 2;
    result -= (25 * alignments - 10) * alignments - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** All codewords (data and error correction) of a version. */
export function totalCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8);
}

/** Data codewords of a version and level. */
export function dataCodewords(version: number, level: QrErrorCorrection): number {
  return (
    totalCodewords(version) -
    eccCodewordsPerBlock(version, level) * errorCorrectionBlocks(version, level)
  );
}

/** Center coordinates of the alignment patterns along each axis (ISO/IEC 18004 Annex E). */
export function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const positions = [6];
  for (let position = symbolSize(version) - 7; positions.length < count; position -= step) {
    positions.splice(1, 0, position);
  }
  return positions;
}
