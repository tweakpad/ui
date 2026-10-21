/**
 * The block gutter (`uwg-te-req-blocks-2`, `uwg-te-tab-anatomy` r7, r8): an overlay toolbar with
 * the insert Button and the grip beside one block. It is revealed by the pointer, or beside the
 * caret block after a coarse press, hidden while typing until the pointer moves, pinned while its
 * menu, a drag or focus is in it, and out of the Tab sequence outside an Alt+F10 session.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { compositeControl } from '../../../foundation/composite-control.js';
import { composedContains } from '../../../foundation/focus.js';
import { preserveFocusOnPress } from '../../../foundation/press.js';
import type { TextEditorAction } from '../../../foundation/text-editor/actions.js';
import type {
  TextEditorAccess,
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type { TextEditorLayout } from '../../../foundation/text-editor/layout.js';
import type {
  TextEditorBlock,
  TextEditorBlockRects,
  TextEditorBlockTree,
  TextEditorSelection,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import { ToolbarController } from '../../../foundation/toolbar.js';
import { gripVerticalIcon } from '../../../icons/grip-vertical.js';
import { plusIcon } from '../../../icons/plus.js';
import type {
  OverlayBox,
  OverlayGeometry,
  OverlayLayer,
  OverlayMeasureContext,
} from '../geometry.js';

// Model ------------------------------------------------------------------------------------------

/** What decides the block the gutter sits beside. */
export interface TextEditorGutterInput {
  /** Ready, editable, not disabled and `layout.gutter`. */
  readonly enabled: boolean;
  /** Its menu is open or a drag is active: it stays beside `current`. */
  readonly pinned: boolean;
  readonly current: string | null;
  /** Focus is inside the gutter: it sits beside the block at the selection head. */
  readonly focusInside: boolean;
  readonly headBlock: string | null;
  /** A key was typed since the pointer last moved or pressed. */
  readonly typing: boolean;
  /** The block under the pointer, or `null`. */
  readonly hovered: string | null;
  /** The last press came from a coarse pointer while the editing root had focus. */
  readonly coarse: boolean;
  readonly editingFocused: boolean;
}

/** The block the gutter sits beside, or `null` when it is hidden (`uwg-te-req-blocks-2`). */
export function gutterTarget(input: TextEditorGutterInput): string | null {
  if (!input.enabled) return null;
  if (input.pinned) return input.current;
  if (input.focusInside) return input.headBlock ?? input.current;
  if (input.typing) return null;
  if (input.hovered) return input.hovered;
  if (input.coarse && input.editingFocused) return input.headBlock;
  return null;
}

/** The block holding the selection head: a text point's block, a block selection's last block. */
export function headBlock(selection: TextEditorSelection): string | null {
  switch (selection.kind) {
    case 'text':
      return selection.head.block;
    case 'blocks':
      return selection.ids.at(-1) ?? null;
    case 'cells':
      return selection.table;
    default:
      return null;
  }
}

const LIST_KINDS: ReadonlySet<string> = new Set(['list-bullet', 'list-ordered', 'list-task']);

/** An empty paragraph or an empty list item, which the insert Button fills in place. */
function fillsInPlace(block: TextEditorBlock): boolean {
  return block.empty && (block.kind === 'paragraph' || LIST_KINDS.has(block.kind));
}

/**
 * The actions of the insert Button (`uwg-te-req-blocks-2`, R4-D5): in an empty paragraph or empty
 * list item, the caret at its start and the slash trigger; otherwise a new block after the block
 * and its nested items (before it with Alt), a list item of the same kind beside a list item and a
 * paragraph elsewhere, with the caret in it and the trigger typed there. Without the slash
 * suggestions no trigger is typed, and an empty block needs only the caret (`select-only`).
 */
