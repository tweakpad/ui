/**
 * The image popover (`uwg-te-req-surfaces-4`, `uwg-te-tab-anatomy-r15`): a state-driven Popover
 * without a Trigger holding the URL and alternative text Fields, an Insert Button and, while
 * `imageUpload` is set, a File upload for images. It remembers the selection at opening; its
 * first image goes to the point of insertion of that selection and each later one right after
 * the image it inserted last. Several uploads may run at once; closing aborts the unfinished
 * ones.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { FileUploadContext, FileUploadItem } from '../../../components/file-upload/types.js';
import type { TpFileUpload } from '../../../components/file-upload/file-upload.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { allowedUrl, imageProtocols } from '../../../foundation/markdown/url.js';
import type { AnchorGeometry, VirtualAnchor } from '../../../foundation/positioning.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import type { ChangeReason } from '../../../foundation/types.js';
import type { TextEditorAction } from '../../../foundation/text-editor/actions.js';
import type {
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type {
  TextEditorSelection,
  TextEditorSelectionInput,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorRequestSurface } from '../../../foundation/text-editor/tools.js';
import { selectionInput } from '../focus.js';
import type { TextEditorImageUpload } from '../types.js';
import { popoverCloseRefocuses } from './link-popover.js';
import { selectionAnchor } from './selection-toolbar.js';

/** Whether an image source passes the image policy (`uwg-te-req-surfaces-4`). */
export function imageSourceAllowed(
  src: string,
  protocols: readonly string[] = imageProtocols(null),
): boolean {
  const value = src.trim();
  return value !== '' && allowedUrl(value, protocols);
}

/** Where the popover inserts its next image. */
export type ImageInsertionPoint =
  /** The point of insertion of a selection: the one remembered at opening, or a paste or drop point. */
  | { readonly kind: 'selection'; readonly selection: TextEditorSelectionInput }
  /** Right after a block: the image inserted last, or the last block of the document. */
  | { readonly kind: 'after'; readonly id: string }
  /** An empty document without blocks: the engine's own point of insertion. */
  | { readonly kind: 'document' };

/** The insertion point at opening: the selection, else the end of the document. */
export function initialInsertionPoint(
  selection: TextEditorSelection,
  lastBlock: string | null,
): ImageInsertionPoint {
  const input = selectionInput(selection);
  if (input) return { kind: 'selection', selection: input };
  return lastBlock ? { kind: 'after', id: lastBlock } : { kind: 'document' };
}

/**
 * The actions that insert one image at an insertion point: a remembered selection set first,
 * then `blocks.insert` at its point of insertion, in one request.
 */
export function imageInsertActions(
  point: ImageInsertionPoint,
  src: string,
  alt: string,
): readonly TextEditorAction[] {
  const attrs = { src: src.trim(), alt };
  if (point.kind === 'after')
    return [{ type: 'blocks.insert', kind: 'image', attrs, at: { after: point.id } }];
  return [
    ...(point.kind === 'selection'
      ? [{ type: 'selection.set', selection: point.selection } as const]
      : []),
    { type: 'blocks.insert', kind: 'image', attrs },
  ];
}

/**
 * The request of one image that the popover inserts. Focus stays where it is, in the popover, so
 * that the uploads still running keep it open; closing returns focus to the editing root.
 */
export function imageInsertProposal(
  point: ImageInsertionPoint,
  src: string,
  alt: string,
  surface: TextEditorRequestSurface,
  reason: ChangeReason,
  sourceEvent: Event | undefined,
): TextEditorRequestProposal {
  return {
    target: imageInsertActions(point, src, alt),
    surface,
    reason,
    sourceEvent,
    trigger: null,
    focus: false,
  };
}

/** The identifier of the image that an applied insert added: the first block that is new. */
export function insertedBlock(before: readonly string[], after: readonly string[]): string | null {
  const known = new Set(before);
  return after.find((id) => !known.has(id)) ?? null;
}

