/* Assertion helpers evaluated through Chrome DevTools MCP; each resolves to { checks, passed }. */
import type { TpQrCode } from '../../../../src/components/qr-code/index.js';
import type { QrCode, QrEncodeOptions } from '../../../../src/foundation/qr/index.js';

interface Check {
  readonly name: string;
  readonly pass: boolean;
  readonly actual: unknown;
}
interface Report {
  readonly checks: Check[];
  readonly passed: boolean;
}
interface Fixture {
  readonly encoder: {
    encodeQr(text: string, options?: QrEncodeOptions): QrCode;
    qrCapacity(mode: string, level: string, version?: number): number;
  };
  readonly events: { type: string; target: string; detail: Record<string, unknown> }[];
  readonly diagnostics: { target: string; detail: { code: string; message: string } }[];
  readonly downloads: { href: string; download: string; type: string; size: number }[];
}
interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}

const fixture = () => (window as unknown as { qrCodeAPI: Fixture }).qrCodeAPI;
const report = (checks: Check[]): Report => ({
  checks,
  passed: checks.every((check) => check.pass),
});
const check = (name: string, pass: boolean, actual: unknown): Check => ({ name, pass, actual });
const qr = (id: string) => document.getElementById(id) as unknown as TpQrCode;
const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function settle(target: TpQrCode): Promise<void> {
  await target.updateComplete;
  for (const nested of target.shadowRoot!.querySelectorAll<
    HTMLElement & { updateComplete?: Promise<unknown> }
  >('*'))
    if (nested.updateComplete) await nested.updateComplete;
  await frame();
}

async function make(attributes: Record<string, string | boolean>): Promise<TpQrCode> {
  const element = document.createElement('tp-qr-code') as TpQrCode;
  for (const [name, value] of Object.entries(attributes)) {
    if (value === true) element.setAttribute(name, '');
    else if (value !== false) element.setAttribute(name, value);
  }
  document.getElementById('dynamic')!.append(element);
  await settle(element);
  return element;
}

function detector(): Detector | null {
  const Detector = (
    window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }
  ).BarcodeDetector;
  return Detector ? new Detector({ formats: ['qr_code'] }) : null;
}

/** Paints an encoder result on a canvas at 4 px per module with a 4-module quiet zone. */
function paint(code: QrCode, scale = 4): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const side = (code.size + 8) * scale;
  canvas.width = canvas.height = side;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, side, side);
  context.fillStyle = '#000';
  for (let y = 0; y < code.size; y++)
    for (let x = 0; x < code.size; x++)
      if (code.modules[y * code.size + x])
        context.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale);
  return canvas;
}

async function decode(source: ImageBitmapSource): Promise<string | null> {
  const found = await detector()!.detect(source);
  return found[0]?.rawValue ?? null;
}

async function decodeBlob(
  blob: Blob,
): Promise<{ value: string | null; width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const value = await decode(bitmap);
  return { value, width: bitmap.width, height: bitmap.height };
}