export function gutterInsertActions(
  tree: TextEditorBlockTree,
  id: string,
  options: { readonly before: boolean; readonly slash: boolean },
): readonly TextEditorAction[] | 'select-only' | null {
  const block = tree.get(id);
  if (!block) return null;
  const trigger: TextEditorAction[] = options.slash ? [{ type: 'text.insert', text: '/' }] : [];
  if (fillsInPlace(block)) {
    if (!options.slash) return 'select-only';
    return [
      { type: 'selection.set', selection: { kind: 'caret', block: id, position: 'start' } },
      ...trigger,
    ];
  }
  const kind = LIST_KINDS.has(block.kind) ? block.kind : 'paragraph';
  return [
    {
      type: 'blocks.insert',
      kind,
      at: options.before ? { before: id } : { after: id },
      select: 'start',
    },
    ...trigger,
  ];
}

/**
 * Where the gutter sits beside a block, in overlay coordinates: vertically centred on the block's
 * first line, at the block's inline start minus the gutter's own inline size (the right side in a
 * right-to-left widget), and a further `outset` away from the block, which for a table is the
 * reach of its row grips outside its edge.
 */
export function gutterPlacement(
  rects: Pick<TextEditorBlockRects, 'content' | 'firstLine'>,
  toOverlay: (rect: DOMRectReadOnly) => OverlayBox,
  size: { readonly width: number; readonly height: number },
  rtl: boolean,
  outset = 0,
): { readonly left: number; readonly top: number } {
  const content = toOverlay(rects.content);
  const line = toOverlay(rects.firstLine);
  return {
    left: rtl ? content.left + content.width + outset : content.left - size.width - outset,
    top: line.top + (line.height - size.height) / 2,
  };
}

// View -------------------------------------------------------------------------------------------

/** What the gutter needs from the element. */
export interface TextEditorGutterHost {
  readonly geometry: OverlayGeometry;
  /** Whether the editor is ready. */
  ready(): boolean;
  tree(): TextEditorBlockTree | null;
  selection(): TextEditorSelection;
  strings(): TextEditorStrings;
  layout(): TextEditorLayout;
  access(): TextEditorAccess;
  direction(): 'ltr' | 'rtl';
  /** Focus is in the editing root. */
  editingFocused(): boolean;
  /** The block menu is open, or a block drag is active. */
  pinned(): boolean;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  /** Restores editing focus and the selection through the adapter. */
  focusEditing(): void;
  /** A click on the grip of `block`; `false` when its menu must stay closed. */
  gripClick(event: MouseEvent, block: string): void;
  /** Shift+F10 or the ContextMenu key on the focused grip. */
  gripMenuKey(event: KeyboardEvent, block: string): boolean;
  /** Alt+F10 from inside the gutter: the next contextual controls. */
  cycle(event: KeyboardEvent): boolean;
  /** How far the row grips of a table reach outside its inline-start edge; 0 when unknown. */
  tableGripOutset?(): number;
}

interface Placement {
  readonly left: number;
  readonly top: number;
}

/** An owner that keeps the gutter's Buttons out of the Tab sequence outside a keyboard session. */
const OUT_OF_SEQUENCE = Object.freeze({
  disabled: false,
  focusableWhenDisabled: true,
  tabIndex: -1,
});

const MODIFIER_KEYS: ReadonlySet<string> = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'AltGraph',
  'CapsLock',
]);

/** The gutter: its template, reveal state, placement layer and keyboard session. */
export class TextEditorGutter implements OverlayLayer<Placement | null> {
  readonly #host: TextEditorGutterHost;
  #element: HTMLElement | null = null;
  #insert: HTMLElement | null = null;
  #grip: HTMLElement | null = null;
  #viewport: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #session: ToolbarController | null = null;
  #target: string | null = null;
  #hovered: string | null = null;
  #pointer: { x: number; y: number } | null = null;
  #typing = false;
  #coarse = false;
  #focusInside = false;
  #releases: (() => void)[] = [];
  readonly #outOfSequence = { owner: 'text-editor-gutter' };

