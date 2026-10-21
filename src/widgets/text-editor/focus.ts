/**
 * Focus handling of the widget: the Escape order, the focus policy of activations, the blur commit,
 * the focus entry through the adapter and the focus return of toolbar menus.
 */
import { composedContains, deepActiveElement } from '../../foundation/focus.js';
import type { SurfaceInteraction } from '../../foundation/surface-focus.js';
import type { TextEditorAccess } from '../../foundation/text-editor/controller.js';
import type {
  TextEditorEngineInstance,
  TextEditorFocusPosition,
} from '../../foundation/text-editor/engine.js';
import type {
  TextEditorSelection,
  TextEditorSelectionInput,
} from '../../foundation/text-editor/model.js';
import type { TextEditorKeyZone } from './router.js';

/** The states that Escape acts on, in the order of `uwg-te-req-key-4` and `uwg-te-req-surfaces-6`. */
export interface TextEditorEscapeContext {
  /** A block drag, a cell-handle drag or a column resize is in progress. */
  readonly gesture: boolean;
  readonly composing: boolean;
  /** A transient surface that handles Escape itself is open (it closes itself). */
  readonly surfaceOpen: boolean;
  readonly suggestionOpen: boolean;
  /** The kind of the selection; a caret is a collapsed `text` selection. */
  readonly selection: TextEditorSelection['kind'];
  readonly blockMode: boolean;
}

/** The first step of the Escape order that applies. */
export type TextEditorEscapeAction =
  | 'cancel-gesture' // gesture
  | 'ignore' // composing
  | 'yield' // surfaceOpen: the surface closes itself; the keymap does not consume
  | 'close-suggestion' // suggestionOpen
  | 'collapse-cells' // selection 'cells'
  | 'enter-block-mode' // selection 'text' (text selection or caret)
  | 'end-block-mode' // blockMode: ends with no selection and keeps focus
  | 'pass'; // otherwise: neither consumed nor prevented

/** The first applicable step, in exactly the order above. */
export function escapeStep(context: TextEditorEscapeContext): TextEditorEscapeAction {
  if (context.gesture) return 'cancel-gesture';
  if (context.composing) return 'ignore';
  if (context.surfaceOpen) return 'yield';
  if (context.suggestionOpen) return 'close-suggestion';
  if (context.selection === 'cells') return 'collapse-cells';
  if (context.selection === 'text') return 'enter-block-mode';
  if (context.blockMode) return 'end-block-mode';
  return 'pass';
}

/** How a toolbar menu was opened. */
export type TextEditorMenuModality = 'pointer' | 'keyboard';

/** The source of an activation whose request may move focus. */
export type TextEditorActivation =
  | { readonly reason: 'trigger-press'; readonly modality: TextEditorMenuModality }
  | { readonly reason: 'item-press' }
  | { readonly reason: 'hotkey'; readonly zone: TextEditorKeyZone };

/**
 * Whether applying the request of an activation moves focus into the editing root: a control press moves
 * none (keyboard activation keeps focus on the control, `uwg-te-req-a11y-2`; a pointer press moves no
 * focus, `uwg-te-req-key-8`), a menu item press does (`uwg-te-req-a11y-6`), and a hotkey only in the
 * editing root. The decision precedes dispatch, so a cancelled request follows the same policy
 * (`uwg-te-req-evt-1`). The router and the toolbar both call it.
 */
export function activationMovesFocus(activation: TextEditorActivation): boolean {
  if (activation.reason === 'item-press') return true;
  if (activation.reason === 'hotkey') return activation.zone === 'editing';
  return false;
}

/** The selection input that sets a reported selection again, or null for no selection. */
export function selectionInput(selection: TextEditorSelection): TextEditorSelectionInput | null {
  switch (selection.kind) {
    case 'text':
      return { kind: 'text', anchor: selection.anchor, head: selection.head };
    case 'blocks':
      return { kind: 'blocks', ids: selection.ids };
    case 'cells':
      return { kind: 'cells', table: selection.table, range: selection.range };
    default:
      return null;
  }
}

// Alt+F10 contextual controls (uwg-te-tab-keymap-host-r2, uwg-te-req-tables-7) ---------------

/**
 * A surface of contextual controls that Alt+F10 moves focus into: the selection toolbar, the
 * table-controls session or the gutter, cycled in ascending `order`.
 */
export interface TextEditorContextualSurface {
  /** The cycle position: lower comes first (selection toolbar, table controls, gutter). */
  readonly order: number;
  /** Whether it applies to the selection now. */
  applicable(): boolean;
  /** Moves focus into it; returns whether it took focus. */
  enter(sourceEvent: Event): boolean;
  /** Whether focus is in it now. */
  holdsFocus(): boolean;
  /** Called when the cycle moves focus from it to another surface. */
  leave?(): void;
}

/**
 * The surface Alt+F10 enters next: after the one that holds focus, in cycle order and wrapping,
 * the first applicable one; from the editing root (none holds focus), the first applicable one.
 * `null` when none other applies.
 */
export function nextContextualSurface<
  S extends Pick<TextEditorContextualSurface, 'order' | 'applicable' | 'holdsFocus'>,
