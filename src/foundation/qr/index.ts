/**
 * QR Code Model 2 encoding (Foundation §18.21), DOM-free; published as `@tweakpad/ui/qr`.
 */
export { encodeQr, isDarkModule } from './encode.js';
export { qrPathData } from './path.js';
export { qrCapacity, qrSegmentMode } from './segments.js';
export {
  MAX_VERSION as QR_MAX_VERSION,
  MIN_VERSION as QR_MIN_VERSION,
  symbolSize as qrSymbolSize,
} from './tables.js';
export {
  QrCapacityError,
  type QrCode,
  type QrEncodeOptions,
  type QrErrorCorrection,
  type QrMask,
  type QrMode,
} from './types.js';
