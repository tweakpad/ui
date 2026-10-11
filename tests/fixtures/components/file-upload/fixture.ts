import type { TpFileUpload } from '../../../../src/components/file-upload/index.js';

const params = new URLSearchParams(location.search);
const built = params.has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';

const log = document.querySelector('#log')!;
const events: { id: string; type: string; detail: unknown }[] = [];
const diagnostics: unknown[] = [];
const record = (type: string) =>
  document.addEventListener(type, (event) => {
    const target = (event.composedPath()[0] as Element | undefined) ?? (event.target as Element);
    const id = (event.target as Element)?.id || target?.localName || '';
    const detail = (event as CustomEvent).detail as Record<string, unknown> | undefined;
    events.push({ id, type, detail });
    if (type === 'tp-diagnostic') diagnostics.push(detail);
    const summary =
      type === 'tp-value-change'
        ? `${detail?.reason} → [${((detail?.value as File[]) ?? []).map((f) => f.name).join(', ')}]`
        : type === 'tp-file-reject'
          ? ((detail?.rejections as { file: File; errors: { code: string }[] }[]) ?? [])
              .map((r) => `${r.file.name}:${r.errors.map((e) => e.code).join('+')}`)
              .join(', ')
          : type === 'tp-diagnostic'
            ? String(detail?.code)
            : '';
    log.textContent += `${id} ${type} ${summary}\n`;
  });
for (const type of [
  'tp-value-change',
  'tp-file-reject',
  'tp-file-retry',
  'tp-upload-start',
  'tp-upload-complete',
  'tp-upload-error',
  'tp-picker-cancel',
  'tp-diagnostic',
])
  record(type);

/** A File of a given byte size; content is zero-filled unless text is supplied. */
function makeFile(
  name: string,
  size = 1024,
  type = '',
  text?: string,
  lastModified = 1_700_000_000_000,
): File {
  return new File([text ?? new Uint8Array(size)], name, { type, lastModified });
}

