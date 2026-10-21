/**
 * The selection toolbar (`uwg-te-req-surfaces-1`, `uwg-te-tab-anatomy-r12`): a contextual Toolbar
 * in the top layer of the widget's shadow root, composed from the `selectionToolbar` layout like
 * the fixed toolbar and anchored to the selection by one stable virtual anchor whose client
 * rectangles let the inline-fragment stage pick the line. It shows without debounce and never
 * animates when it follows the selection.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { TooltipProvider } from '../../../components/tooltip/handle.js';
import type { TpMenu } from '../../../components/menu/menu.js';
import { ContextualToolbarController } from '../../../foundation/contextual-toolbar.js';
import {
  rect,
  themeSpacing,
  type Rect,
  type VirtualAnchor,
} from '../../../foundation/positioning.js';
import { surfaceInteraction, type SurfaceInteraction } from '../../../foundation/surface-focus.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import type { TextEditorSelection } from '../../../foundation/text-editor/model.js';
import type { TextEditorMenuModality } from '../focus.js';
import {
  renderToolControl,
  type TextEditorToolActivation,
  type TextEditorToolHandlers,
} from '../tools/controls.js';
import type { TextEditorSelectionToolbarView } from '../tools/resolve.js';
import { TextEditorToolbarControls, toolbarTooltipContent } from './toolbar.js';

// Visibility (uwg-te-req-surfaces-1) ---------------------------------------------------------

/** What decides whether the selection toolbar shows. */
export interface SelectionToolbarVisibility {
  /** The editor is ready. */
  readonly ready: boolean;
  /** The document is editable: the engine accepts input and the widget is neither read-only nor disabled. */
  readonly editable: boolean;
  /** The layout places an available tool on the selection toolbar. */
  readonly placed: boolean;
  readonly selection: TextEditorSelection;
  /** The selected text holds more than whitespace (read for a text selection only). */
  readonly hasText: boolean;
  /**
   * Focus is in the editing root, the selection toolbar or a menu it opened, the gutter or the
   * table controls.
   */
  readonly focusInside: boolean;
  readonly composing: boolean;
  /** A pointer selection is in progress (the toolbar shows on release). */
  readonly pointerSelecting: boolean;
  /** A drag is in progress. */
  readonly dragging: boolean;
  /** A suggestion list or a popover is open. */
  readonly surfaceOpen: boolean;
}

/**
 * Whether the selection toolbar shows: for a text selection holding more than whitespace or for
 * a cell range, while ready, editable, placed and focused, and never while composing, during a
 * pointer selection or a drag, while a suggestion or a popover is open, or in block mode.
 */
export function selectionToolbarVisible(input: SelectionToolbarVisibility): boolean {
  if (!input.ready || !input.editable || !input.placed || !input.focusInside) return false;
  if (input.composing || input.pointerSelecting || input.dragging || input.surfaceOpen)
    return false;
  const { selection } = input;
  if (selection.kind === 'cells') return true;
  return selection.kind === 'text' && !selection.empty && input.hasText;
}

// Anchor (uwg-te-req-surfaces-1, Foundation §10.2) ------------------------------------------

/** The client rectangles of the selection, as the adapter reports them. */
export type SelectionRectsSource = () => readonly DOMRectReadOnly[];

const toRect = (value: DOMRectReadOnly): Rect => rect(value.x, value.y, value.width, value.height);

/** The union of rectangles, or an empty rectangle at the origin for none. */
export function unionRect(rectangles: readonly Rect[]): Rect {
  if (!rectangles.length) return rect(0, 0, 0, 0);
  const left = Math.min(...rectangles.map((value) => value.left));
  const top = Math.min(...rectangles.map((value) => value.top));
  const right = Math.max(...rectangles.map((value) => value.right));
  const bottom = Math.max(...rectangles.map((value) => value.bottom));
  return rect(left, top, right - left, bottom - top);
}

/**
 * One stable virtual anchor over the selection: its bounding rectangle and its client rectangles
 * (line boxes of text, one per cell of a cell range) read at every positioning pass, with the
 * content part as its context element.
 */
export function selectionAnchor(
  rects: SelectionRectsSource,
  context: () => Element | null,
): VirtualAnchor {
  return {
    getBoundingRectangle: () => unionRect(rects().map(toRect)),
    getClientRectangles: () => rects().map(toRect),
    // Read when positioning starts: the content part, rendered once the anchor is used.
    get contextElement() {
      return context() ?? undefined;
    },
  } as VirtualAnchor;
}

/**
 * The text of the document selection inside `root`, read through the composed ranges so that a
 * selection inside the shadow root is found; `null` without one.
 */
