import { applyMask, penaltyScore } from './mask.js';
import { createMatrix, drawFormat, drawFunctionPatterns, placeCodewords } from './matrix.js';
import { rsGenerator, rsRemainder } from './reed-solomon.js';
import {
  BitBuffer,
  countBits,
  makeSegment,
  modeIndicator,
  qrCapacity,
  segmentBits,
  type QrSegment,
} from './segments.js';
import {
  MAX_VERSION,
  MIN_VERSION,
  dataCodewords,
  eccCodewordsPerBlock,
  errorCorrectionBlocks,
  symbolSize,
  totalCodewords,
} from './tables.js';
import {
  QrCapacityError,
  type QrCode,
  type QrEncodeOptions,
  type QrErrorCorrection,
  type QrMask,
} from './types.js';

const LEVELS: readonly QrErrorCorrection[] = ['L', 'M', 'Q', 'H'];

/**
 * Encodes `text` as a QR Code Model 2 symbol (Foundation §18.21): one segment in the most compact
 * mode, the smallest version from `minVersion` to `maxVersion` that holds it at the requested
 * level, Reed-Solomon error correction per block with interleaving, and the mask with the
 * lowest penalty (or `mask`). Throws `QrCapacityError` when the value does not fit and a
 * `RangeError` for invalid options. Deterministic and DOM-free.
 */
export function encodeQr(text: string, options: QrEncodeOptions = {}): QrCode {
  const level = options.errorCorrection ?? 'M';
  const minVersion = options.minVersion ?? MIN_VERSION;
  const maxVersion = options.maxVersion ?? MAX_VERSION;
  const fixedMask = options.mask ?? 'auto';
  if (!LEVELS.includes(level))
    throw new RangeError(`Unknown error correction level: ${String(level)}`);
  if (!isVersion(minVersion) || !isVersion(maxVersion) || minVersion > maxVersion) {
    throw new RangeError(`Invalid version range: ${minVersion} to ${maxVersion}`);
  }
  if (fixedMask !== 'auto' && !(Number.isInteger(fixedMask) && fixedMask >= 0 && fixedMask <= 7)) {
    throw new RangeError(`Invalid mask: ${String(fixedMask)}`);
  }

  const segment = makeSegment(text);
  let version = minVersion;
  while (segmentBits(segment, version) > dataCodewords(version, level) * 8) {
    if (version === maxVersion) {
      throw new QrCapacityError(
        segment.mode,
        level,
        segment.count,
        qrCapacity(segment.mode, level, maxVersion),
        maxVersion,
      );
    }
    version++;
  }

  const data = assembleData(segment, version, level);

  const matrix = createMatrix(version);
  drawFunctionPatterns(matrix, version);
  placeCodewords(matrix, interleave(data, version, level));

  let mask: QrMask;
  if (fixedMask === 'auto') {
    mask = 0;
    let best = Infinity;
    for (let candidate = 0 as QrMask; candidate < 8; candidate = (candidate + 1) as QrMask) {
      applyMask(matrix, candidate);
      drawFormat(matrix, level, candidate);
      const penalty = penaltyScore(matrix.modules, matrix.size);
      if (penalty < best) {
        best = penalty;
        mask = candidate;
      }
      applyMask(matrix, candidate);
    }
  } else mask = fixedMask;
  applyMask(matrix, mask);
  drawFormat(matrix, level, mask);

  return Object.freeze({
    version,
    size: symbolSize(version),
    errorCorrection: level,
    mask,
    mode: segment.mode,
    modules: matrix.modules,
  });
}

/**
 * Data codewords of a segment in a version: mode indicator, character count, payload, a
 * terminator of up to four zero bits, zero bits to the byte boundary, then the alternating pad
 * codewords 0xEC and 0x11 up to the data capacity.
 */
export function assembleData(
  segment: QrSegment,
  version: number,
  level: QrErrorCorrection,
): number[] {
  const capacity = dataCodewords(version, level) * 8;
  const bits = new BitBuffer();
  bits.append(modeIndicator(segment.mode), 4);
  bits.append(segment.count, countBits(segment.mode, version));
  bits.bits.push(...segment.data.bits);
  bits.append(0, Math.min(4, capacity - bits.length));
  bits.append(0, (8 - (bits.length % 8)) % 8);
  const data = bits.toBytes();
  for (let pad = 0xec; data.length < capacity / 8; pad ^= 0xec ^ 0x11) data.push(pad);
  return data;
}

/** True when the module at column `x`, row `y` of `code` is dark. */
export function isDarkModule(code: QrCode, x: number, y: number): boolean {
  return (
    x >= 0 && y >= 0 && x < code.size && y < code.size && code.modules[y * code.size + x] === 1
  );
}

/**
 * Splits the data codewords into blocks (short blocks first), appends each block's error
 * correction codewords, and interleaves: data codeword i of every block, then error correction
 * codeword i of every block.
 */
export function interleave(
  data: readonly number[],
  version: number,
  level: QrErrorCorrection,
): number[] {
  const blockCount = errorCorrectionBlocks(version, level);
  const eccLength = eccCodewordsPerBlock(version, level);
  const total = totalCodewords(version);
  const shortBlocks = blockCount - (total % blockCount);
  const shortLength = Math.floor(total / blockCount);
  const generator = rsGenerator(eccLength);
  const blocks: number[][] = [];
  for (let block = 0, offset = 0; block < blockCount; block++) {
    const length = shortLength - eccLength + (block < shortBlocks ? 0 : 1);
    const chunk = data.slice(offset, offset + length);
    offset += length;
    const ecc = rsRemainder(chunk, generator);
    // Short blocks get a placeholder so every block has the same layout.
    if (block < shortBlocks) chunk.push(0);
    blocks.push([...chunk, ...ecc]);
  }
  const result: number[] = [];
  for (let index = 0; index < blocks[0]!.length; index++) {
    blocks.forEach((block, number) => {
      if (index !== shortLength - eccLength || number >= shortBlocks) result.push(block[index]!);
    });
  }
  return result;
}

function isVersion(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_VERSION && value <= MAX_VERSION;
}
