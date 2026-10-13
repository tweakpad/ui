import { markupExample, moduleExample } from './documentation-examples.js';
import { setupQrCodeExample } from './qr-code-example.js';
import setupSource from './qr-code-example.js?raw';

export const qrCodeExamples = [
  markupExample(
    'Connect a device',
    `<tp-card style="max-inline-size:calc(var(--tp-spacing) * 80)">` +
      `<h3 slot="header">Connect your phone</h3>` +
      `<p slot="description">Open the app on your phone and scan the code to pair this account.</p>` +
      `<tp-qr-code value="https://ledger.app/connect/jd-4829" label="Scan to connect your mobile device"></tp-qr-code>` +
      `<tp-button slot="footer" variant="secondary">Got it</tp-button>` +
      `</tp-card>`,
    'A Card around the code. The tile stays light in a dark theme.',
  ),
  markupExample(
    'Copy and download',
    `<tp-qr-code value="https://tweakpad.github.io/invite/42" label="Invite link" copyable downloadable filename="invite"></tp-qr-code>`,
    'Copy writes the image and the link in one clipboard item. Download offers PNG, SVG and JPG at `export-size` pixels (1024 by default).',
  ),
  moduleExample({
    title: 'Live value',
    id: 'qr-code-live',
    markup:
      `<div style="display:grid;gap:var(--tp-space-4);justify-items:start;max-inline-size:calc(var(--tp-spacing) * 80)">` +
      `<tp-field label="Link"><tp-input default-value="https://tweakpad.github.io"></tp-input></tp-field>` +
      `<tp-qr-code size="lg" error-correction="Q" label="Link"></tp-qr-code>` +
      `<tp-button variant="outline">Download 2048 px PNG</tp-button>` +
      `</div>`,
    setup: setupQrCodeExample,
    source: setupSource,
    call: `setupQrCodeExample(document.getElementById('qr-code-live'));`,
    description:
      'The code follows the field as you type. The button calls `download()` with a size of its own.',
  }),
  markupExample(
    'Sizes and colors',
    `<div style="display:flex;flex-wrap:wrap;align-items:end;gap:var(--tp-space-5)">` +
      `<tp-qr-code size="sm" value="https://tweakpad.github.io" label="Small"></tp-qr-code>` +
      `<tp-qr-code value="https://tweakpad.github.io" label="Default"></tp-qr-code>` +
      `<tp-qr-code size="lg" value="https://tweakpad.github.io" label="Large"></tp-qr-code>` +
      `<tp-qr-code value="https://tweakpad.github.io" label="Brand colors" error-correction="H" style="--tp-qr-code-size:12rem;--tp-qr-code-foreground:#3b2fc9;--tp-qr-code-background:#f4f2ff"></tp-qr-code>` +
      `</div>`,
    '`size` picks 128, 192 or 256 pixels; `--tp-qr-code-size` sets any size. The color variables change the screen and every export.',
  ),
];