export function composedSelectionText(root: ShadowRoot): string | null {
  const document = root.ownerDocument;
  const selection = document.getSelection?.() as
    | (Selection & {
        getComposedRanges?: (options: { shadowRoots: ShadowRoot[] }) => StaticRange[];
      })
    | null
    | undefined;
  if (!selection || selection.rangeCount === 0) return null;
  const composed = selection.getComposedRanges?.({ shadowRoots: [root] })[0];
  if (!composed) return selection.toString();
  const range = document.createRange();
  range.setStart(composed.startContainer, composed.startOffset);
  range.setEnd(composed.endContainer, composed.endOffset);
  return range.toString();
}

// View ---------------------------------------------------------------------------------------

export interface TextEditorSelectionToolbarHost {
  readonly renderRoot: ShadowRoot;
  view(): TextEditorSelectionToolbarView | null;
  /** The visibility inputs other than the selection toolbar's own state. */
  visibility(): Omit<SelectionToolbarVisibility, 'placed' | 'pointerSelecting'>;
  /** The adapter's selection rectangles while ready, else none. */
  selectionRects(): readonly DOMRectReadOnly[];
  /** The content part, the anchor's context element. */
  content(): HTMLElement | null;
  activate(activation: TextEditorToolActivation): void;
  menuOpened(trigger: HTMLElement, modality: TextEditorMenuModality): void;
  menuClosed(changed: boolean): void;
  /** A menu opened or closed, for the widget's one transient surface (`uwg-te-req-surfaces-6`). */
  transientOpened?(owner: object, close: () => void): void;
  transientClosed?(owner: object): void;
  readonly menuFinalFocus: (interaction: SurfaceInteraction) => HTMLElement | boolean;
  /** Returns focus to the editing root with its selection, through the adapter. */
  focusEditing(): void;
  /** Alt+F10 inside the toolbar: moves focus to the next applicable contextual controls. */
  cycleContextual(sourceEvent: Event): boolean;
}

const PART = 'text-editor-selection-toolbar';

/** The selection toolbar of one widget. */
export class TextEditorSelectionToolbar {
  readonly #host: TextEditorSelectionToolbarHost;
  readonly #provider = new TooltipProvider();
  readonly #controls = new TextEditorToolbarControls();
  readonly #handlers: TextEditorToolHandlers;
  readonly #anchor: VirtualAnchor;
  #view: TextEditorSelectionToolbarView | null = null;
  #surface: HTMLElement | null = null;
  #contextual: ContextualToolbarController | null = null;
  #pointerSelecting = false;
  #openMenu: TpMenu | null = null;
  #changed = false;
  #listening: ShadowRoot | null = null;
  /** The window that the release listeners went to, kept for their removal after a move. */
  #listeningWindow: Window | null = null;

