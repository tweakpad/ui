/**
 * The image upload cards (`uwg-te-req-surfaces-4`, `uwg-te-tab-anatomy-r15`): one File upload
 * overlaid on each pending image block of the document, an image whose source is still empty.
 * The image tool inserts such a block; a pasted or dropped image file inserts one and feeds the
 * file to its card. The card validates the file against the widget's image limits, uploads it
 * through `imageUpload` with progress, error and Retry, and once the upload resolves a source that
 * passes the image policy, sets it on the block, which then renders as an image. Deleting the
 * block cancels its upload.
 */
import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import { acceptsFile, normalizeAccept } from '../../../components/file-upload/accept.js';
import type { TpFileUpload } from '../../../components/file-upload/file-upload.js';
import type { FileUploadMessages } from '../../../components/file-upload/messages.js';
import type {
  FileAcceptInput,
  FileUploadContext,
  FileUploadItem,
} from '../../../components/file-upload/types.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { formatBytes } from '../../../foundation/format-bytes.js';
import { allowedUrl, imageProtocols } from '../../../foundation/markdown/url.js';
import { fillTemplate } from '../../../foundation/template.js';
import type { TextEditorAction } from '../../../foundation/text-editor/actions.js';
import type { TextEditorAccess } from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorBlockTree,
  TextEditorSelection,
  TextEditorSelectionInput,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorRequestSurface } from '../../../foundation/text-editor/tools.js';
import type { ChangeReason } from '../../../foundation/types.js';
import { selectionInput } from '../focus.js';
import type {
  OverlayBox,
  OverlayGeometry,
  OverlayInstance,
  OverlayLayer,
  OverlayMeasureContext,
} from '../geometry.js';
import type { TextEditorImageUpload } from '../types.js';

/** Whether an image source passes the image policy (`uwg-te-req-surfaces-4`). */
export function imageSourceAllowed(
  src: string,
  protocols: readonly string[] = imageProtocols(null),
): boolean {
  const value = src.trim();
  return value !== '' && allowedUrl(value, protocols);
}

/** The type and size limits of image files (`uwg-te-tab-props` r14, r15). */
export interface TextEditorImageLimits {
  /** The accepted types, in File upload's `accept` forms; `image/*` by default. */
  readonly accept: FileAcceptInput;
  /** The largest accepted file in bytes, or `null` for no limit. */
  readonly maxFileSize: number | null;
}

/**
 * Why a pasted or dropped image file is refused, as a message from `strings`, or `null` when the
 * limits accept it: its type outside `accept`, or its size over `maxFileSize`.
 */
export function imageFileRejection(
  file: File,
  limits: TextEditorImageLimits,
  strings: Pick<TextEditorStrings, 'imageRejectedType' | 'imageRejectedSize'>,
): string | null {
  if (!acceptsFile(normalizeAccept(limits.accept), file))
    return fillTemplate(strings.imageRejectedType, { name: file.name });
  if (limits.maxFileSize !== null && file.size > limits.maxFileSize)
    return fillTemplate(strings.imageRejectedSize, {
      name: file.name,
      size: formatBytes(limits.maxFileSize),
    });
  return null;
}

/** The identifiers of the pending images of a block tree, in document order. */
export function pendingImageIds(tree: Pick<TextEditorBlockTree, 'ordered'> | null): string[] {
  if (!tree) return [];
  return tree
    .ordered()
    .filter((block) => block.kind === 'image' && block.attrs['src'] === '')
    .map((block) => block.id);
}

/** Where a paste or drop inserts its next pending image. */
export type ImageInsertionPoint =
  /** The point of insertion of a selection: the paste or drop point. */
  | { readonly kind: 'selection'; readonly selection: TextEditorSelectionInput }
  /** Right after a block: the image inserted last, or the last block of the document. */
  | { readonly kind: 'after'; readonly id: string }
  /** An empty document without blocks: the engine's own point of insertion. */
  | { readonly kind: 'document' };

