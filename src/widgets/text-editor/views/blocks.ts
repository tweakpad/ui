/**
 * The block controls of the text editor, composed for the element (`uwg-te-req-blocks-2` to
 * `uwg-te-req-blocks-5`, `uwg-te-req-content-8`): the gutter, the block menu, block mode, the block
 * drag, the keyboard block moves, copying a block link and the URL fragment navigation.
 */
import { css, type nothing, type TemplateResult } from 'lit';
import { copyText } from '../../../foundation/clipboard.js';
import { preventComponentHandling } from '../../../foundation/part.js';
import { preserveFocusOnPress } from '../../../foundation/press.js';
import type {
  TextEditorAction,
  TextEditorBlockSlot,
} from '../../../foundation/text-editor/actions.js';
import type {
  TextEditorAccess,
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type { TextEditorEngineInstance } from '../../../foundation/text-editor/engine.js';
import type { TextEditorLayout } from '../../../foundation/text-editor/layout.js';
import type {
  TextEditorBlock,
  TextEditorBlockTree,
  TextEditorSelection,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type {
  TextEditorRequestSurface,
  TextEditorTool,
  TextEditorToolContext,
  TextEditorToolRegistry,
  TextEditorToolTarget,
} from '../../../foundation/text-editor/tools.js';
import type { KeyShortcut } from '../../../foundation/key-bindings.js';
import {
  blocksDeletedText,
  blocksDuplicatedText,
  blocksMovedText,
  linkCopiedText,
} from '../announcer.js';
import { TEXT_EDITOR_CONTEXTUAL_ORDER, type TextEditorContextualSurface } from '../focus.js';
import type { OverlayGeometry } from '../geometry.js';
import type { TextEditorToolActivation } from '../tools/controls.js';
import { resolveMenuGroups } from '../tools/resolve.js';
import { keyboardMoveSlot, moveAction, TextEditorBlockDrag } from './block-drag.js';
import { TextEditorBlockMenu, type TextEditorBlockMenuAction } from './block-menu.js';
import { cellRangeKeyTarget, TextEditorBlockSelection, touchedBlocks } from './block-selection.js';
import { headBlock, TextEditorGutter } from './gutter.js';

/**
 * Structure of the block controls (`uwg-te-req-blocks-2`, `uwg-te-req-blocks-5`): overlay marks
 * placed by transform from the layer origin, never in the flow, and the drag feedback.
 */
export const blocksStyles = css`
  [part~='text-editor-gutter'],
  [part~='text-editor-block-selection'],
  [part~='text-editor-drop-indicator'] {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
  }

  [part~='text-editor-gutter'] {
    pointer-events: auto;
  }

  [part~='text-editor-block-selection'][hidden],
  [part~='text-editor-drop-indicator'][hidden] {
    display: none !important;
  }

  /* Hidden, the gutter keeps its box: its placement reads its own size before it shows. */
  [part~='text-editor-gutter'][hidden] {
    visibility: hidden !important;
  }

  /* The feedback sizes the preview to the gripped block; it grows to every copy of a group, and its
     backdrop lies under the copies, a little beyond them, without moving them. */
  .block-drag-preview {
    margin: 0;
    border: 0;
    padding: 0;
    overflow: visible;
    background: transparent;

    /* The copies take the content's text colour, not the popover's system one. */
    color: inherit;
    block-size: auto !important;
  }

  .block-drag-preview:not(:popover-open) {
    display: none;
  }

  .block-drag-preview::before {
    content: '';
    position: absolute;
    inset: calc(-1 * var(--tp-space-1)) calc(-1 * var(--tp-space-2));
    inset-inline-start: calc(-1 * (var(--tp-space-2) + var(--_tp-text-editor-preview-inset, 0px)));
    z-index: -1;
    pointer-events: none;
  }

  .block-drag-count {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
  }
`;

/** The longest block text that an announcement names a block by. */
const LABEL_LENGTH = 40;

/** The label of a block in announcements: its first line of text, else its kind's name. */
export function blockLabel(text: string, kind: string, strings: TextEditorStrings): string {
  const line =
    text
      .split('\n')
      .find((part) => part.trim() !== '')
      ?.trim() ?? '';
  if (line) return line.length > LABEL_LENGTH ? `${line.slice(0, LABEL_LENGTH - 1)}…` : line;
  const names: Readonly<Record<string, string>> = {
    paragraph: strings.paragraph,
    heading: strings.heading1,
    quote: strings.blockquote,
    code: strings.codeBlock,
    'list-bullet': strings.bulletList,
    'list-ordered': strings.orderedList,
    'list-task': strings.taskList,
    divider: strings.divider,
    image: strings.image,
    table: strings.table,
  };
  return names[kind] ?? kind;
}

/** The link of a block: the document URL without its fragment, `#` and the block identifier. */
export function blockLink(href: string, id: string): string {
  const hash = href.indexOf('#');
  return `${hash < 0 ? href : href.slice(0, hash)}#${encodeURIComponent(id)}`;
}

/** The block identifier a URL fragment names, or `null`. */
export function fragmentBlock(hash: string, tree: TextEditorBlockTree | null): string | null {
  if (!tree || hash.length < 2) return null;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  return tree.get(id) ? id : null;
}

/** The class of the non-editable span that holds a task item's checkbox (adapter view hooks). */
const TASK_MARKER = 'tp-te-task-marker';

/** The task checkbox an event targets, or `null`: a checkbox inside a task marker. */
export function taskCheckboxOf(target: EventTarget | undefined): HTMLInputElement | null {
  const element = target as Partial<HTMLInputElement> | undefined;
  if (element?.tagName !== 'INPUT' || element.type !== 'checkbox') return null;
  const input = element as HTMLInputElement;
  return input.parentElement?.classList.contains(TASK_MARKER) ? input : null;
}

/**
 * The task item a press on a checkbox toggles: the deepest task item whose element holds the
 * checkbox, read through the adapter's block lookups (`holds`); `null` when none does.
 */
export function pressedTaskItem(
  tree: TextEditorBlockTree,
  holds: (id: string) => boolean,
): TextEditorBlock | null {
  let found: TextEditorBlock | null = null;
  for (const block of tree.ordered())
    if (block.kind === 'list-task' && (!found || block.depth > found.depth) && holds(block.id))
      found = block;
  return found;
}

/**
 * The request of a task checkbox press (`uwg-te-req-blocks-7`, `uwg-te-tab-reasons` r3): the
 * item's `checked` toggled, surface `content`, reason `trigger-press`; focus stays where the press
 * primitive kept it.
 */
export function taskToggleProposal(
  block: TextEditorBlock,
  sourceEvent: Event,
  trigger: Element,
): TextEditorRequestProposal {
  return {
    target: [
      {
        type: 'block.set-attrs',
        id: block.id,
        attrs: { checked: block.attrs['checked'] !== true },
      },
    ],
    surface: 'content',
    reason: 'trigger-press',
    sourceEvent,
    trigger,
    focus: false,
  };
}

/** What the block controls need from the element. */
export interface TextEditorBlocksHost {
  readonly geometry: OverlayGeometry;
  /** The instance while ready, else `null`. */
  instance(): TextEditorEngineInstance | null;
  /** The live selection while ready, else the published one. */
  selection(): TextEditorSelection;
  /** Whether the live selection is the whole-document selection (Escape selects every block). */
  wholeDocument?(): boolean;
  strings(): TextEditorStrings;
  layout(): TextEditorLayout;
  access(): TextEditorAccess;
  direction(): 'ltr' | 'rtl';
  registry(): TextEditorToolRegistry | null;
  /** The tool context of `surface`; `target` is what the tools act on, the selection by default. */
  toolContext(
    surface: TextEditorRequestSurface,
    target?: TextEditorToolTarget,
  ): TextEditorToolContext;
  toolEnabled(tool: TextEditorTool, context: TextEditorToolContext): boolean;
  shortcut(toolId: string): KeyShortcut | undefined;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  can(action: TextEditorAction): boolean;
  announce(message: string): void;
  /** Restores editing focus and the selection through the adapter. */
  focusEditing(): void;
  /** A primary press in the content part. */
  contentPressed?(): void;
  /** Focus is in the editing root. */
  editingFocused(): boolean;
  /** Alt+F10: the next contextual controls. */
  cycleContextual(event: Event): boolean;
  /** Whether a suggestion list is open, and closing it (the suggestions view's). */
  suggestionOpen?(): boolean;
  closeSuggestion?(event: KeyboardEvent): void;
  renderRoot(): ShadowRoot | null;
  viewport(): HTMLElement | null;
  content(): HTMLElement | null;
  overlay(): HTMLElement | null;
  underlay(): HTMLElement | null;
  /** The host element's `data-dragging` marker. */
  dragChanged(active: boolean): void;
  requestUpdate(): void;
  /** How far a table's row grips reach outside its inline-start edge (the table chrome's). */
  tableGripOutset?(): number;
  /** The widget's one transient surface (`uwg-te-req-surfaces-6`), for the block menu. */
  transientOpened?(owner: object, close: () => void): void;
  transientClosed?(owner: object): void;
}

const ignore = (): void => undefined;

/** The block controls of one widget. */
export class TextEditorBlocks {
  readonly #host: TextEditorBlocksHost;
  readonly selection: TextEditorBlockSelection;
  readonly gutter: TextEditorGutter;
  readonly menu: TextEditorBlockMenu;
  readonly drag: TextEditorBlockDrag;
  #layers: (() => void)[] = [];
  #opening = false;
  #window: Window | null = null;
  #navigated = false;
  readonly #pressBound = new WeakSet<HTMLElement>();

  constructor(host: TextEditorBlocksHost) {
    this.#host = host;
    const tree = (): TextEditorBlockTree | null => host.instance()?.getBlocks() ?? null;
    const editable = (): boolean => {
      const access = host.access();
      return !access.readOnly && !access.disabled;
    };
    this.selection = new TextEditorBlockSelection({
      tree,
      selection: () => host.selection(),
      request: (proposal) => host.request(proposal),
      direction: () => host.direction(),
      strings: () => host.strings(),
      announce: (message) => host.announce(message),
      editable,
      wholeDocument: () => host.wholeDocument?.() ?? false,
      openMenu: (event) => this.openMenu(event),
      dragging: () => this.drag.active,
      cancelDrag: () => this.drag.cancel(),
      suggestionOpen: () => host.suggestionOpen?.() ?? false,
      closeSuggestion: (event) => host.closeSuggestion?.(event),
      underlay: () => host.underlay(),
      overlay: () => host.overlay(),
      invalidate: () => host.geometry.invalidate('state'),
    });
    this.gutter = new TextEditorGutter({
      geometry: host.geometry,
      ready: () => host.instance() !== null,
      tree,
      selection: () => host.selection(),
      strings: () => host.strings(),
      layout: () => host.layout(),
      access: () => host.access(),
      direction: () => host.direction(),
      editingFocused: () => host.editingFocused(),
      pinned: () => this.#opening || this.menu.open || this.drag.active,
      request: (proposal) => host.request(proposal),
      focusEditing: () => host.focusEditing(),
      gripClick: (event, block) => this.#gripClick(event, block),
      gripMenuKey: (event, block) => this.#gripMenuKey(event, block),
      cycle: (event) => host.cycleContextual(event),
      tableGripOutset: () => host.tableGripOutset?.() ?? 0,
    });
    this.menu = new TextEditorBlockMenu({
      strings: () => host.strings(),
      groups: () => this.#menuGroups(),
      activate: (activation) => this.#activate(activation),
      perform: (action, event) => this.#perform(action, event, 'block-menu'),
      finalFocus: () => {
        if (host.access().disabled) return false;
        if (!host.instance()) return true;
        host.focusEditing();
        return false;
      },
      openChanged: (open) => {
        if (open) host.transientOpened?.(this.menu, () => this.menu.close());
        else host.transientClosed?.(this.menu);
        this.gutter.refresh();
        host.requestUpdate();
      },
      requestUpdate: () => host.requestUpdate(),
    });
    this.drag = new TextEditorBlockDrag({
      instance: () => host.instance(),
      gripBlock: () => this.gutter.target,
      blockSelection: () => this.selection.range?.ids ?? null,
      viewport: () => host.viewport(),
      content: () => host.content(),
      overlay: () => host.overlay(),
      direction: () => host.direction(),
      strings: () => host.strings(),
      announce: (message) => host.announce(message),
      can: (action) => host.can(action),
      request: (proposal) => host.request(proposal),
      blockLabel: (id) => this.label(id),
      dragChanged: (active) => {
        host.dragChanged(active);
        this.gutter.refresh();
      },
    });
    this.drag.setInvalidate(() => host.geometry.invalidate('state'));
  }

  /** The gutter as an Alt+F10 surface, after the selection toolbar and the table controls. */
  readonly contextual: TextEditorContextualSurface = {
    order: TEXT_EDITOR_CONTEXTUAL_ORDER.gutter,
    applicable: () =>
      this.gutter.enabled() &&
      this.#host.instance() !== null &&
      headBlock(this.#host.selection()) !== null,
    enter: () => this.gutter.focusSession(),
    holdsFocus: () => this.gutter.contains(this.#host.renderRoot()?.activeElement ?? null),
    leave: () => undefined,
  };

  /** The overlay's block controls: the gutter. */
  render(): TemplateResult | typeof nothing {
    return this.gutter.render();
  }

  /** The block menu, outside the viewport and the overlay like every floating surface. */
  renderMenu(): TemplateResult | typeof nothing {
    return this.menu.render(this.gutter.enabled());
  }

  /** After each render of the element. */
  updated(): void {
    const root = this.#host.renderRoot();
    if (!root) return;
    if (!this.#layers.length)
      this.#layers = [
        this.#host.geometry.addLayer(this.selection),
        this.#host.geometry.addLayer(this.gutter),
        this.#host.geometry.addLayer(this.drag),
      ];
    this.gutter.updated(root, this.#host.viewport(), this.#host.content());
    this.menu.updated(root, this.gutter.grip);
    this.drag.sync(this.gutter.grip);
    // The Draggable follows the gutter to the pressed block before the sensor reads it.
    const gutter = this.gutter.element;
    if (gutter && !this.#pressBound.has(gutter)) {
      this.#pressBound.add(gutter);
      gutter.addEventListener('pointerdown', () => this.drag.sync(this.gutter.grip), {
        capture: true,
      });
    }
    const content = this.#host.content();
    if (content && !content.dataset['tpBlocks']) {
      content.dataset['tpBlocks'] = '';
      content.addEventListener('mousedown', this.#onContentPress, { capture: true });
      content.addEventListener('pointerdown', this.#onContentPointerDown, { capture: true });
      content.addEventListener('click', this.#onTaskClick, { capture: true });
    }
  }

  /** After each publication of the state. */
  stateChanged(): void {
    this.selection.sync();
    this.gutter.refresh();
    this.drag.sync(this.gutter.grip);
  }

  connected(view: Window | null): void {
    if (view === this.#window) return;
    this.#window?.removeEventListener('hashchange', this.#onHashChange);
    this.#window = view;
    view?.addEventListener('hashchange', this.#onHashChange);
  }

  disconnected(): void {
    this.#window?.removeEventListener('hashchange', this.#onHashChange);
    this.#window = null;
    for (const release of this.#layers) release();
    this.#layers = [];
    this.gutter.disconnected();
    this.menu.disconnected();
    this.drag.release();
    this.selection.release();
    const content = this.#host.content();
    if (content) {
      content.removeEventListener('mousedown', this.#onContentPress, { capture: true });
      content.removeEventListener('pointerdown', this.#onContentPointerDown, { capture: true });
      content.removeEventListener('click', this.#onTaskClick, { capture: true });
      delete content.dataset['tpBlocks'];
    }
  }

  /** The editor became ready: a URL fragment naming a block reveals it, on the first mount only. */
  ready(): void {
    this.selection.reset();
    if (this.#navigated) return;
    this.#navigated = true;
    this.#navigate();
  }

  /** The ready instance went away. */
  detached(): void {
    this.drag.cancel();
    this.menu.close();
    this.selection.reset();
  }

  // Router hooks -------------------------------------------------------------------------------

  /** A keydown in the editing root before the keymap: Escape and the block-mode keys. */
  editingKey(event: KeyboardEvent): boolean {
    if (!this.#host.instance()) return false;
    // The Escape that cancelled a drag is its only step.
    if (event.key === 'Escape' && this.drag.cancelledBy(event)) return true;
    if (event.key === 'Escape' && !event.altKey && !event.ctrlKey && !event.metaKey)
      return event.shiftKey ? false : this.selection.escape(event);
    return this.#cellRangeKey(event) || this.selection.handleKey(event);
  }

  /**
   * A printable key or Enter over a cell range while editable (`uwg-te-req-tables-5`): one request
   * whose `content.insert` clears the range's cells and applies the key in its first cell, as one
   * change on both engines.
   */
  #cellRangeKey(event: KeyboardEvent): boolean {
    const access = this.#host.access();
    if (event.isComposing || access.readOnly || access.disabled) return false;
    const target = cellRangeKeyTarget(this.#host.selection(), event);
    if (!target) return false;
    void this.#host
      .request({
        target,
        surface: 'keyboard',
        reason: 'keyboard',
        sourceEvent: event,
        trigger: null,
      })
      .catch(ignore);
    return true;
  }

  /** A block tool's shortcut that the widget performs; whether it handled it. */
  blockTool(id: string, event: KeyboardEvent): boolean {
    switch (id) {
      case 'move-block-up':
      case 'move-block-down':
      case 'copy-block-link':
        return this.#perform(id, event, 'keyboard');
      case 'duplicate-block':
        return this.#duplicate(event, 'keyboard');
      case 'open-block-menu':
        return this.openMenu(event);
      default:
        return false;
    }
  }

  /**
   * Opens the block menu for the block selection, or else for the blocks that the selection
   * touches, which become the block selection; with the grip beside the first of them.
   */
  openMenu(event: KeyboardEvent): boolean {
    const tree = this.#host.instance()?.getBlocks() ?? null;
    if (!tree || !this.gutter.enabled()) return false;
    const ids = this.selection.range?.ids ?? touchedBlocks(tree, this.#host.selection());
    const first = ids[0];
    if (first === undefined) return false;
    this.#opening = true;
    try {
      if (!this.selection.range) this.selection.enterFromSelection(event);
      // The menu anchors to the grip beside the first block, which is revealed first: a menu
      // anchored out of view would not take focus.
      this.#host
        .instance()
        ?.blockElement(first)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      if (!this.gutter.pinTo(first)) return false;
      return this.menu.openFromKey(event);
    } finally {
      this.#opening = false;
    }
  }

  /** The announcement label of a block. */
  label(id: string): string {
    const instance = this.#host.instance();
    const block = instance?.getBlocks().get(id);
    if (!instance || !block) return id;
    let text: string;
    try {
      text = instance.getContent('text', { blocks: [id] });
    } catch {
      text = '';
    }
    return blockLabel(text, block.kind, this.#host.strings());
  }

  // Internals ----------------------------------------------------------------------------------

  #menuGroups() {
    const registry = this.#host.registry();
    if (!registry) return [];
    const layout = this.#host.layout();
    return resolveMenuGroups(
      layout.blockMenu,
      {
        registry,
        layout,
        access: this.#host.access(),
        // The tools act on the targeted blocks (`uwg-te-req-blocks-3`).
        context: (surface) => this.#host.toolContext(surface, this.#toolTarget()),
        // The moves resolve no action of their own: the widget finds their slot.
        enabled: (tool, context) =>
          tool.id === 'move-block-up' || tool.id === 'move-block-down'
            ? this.#canMove(tool.id === 'move-block-up' ? 'up' : 'down')
            : this.#host.toolEnabled(tool, context),
        shortcut: (id) => this.#host.shortcut(id),
      },
      'block-menu',
    );
  }

  /**
   * Whether the target blocks can move one slot up or down; kept while the tree and the targets
   * stay the same, since the menu resolves its items on every render.
   */
  #canMove(direction: 'up' | 'down'): boolean {
    const access = this.#host.access();
    const tree = this.#host.instance()?.getBlocks();
    const ids = this.#targets();
    if (access.readOnly || access.disabled || !tree || !ids.length) return false;
    const key = ids.join('\u0000');
    let moves = this.#moves;
    if (moves?.tree !== tree || moves.key !== key) {
      const can = (slot: TextEditorBlockSlot | null) =>
        slot !== null && this.#host.can(moveAction(tree, ids, slot));
      moves = {
        tree,
        key,
        up: can(keyboardMoveSlot(tree, ids, 'up')),
        down: can(keyboardMoveSlot(tree, ids, 'down')),
      };
      this.#moves = moves;
    }
    return moves[direction];
  }

  #moves: {
    readonly tree: TextEditorBlockTree;
    readonly key: string;
    readonly up: boolean;
    readonly down: boolean;
  } | null = null;

  /** The blocks a block action acts on: the block selection, else those the selection touches. */
  #targets(): readonly string[] {
    const tree = this.#host.instance()?.getBlocks();
    if (!tree) return [];
    return this.selection.range?.ids ?? touchedBlocks(tree, this.#host.selection());
  }

  /** The block menu's tool target: the blocks it acts on. */
  #toolTarget(): TextEditorToolTarget {
    return { kind: 'blocks', ids: this.#targets() };
  }

  #activate(activation: TextEditorToolActivation): void {
    const count = this.#targets().length;
    void this.#host
      .request({
        target: activation.tool,
        ...(activation.value === undefined ? {} : { value: activation.value }),
        toolTarget: this.#toolTarget(),
        surface: activation.surface,
        reason: activation.reason,
        sourceEvent: activation.sourceEvent,
        trigger: activation.trigger,
        focus: activation.focus,
      })
      .then((outcome) => {
        if (outcome !== 'applied') return;
        if (activation.tool === 'duplicate-block')
          this.#host.announce(blocksDuplicatedText(this.#host.strings(), count));
        else if (activation.tool === 'delete-block')
          this.#host.announce(blocksDeletedText(this.#host.strings(), count));
      })
      .catch(ignore);
  }

  #duplicate(event: KeyboardEvent, surface: TextEditorRequestSurface): boolean {
    const ids = this.#targets();
    if (!ids.length) return true;
    void this.#host
      .request({
        target: [{ type: 'blocks.duplicate', ids }],
        surface,
        reason: 'hotkey',
        sourceEvent: event,
        trigger: null,
      })
      .then((outcome) => {
        if (outcome === 'applied')
          this.#host.announce(blocksDuplicatedText(this.#host.strings(), ids.length));
      })
      .catch(ignore);
    return true;
  }

  /** A widget-owned block action from a key or the block menu; whether it was handled. */
  #perform(
    action: TextEditorBlockMenuAction,
    event: Event,
    surface: TextEditorRequestSurface,
  ): boolean {
    if (action === 'copy-block-link') {
      this.#copyLink(event, surface);
      return true;
    }
    const tree = this.#host.instance()?.getBlocks();
    const ids = this.#targets();
    if (!tree || !ids.length) return true;
    const slot = keyboardMoveSlot(tree, ids, action === 'move-block-up' ? 'up' : 'down');
    if (!slot) return true;
    const labels = ids.length === 1 ? [this.label(ids[0]!)] : ids;
    void this.#host
      .request({
        target: [moveAction(tree, ids, slot)],
        surface,
        reason: surface === 'keyboard' ? 'hotkey' : 'item-press',
        sourceEvent: event,
        trigger: null,
      })
      .then((outcome) => {
        if (outcome === 'applied')
          this.#host.announce(blocksMovedText(this.#host.strings(), labels));
      })
      .catch(ignore);
    return true;
  }

  /** Copy link (`uwg-te-req-content-8`): acts once its request without actions is accepted. */
  #copyLink(event: Event, surface: TextEditorRequestSurface): void {
    const id = this.#targets()[0];
    const document = this.#host.renderRoot()?.ownerDocument;
    const href = document?.defaultView?.location.href;
    if (id === undefined || !document || href === undefined) return;
    const link = blockLink(href, id);
    void this.#host
      .request({
        target: 'copy-block-link',
        surface,
        reason: surface === 'keyboard' ? 'hotkey' : 'item-press',
        sourceEvent: event,
        trigger: null,
      })
      .then(async (outcome) => {
        if (outcome !== 'applied') return;
        const copied = await copyText(document, link);
        this.#host.announce(linkCopiedText(this.#host.strings(), copied));
      })
      .catch(ignore);
  }

  /**
   * A grip click enters block mode on its block, or keeps the block selection holding it, and
   * lets the menu open; with Shift in block mode it extends the selection and keeps the menu
   * closed.
   */
  #gripClick(event: MouseEvent, block: string): void {
    if (this.selection.active && event.shiftKey) {
      preventComponentHandling(event);
      this.selection.extendTo(block, event);
      return;
    }
    void this.selection.selectBlock(block, event);
  }

  /** Shift+F10 or the ContextMenu key on the focused grip of a block. */
  #gripMenuKey(event: KeyboardEvent, block: string): boolean {
    void this.selection.selectBlock(block, event);
    this.#opening = true;
    try {
      return this.menu.openFromKey(event);
    } finally {
      this.#opening = false;
    }
  }

  /** In block mode a Shift press on block content extends the selection from its anchor. */
  readonly #onContentPress = (event: MouseEvent): void => {
    if (!event.shiftKey || event.button !== 0 || !this.selection.active) return;
    const block = this.#host.geometry.hitBlock(event.clientX, event.clientY);
    if (block && this.selection.extendTo(block, event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  /**
   * A press in the content: the host learns of a primary one (a suggestion list's lane names it),
   * and a press on a task checkbox keeps focus and the selection where they are (G2-D2).
   */
  readonly #onContentPointerDown = (event: PointerEvent): void => {
    if (event.button === 0) this.#host.contentPressed?.();
    if (taskCheckboxOf(event.composedPath()[0])) preserveFocusOnPress(event);
  };

  /** A task checkbox's activation toggles its item through one request (surface `content`). */
  readonly #onTaskClick = (event: MouseEvent): void => {
    const checkbox = taskCheckboxOf(event.composedPath()[0]);
    if (!checkbox) return;
    // The checkbox's own toggle stays cancelled: the item changes only through the request.
    event.preventDefault();
    const instance = this.#host.instance();
    if (!instance) return;
    const block = pressedTaskItem(
      instance.getBlocks(),
      (id) => instance.blockElement(id)?.contains(checkbox) === true,
    );
    if (!block) return;
    const proposal = taskToggleProposal(block, event, checkbox);
    // After the click's dispatch: cancelling it restores the checkbox's previous state at its end,
    // which would overwrite the state that the applied request renders.
    setTimeout(() => void this.#host.request(proposal).catch(() => undefined), 0);
  };

  /** URL fragment navigation (`uwg-te-req-content-8`): reveal and block-select, no request. */
  #navigate(): void {
    const instance = this.#host.instance();
    const hash = this.#window?.location.hash ?? '';
    const tree = instance?.getBlocks() ?? null;
    const id = fragmentBlock(hash, tree);
    if (!instance || !tree || id === null) return;
    instance.blockElement(id)?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    void this.selection.select({ anchor: id, head: id, ids: [id] }, undefined, false);
  }

  readonly #onHashChange = (): void => {
    this.#navigate();
  };
}