async function decodeSvg(markup: string, size: number): Promise<string | null> {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.getContext('2d')!.drawImage(image, 0, 0, size, size);
    return decode(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The rendered shadow SVG, with its computed fills inlined, as a standalone document. */
function renderedSvg(element: TpQrCode): string {
  const symbol = element.shadowRoot!.querySelector('svg')!;
  const clone = symbol.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  for (const selector of ['.background', '.modules']) {
    const source = symbol.querySelector(selector);
    const target = clone.querySelector(selector);
    if (source && target) target.setAttribute('fill', getComputedStyle(source).fill);
  }
  return new XMLSerializer().serializeToString(clone);
}

/** A value of `length` characters in `mode`, varied so no long repetitive run forms. */
function filler(mode: 'numeric' | 'alphanumeric' | 'byte', length: number): string {
  const alphabet =
    mode === 'numeric'
      ? '0123456789'
      : mode === 'alphanumeric'
        ? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
        : 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~!*';
  return Array.from({ length }, (_, index) => alphabet[(index * 7919 + 13) % alphabet.length]).join(
    '',
  );
}

/**
 * V-07: the encoder round-trips through Chrome's barcode detector: sample values in every mode
 * and level at their natural version, every version 1–40 at every level filled with real data
 * (each block structure), all eight masks, and the rendered on-screen symbols.
 */
export async function assertRoundTrip(): Promise<Report> {
  const checks: Check[] = [];
  if (!detector()) return report([check('BarcodeDetector available', false, 'missing')]);
  const { encodeQr, qrCapacity } = fixture().encoder;
  const levels = ['L', 'M', 'Q', 'H'] as const;
  const samples: [string, string][] = [
    ['numeric', '0123456789'],
    ['alphanumeric', 'HELLO WORLD $%*+-./:'],
    ['byte', 'https://tweakpad.github.io/qr?x=1&y=2'],
    ['utf-8', 'Grüße · こんにちは · 😀'],
  ];
  for (const [mode, value] of samples)
    for (const level of levels) {
      const code = encodeQr(value, { errorCorrection: level });
      checks.push(
        check(
          `${mode} ${level} (v${code.version})`,
          (await decode(paint(code))) === value,
          code.version,
        ),
      );
    }
  for (const level of levels)
    for (let version = 1; version <= 40; version++) {
      const value = filler('byte', qrCapacity('byte', level, version));
      const code = encodeQr(value, { errorCorrection: level });
      const decoded = await decode(paint(code, version > 30 ? 3 : 4));
      checks.push(
        check(
          `byte capacity ${level} v${version}`,
          code.version === version && decoded === value,
          code.version,
        ),
      );
    }
  for (const mode of ['numeric', 'alphanumeric'] as const)
    for (const [level, version] of [
      ['L', 1],
      ['M', 9],
      ['Q', 10],
      ['H', 26],
      ['M', 27],
      ['L', 40],
    ] as const) {
      const value = filler(mode, qrCapacity(mode, level, version));
      const code = encodeQr(value, { errorCorrection: level });
      checks.push(
        check(
          `${mode} capacity ${level} v${version}`,
          code.version === version && (await decode(paint(code, 3))) === value,
          code.version,
        ),
      );
    }
  for (const mask of [0, 1, 2, 3, 4, 5, 6, 7] as const)
    for (const version of [1, 7, 23, 40]) {
      const value = filler('byte', qrCapacity('byte', 'Q', version));
      const code = encodeQr(value, { mask, errorCorrection: 'Q' });
      checks.push(
        check(
          `mask ${mask} v${version}`,
          code.mask === mask && (await decode(paint(code, 3))) === value,
          code.mask,
        ),
      );
    }
  for (const id of ['basic', 'actions', 'colors', 'rtl']) {
    const element = qr(id);
    checks.push(
      check(
        `rendered #${id} decodes`,
        (await decodeSvg(renderedSvg(element), 640)) === element.value,
        id,
      ),
    );
  }
  return report(checks);
}

/** V-08, V-19 (exports): files, sizes, colors and decodes. */
export async function assertExports(): Promise<Report> {
  const checks: Check[] = [];
  const element = qr('basic');
  for (const format of ['png', 'jpeg'] as const)
    for (const size of [1024, 333, 100, 2048]) {
      const blob = (await element.toBlob(format, { size }))!;
      const { value, width, height } = await decodeBlob(blob);
      checks.push(
        check(
          `${format} ${size}px: type, exact size, decodes`,
          blob.type === `image/${format}` &&
            width === size &&
            height === size &&
            value === element.value,
          { type: blob.type, width, value },
        ),
      );
    }
  // Whole-pixel modules: at 333 px a 29-module v3 symbol (37 with the quiet zone) is 9 px per module.
  const png = (await element.toBlob('png', { size: 333 }))!;
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 333;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0);
  const extent = element.moduleCount! + 8;
  const module = Math.floor(333 / extent);
  const origin = Math.floor((333 - module * extent) / 2) + 4 * module;
  const pixel = (x: number, y: number) => context.getImageData(x, y, 1, 1).data[0]!;
  const sharp = [...Array(element.moduleCount!).keys()].every((index) => {
    const x = origin + index * module;
    return pixel(x, origin + 1) === pixel(x + module - 1, origin + 1);
  });
  checks.push(
    check(
      'PNG modules are whole pixels without anti-aliasing',
      sharp && pixel(origin, origin) < 40,
      { module, origin },
    ),
  );
  checks.push(
    check(
      'quiet zone is light',
      pixel(origin - 1, origin - 1) > 240,
      pixel(origin - 1, origin - 1),
    ),
  );
  const jpeg = (await element.toBlob('jpeg', { size: 200 }))!;
  const jpegBitmap = await createImageBitmap(jpeg);
  context.clearRect(0, 0, 333, 333);
  context.drawImage(jpegBitmap, 0, 0);
  checks.push(
    check(
      'JPEG is opaque',
      context.getImageData(1, 1, 1, 1).data[3] === 255,
      context.getImageData(1, 1, 1, 1).data[3],
    ),
  );
  const svgBlob = (await element.toBlob('svg', { size: 512 }))!;
  const text = await svgBlob.text();
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
  checks.push(
    check(
      'SVG export is a standalone document of the size, titled by the label',
      svgBlob.type === 'image/svg+xml' &&
        parsed.getAttribute('width') === '512' &&
        parsed.querySelector('title')?.textContent === 'Tweakpad UI' &&
        !!parsed.querySelector('path')?.getAttribute('fill'),
      { width: parsed.getAttribute('width'), title: parsed.querySelector('title')?.textContent },
    ),
  );
  checks.push(check('SVG export decodes', (await decodeSvg(text, 512)) === element.value, null));
  checks.push(check('toSVG matches the SVG blob', element.toSVG({ size: 512 }) === text, null));
  checks.push(
    check(
      'default export size is 1024',
      (await decodeBlob((await element.toBlob())!)).width === 1024,
      null,
    ),
  );
  const before = fixture().diagnostics.length;
  const clampedSmall = (await decodeBlob((await element.toBlob('png', { size: 10 }))!)).width;
  const clampedLarge = (await decodeBlob((await element.toBlob('png', { size: 9999 }))!)).width;
  const clampDiagnostics = fixture()
    .diagnostics.slice(before)
    .filter((entry) => entry.detail.code === 'qr-code-export-size');
  checks.push(
    check(
      'sizes clamp to the module count and 4096 with a diagnostic',
      clampedSmall === extent && clampedLarge === 4096 && clampDiagnostics.length >= 1,
      { clampedSmall, clampedLarge },
    ),
  );
  const empty = qr('empty');
  checks.push(
    check(
      'exports resolve null while empty',
      (await empty.toBlob('png')) === null && empty.toSVG() === null,
      null,
    ),
  );
  const colored = qr('colors');
  const coloredSvg = colored.toSVG()!;
  checks.push(
    check(
      'exports use the custom colors',
      coloredSvg.includes('fill="#3b2fc9"') && coloredSvg.includes('fill="#f4f2ff"'),
      coloredSvg.slice(0, 0),
    ),
  );
  const parts = qr('parts').toSVG()!;
  checks.push(
    check('exports use colors set through ::part', parts.includes('fill="#c80000"'), null),
  );
  return report(checks);
}

/** V-09: properties, defaults, statuses and diagnostics. */
export async function assertProperties(): Promise<Report> {
  const checks: Check[] = [];
  const element = await make({});
  checks.push(
    check(
      'defaults',
      element.value === '' &&
        element.errorCorrection === 'M' &&
        element.quietZone === 4 &&
        element.size === 'default' &&
        !element.copyable &&
        !element.downloadable &&
        element.exportSize === 1024 &&
        element.filename === 'qr-code' &&
        element.label === '',
      { level: element.errorCorrection, size: element.getAttribute('size') },
    ),
  );
  checks.push(
    check(
      'size reflects',
      element.getAttribute('size') === 'default',
      element.getAttribute('size'),
    ),
  );
  checks.push(
    check(
      'empty status',
      element.status === 'empty' &&
        element.dataset.status === 'empty' &&
        element.version === null &&
        element.moduleCount === null,
      element.dataset.status,
    ),
  );
  const tile = () =>
    element.shadowRoot!.querySelector<HTMLElement>('[part~="tile"]')!.getBoundingClientRect().width;
  const emptySide = tile();
  element.value = 'HELLO WORLD';
  await settle(element);
  checks.push(
    check(
      'encoded status, version and module count',
      element.status === 'encoded' &&
        element.dataset.status === 'encoded' &&
        element.version === 1 &&
        element.moduleCount === 21,
      { version: element.version },
    ),
  );
  element.errorCorrection = 'H';
  element.value = 'https://tweakpad.github.io/a/much/longer/link/that/needs/more/modules';
  await settle(element);
  checks.push(
    check('tile keeps its size across versions', tile() === emptySide && element.version! > 3, {
      side: tile(),
      version: element.version,
    }),
  );
  const before = fixture().diagnostics.length;
  element.errorCorrection = 'X' as never;
  element.quietZone = -2;
  await settle(element);
  const codes = fixture()
    .diagnostics.slice(before)
    .map((entry) => entry.detail.code);
  const viewBox = element.shadowRoot!.querySelector('svg')!.getAttribute('viewBox');
  checks.push(
    check(
      'invalid level and quiet zone fall back with diagnostics',
      codes.includes('qr-code-error-correction') &&
        codes.includes('qr-code-quiet-zone') &&
        viewBox === `0 0 ${element.moduleCount! + 8} ${element.moduleCount! + 8}`,
      { codes, viewBox },
    ),
  );
  element.errorCorrection = 'M';
  element.quietZone = 0;
  await settle(element);
  checks.push(
    check(
      'quiet zone 0 removes the border',
      element.shadowRoot!.querySelector('svg')!.getAttribute('viewBox') ===
        `0 0 ${element.moduleCount} ${element.moduleCount}`,
      null,
    ),
  );
  const overflow = qr('overflow');
  const capacity = fixture().diagnostics.find(
    (entry) => entry.target === 'tp-qr-code#overflow' && entry.detail.code === 'qr-code-capacity',
  );
  checks.push(
    check(
      'over capacity: error status, background only, capacity diagnostic with the limit',
      overflow.status === 'error' &&
        overflow.dataset.status === 'error' &&
        !overflow.shadowRoot!.querySelector('[part~="modules"]') &&
        !!overflow.shadowRoot!.querySelector('[part~="background"]') &&
        !!capacity?.detail.message.includes('2331'),
      capacity?.detail.message,
    ),
  );
  element.remove();
  return report(checks);
}

/** V-10: downloads, cancellation, names and the failure path. */
export async function assertDownload(): Promise<Report> {
  const checks: Check[] = [];
  const { downloads, events } = fixture();
  const element = qr('actions');
  const start = downloads.length;
  const eventStart = events.length;
  checks.push(check('download png resolves true', await element.download('png'), null));
  await sleep(50);
  const png = downloads[start];
  checks.push(
    check(
      'file named filename.png with a PNG blob',
      png?.download === 'invite.png' && png.type === 'image/png' && png.size > 0,
      png,
    ),
  );
  const detail = events.slice(eventStart).find((entry) => entry.type === 'tp-download')?.detail;
  checks.push(
    check(
      'tp-download detail',
      detail?.format === 'png' && detail.size === 1024 && detail.filename === 'invite.png',
      detail,
    ),
  );
  await element.download('jpeg', { filename: 'poster.JPG', size: 300 });
  await element.download('svg', { filename: '  ' });
  await sleep(50);
  checks.push(
    check(
      'jpeg keeps an existing extension; an empty name falls back',
      downloads[start + 1]?.download === 'poster.JPG' &&
        downloads[start + 1]?.type === 'image/jpeg' &&
        downloads[start + 2]?.download === 'qr-code.svg' &&
        downloads[start + 2]?.type === 'image/svg+xml',
      downloads.slice(start + 1),
    ),
  );
  const cancel = (event: Event) => event.preventDefault();
  element.addEventListener('tp-download', cancel, { once: true });
  const canceled = await element.download('png');
  checks.push(
    check(
      'canceling tp-download skips the file',
      !canceled && downloads.length === start + 3,
      downloads.length,
    ),
  );
  const original = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
    callback(null);
  };
  const errorStart = events.length;
  let failed: boolean;
  try {
    failed = await element.download('png');
  } finally {
    HTMLCanvasElement.prototype.toBlob = original;
  }
  const error = events.slice(errorStart).find((entry) => entry.type === 'tp-download-error');
  await sleep(200);
  const live = [...document.querySelectorAll('[aria-live]')]
    .map((region) => region.textContent)
    .join(' ');
  checks.push(
    check(
      'a failed export reports tp-download-error and announces (simulated canvas failure)',
      !failed && !!error && 'error' in error.detail && live.includes('Download failed'),
      { live },
    ),
  );
  checks.push(
    check('no download while empty', (await qr('empty').download('png')) === false, null),
  );
  return report(checks);
}