/** The attributes of a pending image. */
const PENDING_IMAGE = Object.freeze({ src: '', alt: '' });

/** The insert of a pending image at an insertion point. */
export function pendingImageInsertActions(point: ImageInsertionPoint): TextEditorAction[] {
  if (point.kind === 'after')
    return [
      { type: 'blocks.insert', kind: 'image', attrs: PENDING_IMAGE, at: { after: point.id } },
    ];
  return [
    ...(point.kind === 'selection'
      ? [{ type: 'selection.set', selection: point.selection } satisfies TextEditorAction]
      : []),
    { type: 'blocks.insert', kind: 'image', attrs: PENDING_IMAGE },
  ];
}

/** The identifier of the block that an applied insert added: the first block that is new. */
export function insertedBlock(before: readonly string[], after: readonly string[]): string | null {
  const known = new Set(before);
  return after.find((id) => !known.has(id)) ?? null;
}

/** The blocks that a selection input names. */
function selectionBlocks(selection: TextEditorSelectionInput): readonly string[] {
  switch (selection.kind) {
    case 'text':
      return selection.head
        ? [selection.anchor.block, selection.head.block]
        : [selection.anchor.block];
    case 'caret':
      return [selection.block];
    case 'blocks':
      return selection.ids;
    case 'cells':
      return [selection.table];
  }
}

/**
 * The point where the next pending image inserts: the remembered one while every block it names
 * exists; once a block is gone (the HTML of the same paste replaced the selected blocks), the
 * current selection, else right after the last block.
 */
export function livePoint(
  point: ImageInsertionPoint,
  ids: readonly string[],
  selection: TextEditorSelection | null,
): ImageInsertionPoint {
  if (point.kind !== 'selection') return point;
  if (selectionBlocks(point.selection).every((id) => ids.includes(id))) return point;
  const current = selection ? selectionInput(selection) : null;
  if (current) return { kind: 'selection', selection: current };
  const last = ids.at(-1);
  return last ? { kind: 'after', id: last } : { kind: 'document' };
}

export interface TextEditorImageUploadsHost {
  readonly geometry: OverlayGeometry;
  requestUpdate(): void;
  strings(): TextEditorStrings;
  imageUpload(): TextEditorImageUpload | null;
  limits(): TextEditorImageLimits;
  access(): TextEditorAccess;
  /** The instance while the editor is ready, else `null`. */
  instance(): OverlayInstance | null;
  /** The selection now. */
  selection(): TextEditorSelection;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  /** A `text-editor-upload-rejected` diagnostic. */
  diagnose(message: string): void;
  announce(message: string): void;
  /** Focuses the editing root with its selection, through the adapter. */
  focusEditing(): void;
}

/** A file that a paste or a drop hands to the card of the block it inserted. */
interface PendingFile {
  readonly file: File;
  readonly reason: ChangeReason;
  readonly surface: TextEditorRequestSurface;
}

/** The card of one pending image. */
interface Card {
  element: HTMLElement | null;
  upload: TpFileUpload | null;
  /** A pasted or dropped file, until the card takes it. */
  pending: PendingFile | null;
  /** The reason of the File upload value change that added each file. */
  readonly reasons: WeakMap<File, ChangeReason>;
  /** The surface of the request that completes each file's upload. */
  readonly surfaces: WeakMap<File, TextEditorRequestSurface>;
  shown: boolean;
  translate: string;
  width: string;
  height: string;
}

interface CardPlacement {
  readonly id: string;
  readonly box: OverlayBox;
}

/**
 * The image upload cards of one widget: an overlay layer that places one File upload over each
 * pending image block, and the uploads that fill the blocks in.
 */