export interface TextEditorImagePopoverHost {
  requestUpdate(): void;
  strings(): TextEditorStrings;
  imageUpload(): TextEditorImageUpload | null;
  /** The selection now, which the popover remembers at opening. */
  selection(): TextEditorSelection;
  /** The identifiers of every block in document order, while ready. */
  blockIds(): readonly string[];
  selectionRects(): readonly DOMRectReadOnly[];
  caretRect(): DOMRectReadOnly | null;
  /** The client rectangle of the last block, the anchor at the end of the document. */
  endRect(): DOMRectReadOnly | null;
  content(): HTMLElement | null;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  diagnose(message: string): void;
  focusEditing(): void;
  /** This surface opens, for `reason`: close the other transient surfaces with it. */
  opening(reason?: ChangeReason): void;
  /** A change of the open lane with its reason (`uwg-te-tab-reasons` r12, r13). */
  lane?(open: boolean, reason: ChangeReason): void;
}

/** The image popover of one widget. */
export class TextEditorImagePopover {
  readonly #host: TextEditorImagePopoverHost;
  readonly #virtual: VirtualAnchor;
  #open = false;
  #anchor: AnchorGeometry | null = null;
  #src = '';
  #alt = '';
  #invalid = false;
  #surface: TextEditorRequestSurface = 'api';
  #point: ImageInsertionPoint = { kind: 'document' };
  #closing: { reason: string | undefined; event: Event | undefined } | null = null;
  #input: HTMLElement | null = null;
  #upload: TpFileUpload | null = null;
  /** The reason of the File upload value change that added each file. */
  readonly #reasons = new WeakMap<File, ChangeReason>();
  /** Aborts the uploads of the current opening. */
  #uploads: AbortController | null = null;
  /** Inserts run one after another, so that each one follows the image inserted before it. */
  #queue: Promise<unknown> = Promise.resolve();