  constructor(host: TextEditorGutterHost) {
    this.#host = host;
  }

  /** The block the gutter sits beside, or `null` while hidden. */
  get target(): string | null {
    return this.#target;
  }

  get element(): HTMLElement | null {
    return this.#element;
  }

  get grip(): HTMLElement | null {
    return this.#grip;
  }

  /** Whether the gutter can show at all: editable, not disabled and `layout.gutter`. */
  enabled(): boolean {
    const access = this.#host.access();
    return this.#host.layout().gutter && !access.readOnly && !access.disabled;
  }

  /** The toolbar with the insert Button and the grip; nothing while the gutter cannot show. */
  render(): TemplateResult | typeof nothing {
    if (!this.enabled()) return nothing;
    const strings = this.#host.strings();
    return html`<div
      part="text-editor-gutter"
      role="toolbar"
      aria-label=${strings.gutter}
      aria-orientation="horizontal"
      hidden
      @keydown=${this.#onKeyDown}
      @focusin=${this.#onFocusIn}
      @focusout=${this.#onFocusOut}
    >
      <tp-button
        part="text-editor-insert"
        variant="ghost"
        size="icon-xs"
        .icon=${plusIcon}
        @pointerdown=${this.#onInsertPress}
        @click=${this.#onInsertClick}
        >${strings.insertBlock}</tp-button
      ><tp-button
        part="text-editor-grip"
        variant="ghost"
        size="icon-xs"
        .icon=${gripVerticalIcon}
        @click=${this.#onGripClick}
        >${strings.grip}</tp-button
      >
    </div>`;
  }