/** A real PNG/JPEG/WebP with a diagonal gradient, so previews have visible content. */
async function makeImage(name: string, hue: number, type = 'image/png', size = 320): Promise<File> {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, `hsl(${hue} 70% 55%)`);
  gradient.addColorStop(1, `hsl(${(hue + 60) % 360} 70% 35%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  context.fillStyle = 'rgba(255,255,255,.35)';
  context.beginPath();
  context.arc(size * 0.7, size * 0.3, size * 0.12, 0, Math.PI * 2);
  context.fill();
  const blob = await canvas.convertToBlob({ type });
  return new File([blob], name, { type, lastModified: 1_700_000_000_000 + hue });
}

/** Dispatches a constructed drag sequence (API evidence only; real OS drags are not scriptable). */
/**
 * Dispatches a constructed paste carrying files (or text) at `target`; returns whether the
 * paste was taken (its default prevented). Real clipboard pastes go through the keyboard.
 */
function pasteFiles(target: EventTarget, files: File[], text = '') {
  const data = new DataTransfer();
  for (const file of files) data.items.add(file);
  if (text) data.setData('text/plain', text);
  const event = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    composed: true,
    clipboardData: data,
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

async function dropFiles(element: TpFileUpload, files: File[], { leave = false } = {}) {
  const zone = element.shadowRoot!.querySelector<HTMLElement>('[part~="file-upload-dropzone"]')!;
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  const fire = (type: string) =>
    zone.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: transfer,
      }),
    );
  const results = { enterAccepted: !fire('dragenter'), overAccepted: !fire('dragover') };
  await element.updateComplete;
  const states = {
    dropTarget: element.hasAttribute('data-drop-target'),
    dropReject: element.hasAttribute('data-drop-reject'),
    dropEffect: transfer.dropEffect,
  };
  if (leave) fire('dragleave');
  else fire('drop');
  await element.updateComplete;
  return { ...results, ...states, after: element.hasAttribute('data-drop-target') };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup() {
  await customElements.whenDefined('tp-file-upload');
  const $ = (id: string) => document.getElementById(id) as TpFileUpload;

  $('chips').value = [
    makeFile('Q4-report-final.pdf', 2.3 * 1024 ** 2, 'application/pdf'),
    await makeImage('team-photo.jpg', 200, 'image/jpeg'),
    makeFile(
      'budget-2025.xlsx',
      869.1 * 1024,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    makeFile(
      'meeting-notes.docx',
      152.3 * 1024,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ),
    makeFile(
      'logo-dark.svg',
      13.9 * 1024,
      'image/svg+xml',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#222"/></svg>',
    ),
  ];

  // Metadata extraction: a fake page count for PDFs, read from the byte size.
  $('documents').fileValidator = async (file) => {
    await wait(150);
    if (!file.name.toLowerCase().endsWith('.pdf')) return null;
    return {
      meta: { pages: Math.max(1, Math.round(file.size / 100_000)) },
      description: `${Math.max(1, Math.round(file.size / 100_000))} pages`,
    };
  };
  await $('documents').addFiles([
    makeFile('quarterly-report-q4-2025.pdf', 2.4 * 1024 ** 2, 'application/pdf'),
  ]);

  $('grid').value = await Promise.all(
    [
      'hero-banner.jpg',
      'product-shot.png',
      'team-photo.jpg',
      'office-interior.png',
      'Codex Image Aug 24, 2025, 09_14_11 PM.png',
    ].map((name, index) =>
      makeImage(name, index * 55, name.endsWith('.jpg') ? 'image/jpeg' : 'image/png'),
    ),
  );

  const uploads = $('uploads');
  uploads.uploader = (item, { signal, onProgress }) =>
    new Promise((resolve, reject) => {
      let loaded = 0;
      const total = item.file.size || 1;
      const timer = setInterval(() => {
        loaded = Math.min(total, loaded + total / 8);
        onProgress(loaded, total);
        if (loaded >= total) {
          clearInterval(timer);
          if (item.file.name.includes('fail') && !(item.meta as { retried?: boolean }).retried) {
            uploads.setItemState(item, { meta: { retried: true } });
            reject(new Error('Server returned 500'));
          } else resolve({ url: `/uploads/${item.file.name}` });
        }
      }, 250);
      signal.addEventListener('abort', () => {
        clearInterval(timer);
        reject(signal.reason);
      });
    });
  document
    .querySelector('#add-uploads')!
    .addEventListener('click', () =>
      uploads.addFiles([
        makeFile('dataset.parquet', 3 * 1024 ** 2),
        makeFile('will-fail.zip', 1024 ** 2, 'application/zip'),
        makeFile('readme.md', 4 * 1024, 'text/markdown'),
      ]),
    );
  document
    .querySelector('#cancel-uploads')!
    .addEventListener('click', () => uploads.cancelUpload());

  // Structure validation: the first CSV line must contain name, email and phone.
  $('csv').fileValidator = async (file, { signal }) => {
    const text = await file.text();
    if (signal.aborted) return null;
    const header = text
      .split(/\r?\n/, 1)[0]!
      .toLowerCase()
      .split(',')
      .map((cell) => cell.trim());
    const missing = ['name', 'email', 'phone'].filter((column) => !header.includes(column));
    if (missing.length)
      return { code: 'csv-columns', message: `Missing columns: ${missing.join(', ')}.` };
    const rows = text.trim().split(/\r?\n/).length - 1;
    return { meta: { rows }, description: `${rows} contacts` };
  };

  (document.querySelector('#form') as HTMLElement & { onFormSubmit?: unknown }).onFormSubmit = (
    values: Record<string, unknown>,
    details: { data?: FormData },
  ) => {
    const entries = [...(details.data?.entries() ?? [])].map(
      ([key, value]) => `${key}=${value instanceof File ? value.name : value}`,
    );
    log.textContent += `submit ${entries.join(' ')} values=${Object.keys(values).join(',')}\n`;
  };

  Object.assign(window, {
    fileUploadFixture: { makeFile, makeImage, dropFiles, pasteFiles, events, diagnostics, wait, $ },
  });
  document.documentElement.toggleAttribute('data-ready', true);
}

void (async () => {
  await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
  await setup();
})();
