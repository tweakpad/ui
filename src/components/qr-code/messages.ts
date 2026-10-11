/** Built-in strings of the QR code; each falls back to English. */
export interface QrCodeMessages {
  /** Accessible name of the symbol when `label` is empty. */
  readonly qrCode?: string;
  /** Accessible name of the actions group. */
  readonly actions?: string;
  readonly copy?: string;
  readonly copied?: string;
  readonly copyFailed?: string;
  /** Text of the download menu trigger and name of the menu. */
  readonly download?: string;
  readonly downloadPng?: string;
  readonly downloadSvg?: string;
  readonly downloadJpeg?: string;
  /** Announced when an export for a download fails. */
  readonly downloadFailed?: string;
}

export const DEFAULT_QR_CODE_MESSAGES: Required<QrCodeMessages> = {
  qrCode: 'QR code',
  actions: 'QR code actions',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy failed',
  download: 'Download',
  downloadPng: 'PNG',
  downloadSvg: 'SVG',
  downloadJpeg: 'JPG',
  downloadFailed: 'Download failed',
};