  constructor(host: TextEditorImagePopoverHost) {
    this.#host = host;
    this.#virtual = selectionAnchor(
      () => {
        const rects = host.selectionRects();
        if (rects.length) return rects;
        const caret = host.caretRect() ?? host.endRect();
        return caret ? [caret] : [];
      },
      () => host.content(),
    );
  }

  get isOpen(): boolean {
    return this.#open;
  }

  /**
   * Opens for requests of `surface`, at `anchor` (a toolbar control or the More trigger) or else
   * at the selection, and remembers the insertion point.
   */
  open(
    surface: TextEditorRequestSurface,
    anchor: Element | null,
    reason: ChangeReason = 'imperative-action',
  ): void {
    this.#host.opening(reason);
    const opened = !this.#open;
    const ids = this.#host.blockIds();
    this.#point = initialInsertionPoint(this.#host.selection(), ids.at(-1) ?? null);
    this.#anchor = anchor ?? this.#virtual;
    this.#src = '';
    this.#alt = '';
    this.#invalid = false;
    this.#surface = surface;
    this.#closing = null;
    this.#uploads?.abort();
    this.#uploads = new AbortController();
    this.#open = true;
    if (opened) this.#host.lane?.(true, reason);
    this.#host.requestUpdate();
  }

  /** Closes and aborts the unfinished uploads; the lane records `reason` (else `programmatic`). */
  close(reason?: ChangeReason, event?: Event): void {
    if (!this.#open) return;
    this.#closing = { reason, event };
    this.#open = false;
    this.#host.lane?.(false, reason ?? 'programmatic');
    this.#uploads?.abort();
    this.#uploads = null;
    this.#upload?.cancelUpload();
    this.#host.requestUpdate();
  }

  /** Aborts every upload; called when the widget disconnects. */
  release(): void {
    this.#uploads?.abort();
    this.#uploads = null;
    this.#open = false;
  }

  render(): TemplateResult {
    const strings = this.#host.strings();
    const upload = this.#host.imageUpload();
    return html`<tp-popover
      part="text-editor-image-popover"
      label=${strings.image}
      side="block-end"
      align="start"
      .portal=${false}
      .modal=${false}
      .open=${this.#open}
      .anchor=${this.#anchor ?? this.#virtual}
      .initialFocus=${this.#initialFocus}
      .finalFocus=${this.#finalFocus}
      @tp-open-change=${this.#openChange}
      ><div class="image-popover">
        <tp-field label=${strings.imageUrl} .invalid=${this.#invalid}
          ><tp-input
            type="url"
            .value=${this.#src}
            .invalid=${this.#invalid}
            .onValueChange=${this.#srcChange}
            .inputElementReference=${this.#inputReference}
            @keydown=${this.#keyDown}
          ></tp-input
        ></tp-field>
        <tp-field label=${strings.imageAlt}
          ><tp-input
            .value=${this.#alt}
            .onValueChange=${this.#altChange}
            @keydown=${this.#keyDown}
          ></tp-input
        ></tp-field>
        ${
          upload && this.#open
            ? html`<tp-file-upload
                accept="image/*"
                multiple
                .preventDocumentDrop=${false}
                .uploader=${this.#uploader}
                @tp-value-change=${this.#filesChanged}
                @tp-upload-complete=${this.#uploaded}
                ${ref((element) => {
                  this.#upload = (element as TpFileUpload | undefined) ?? null;
                })}
              ></tp-file-upload>`
            : nothing
        }
        <tp-button @click=${this.#insert}>${strings.insertImage}</tp-button>
      </div></tp-popover
    >`;
  }

  // Stable callbacks: the closed popover renders with the element on every state publication, and
  // a new function in an input's property would update the input each time.
  readonly #srcChange = (event: TpValueChangeEvent<unknown>): void => {
    this.#src = String(event.detail.value ?? '');
    this.#invalid = false;
    this.#host.requestUpdate();
  };

  readonly #altChange = (event: TpValueChangeEvent<unknown>): void => {
    this.#alt = String(event.detail.value ?? '');
    this.#host.requestUpdate();
  };

  readonly #inputReference = (element: HTMLElement | null): void => {
    this.#input = element;
  };

  readonly #uploader = (item: FileUploadItem, context: FileUploadContext): Promise<unknown> => {
    const upload = this.#host.imageUpload();
    const opening = this.#uploads;
    if (!upload || !opening) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    const signal = AbortSignal.any
      ? AbortSignal.any([context.signal, opening.signal])
      : context.signal;
    return upload(item.file, {
      signal,
      onProgress: (loaded, total) => context.onProgress(loaded, total),
    });
  };

  readonly #filesChanged = (event: TpValueChangeEvent<readonly File[]>): void => {
    const added = (event.detail.metadata as { added?: readonly File[] } | undefined)?.added ?? [];
    for (const file of added) this.#reasons.set(file, event.detail.reason);
  };

  readonly #uploaded = (event: CustomEvent<{ item: FileUploadItem; response: unknown }>): void => {
    const { item, response } = event.detail;
    const opening = this.#uploads;
    if (!opening || opening.signal.aborted) return;
    const src = typeof response === 'string' ? response : '';
    if (!imageSourceAllowed(src)) {
      this.#host.diagnose(
        `The uploaded image source "${src}" fails the image policy; nothing is inserted.`,
      );
      return;
    }
    const reason = this.#reasons.get(item.file) ?? 'input';
    // The last upload to finish closes the popover with the reason that added its file
    // (`uwg-te-tab-reasons` r13: `input`, `drag` or `input-paste`).
    void this.#enqueue(src, reason, event).then((applied) => {
      if (applied && !this.#unfinished()) this.close(reason, event);
    });
  };

  /** Whether an upload of the File upload is still queued or running. */
  #unfinished(): boolean {
    return (this.#upload?.items ?? []).some(
      (item) => item.status === 'queued' || item.status === 'uploading',
    );
  }

  /** Inserts one image after the previous insert settled; resolves whether it applied. */
  #enqueue(src: string, reason: ChangeReason, sourceEvent: Event | undefined): Promise<boolean> {
    const run = this.#queue.then(async () => {
      const before = this.#host.blockIds();
      const outcome = await this.#host
        .request(
          imageInsertProposal(this.#point, src, this.#alt, this.#surface, reason, sourceEvent),
        )
        .catch(() => 'unchanged' as const);
      if (outcome !== 'applied') return false;
      const inserted = insertedBlock(before, this.#host.blockIds());
      if (inserted) this.#point = { kind: 'after', id: inserted };
      return true;
    });
    this.#queue = run.catch(() => undefined);
    return run;
  }

  readonly #insert = (event: Event): void => {
    if (!imageSourceAllowed(this.#src)) {
      this.#invalid = true;
      this.#host.requestUpdate();
      return;
    }
    // Insert by URL finishes the popover: it closes and aborts the uploads still running.
    void this.#enqueue(this.#src, 'item-press', event).then((applied) => {
      if (applied) this.close('item-press', event);
    });
  };

  readonly #keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' || event.isComposing || event.defaultPrevented) return;
    event.preventDefault();
    this.#insert(event);
  };

  /**
   * The popover's input, else its first focusable; one stable reference, so that a render of the
   * element leaves the closed popover as it is.
   */
  readonly #initialFocus = (): HTMLElement | boolean => this.#input ?? true;

  readonly #finalFocus = (): boolean => {
    const closing = this.#closing;
    this.#closing = null;
    if (popoverCloseRefocuses(closing?.reason, closing?.event, this.#host.content()))
      this.#host.focusEditing();
    return false;
  };

  readonly #openChange = (event: TpSurfaceOpenChangeEvent): void => {
    if (event.target !== event.currentTarget) return;
    if (!event.detail.value) this.close(event.detail.reason, event.detail.sourceEvent);
  };
}