>(surfaces: Iterable<S>): S | null {
  const ordered = [...surfaces].sort((a, b) => a.order - b.order);
  const current = ordered.findIndex((surface) => surface.holdsFocus());
  for (let step = 1; step <= ordered.length; step++) {
    const index = current < 0 ? step - 1 : (current + step) % ordered.length;
    const surface = ordered[index]!;
    if (index === current) break;
    if (surface.applicable()) return surface;
  }
  return null;
}

interface MenuRecord {
  readonly trigger: HTMLElement | null;
  readonly modality: TextEditorMenuModality | null;
  /** The element focused before the press, or null. */
  readonly previous: Element | null;
  changed: boolean;
}

interface PendingFocus {
  position: TextEditorFocusPosition;
  /** The deep active element at the call. */
  active: Element | null;
  readonly settle: (() => void)[];
}

/** What focus handling needs from the element, which implements it. */
export interface TextEditorFocusHost {
  /** The widget element: focus in its composed subtree is focus in the widget. */
  readonly element: HTMLElement;
  /** The content part, whose subtree holds the editing root. */
  contentElement(): Element | null;
  /** The instance while the editor is ready, else null. */
  readyInstance(): TextEditorEngineInstance | null;
  access(): TextEditorAccess;
  /** Focus entered (true) or left (false) the widget. */
  focusChanged(focused: boolean): void;
  /** The `input-blur` commit of an uncommitted engine change (`uwg-te-req-evt-4`). */
  commitPending(sourceEvent: Event): boolean;
}

export class TextEditorFocus {
  readonly #host: TextEditorFocusHost;
  #root: ShadowRoot | null = null;
  #focused = false;
  #pending: PendingFocus | null = null;
  #refocus = false;
  #remembered: TextEditorSelection | null = null;
  #menu: MenuRecord | null = null;

