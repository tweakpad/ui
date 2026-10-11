/** Error correction level: restores about 7 (L), 15 (M), 25 (Q) or 30 (H) percent of codewords. */
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** Encoding mode of the single data segment. */
export type QrMode = 'numeric' | 'alphanumeric' | 'byte';

/** Data mask pattern number. */
export type QrMask = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface QrEncodeOptions {
  /** Error correction level; `M` by default. */
  readonly errorCorrection?: QrErrorCorrection;
  /** Smallest version to use, 1 to 40; 1 by default. */
  readonly minVersion?: number;
  /** Largest version to use, 1 to 40; 40 by default. */
  readonly maxVersion?: number;
  /** A fixed mask, or `auto` (default) for the lowest penalty. */
  readonly mask?: QrMask | 'auto';
}

/** An encoded QR Code Model 2 symbol. */
export interface QrCode {
  readonly version: number;
  /** Modules per side, without the quiet zone: 4 × version + 17. */
  readonly size: number;
  readonly errorCorrection: QrErrorCorrection;
  readonly mask: QrMask;
  readonly mode: QrMode;
  /** Row-major modules, `size × size`; 1 is dark. */
  readonly modules: Uint8Array;
}

/** Thrown by `encodeQr` when the value does not fit the largest allowed version. */
export class QrCapacityError extends RangeError {
  readonly code = 'qr-capacity';
  constructor(
    readonly mode: QrMode,
    readonly errorCorrection: QrErrorCorrection,
    /** Characters (numeric, alphanumeric) or UTF-8 bytes (byte) in the value. */
    readonly length: number,
    /** The most the mode holds at this level in the largest allowed version. */
    readonly capacity: number,
    readonly maxVersion: number,
  ) {
    super(
      `QR code value is too long: ${mode} mode at level ${errorCorrection} holds at most ` +
        `${capacity} ${mode === 'byte' ? 'bytes' : 'characters'} in version ${maxVersion}; ` +
        `this value has ${length}.`,
    );
    this.name = 'QrCapacityError';
  }
}
