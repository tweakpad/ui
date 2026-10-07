import { deepActiveElement, focusManaged } from '../focus.js';

/**
 * Copies text to the clipboard: the async Clipboard API first, then a hidden text area with
 * `execCommand('copy')` (insecure contexts, older engines). Resolves whether it succeeded and
 * never throws. Focus returns to where it was without reopening focus-opened descriptions.
 */
export async function copyText(document: Document, text: string): Promise<boolean> {
  const clipboard = document.defaultView?.navigator?.clipboard;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or unavailable: try the legacy path.
    }
  }
  try {
    const active = deepActiveElement(document);
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.setAttribute('aria-hidden', 'true');
    area.style.position = 'fixed';
    area.style.inset = '0 auto auto 0';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
    document.body.append(area);
    area.focus({ preventScroll: true });
    area.select();
    const copied = document.execCommand?.('copy') ?? false;
    area.remove();
    if (active && 'focus' in active) focusManaged(active as HTMLElement);
    return copied;
  } catch {
    return false;
  }
}