// Pasted and dropped image files (uwg-te-req-content-6) --------------------------------------

export interface TextEditorImageFilesInput {
  readonly upload: TextEditorImageUpload;
  readonly files: readonly File[];
  /** The paste or drop position. */
  readonly at: TextEditorSelectionInput;
  readonly surface: TextEditorRequestSurface;
  readonly reason: ChangeReason;
  readonly sourceEvent: Event | undefined;
  /** Aborts the uploads, when the widget disconnects. */
  readonly signal: AbortSignal;
  blockIds(): readonly string[];
  /** The current selection, where an image goes once the paste or drop position is gone. */
  selection?(): TextEditorSelection;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  diagnose(message: string): void;
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
 * The point where an upload inserts: the remembered one while every block it names exists; once a
 * block is gone (the HTML of the same paste replaced the selected blocks), the current selection,
 * else right after the last block.
 */
function livePoint(
  point: ImageInsertionPoint,
  input: TextEditorImageFilesInput,
): ImageInsertionPoint {
  if (point.kind !== 'selection') return point;
  const ids = input.blockIds();
  if (selectionBlocks(point.selection).every((id) => ids.includes(id))) return point;
  const current = input.selection ? selectionInput(input.selection()) : null;
  if (current) return { kind: 'selection', selection: current };
  const last = ids.at(-1);
  return last ? { kind: 'after', id: last } : { kind: 'document' };
}

/**
 * Uploads pasted or dropped image files through `imageUpload`, all at once, and inserts each
 * source that passes the image policy once its upload completes: the first at the paste or drop
 * position (or, once that position is gone, at the current selection), each later one right after
 * the image inserted last. A source that fails the policy is reported and inserted nowhere; an
 * aborted or failed upload inserts nothing.
 */
export async function insertImageFiles(input: TextEditorImageFilesInput): Promise<void> {
  let point: ImageInsertionPoint = { kind: 'selection', selection: input.at };
  let queue: Promise<unknown> = Promise.resolve();
  const insert = (src: string) => {
    const run = queue.then(async () => {
      if (input.signal.aborted) return;
      const before = input.blockIds();
      point = livePoint(point, input);
      const outcome = await input
        .request({
          target: imageInsertActions(point, src, ''),
          surface: input.surface,
          reason: input.reason,
          sourceEvent: input.sourceEvent,
          trigger: null,
        })
        .catch(() => 'unchanged' as const);
      const inserted = outcome === 'applied' ? insertedBlock(before, input.blockIds()) : null;
      if (inserted) point = { kind: 'after', id: inserted };
    });
    queue = run.catch(() => undefined);
    return run;
  };
  await Promise.all(
    input.files.map(async (file) => {
      let src: string;
      try {
        src = await input.upload(file, { signal: input.signal, onProgress: () => undefined });
      } catch {
        return;
      }
      if (input.signal.aborted) return;
      if (!imageSourceAllowed(src)) {
        input.diagnose(
          `The uploaded image source "${String(src)}" fails the image policy; nothing is inserted.`,
        );
        return;
      }
      await insert(src);
    }),
  );
}