/** V-12: copy proposals and the method without the button. */
export async function assertCopy(): Promise<Report> {
  const checks: Check[] = [];
  const { events } = fixture();
  const element = qr('copy-only');
  const start = events.length;
  element.addEventListener('tp-copy', (event) => event.preventDefault(), { once: true });
  const result = await element.copy();
  const types = events.slice(start).map((entry) => entry.type);
  checks.push(
    check(
      'canceling tp-copy skips the write',
      result === false && types.join() === 'tp-copy',
      types,
    ),
  );
  const empty = qr('empty');
  const emptyStart = events.length;
  checks.push(
    check(
      'copy resolves false without events while empty',
      (await empty.copy()) === false && events.length === emptyStart,
      null,
    ),
  );
  const basic = qr('basic');
  const basicStart = events.length;
  await basic.copy();
  const sequence = events.slice(basicStart).filter((entry) => entry.target === 'tp-qr-code#basic');
  checks.push(
    check(
      'without the button copy() still proposes and reports',
      sequence[0]?.type === 'tp-copy' &&
        ['tp-copied', 'tp-copy-error'].includes(sequence[1]?.type ?? ''),
      sequence.map((entry) => entry.type),
    ),
  );
  return report(checks);
}

/** V-14, V-15: actions, independence, disabled state and semantics. */
export async function assertActions(): Promise<Report> {
  const checks: Check[] = [];
  const parts = (id: string) =>
    [...qr(id).shadowRoot!.querySelectorAll('[part]')].flatMap((node) =>
      node.getAttribute('part')!.split(/\s+/u),
    );
  checks.push(check('no actions by default', !parts('basic').includes('actions'), parts('basic')));
  checks.push(
    check(
      'copyable alone',
      parts('copy-only').includes('copy') && !parts('copy-only').includes('download'),
      parts('copy-only'),
    ),
  );
  checks.push(
    check(
      'downloadable alone',
      parts('download-only').includes('download') && !parts('download-only').includes('copy'),
      parts('download-only'),
    ),
  );
  const actions = qr('actions').shadowRoot!;
  const items = [...actions.querySelectorAll('[part~="download-item"]')].map((item) => [
    item.getAttribute('value'),
    item.textContent?.trim(),
  ]);
  checks.push(
    check(
      'items PNG, SVG, JPG in order',
      JSON.stringify(items) ===
        JSON.stringify([
          ['png', 'PNG'],
          ['svg', 'SVG'],
          ['jpeg', 'JPG'],
        ]),
      items,
    ),
  );
  const group = actions.querySelector('tp-button-group') as HTMLElement & {
    label: string;
    joined: boolean;
  };
  checks.push(
    check(
      'actions group is named and not joined',
      group.label === 'QR code actions' && group.joined === false,
      group.label,
    ),
  );
  const menu = actions.querySelector('tp-menu') as HTMLElement & { portal: boolean };
  checks.push(check('menu renders in place', menu.portal === false, menu.portal));
  const disabled = (id: string) => {
    const root = qr(id).shadowRoot!;
    return [
      (root.querySelector('tp-copy-button') as HTMLElement & { disabled: boolean }).disabled,
      (root.querySelector('[part~="download-trigger"]') as HTMLElement & { disabled: boolean })
        .disabled,
    ];
  };
  checks.push(
    check(
      'actions disabled while empty or over capacity',
      disabled('empty').every(Boolean) &&
        disabled('overflow').every(Boolean) &&
        !disabled('actions').some(Boolean),
      { empty: disabled('empty'), actions: disabled('actions') },
    ),
  );
  const svg = qr('basic').shadowRoot!.querySelector('svg')!;
  checks.push(
    check(
      'symbol is an image named by the label',
      svg.getAttribute('role') === 'img' && svg.getAttribute('aria-label') === 'Tweakpad UI',
      svg.getAttribute('aria-label'),
    ),
  );
  const unnamed = await make({ value: 'x' });
  checks.push(
    check(
      'without a label the QR code message names it',
      unnamed.shadowRoot!.querySelector('svg')!.getAttribute('aria-label') === 'QR code',
      null,
    ),
  );
  unnamed.messages = { qrCode: 'Código QR', actions: 'Acciones', download: 'Descargar' };
  unnamed.downloadable = true;
  await settle(unnamed);
  checks.push(
    check(
      'messages replace the built-in strings',
      unnamed.shadowRoot!.querySelector('svg')!.getAttribute('aria-label') === 'Código QR' &&
        unnamed
          .shadowRoot!.querySelector('[part~="download-trigger"]')!
          .textContent!.includes('Descargar'),
      null,
    ),
  );
  unnamed.remove();
  const hidden = qr('empty').shadowRoot!.querySelector('svg')!;
  checks.push(
    check(
      'empty symbol is hidden from assistive technology',
      hidden.getAttribute('aria-hidden') === 'true' && !hidden.hasAttribute('role'),
      null,
    ),
  );
  const rtl = qr('rtl').shadowRoot!.querySelector('svg')!;
  checks.push(
    check(
      'right to left keeps the symbol unmirrored',
      getComputedStyle(rtl).direction === 'ltr' &&
        rtl.querySelector('path')!.getAttribute('d') ===
          qr('basic').shadowRoot!.querySelector('path')!.getAttribute('d'),
      null,
    ),
  );
  return report(checks);
}