  /** Picks up the rendered elements and listens on the viewport and the content part. */
  updated(renderRoot: ShadowRoot, viewport: HTMLElement | null, content: HTMLElement | null): void {
    const element = renderRoot.querySelector<HTMLElement>('[part~="text-editor-gutter"]');
    if (element !== this.#element) {
      this.#endSession();
      this.#element = element;
      this.#insert = element?.querySelector<HTMLElement>('[part~="text-editor-insert"]') ?? null;
      this.#grip = element?.querySelector<HTMLElement>('[part~="text-editor-grip"]') ?? null;
      this.#outOfSequenceButtons();
    }
    if (viewport !== this.#viewport || content !== this.#content) {
      this.#unlisten();
      this.#viewport = viewport;
      this.#content = content;
      if (viewport) {
        viewport.addEventListener('pointermove', this.#onPointerMove);
        viewport.addEventListener('pointerdown', this.#onPointerDown, { capture: true });
        viewport.addEventListener('pointerleave', this.#onPointerLeave);
        this.#releases.push(() => {
          viewport.removeEventListener('pointermove', this.#onPointerMove);
          viewport.removeEventListener('pointerdown', this.#onPointerDown, { capture: true });
          viewport.removeEventListener('pointerleave', this.#onPointerLeave);
        });
      }
      if (content) {
        content.addEventListener('keydown', this.#onTyping);
        this.#releases.push(() => content.removeEventListener('keydown', this.#onTyping));
      }
      this.#releases.push(this.#host.geometry.onScroll(() => this.#rehit()));
    }
    this.refresh();
  }

  /** Re-evaluates the target from the current inputs; called after every publication. */
  refresh(): void {
    const selection = this.#host.selection();
    const target = gutterTarget({
      enabled: this.enabled() && this.#host.ready() && this.#element !== null,
      pinned: this.#host.pinned(),
      current: this.#target,
      focusInside: this.#focusInside,
      headBlock: headBlock(selection),
      typing: this.#typing,
      hovered: this.#hovered,
      coarse: this.#coarse,
      editingFocused: this.#host.editingFocused(),
    });
    const exists = target !== null && this.#host.tree()?.get(target) !== undefined;
    const next = exists ? target : null;
    if (next === this.#target && next !== null) {
      this.#host.geometry.invalidate('state');
      return;
    }
    this.#target = next;
    if (next === null) this.hide();
    else this.#host.geometry.invalidate('state');
  }

  /**
   * Alt+F10 on the gutter (`uwg-te-req-blocks-2`): pins it beside the block at the selection head
   * and focuses its insert Button; `false` when it cannot show.
   */
  focusSession(): boolean {
    if (!this.enabled() || !this.#host.ready() || !this.#element) return false;
    const head = headBlock(this.#host.selection());
    if (!head) return false;
    this.#focusInside = true;
    this.#target = head;
    this.#element.hidden = false;
    this.#host.geometry.invalidate('state');
    this.#startSession();
    return this.#session?.focusFirst() ?? false;
  }

  /**
   * Places the gutter beside `id` at once, so that a menu opened by a key anchors to its grip in
   * the same task; the pin holds while the host reports it pinned.
   */
  pinTo(id: string): boolean {
    if (!this.enabled() || !this.#element || !this.#host.tree()?.get(id)) return false;
    this.#target = id;
    this.#host.geometry.layoutNow(this);
    return !this.#element.hidden;
  }

  /** Whether `node` is inside the gutter. */
  contains(node: Node | null): boolean {
    return this.#element !== null && composedContains(this.#element, node);
  }

  disconnected(): void {
    this.#unlisten();
    this.#endSession();
    this.#viewport = null;
    this.#content = null;
    this.#hovered = null;
    this.#target = null;
  }

  // Layer --------------------------------------------------------------------------------------

  wanted(): boolean {
    return this.#target !== null && this.#element !== null;
  }

  measure(context: OverlayMeasureContext): Placement | null {
    const target = this.#target;
    const element = this.#element;
    if (!target || !element || context.source.kind !== 'instance') return null;
    const rects = context.source.instance.blockRects(target);
    if (!rects) return null;
    // Beside a table the gutter sits outside its row grips, which share the grip's size until
    // one has shown.
    const table = this.#host.tree()?.get(target)?.kind === 'table';
    const outset = table ? this.#host.tableGripOutset?.() || (this.#grip?.offsetWidth ?? 0) / 2 : 0;
    return gutterPlacement(
      rects,
      context.toOverlay,
      { width: element.offsetWidth, height: element.offsetHeight },
      this.#host.direction() === 'rtl',
      outset,
    );
  }

  apply(placement: Placement | null): void {
    const element = this.#element;
    if (!element) return;
    if (!placement) {
      element.hidden = true;
      return;
    }
    element.style.transform = `translate(${placement.left}px, ${placement.top}px)`;
    element.hidden = false;
  }

  hide(): void {
    if (this.#element && !this.#host.pinned() && !this.#focusInside) this.#element.hidden = true;
  }

  // Keyboard session ---------------------------------------------------------------------------

  #outOfSequenceButtons(): void {
    for (const button of [this.#insert, this.#grip])
      if (button) compositeControl(button)?.apply(this.#outOfSequence, OUT_OF_SEQUENCE, () => {});
  }

  #startSession(): void {
    const element = this.#element;
    if (this.#session || !element) return;
    for (const button of [this.#insert, this.#grip])
      if (button) compositeControl(button)?.release(this.#outOfSequence);
    const session = new ToolbarController(element, { loopFocus: false });
    for (const button of [this.#insert, this.#grip])
      if (button) session.registerItem(button, { kind: 'button', focusableWhenDisabled: false });
    this.#session = session;
  }

  #endSession(): void {
    this.#session?.dispose();
    this.#session = null;
    this.#outOfSequenceButtons();
  }

  #leave(): void {
    this.#focusInside = false;
    this.#endSession();
    this.#host.focusEditing();
    this.refresh();
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      this.#leave();
      return;
    }
    if (event.key === 'F10' && event.altKey && !event.shiftKey) {
      if (this.#host.cycle(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    const target = this.#target;
    const onGrip =
      this.#grip !== null && composedContains(this.#grip, event.composedPath()[0] as Node);
    if (
      target &&
      onGrip &&
      ((event.key === 'F10' && event.shiftKey && !event.altKey) || event.key === 'ContextMenu') &&
      this.#host.gripMenuKey(event, target)
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  readonly #onFocusIn = (): void => {
    if (this.#focusInside) return;
    this.#focusInside = true;
    this.#startSession();
    this.refresh();
  };

  readonly #onFocusOut = (event: FocusEvent): void => {
    if (this.contains(event.relatedTarget as Node | null)) return;
    this.#focusInside = false;
    this.#endSession();
    this.refresh();
  };

  // Pointer ------------------------------------------------------------------------------------

  readonly #onPointerMove = (event: PointerEvent): void => {
    const pointer = this.#pointer;
    if (pointer && pointer.x === event.clientX && pointer.y === event.clientY) return;
    this.#pointer = { x: event.clientX, y: event.clientY };
    this.#typing = false;
    if (event.pointerType === 'mouse') this.#coarse = false;
    // Over the gutter itself the pointer keeps the block it came from.
    if (this.contains(event.composedPath()[0] as Node)) return;
    if (this.#host.pinned()) return;
    const hit = this.#host.geometry.hitBlock(event.clientX, event.clientY);
    if (hit !== null || !this.#hovered) this.#hovered = hit ?? this.#hovered;
    this.refresh();
  };

  readonly #onPointerDown = (event: PointerEvent): void => {
    this.#typing = false;
    this.#coarse = event.pointerType === 'touch' || event.pointerType === 'pen';
    queueMicrotask(() => this.refresh());
  };

  readonly #onPointerLeave = (): void => {
    this.#pointer = null;
    this.#hovered = null;
    this.refresh();
  };

  /** The block under a stationary pointer after a scroll. */
  #rehit(): void {
    const pointer = this.#pointer;
    if (!pointer || this.#host.pinned()) return;
    const hit = this.#host.geometry.hitBlock(pointer.x, pointer.y);
    if (hit !== null) this.#hovered = hit;
    this.refresh();
  }

  readonly #onTyping = (event: KeyboardEvent): void => {
    if (MODIFIER_KEYS.has(event.key) || (event.key === 'F10' && event.altKey)) return;
    if (this.#typing) return;
    this.#typing = true;
    this.refresh();
  };

  // Buttons ------------------------------------------------------------------------------------

  /** The insert Button keeps focus and the selection where they are (G2-D2 press primitive). */
  readonly #onInsertPress = (event: PointerEvent): void => {
    preserveFocusOnPress(event);
  };

  readonly #onInsertClick = (event: MouseEvent): void => {
    const target = this.#target;
    const tree = this.#host.tree();
    if (!target || !tree) return;
    const slash = this.#host.layout().suggestions.includes('slash');
    const actions = gutterInsertActions(tree, target, { before: event.altKey, slash });
    if (!actions) return;
    const proposal = (list: readonly TextEditorAction[]): TextEditorRequestProposal => ({
      target: list,
      surface: 'gutter',
      reason: 'trigger-press',
      sourceEvent: event,
      trigger: this.#insert,
      focus: true,
    });
    const selectOnly: readonly TextEditorAction[] = [
      { type: 'selection.set', selection: { kind: 'caret', block: target, position: 'start' } },
    ];
    this.#focusInside = false;
    this.#endSession();
    this.#host
      .request(proposal(actions === 'select-only' ? selectOnly : actions))
      .catch(() => undefined);
  };

  readonly #onGripClick = (event: MouseEvent): void => {
    const target = this.#target;
    if (target) this.#host.gripClick(event, target);
  };

  #unlisten(): void {
    for (const release of this.#releases) release();
    this.#releases = [];
  }
}
