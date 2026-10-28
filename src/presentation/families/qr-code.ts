import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { qrCodeAppearance } from '../recipes/qr-code.js';

const definition: ComponentDefinition = {
  name: 'QR code',
  tagName: 'tp-qr-code',
  kind: 'preset-composition',
  axes: [{ name: 'size', values: ['sm', 'default', 'lg'], default: 'default' }],
  parts: [
    { name: 'qr-code', axes: ['size'], description: 'The host; `size` sets the side of its tile.' },
    { name: 'qr-code-tile', description: 'The square light surface.' },
    { name: 'qr-code-symbol', description: 'The image of the code, named by `label`.' },
    {
      name: 'qr-code-background',
      description: 'The light fill of the symbol, quiet zone included.',
    },
    { name: 'qr-code-modules', description: 'The dark modules.' },
    { name: 'qr-code-actions', description: 'The Button group of the actions.' },
    { name: 'qr-code-copy', description: 'The Copy button.' },
    { name: 'qr-code-download', description: 'The download Menu.' },
    { name: 'qr-code-download-trigger', description: 'The Button that opens the download Menu.' },
    { name: 'qr-code-download-item', description: 'A format item of the download Menu.' },
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
