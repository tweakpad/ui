import type { QrMatrix } from './matrix.js';
import type { QrMask } from './types.js';

/** The eight data mask conditions of ISO/IEC 18004 Table 10 (x is the column, y the row). */
export function maskCondition(mask: QrMask, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/** Inverts every non-function module where the mask condition holds; applying it twice undoes it. */
export function applyMask(matrix: QrMatrix, mask: QrMask): void {
  const { size, modules, reserved } = matrix;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const at = y * size + x;
      if (!reserved[at] && maskCondition(mask, x, y)) modules[at]! ^= 1;
    }
  }
}

export const PENALTY_N1 = 3;
export const PENALTY_N2 = 3;
export const PENALTY_N3 = 40;
export const PENALTY_N4 = 10;

/**
 * Penalty score of a symbol under the four ISO/IEC 18004 rules: N1 for each run of five or more
 * same-color modules in a row or column (3, plus 1 per module beyond five); N2 for each 2 × 2
 * block of one color; N3 for each 1:1:3:1:1 finder-like pattern with four light modules on a
 * side, the area outside the symbol counting as light; N4 for each 5 % step of the dark
 * proportion away from half.
 */
export function penaltyScore(modules: Uint8Array, size: number): number {
  let score = 0;
  const at = (x: number, y: number) => modules[y * size + x]!;
  for (let line = 0; line < size; line++) {
    score += linePenalty(size, (index) => at(index, line));
    score += linePenalty(size, (index) => at(line, index));
  }
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = at(x, y);
      if (color === at(x + 1, y) && color === at(x, y + 1) && color === at(x + 1, y + 1)) {
        score += PENALTY_N2;
      }
    }
  }
  let dark = 0;
  for (const module of modules) dark += module;
  const total = size * size;
  const steps = Math.max(0, Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1);
  return score + steps * PENALTY_N4;
}

/** N1 and N3 for one row or column; exported for tests. */
export function linePenalty(size: number, module: (index: number) => number): number {
  let score = 0;
  let color = 0;
  let run = 0;
  // Lengths of the latest runs, most recent first; the first run is preceded by light border.
  const history = [0, 0, 0, 0, 0, 0, 0];
  const push = (length: number) => {
    if (history[0] === 0) length += size;
    history.pop();
    history.unshift(length);
  };
  for (let index = 0; index < size; index++) {
    if (module(index) === color) {
      run++;
      if (run === 5) score += PENALTY_N1;
      else if (run > 5) score++;
    } else {
      push(run);
      if (!color) score += finderPatterns(history) * PENALTY_N3;
      color = module(index);
      run = 1;
    }
  }
  // Close the line against the light border after it.
  if (color) {
    push(run);
    run = 0;
  }
  push(run + size);
  return score + finderPatterns(history) * PENALTY_N3;
}

/** Counts dark-light-dark×3-light-dark patterns with four light modules before or after them. */
function finderPatterns(history: readonly number[]): number {
  const unit = history[1]!;
  const core =
    unit > 0 &&
    history[2] === unit &&
    history[3] === unit * 3 &&
    history[4] === unit &&
    history[5] === unit;
  return (
    (core && history[0]! >= unit * 4 && history[6]! >= unit ? 1 : 0) +
    (core && history[6]! >= unit * 4 && history[0]! >= unit ? 1 : 0)
  );
}
