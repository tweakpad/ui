/** How long a handed-off object URL stays alive; Safari starts the download after the click. */
const REVOKE_DELAY = 30_000;

/**
 * Hands `blob` to the host as a downloaded file named `filename`: an object URL from the owner
 * window, a detached `<a download>` clicked once and removed, and the URL revoked after the host
 * had time to start the download. Whether the user saved the file is not observable.
 */
export function downloadBlob(document: Document, blob: Blob, filename: string): void {
  const view = document.defaultView;
  const urls = view?.URL ?? URL;
  const url = urls.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.hidden = true;
  (document.body ?? document.documentElement).append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    (view ?? globalThis).setTimeout(() => urls.revokeObjectURL(url), REVOKE_DELAY);
  }
}