export class TextEditorImageUploads implements OverlayLayer<readonly CardPlacement[]> {
  readonly #host: TextEditorImageUploadsHost;
  readonly #remove: () => void;
  #ids: readonly string[] = [];
  readonly #cards = new Map<string, Card>();
  /** The next pending image that the image tool inserts takes focus once its card renders. */
  #focusNext = false;
  #focusId: string | null = null;
  #messages: Partial<FileUploadMessages> = {};
  #messagesFor: TextEditorStrings | null = null;
  /** Pastes and drops insert one after another, so that each one follows the image inserted before it. */
  #queue: Promise<unknown> = Promise.resolve();
  #released = false;

  constructor(host: TextEditorImageUploadsHost) {
    this.#host = host;
    this.#remove = host.geometry.addLayer(this);
  }

  /** The identifiers of the pending images, in document order. */
  get ids(): readonly string[] {
    return this.#ids;
  }

  /** Whether an upload card holds `node`. */
  contains(node: Node | null): boolean {
    if (!node) return false;
    for (const card of this.#cards.values()) if (card.element?.contains(node)) return true;
    return false;
  }

  /**
   * Every state publication: follows the pending images of the document. A card whose block is
   * gone cancels its upload; a new pending image gets a card, which the next render mounts.
   */
  sync(): void {
    const ids = pendingImageIds(this.#host.instance()?.getBlocks() ?? null);
    const same =
      ids.length === this.#ids.length && ids.every((id, index) => id === this.#ids[index]);
    if (same) return;
    for (const [id, card] of this.#cards)
      if (!ids.includes(id)) {
        card.upload?.cancelUpload();
        this.#cards.delete(id);
      }
    for (const id of ids)
      if (!this.#cards.has(id)) {
        this.#cards.set(id, {
          element: null,
          upload: null,
          pending: null,
          reasons: new WeakMap(),
          surfaces: new WeakMap(),
          shown: false,
          translate: '',
          width: '',
          height: '',
        });
        if (this.#focusNext) {
          this.#focusNext = false;
          this.#focusId = id;
        }
      }
    this.#ids = ids;
    this.#host.geometry.invalidate('state');
    this.#host.requestUpdate();
  }

  /**
   * A document change that the image tool made: the pending image it inserted takes focus once
   * its card renders, as the popover it replaces took focus when it opened.
   */
  toolInserted(): void {
    // The publication of the change may run before or after this notification: once the cards
    // already follow the document, the newest card takes focus; otherwise the next new one does.
    const ids = pendingImageIds(this.#host.instance()?.getBlocks() ?? null);
    const synced =
      ids.length === this.#ids.length && ids.every((id, index) => id === this.#ids[index]);
    const last = ids.at(-1);
    if (synced && last !== undefined) this.#focusCard(last);
    else this.#focusNext = true;
  }

  /**
   * Focuses a card's File upload once the card shows: a hidden card, one not yet rendered or not
   * yet placed by the overlay pass, cannot take focus.
   */
  #focusCard(id: string): void {
    this.#focusId = id;
    const card = this.#cards.get(id);
    const upload = card?.upload;
    if (!card?.shown || !upload) return;
    this.#focusId = null;
    void Promise.resolve(upload.updateComplete).then(() => {
      if (upload.isConnected && this.#cards.get(id)?.upload === upload)
        upload.focus({ preventScroll: true });
    });
  }

  /**
   * Pasted or dropped image files (`uwg-te-req-content-6`): each file the limits refuse is
   * reported and announced; each accepted one inserts a pending image, the first at the paste or
   * drop position, each later one right after the image inserted last, and hands the file to its
   * card, which uploads it. Returns whether the widget uploads (an upload hook is set).
   */
  uploadImages(
    files: readonly File[],
    at: TextEditorSelectionInput,
    reason: 'input-paste' | 'drag',
    sourceEvent: Event,
  ): boolean {
    if (!this.#host.imageUpload()) return false;
    const strings = this.#host.strings();
    const limits = this.#host.limits();
    const surface: TextEditorRequestSurface = reason === 'drag' ? 'drag' : 'paste';
    let point: ImageInsertionPoint = { kind: 'selection', selection: at };
    for (const file of files) {
      const rejection = imageFileRejection(file, limits, strings);
      if (rejection) {
        this.#host.diagnose(rejection);
        this.#host.announce(rejection);
        continue;
      }
      const run = this.#queue.then(async () => {
        if (this.#released) return;
        const before = this.#blockIds();
        point = livePoint(point, before, this.#host.selection());
        const outcome = await this.#host
          .request({
            target: pendingImageInsertActions(point),
            surface,
            reason,
            sourceEvent,
            trigger: null,
            focus: false,
          })
          .catch(() => 'unchanged' as const);
        if (outcome !== 'applied') return;
        const inserted = insertedBlock(before, this.#blockIds());
        if (!inserted) return;
        point = { kind: 'after', id: inserted };
        this.sync();
        const card = this.#cards.get(inserted);
        if (!card) return;
        card.pending = { file, reason, surface };
        this.#feed(inserted, card);
      });
      this.#queue = run.catch(() => undefined);
    }
    return true;
  }

  /** The cards, rendered inside the overlay part; one per pending image, hidden until placed. */
  render(): TemplateResult {
    const strings = this.#host.strings();
    const access = this.#host.access();
    const limits = this.#host.limits();
    const upload = this.#host.imageUpload();
    return html`${repeat(
      this.#ids,
      (id) => id,
      (id) =>
        html`<div
          part="text-editor-image-upload"
          data-block=${id}
          hidden
          @keydown=${this.#keyDown}
          ${ref((element) => this.#bind(id, (element as HTMLElement | undefined) ?? null))}
        >
          <tp-file-upload
            size="sm"
            .accept=${limits.accept}
            .maxFileSize=${limits.maxFileSize}
            .messages=${this.#messagesOf(strings)}
            .uploader=${this.#uploader}
            .disabled=${!upload || access.disabled}
            .readOnly=${access.readOnly}
            .preventDocumentDrop=${false}
            @tp-value-change=${this.#filesChanged}
            @tp-upload-complete=${this.#uploaded}
          ></tp-file-upload>
        </div>`,
    )}`;
  }

  /** Cancels every upload and removes the layer; called when the widget disconnects. */
  release(): void {
    this.#released = true;
    for (const card of this.#cards.values()) card.upload?.cancelUpload();
    this.#cards.clear();
    this.#ids = [];
    this.#remove();
    this.hide();
  }

  // Overlay layer -------------------------------------------------------------------------------

  wanted(): boolean {
    for (const card of this.#cards.values()) if (card.element) return true;
    return false;
  }

  measure(context: OverlayMeasureContext): readonly CardPlacement[] {
    const { source } = context;
    if (source.kind !== 'instance') return [];
    const placements: CardPlacement[] = [];
    for (const [id, card] of this.#cards) {
      if (!card.element) continue;
      const rects = source.instance.blockRects(id);
      if (!rects) continue;
      placements.push({ id, box: context.toOverlay(rects.content) });
    }
    return placements;
  }

  apply(placements: readonly CardPlacement[]): void {
    const placed = new Set<string>();
    for (const { id, box } of placements) {
      const card = this.#cards.get(id);
      const element = card?.element;
      if (!card || !element) continue;
      placed.add(id);
      const translate = `${box.left}px ${box.top}px`;
      if (translate !== card.translate)
        element.style.setProperty('translate', (card.translate = translate));
      const width = `${box.width}px`;
      if (width !== card.width) element.style.setProperty('width', (card.width = width));
      const height = `${box.height}px`;
      if (height !== card.height) element.style.setProperty('height', (card.height = height));
      if (!card.shown) {
        card.shown = true;
        element.hidden = false;
        if (this.#focusId === id) this.#focusCard(id);
      }
    }
    for (const [id, card] of this.#cards)
      if (!placed.has(id) && card.shown && card.element) {
        card.shown = false;
        card.element.hidden = true;
      }
  }

  hide(): void {
    for (const card of this.#cards.values())
      if (card.shown && card.element) {
        card.shown = false;
        card.element.hidden = true;
      }
  }

  // Cards ---------------------------------------------------------------------------------------

  #blockIds(): readonly string[] {
    return (
      this.#host
        .instance()
        ?.getBlocks()
        .ordered()
        .map((block) => block.id) ?? []
    );
  }

  /** The File upload's texts from the widget's strings, one record per strings object. */
  #messagesOf(strings: TextEditorStrings): Partial<FileUploadMessages> {
    if (strings !== this.#messagesFor) {
      this.#messagesFor = strings;
      this.#messages = { title: strings.imageUploadTitle };
    }
    return this.#messages;
  }

  #bind(id: string, element: HTMLElement | null): void {
    const card = this.#cards.get(id);
    if (!card) return;
    if (element === card.element) return;
    card.element = element;
    card.upload = element?.querySelector<TpFileUpload>('tp-file-upload') ?? null;
    card.shown = false;
    card.translate = '';
    card.width = '';
    card.height = '';
    if (!element) return;
    this.#host.geometry.invalidate('state');
    if (card.pending) this.#feed(id, card);
  }

  /** Hands a pasted or dropped file to a mounted card, which validates and uploads it. */
  #feed(id: string, card: Card): void {
    const pending = card.pending;
    const upload = card.upload;
    if (!pending || !upload) return;
    card.pending = null;
    card.reasons.set(pending.file, pending.reason);
    card.surfaces.set(pending.file, pending.surface);
    void Promise.resolve(upload.updateComplete).then(() => {
      if (upload.isConnected && this.#cards.get(id)?.upload === upload)
        void upload.addFiles([pending.file]);
    });
  }

  readonly #uploader = (item: FileUploadItem, context: FileUploadContext): Promise<unknown> => {
    const upload = this.#host.imageUpload();
    if (!upload) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    return upload(item.file, {
      signal: context.signal,
      onProgress: (loaded, total) => context.onProgress(loaded, total),
    });
  };

  #cardOf(event: Event): [string, Card] | null {
    const element = (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>(
      '[data-block]',
    );
    const id = element?.dataset['block'];
    const card = id === undefined ? undefined : this.#cards.get(id);
    return id !== undefined && card ? [id, card] : null;
  }

  readonly #filesChanged = (event: TpValueChangeEvent<readonly File[]>): void => {
    const found = this.#cardOf(event);
    if (!found) return;
    const [, card] = found;
    const added = (event.detail.metadata as { added?: readonly File[] } | undefined)?.added ?? [];
    for (const file of added)
      if (!card.reasons.has(file)) card.reasons.set(file, event.detail.reason);
  };

  /**
   * A completed upload sets the block's source, with the reason of the File upload value change
   * that added the file (`uwg-te-tab-reasons` r9); a source that fails the image policy is
   * reported and the block stays pending.
   */
  readonly #uploaded = (event: CustomEvent<{ item: FileUploadItem; response: unknown }>): void => {
    const found = this.#cardOf(event);
    if (!found) return;
    const [id, card] = found;
    const { item, response } = event.detail;
    const src = typeof response === 'string' ? response : '';
    if (!imageSourceAllowed(src)) {
      this.#host.diagnose(
        `The uploaded image source "${src}" fails the image policy; the image stays pending.`,
      );
      return;
    }
    void this.#host
      .request({
        target: [{ type: 'block.set-attrs', id, attrs: { src } }],
        surface: card.surfaces.get(item.file) ?? 'api',
        reason: card.reasons.get(item.file) ?? 'input',
        sourceEvent: event,
        trigger: null,
        focus: false,
      })
      .catch(() => undefined);
  };

  /** Escape in a card returns focus to the editing root with its selection. */
  readonly #keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.#host.focusEditing();
  };
}
