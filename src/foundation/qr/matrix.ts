import { FORMAT_LEVEL_BITS, alignmentPositions, symbolSize } from './tables.js';
import type { QrErrorCorrection, QrMask } from './types.js';

/** A module grid under construction: row-major modules and the function-pattern map. */
export interface QrMatrix {
  readonly size: number;
  /** 1 is dark. */
  readonly modules: Uint8Array;
  /** 1 marks a function module (patterns, format and version information). */
  readonly reserved: Uint8Array;
}

export function createMatrix(version: number): QrMatrix {
  const size = symbolSize(version);
  return { size, modules: new Uint8Array(size * size), reserved: new Uint8Array(size * size) };
}

function setFunction(matrix: QrMatrix, x: number, y: number, dark: boolean): void {
  const index = y * matrix.size + x;
  matrix.modules[index] = dark ? 1 : 0;
  matrix.reserved[index] = 1;
}

/** Bit `index` of `value`, least significant first. */
function bit(value: number, index: number): boolean {
  return ((value >>> index) & 1) !== 0;
}

/**
 * Draws the timing patterns, the three finder patterns with their separators, the alignment
 * patterns and the version information, and reserves the format information areas (written
 * after masking) with the dark module.
 */
export function drawFunctionPatterns(matrix: QrMatrix, version: number): void {
  const { size } = matrix;
  for (let index = 0; index < size; index++) {
    setFunction(matrix, 6, index, index % 2 === 0);
    setFunction(matrix, index, 6, index % 2 === 0);
  }
  drawFinder(matrix, 3, 3);
  drawFinder(matrix, size - 4, 3);
  drawFinder(matrix, 3, size - 4);
  const positions = alignmentPositions(version);
  const last = positions.length - 1;
  positions.forEach((y, row) => {
    positions.forEach((x, column) => {
      // The three corners already hold finder patterns.
      if (
        (row === 0 && column === 0) ||
        (row === 0 && column === last) ||
        (row === last && column === 0)
      )
        return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunction(matrix, x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });
  drawFormat(matrix, 'M', 0);
  drawVersion(matrix, version);
}

/** A 7 × 7 finder pattern centered at (x, y) with its light separator, clipped to the symbol. */
function drawFinder(matrix: QrMatrix, x: number, y: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      const column = x + dx;
      const row = y + dy;
      if (column < 0 || column >= matrix.size || row < 0 || row >= matrix.size) continue;
      setFunction(matrix, column, row, distance !== 2 && distance !== 4);
    }
  }
}

/** Format information: 2 level bits and 3 mask bits, BCH(15,5) with generator 0x537, ^ 0x5412. */
export function formatBits(level: QrErrorCorrection, mask: QrMask): number {
  const data = (FORMAT_LEVEL_BITS[level] << 3) | mask;
  let remainder = data;
  for (let index = 0; index < 10; index++)
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  return ((data << 10) | remainder) ^ 0x5412;
}

/** Version information for versions 7 and above: 6 version bits, BCH(18,6) with generator 0x1F25. */
export function versionBits(version: number): number {
  let remainder = version;
  for (let index = 0; index < 12; index++)
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  return (version << 12) | remainder;
}

/** Writes both copies of the format information and the dark module. */
export function drawFormat(matrix: QrMatrix, level: QrErrorCorrection, mask: QrMask): void {
  const { size } = matrix;
  const bits = formatBits(level, mask);
  // Around the top-left finder.
  for (let index = 0; index <= 5; index++) setFunction(matrix, 8, index, bit(bits, index));
  setFunction(matrix, 8, 7, bit(bits, 6));
  setFunction(matrix, 8, 8, bit(bits, 7));
  setFunction(matrix, 7, 8, bit(bits, 8));
  for (let index = 9; index < 15; index++) setFunction(matrix, 14 - index, 8, bit(bits, index));
  // Beside the top-right and bottom-left finders.
  for (let index = 0; index < 8; index++)
    setFunction(matrix, size - 1 - index, 8, bit(bits, index));
  for (let index = 8; index < 15; index++)
    setFunction(matrix, 8, size - 15 + index, bit(bits, index));
  setFunction(matrix, 8, size - 8, true);
}

function drawVersion(matrix: QrMatrix, version: number): void {
  if (version < 7) return;
  const bits = versionBits(version);
  for (let index = 0; index < 18; index++) {
    const dark = bit(bits, index);
    const a = matrix.size - 11 + (index % 3);
    const b = Math.floor(index / 3);
    setFunction(matrix, a, b, dark);
    setFunction(matrix, b, a, dark);
  }
}

/**
 * Places codewords in the two-module-wide zigzag from the bottom-right corner, skipping the
 * vertical timing column and every function module; remainder bits stay light.
 */
export function placeCodewords(matrix: QrMatrix, codewords: readonly number[]): void {
  const { size, modules, reserved } = matrix;
  const total = codewords.length * 8;
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const x = right - offset;
        const at = y * size + x;
        if (reserved[at] || index >= total) continue;
        modules[at] = (codewords[index >>> 3]! >>> (7 - (index & 7))) & 1;
        index++;
      }
    }
  }
}
