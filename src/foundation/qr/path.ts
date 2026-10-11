import type { QrCode } from './types.js';

/**
 * SVG path data drawing every dark module of `code` as horizontal runs, offset by `quietZone`
 * modules, in a coordinate space of one unit per module (`size + 2 × quietZone` per side).
 */
export function qrPathData(code: QrCode, quietZone = 0): string {
  const { size, modules } = code;
  let path = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!modules[y * size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && modules[y * size + x]) x++;
      const run = x - start;
      path += `M${start + quietZone} ${y + quietZone}h${run}v1h-${run}z`;
    }
  }
  return path;
}
