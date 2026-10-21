import { LiveAnnouncer, type AnnounceOptions } from '../../foundation/announcer.js';
import { fillTemplate } from '../../foundation/template.js';
import type { TextEditorStrings } from '../../foundation/text-editor/strings.js';

/**
 * The widget's one announcer (`uwg-te-req-engine-9`): its live regions are created on the first
 * announcement inside the element the root getter returns, in the widget's shadow root.
 */
export class TextEditorAnnouncer {
  readonly #root: () => Element | null;
  #announcer: LiveAnnouncer | null = null;

  /** Stores the root getter; touches no global. */
  constructor(root: () => Element | null) {
    this.#root = root;
  }

  /** Nothing while the root getter returns null, so no region is ever created in the document. */
  announce(message: string, options?: AnnounceOptions): void {
    if (!this.#root()) return;
    this.#announcer ??= new LiveAnnouncer({ root: () => this.#root() });
    this.#announcer.announce(message, options);
  }

  /** Cancels pending messages and empties the regions; called at disconnection. */
  clear(): void {
    this.#announcer?.clear();
  }
}

// Block texts (M8) -------------------------------------------------------------------------------

/** The count of a block selection (`announceSelected`). */
export function blocksSelectedText(strings: TextEditorStrings, count: number): string {
  return fillTemplate(strings.announceSelected, { count });
}

/** Blocks deleted together (`announceDeleted`). */
export function blocksDeletedText(strings: TextEditorStrings, count: number): string {
  return fillTemplate(strings.announceDeleted, { count });
}

/** Blocks duplicated together (`announceDuplicated`). */
export function blocksDuplicatedText(strings: TextEditorStrings, count: number): string {
  return fillTemplate(strings.announceDuplicated, { count });
}

/** A block moved by key or from the block menu: its label alone, else the count. */
export function blocksMovedText(strings: TextEditorStrings, labels: readonly string[]): string {
  return labels.length === 1
    ? fillTemplate(strings.announceMoved, { label: labels[0] })
    : fillTemplate(strings.announceMovedMany, { count: labels.length });
}

/** Where a dragged block is, would drop or dropped: its label, level and parent. */
export interface TextEditorDragPlace {
  readonly label: string;
  /** One-based level. */
  readonly level: number;
  /** The label of the parent list item, or `null` at the top level. */
  readonly parent: string | null;
}

/** The text of a drag stage (`dnd-tree-p-announce`). */
export function blockDragText(
  strings: TextEditorStrings,
  stage: 'picked-up' | 'over' | 'dropped' | 'cancelled',
  place: TextEditorDragPlace,
): string {
  const where =
    place.parent === null
      ? strings.announcePlaceTop
      : fillTemplate(strings.announcePlaceIn, { parent: place.parent });
  const template = {
    'picked-up': strings.announcePickedUp,
    over: strings.announceDropTarget,
    dropped: strings.announceDropped,
    cancelled: strings.announceDragCancelled,
  }[stage];
  return fillTemplate(template, { label: place.label, level: place.level, place: where });
}

/** The result of copying a block link (`announceLinkCopied`, `announceLinkCopyFailed`). */
export function linkCopiedText(strings: TextEditorStrings, copied: boolean): string {
  return copied ? strings.announceLinkCopied : strings.announceLinkCopyFailed;
}
