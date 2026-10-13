import type { PresentationDictionary } from '../resolver.js';

// The tile is bordered, rounded and light in every scheme, 192 px by default with the quiet zone
// inside. A scoped light color scheme resolves every light-dark() role inside it to its light
// value, as Media player scopes dark. The composed Copy button, Button, Menu and Button
// group recipes own the actions' paint.
export const qrCodeAppearance: PresentationDictionary = {
  'qr-code': [{ declarations: { gap: 'var(--tp-space-3)' } }],
  'qr-code-size-sm': [{ declarations: { '--_tp-qr-code-size': 'calc(var(--tp-spacing) * 32)' } }],
  'qr-code-size-default': [
    { declarations: { '--_tp-qr-code-size': 'calc(var(--tp-spacing) * 48)' } },
  ],
  'qr-code-size-lg': [{ declarations: { '--_tp-qr-code-size': 'calc(var(--tp-spacing) * 64)' } }],
  'qr-code-tile': [
    {
      declarations: {
        'color-scheme': 'light',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-xl)',
        'background-color': 'var(--tp-qr-code-background, var(--tp-background))',
      },
    },
  ],
  'qr-code-symbol': [
    { declarations: { color: 'var(--tp-qr-code-foreground, var(--tp-foreground))' } },
  ],
  'qr-code-background': [
    { declarations: { fill: 'var(--tp-qr-code-background, var(--tp-background))' } },
  ],
  'qr-code-modules': [{ declarations: { fill: 'currentColor' } }],
  'qr-code-actions': [],
  'qr-code-copy': [],
  'qr-code-download': [],
  'qr-code-download-trigger': [],
  'qr-code-download-item': [],
};
