import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { qrCodeAppearance } from '../recipes/qr-code.js';

const definition: ComponentDefinition = {
  name: 'QR code',
  tagName: 'tp-qr-code',
  kind: 'preset-composition',
  axes: [{ name: 'size', values: ['sm', 'default', 'lg'], default: 'default' }],
  parts: [
    { name: 'qr-code', axes: ['size'] },
    { name: 'qr-code-tile' },
    { name: 'qr-code-symbol' },
    { name: 'qr-code-background' },
    { name: 'qr-code-modules' },
    { name: 'qr-code-actions' },
    { name: 'qr-code-copy' },
    { name: 'qr-code-download' },
    { name: 'qr-code-download-trigger' },
    { name: 'qr-code-download-item' },
  ],
};

export const qrCodePresentation = definePresentation({
  definition,
  bindings: {
    'tp-qr-code': {
      ':host': 'qr-code',
      "[part~='tile']": 'qr-code-tile',
      "[part~='symbol']": 'qr-code-symbol',
      "[part~='background']": 'qr-code-background',
      "[part~='modules']": 'qr-code-modules',
      "[part~='actions']": 'qr-code-actions',
      "[part~='copy']": 'qr-code-copy',
      "[part~='download']": 'qr-code-download',
      "[part~='download-trigger']": 'qr-code-download-trigger',
      "[part~='download-item']": 'qr-code-download-item',
    },
  },
  sources: [qrCodeAppearance],
});
