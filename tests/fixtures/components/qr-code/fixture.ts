/* QR code fixture bootstrap. Driven only through Chrome DevTools MCP (see README.md). */
const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const encoder = await import(
  /* @vite-ignore */ built ? '/dist/qr.js' : '/src/foundation/qr/index.ts'
);
const checks = await import('./api.ts');

interface Recorded {
  readonly type: string;
  readonly target: string;
  readonly detail: unknown;
}
const events: Recorded[] = [];
const diagnostics: Recorded[] = [];
const downloads: { href: string; download: string; type: string; size: number }[] = [];

for (const type of [
  'tp-copy',
  'tp-copied',
  'tp-copy-error',
  'tp-download',
  'tp-download-error',
  'tp-action',
]) {
  document.addEventListener(type, (event) => {
    const target = event.target as HTMLElement;
    const detail = { ...(event as CustomEvent<Record<string, unknown>>).detail };
    delete detail.sourceEvent;
    delete detail.item;
    events.push({ type, target: `${target.localName}#${target.id}`, detail });
  });
}
document.addEventListener('tp-diagnostic', (event) => {
  const target = event.target as HTMLElement;
  diagnostics.push({
    type: 'tp-diagnostic',
    target: `${target.localName}#${target.id}`,
    detail: (event as CustomEvent).detail,
  });
});
// Downloads are recorded instead of saved: the anchor click is captured and its blob fetched.
document.addEventListener(
  'click',
  (event) => {
    const anchor = event.target as HTMLAnchorElement;
    if (anchor.localName !== 'a' || !anchor.hasAttribute('download')) return;
    event.preventDefault();
    const entry = { href: anchor.href, download: anchor.download, type: '', size: 0 };
    downloads.push(entry);
    void fetch(anchor.href)
      .then((response) => response.blob())
      .then((blob) => Object.assign(entry, { type: blob.type, size: blob.size }));
  },
  true,
);

const overflow = document.getElementById('overflow') as HTMLElement & { value: string };
overflow.value = 'x'.repeat(3000);

Object.assign(window, {
  qrCodeAPI: { ...checks, encoder, events, diagnostics, downloads, built },
});
document.documentElement.dataset.ready = '';