/** V-19, V-20: sizes, the size variable, narrow containers, colors and contrast. */
export async function assertPresentation(): Promise<Report> {
  const checks: Check[] = [];
  const side = (id: string) =>
    qr(id).shadowRoot!.querySelector<HTMLElement>('[part~="tile"]')!.getBoundingClientRect().width;
  checks.push(
    check(
      'sizes 128, 192, 256',
      side('sm') === 128 && side('default') === 192 && side('lg') === 256,
      [side('sm'), side('default'), side('lg')],
    ),
  );
  checks.push(
    check('--tp-qr-code-size from an ancestor', side('variable') === 200, side('variable')),
  );
  checks.push(check('never wider than its container', side('narrowed') <= 100, side('narrowed')));
  const tile = qr('basic').shadowRoot!.querySelector<HTMLElement>('[part~="tile"]')!;
  const style = getComputedStyle(tile);
  checks.push(
    check(
      'tile is square, bordered and rounded',
      tile.getBoundingClientRect().height === tile.getBoundingClientRect().width &&
        style.borderTopWidth === '1px' &&
        parseFloat(style.borderTopLeftRadius) > 0,
      { radius: style.borderTopLeftRadius },
    ),
  );
  const modules = getComputedStyle(
    qr('basic').shadowRoot!.querySelector('[part~="modules"]')!,
  ).fill;
  const background = getComputedStyle(
    qr('basic').shadowRoot!.querySelector('[part~="background"]')!,
  ).fill;
  checks.push(
    check(
      'light-scheme colors in the current scheme',
      modules === 'rgb(24, 24, 27)' && background === 'rgb(255, 255, 255)',
      { modules, background },
    ),
  );
  const contrastStart = fixture().diagnostics.length;
  const faint = await make({ value: 'faint', id: 'faint' });
  faint.style.setProperty('--tp-qr-code-foreground', '#cccccc');
  faint.value = 'faint modules';
  await settle(faint);
  const inverted = await make({ value: 'inverted', id: 'inverted' });
  inverted.style.setProperty('--tp-qr-code-foreground', '#ffffff');
  inverted.style.setProperty('--tp-qr-code-background', '#000000');
  inverted.value = 'inverted modules';
  await settle(inverted);
  const contrast = fixture()
    .diagnostics.slice(contrastStart)
    .filter((entry) => entry.detail.code === 'qr-code-contrast');
  faint.remove();
  inverted.remove();
  checks.push(
    check(
      'low contrast and inverted colors report diagnostics',
      contrast.length === 2 && contrast[1]!.detail.message.includes('lighter'),
      contrast.map((entry) => entry.detail.message),
    ),
  );
  const colors = getComputedStyle(
    qr('colors').shadowRoot!.querySelector('[part~="modules"]')!,
  ).fill;
  checks.push(check('color variables reach the modules', colors === 'rgb(59, 47, 201)', colors));
  const override = await make({ value: 'dictionary' });
  override.partPresentation = {
    'qr-code-modules': { styleHook: { fill: 'rgb(0, 120, 0)' } },
  } as never;
  await settle(override);
  const fill = getComputedStyle(override.shadowRoot!.querySelector('[part~="modules"]')!).fill;
  checks.push(
    check(
      'partPresentation reaches the modules and the export',
      fill === 'rgb(0, 120, 0)' && override.toSVG()!.includes('fill="#007800"'),
      fill,
    ),
  );
  override.remove();
  return report(checks);
}

/** V-23: removal and reinsertion. */
export async function assertLifecycle(): Promise<Report> {
  const checks: Check[] = [];
  const element = await make({ value: 'lifecycle', copyable: true, downloadable: true });
  const parent = element.parentElement!;
  element.remove();
  await frame();
  parent.append(element);
  await settle(element);
  checks.push(
    check(
      'reconnects with its symbol and actions',
      element.status === 'encoded' &&
        !!element.shadowRoot!.querySelector('[part~="modules"]') &&
        !!element.shadowRoot!.querySelector('tp-copy-button'),
      element.status,
    ),
  );
  element.remove();
  return report(checks);
}