  /**
   * The final focus of every top-level toolbar menu, a stable reference. Takes and clears the menu record:
   * - the widget is disabled: `false`, no focus call (nothing in it is focusable, `uwg-te-req-prop-3`);
   * - an item changed the document, or a pointer opening whose previous focus was in the content part: the
   *   editing root and `false` while ready, else the trigger (or `true` without one);
   * - a keyboard opening: the trigger;
   * - a pointer opening: the element focused before the press while it is still connected, else the trigger;
   * - no record: `true` (`uwg-te-req-a11y-6`).
   */
  readonly menuFinalFocus: (interaction: SurfaceInteraction) => HTMLElement | boolean = () => {
    const record = this.#menu;
    this.#menu = null;
    if (this.#host.access().disabled) return false;
    if (!record) return true;
    const fallback = record.trigger ?? true;
    const content = this.#host.contentElement();
    const fromContent =
      record.modality === 'pointer' &&
      content !== null &&
      composedContains(content, record.previous);
    if (record.changed || fromContent) {
      if (!this.#host.readyInstance()) return fallback;
      void this.focusEditing('restore');
      return false;
    }
    if (record.modality === 'pointer' && record.previous?.isConnected)
      return record.previous as HTMLElement;
    return fallback;
  };

  constructor(host: TextEditorFocusHost) {
    this.#host = host;
  }

  /** Listens for `focusin` and `focusout` on the shadow root and reads the initial focus. */
  attach(renderRoot: ShadowRoot): void {
    if (this.#root === renderRoot) return;
    this.detach();
    this.#root = renderRoot;
    renderRoot.addEventListener('focusin', this.#onFocusIn);
    renderRoot.addEventListener('focusout', this.#onFocusOut);
    const document = this.#document();
    this.#focused =
      document !== null && composedContains(this.#host.element, deepActiveElement(document));
  }

  detach(): void {
    const root = this.#root;
    if (!root) return;
    root.removeEventListener('focusin', this.#onFocusIn);
    root.removeEventListener('focusout', this.#onFocusOut);
    this.#root = null;
  }

  /** Whether focus is in the widget: the input of the blur commit. */
  get focused(): boolean {
    return this.#focused;
  }

  /**
   * Focuses the editing root through the adapter, at `restore` by default; when ready, synchronously, before
   * the returned promise settles. While ready and disabled: no change. Before ready: kept with the position
   * of the last call and applied when ready, unless `blur()` follows, focus moves to another element or the
   * widget is disabled at ready (`uwg-te-req-prop-2`). Resolves once applied or dropped.
   */
  focusEditing(position: TextEditorFocusPosition = 'restore'): Promise<void> {
    const instance = this.#host.readyInstance();
    if (instance) {
      if (this.#host.access().disabled) return Promise.resolve();
      return instance.focus(position).catch(() => undefined);
    }
    const document = this.#document();
    const active = document ? deepActiveElement(document) : null;
    return new Promise<void>((resolve) => {
      const pending = this.#pending ?? { position, active, settle: [] };
      pending.position = position;
      pending.active = active;
      pending.settle.push(resolve);
      this.#pending = pending;
    });
  }

  /** Drops a pending focus; when ready, blurs the instance. */
  blur(): void {
    this.#drop();
    this.#host.readyInstance()?.blur();
  }

  /**
   * Called right before a setter that remounts, while an instance is mounted or mounting, never on
   * reconnection. Remembers the live selection and, when focus is in the content part, a pending refocus
   * (`uwg-te-req-engine-8`).
   */
  beforeRemount(): void {
    this.#remembered = this.#host.readyInstance()?.getState().selection ?? null;
    const content = this.#host.contentElement();
    const document = this.#document();
    this.#refocus =
      content !== null &&
      document !== null &&
      composedContains(content, deepActiveElement(document));
  }

  /** Called when the editor is ready: applies a pending focus, else a pending refocus. */
  ready(): void {
    const instance = this.#host.readyInstance();
    if (!instance) return;
    const pending = this.#pending;
    if (pending) {
      this.#pending = null;
      this.#refocus = false;
      this.#remembered = null;
      const document = this.#document();
      const active = document ? deepActiveElement(document) : null;
      const moved = active !== null && active !== pending.active && active !== document?.body;
      if (this.#host.access().disabled || moved) {
        for (const settle of pending.settle) settle();
        return;
      }
      void instance
        .focus(pending.position)
        .catch(() => undefined)
        .then(() => {
          for (const settle of pending.settle) settle();
        });
      return;
    }
    if (!this.#refocus) return;
    const remembered = this.#remembered;
    this.#refocus = false;
    this.#remembered = null;
    if (this.#host.access().disabled) return;
    const input = remembered ? selectionInput(remembered) : null;
    const action = input ? ({ type: 'selection.set', selection: input } as const) : null;
    if (action && instance.can(action))
      instance.execute([action], { reason: 'programmatic', focus: true });
    else void instance.focus('start').catch(() => undefined);
  }

  /**
   * A top-level toolbar menu opens, before it takes focus: replaces any earlier record with the trigger,
   * the modality and the element focused before the press.
   */
  menuOpened(trigger: HTMLElement, modality: TextEditorMenuModality): void {
    const document = this.#document();
    const previous = document ? deepActiveElement(document) : null;
    this.#menu = {
      trigger,
      modality,
      previous: previous === document?.body ? null : previous,
      changed: false,
    };
  }

  /**
   * The menu closes, before its final focus resolves; `changed` when one of its items issued a request.
   * Without an opening record, `changed` alone decides the final focus.
   */
  menuClosed(changed: boolean): void {
    if (this.#menu) this.#menu.changed = changed;
    else this.#menu = { trigger: null, modality: null, previous: null, changed };
  }

  // One transient surface at a time (uwg-te-req-surfaces-6) ----------------------------------

  #transient: { readonly owner: object; readonly close: () => void } | null = null;

  /**
   * A transient surface opens: a suggestion list, the link or image popover, the table size
   * picker, or a menu of the widget (a toolbar's, the block menu, a table menu); a submenu belongs
   * to its menu and never comes here. The surface that was open before closes through its `close`,
   * which must do nothing once that surface has closed by itself. `owner` identifies the surface.
   */
  transientOpened(owner: object, close: () => void): void {
    const previous = this.#transient;
    this.#transient = { owner, close };
    if (previous && previous.owner !== owner) previous.close();
  }

  /** A transient surface closed by itself; forgets it while it is the open one. */
  transientClosed(owner: object): void {
    if (this.#transient?.owner === owner) this.#transient = null;
  }

  /** The owner of the open transient surface, or null. */
  get transientOwner(): object | null {
    return this.#transient?.owner ?? null;
  }

  // Alt+F10 contextual controls --------------------------------------------------------------

  readonly #contextual = new Set<TextEditorContextualSurface>();

  /** Adds a surface to the Alt+F10 cycle; the returned function removes it. */
  registerContextual(surface: TextEditorContextualSurface): () => void {
    this.#contextual.add(surface);
    return () => {
      this.#contextual.delete(surface);
    };
  }

  /**
   * Alt+F10: moves focus to the next applicable contextual surface (`nextContextualSurface`),
   * leaving the one that holds it. Returns whether a surface took focus. Nothing while disabled.
   */
  cycleContextual(sourceEvent: Event): boolean {
    if (this.#host.access().disabled) return false;
    const current = [...this.#contextual].find((surface) => surface.holdsFocus()) ?? null;
    const next = nextContextualSurface(this.#contextual);
    if (!next) return false;
    if (current && current !== next) current.leave?.();
    return next.enter(sourceEvent);
  }

  #document(): Document | null {
    return this.#host.element.ownerDocument ?? null;
  }

  #drop(): void {
    const pending = this.#pending;
    this.#pending = null;
    if (pending) for (const settle of pending.settle) settle();
  }

  readonly #onFocusIn = (): void => {
    if (this.#focused) return;
    this.#focused = true;
    this.#host.focusChanged(true);
  };

  readonly #onFocusOut = (event: Event): void => {
    const related = (event as FocusEvent).relatedTarget as Node | null;
    if (related && composedContains(this.#host.element, related)) return;
    if (!related && this.#document()?.hasFocus() === false) return;
    this.#focused = false;
    this.#host.focusChanged(false);
    this.#host.commitPending(event);
  };
}
