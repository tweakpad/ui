/**
 * Application code around File upload: validators that check structure and extract metadata,
 * an upload adapter, and a server-side rejection. The component never uploads by itself.
 */

/** Counts PDF pages by their page objects; good enough for a hint, not a PDF parser. */
async function pdfPages(file, signal) {
  const text = await file.slice(0, Math.min(file.size, 8 * 1024 * 1024)).text();
  if (signal.aborted) return 0;
  return (text.match(/\/Type\s*\/Page(?!s)\b/g) ?? []).length;
}

/** Rejects files that are not PDF documents and reports their page count. */
export async function documentValidator(file, { signal }) {
  if (!file.name.toLowerCase().endsWith('.pdf')) return null;
  const head = await file.slice(0, 5).text();
  if (head !== '%PDF-') return { code: 'pdf-signature', message: 'This file is not a valid PDF.' };
  const pages = await pdfPages(file, signal);
  return pages
    ? { meta: { pages }, description: pages === 1 ? '1 page' : `${pages} pages` }
    : { meta: { pages: 0 } };
}

/** Requires name, email and phone columns in a CSV, and a JSON array of objects with an id. */
export async function importValidator(file) {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.json')) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { code: 'json-syntax', message: 'This file is not valid JSON.' };
    }
    if (!Array.isArray(data) || !data.every((row) => row && typeof row === 'object' && 'id' in row))
      return { code: 'json-shape', message: 'Expected an array of records with an id.' };
    return { meta: { records: data.length }, description: `${data.length} records` };
  }
  const [header = '', ...rows] = text.trim().split(/\r?\n/);
  const columns = header
    .toLowerCase()
    .split(',')
    .map((cell) => cell.trim());
  const missing = ['name', 'email', 'phone'].filter((column) => !columns.includes(column));
  if (missing.length)
    return { code: 'csv-columns', message: `Missing columns: ${missing.join(', ')}.` };
  return { meta: { records: rows.length }, description: `${rows.length} contacts` };
}

/**
 * A stand-in upload adapter: it reports progress over about two seconds and fails files whose
 * name contains "fail" on the first attempt. Replace it with fetch or XMLHttpRequest.
 */
export function createDemoUploader(view) {
  const attempts = new Map();
  return (item, { signal, onProgress }) =>
    new Promise((resolve, reject) => {
      const total = item.file.size || 1;
      let loaded = 0;
      const timer = view.setInterval(() => {
        loaded = Math.min(total, loaded + total / 10);
        onProgress(loaded, total);
        if (loaded < total) return;
        view.clearInterval(timer);
        const attempt = (attempts.get(item.id) ?? 0) + 1;
        attempts.set(item.id, attempt);
        if (item.file.name.includes('fail') && attempt === 1)
          reject(new Error('Server returned 500. Retry the upload.'));
        else resolve({ url: `https://files.example.com/${encodeURIComponent(item.file.name)}` });
      }, 200);
      signal.addEventListener('abort', () => {
        view.clearInterval(timer);
        reject(signal.reason);
      });
    });
}

/** Sample image files with a gradient, so previews have visible content. */
async function sampleImage(view, name, hue) {
  const canvas = view.document.createElement('canvas');
  canvas.width = canvas.height = 320;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 320, 320);
  gradient.addColorStop(0, `hsl(${hue} 65% 55%)`);
  gradient.addColorStop(1, `hsl(${(hue + 60) % 360} 65% 32%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 320, 320);
  const type = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type));
  return new view.File([blob], name, { type, lastModified: 1_700_000_000_000 + hue });
}

const sampleFile = (view, name, size, type) =>
  new view.File([new Uint8Array(size)], name, { type, lastModified: 1_700_000_000_000 });

export function setupFileUploadExample(root) {
  const view = root.ownerDocument.defaultView;
  const controller = new view.AbortController();
  const { signal } = controller;

  for (const upload of root.querySelectorAll('tp-file-upload[data-validator="documents"]'))
    upload.fileValidator = documentValidator;
  for (const upload of root.querySelectorAll('tp-file-upload[data-validator="imports"]'))
    upload.fileValidator = importValidator;
  for (const upload of root.querySelectorAll('tp-file-upload[data-uploader]'))
    upload.uploader = createDemoUploader(view);

  const chips = root.querySelector('tp-file-upload[data-sample="attachments"]');
  if (chips)
    chips.value = [
      sampleFile(view, 'Q4-report-final.pdf', 2.3 * 1024 ** 2, 'application/pdf'),
      sampleFile(
        view,
        'budget-2025.xlsx',
        869 * 1024,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
      sampleFile(
        view,
        'meeting-notes.docx',
        152 * 1024,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ];

  const gallery = root.querySelector('tp-file-upload[data-sample="gallery"]');
  if (gallery) {
    gallery.messages = { countLimited: '{count} of {max} images uploaded' };
    void Promise.all(
      [
        'hero-banner.jpg',
        'product-shot.png',
        'team-photo.jpg',
        'office-interior.png',
        'workspace.png',
      ].map((name, index) => sampleImage(view, name, index * 55)),
    ).then((files) => {
      if (!signal.aborted) gallery.value = files;
    });
  }

  // Server-side validation: the "server" rejects files named like a duplicate contract.
  const contract = root.querySelector('tp-file-upload[data-server]');
  if (contract)
    contract.addEventListener(
      'tp-value-change',
      (event) => {
        for (const file of event.detail.metadata?.added ?? [])
          view.setTimeout(() => {
            if (signal.aborted || !/copy|duplicate/i.test(file.name)) return;
            contract.rejectFile(file, 'The server already has this contract.');
          }, 600);
      },
      { signal },
    );

  const form = root.querySelector('tp-form');
  if (form)
    form.onFormSubmit = (values, details) => {
      const output = root.querySelector('[data-submitted]');
      const files = [...(details.data?.entries() ?? [])].map(
        ([name, value]) => `${name}: ${value.name ?? value}`,
      );
      if (output) output.textContent = files.length ? `Submitted ${files.join(', ')}` : 'Submitted';
    };

  return () => {
    controller.abort();
    for (const upload of root.querySelectorAll('tp-file-upload')) upload.cancelUpload();
  };
}