  constructor(host: TextEditorSelectionToolbarHost) {
    this.#host = host;
    this.#anchor = selectionAnchor(
      () => host.selectionRects(),
      () => host.content(),
    );
    this.#handlers = {
      activate: (activation) => {
        if (activation.reason === 'item-press' && this.#openMenu) this.#changed = true;
        host.activate(activation);
      },
      menuOpenChange: (menu, event) => this.#menuOpenChange(menu, event),
      finalFocus: host.menuFinalFocus,
      surface: 'selection-toolbar',
      iconSize: 'icon-sm',
    };
  }

  /** Whether the toolbar shows. */
  get shown(): boolean {
    return this.#contextual?.shown ?? false;
  }

  /** Whether `node` lies in the toolbar, its menus included. */
  contains(node: Node | null): boolean {
    return this.#contextual?.contains(node) ?? false;
  }

  /** Moves focus to the first enabled control while the toolbar shows (Alt+F10). */
  focus(): boolean {
    return this.#contextual?.focus() ?? false;
  }

  /** The surface part, or nothing while the layout places no available tool. */
  render(): TemplateResult | typeof nothing {
    const view = this.#host.view();
    this.#view = view;
    if (!view) return nothing;
    const handlers = this.#handlers;
    return html`<div
      part=${PART}
      class="selection-toolbar"
      aria-label=${view.label}
      @keydown=${this.#keyDown}
    >
      ${view.groups.map(
        (group, index) =>
          html`${
              index
                ? html`<tp-separator
                    class="toolbar-separator"
                    orientation="vertical"
                  ></tp-separator>`
                : nothing
            }<tp-button-group class="toolbar-buttons" .joined=${false} data-group=${group.key}
              >${group.items.map((item) => renderToolControl(item, handlers))}</tp-button-group
            >`,
      )}
      <tp-tooltip
        class="toolbar-tooltip"
        describes="none"
        .provider=${this.#provider}
        .content=${toolbarTooltipContent}
      ></tp-tooltip>
    </div>`;
  }

  /** Syncs the contextual owner and registrations with the render, then shows or hides. */
  updated(): void {
    const root = this.#host.renderRoot;
    this.#listen(root);
    const view = this.#view;
    const surface = root.querySelector<HTMLElement>(`[part~="${PART}"]`);
    if (!view || !surface) {
      this.#teardown();
      return;
    }
    if (surface !== this.#surface || !this.#contextual) {
      this.#teardown();
      this.#surface = surface;
      this.#contextual = new ContextualToolbarController(surface, {
        layer: 'top',
        placement: 'top-start',
        offset: themeSpacing(surface, 2),
        collision: { side: 'flip', align: 'shift' },
        strategy: 'fixed',
        loopFocus: true,
        preserveFocusOnPress: true,
        sequentialFocus: false,
        finalFocus: () => {
          this.#host.focusEditing();
          return false;
        },
      });
    }
    const contextual = this.#contextual;
    contextual.update({ disabled: view.disabled });
    this.#controls.sync(contextual.toolbar, surface, view.groups, view.disabled);
    this.sync();
  }

  /**
   * Shows or hides from the current state, at once (no debounce); a shown toolbar repositions at
   * the selection without a movement transition.
   */
  sync(): void {
    const contextual = this.#contextual;
    if (!contextual) return;
    const visible =
      selectionToolbarVisible({
        ...this.#host.visibility(),
        placed: this.#view !== null && this.#view.groups.length > 0,
        pointerSelecting: this.#pointerSelecting,
      }) && this.#host.selectionRects().length > 0;
    // Focus in the toolbar or a menu it opened keeps it shown while the selection stays.
    if (visible) {
      if (contextual.shown) void contextual.reposition();
      else contextual.show(this.#anchor);
    } else {
      this.#openMenu?.setOpen(false, 'programmatic');
      contextual.hide();
    }
  }

  connected(): void {
    this.#surface = null;
  }

  disconnected(): void {
    this.#teardown();
    this.#unlisten();
  }

  /** Alt+F10 inside the toolbar cycles to the next contextual controls (`uwg-te-req-key-5`). */
  readonly #keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'F10' || !event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) this.#host.cycleContextual(event);
  };

  #menuOpenChange(menu: TpMenu, event: TpSurfaceOpenChangeEvent): void {
    const { value, sourceEvent } = event.detail;
    if (!value) {
      if (menu !== this.#openMenu) return;
      const changed = this.#changed;
      this.#openMenu = null;
      this.#changed = false;
      this.#host.transientClosed?.(menu);
      this.#host.menuClosed(changed);
      return;
    }
    this.#host.transientOpened?.(menu, () => {
      if (menu.open) menu.setOpen(false, 'programmatic');
    });
    if (this.#openMenu && this.#openMenu !== menu) this.#openMenu.setOpen(false, 'programmatic');
    this.#openMenu = menu;
    this.#changed = false;
    const trigger = menu.triggerElement;
    if (!trigger) return;
    this.#host.menuOpened(
      trigger,
      surfaceInteraction(sourceEvent) === 'keyboard' ? 'keyboard' : 'pointer',
    );
  }

  /** A pointer selection in the content: pressed until released anywhere. */
  #listen(root: ShadowRoot): void {
    if (this.#listening === root && this.#listeningWindow === root.ownerDocument.defaultView)
      return;
    this.#unlisten();
    this.#listening = root;
    const view = root.ownerDocument.defaultView;
    this.#listeningWindow = view;
    root.addEventListener('pointerdown', this.#onPointerDown, { capture: true });
    view?.addEventListener('pointerup', this.#onPointerUp, true);
    view?.addEventListener('pointercancel', this.#onPointerUp, true);
  }

  #unlisten(): void {
    const root = this.#listening;
    if (!root) return;
    const view = this.#listeningWindow;
    root.removeEventListener('pointerdown', this.#onPointerDown, { capture: true });
    view?.removeEventListener('pointerup', this.#onPointerUp, true);
    view?.removeEventListener('pointercancel', this.#onPointerUp, true);
    this.#listening = null;
    this.#listeningWindow = null;
    this.#pointerSelecting = false;
  }

  readonly #onPointerDown = (event: Event): void => {
    const content = this.#host.content();
    if (!content || (event as PointerEvent).button !== 0) return;
    if (!event.composedPath().includes(content)) return;
    this.#pointerSelecting = true;
    this.sync();
  };

  readonly #onPointerUp = (): void => {
    if (!this.#pointerSelecting) return;
    this.#pointerSelecting = false;
    this.sync();
  };

  #teardown(): void {
    this.#controls.clear();
    this.#contextual?.dispose();
    this.#contextual = null;
    this.#surface = null;
    this.#openMenu = null;
    this.#changed = false;
  }
}
