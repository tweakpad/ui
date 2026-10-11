import { deepActiveElement, focusManaged } from './focus.js';

/** One clipboard representation: text, binary data, or a promise of either. */
export type ClipboardRepresentation = string | Blob | PromiseLike<string | Blob>;

/** Representations of one piece of content keyed by media type, such as `image/png`. */
export type ClipboardRepresentations = Readonly<Record<string, ClipboardRepresentation>>;

export interface ClipboardWriteResult {
  /** Whether the host confirmed the write. */
  readonly copied: boolean;
  /** The media types actually written; empty after a failure. */
  readonly types: readonly string[];
}

interface ClipboardItemConstructor {
  new (items: Record<string, string | Blob | PromiseLike<string | Blob>>): ClipboardItem;
  supports?(type: string): boolean;
}

/**
 * Text write of Foundation §19.25 Clipboard write: the async Clipboard API first, then a hidden
 * text area with `execCommand('copy')` (insecure contexts, older engines). Resolves whether it
 * succeeded and never throws. Focus returns to where it was without reopening focus-opened
 * descriptions.
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

/**
 * Data write of Foundation §19.25 Clipboard write: one clipboard item holding every
 * representation the host supports. The item is built and the write requested synchronously,
 * before any await, with pending representations passed as promises, so hosts that bind
 * clipboard access to the user activation (Safari) accept it. When the host cannot write items
 * or rejects this one, a `text/plain` representation falls back to {@link copyText}. Never throws.
 */
export async function copyData(
  document: Document,
  data: ClipboardRepresentations,
): Promise<ClipboardWriteResult> {
  const failed: ClipboardWriteResult = { copied: false, types: [] };
  try {
    const view = document.defaultView as
      (Window & { ClipboardItem?: ClipboardItemConstructor }) | null;
    const clipboard = view?.navigator?.clipboard;
    const Item = view?.ClipboardItem;
    const types = Object.keys(data).filter((type) => {
      try {
        return Item?.supports ? Item.supports(type) : true;
      } catch {
        return false;
      }
    });
    const onlyText = types.every((type) => type === 'text/plain');
    if (Item && clipboard?.write && types.length > 0 && !onlyText) {
      const blobs = (): Record<string, Promise<Blob>> =>
        Object.fromEntries(types.map((type) => [type, asBlob(data[type]!, type)]));
      let write: Promise<void> | undefined;
      try {
        write = clipboard.write([new Item(blobs())]);
      } catch {
        // Engines without promised representations: settle them and build the item again.
        write = undefined;
      }
      try {
        if (!write) {
          const settled = await Promise.all(
            types.map(async (type) => [type, await asBlob(data[type]!, type)] as const),
          );
          write = clipboard.write([new Item(Object.fromEntries(settled))]);
        }
        await write;
        return { copied: true, types };
      } catch {
        // The host refused the item (permission, unsupported type): fall back to the text.
      }
    }
    if (!('text/plain' in data)) return failed;
    const text = await asText(data['text/plain']!);
    const copied = await copyText(document, text);
    return copied ? { copied, types: ['text/plain'] } : failed;
  } catch {
    return failed;
  }
}

async function asBlob(value: ClipboardRepresentation, type: string): Promise<Blob> {
  const settled = await value;
  return typeof settled === 'string' ? new Blob([settled], { type }) : settled;
}

async function asText(value: ClipboardRepresentation): Promise<string> {
  const settled = await value;
  return typeof settled === 'string' ? settled : settled.text();
}
