/**
 * The selection toolbar (`uwg-te-req-surfaces-1`, `uwg-te-tab-anatomy-r12`): a contextual Toolbar
 * in the top layer of the widget's shadow root, composed from the `selectionToolbar` layout like
 * the fixed toolbar and anchored to the selection by one stable virtual anchor whose client
 * rectangles let the inline-fragment stage pick the line. It shows without debounce and never
 * animates when it follows the selection.
 */
import { css, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TooltipProvider } from '../../../components/tooltip/handle.js';
import type { TpMenu } from '../../../components/menu/menu.js';
import { ContextualToolbarController } from '../../../foundation/contextual-toolbar.js';
import { prepareMotion, presenceRole, type MotionHandle } from '../../../foundation/motion.js';
import { themeSpacing, type VirtualAnchor } from '../../../foundation/positioning.js';
import { surfaceInteraction, type SurfaceInteraction } from '../../../foundation/surface-focus.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import type { TextEditorSelection } from '../../../foundation/text-editor/model.js';
import type { TextEditorMenuModality } from '../focus.js';
import {
  renderToolControls,
  type TextEditorToolActivation,
  type TextEditorToolHandlers,
} from '../tools/controls.js';
import type {
  TextEditorSelectionToolbarView,
  TextEditorToolbarGroup,
  TextEditorToolbarItem,
} from '../tools/resolve.js';
import { anchorRects, selectionAnchor, type BlockBand } from './selection-anchor.js';
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
  /** A menu that a table grip, the cell handle or the block gutter opened is open. */
  readonly menuOpen: boolean;
}

/**
 * Whether the selection toolbar shows: for a text selection holding more than whitespace or for
 * a cell range, while ready, editable, placed and focused, and never while composing, during a
 * pointer selection or a drag, while a suggestion, a popover or a menu of a table grip, the cell
 * handle or the gutter is open, or in block mode.
 */
export function selectionToolbarVisible(input: SelectionToolbarVisibility): boolean {
  if (!input.ready || !input.editable || !input.placed || !input.focusInside) return false;
  if (
    input.composing ||
    input.pointerSelecting ||
    input.dragging ||
    input.surfaceOpen ||
    input.menuOpen
  )
    return false;
  const { selection } = input;
  if (selection.kind === 'cells') return true;
  return selection.kind === 'text' && !selection.empty && input.hasText;
}

// View ---------------------------------------------------------------------------------------

export interface TextEditorSelectionToolbarHost {
  readonly renderRoot: ShadowRoot;
  /** Re-renders the widget. */
  requestUpdate(): void;
  view(): TextEditorSelectionToolbarView | null;
  /** The visibility inputs other than the selection toolbar's own state. */
  visibility(): Omit<SelectionToolbarVisibility, 'placed' | 'pointerSelecting'>;
  /** The adapter's selection rectangles while ready, else none. */
  selectionRects(): readonly DOMRectReadOnly[];
  /**
   * The band the toolbar keeps clear above the selection, in client coordinates: the column grips
   * of the table holding a cell range; null otherwise.
   */
  keepClear?(): BlockBand | null;
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

/** Structure of the selection toolbar: a manual popover the positioning owner places. */
export const selectionToolbarStyles = css`
  [part~='text-editor-selection-toolbar'] {
    position: fixed;
    inset: auto;
    margin: 0;
    box-sizing: border-box;
    overflow: visible;
    color: inherit;
  }

  [part~='text-editor-selection-toolbar']:not(:popover-open) {
    display: none;
  }
`;

/**
 * The groups with each label trigger shown by its icon instead of its label, for a toolbar that
 * must narrow; a trigger with no icon to show (a mixed selection's Turn into) keeps its label.
 */
export function compactGroups(
  groups: readonly TextEditorToolbarGroup[],
): readonly TextEditorToolbarGroup[] {
  const compact = (item: TextEditorToolbarItem): TextEditorToolbarItem =>
    item.control === 'menu' && item.display === 'label' && item.icon
      ? { ...item, display: 'icon' }
      : item;
  return groups.map((group) => ({ ...group, items: group.items.map(compact) }));
}

/** The surface motion role that the selection toolbar declares (`uwg-te-req-pres-7`). */
const SURFACE_MOTION = presenceRole('surface');

/**
 * The surface motion of the selection toolbar (`uwg-te-req-pres-7`): an enter request when it
 * shows and an exit request before it hides, which waits for a driver that claimed it; following
 * the selection requests nothing. `motion` prepares the request of a phase.
 */
export class SelectionToolbarMotion {
  readonly #motion: (phase: 'enter' | 'exit') => MotionHandle;
  #handle: MotionHandle | null = null;
  #exiting = false;
  #generation = 0;

  constructor(motion: (phase: 'enter' | 'exit') => MotionHandle) {
    this.#motion = motion;
  }

  /** Whether a claimed exit is still playing, the toolbar not yet hidden. */
  get exiting(): boolean {
    return this.#exiting;
  }

  /** The toolbar shows, or shows again during its exit, which the enter request replaces. */
  entered(): void {
    this.#generation += 1;
    this.#exiting = false;
    this.#handle = this.#motion('enter');
    this.#handle.start();
  }

  /** Hides through the exit request: at once unless a driver claimed it, else once it settles. */
  exit(hide: () => void): void {
    if (this.#exiting) return;
    const generation = ++this.#generation;
    const handle = this.#motion('exit');
    this.#handle = handle;
    handle.start();
    if (!handle.claimed) {
      hide();
      return;
    }
    this.#exiting = true;
    void handle.finished.then(() => {
      if (generation !== this.#generation) return;
      this.#exiting = false;
      hide();
    });
  }

  /** Stops a playing motion; a pending exit no longer hides. */
  cancel(): void {
    this.#generation += 1;
    this.#exiting = false;
    this.#handle?.cancel();
    this.#handle = null;
  }
}

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
  /**
   * Label triggers drop their labels while the full toolbar is wider than the viewport allows;
   * `#fullWidth` is the full toolbar's width when it last showed.
   */
  #compact = false;
  #fullWidth = 0;
  readonly #motion = new SelectionToolbarMotion((phase) => {
    const owner = this.#host.renderRoot.host as HTMLElement;
    const surface = this.#surface;
    return prepareMotion(owner, surface, SURFACE_MOTION, {
      phase,
      fromState: phase === 'enter' ? 'closed' : 'open',
      toState: phase === 'enter' ? 'open' : 'closed',
      context: { placement: surface?.getAttribute('data-placement') ?? 'top' },
    });
  });

  constructor(host: TextEditorSelectionToolbarHost) {
    this.#host = host;
    this.#anchor = selectionAnchor(
      () => anchorRects(host.selectionRects(), host.keepClear?.() ?? null, this.#reach()),
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

  /**
   * Moves focus to the first enabled control while the toolbar shows (Alt+F10), with its focus
   * indicator: the chord moved focus by keyboard.
   */
  focus(): boolean {
    return this.#contextual?.focus({ focusVisible: true }) ?? false;
  }

  /** The surface part, or nothing while the layout places no available tool. */
  render(): TemplateResult | typeof nothing {
    const view = this.#host.view();
    this.#view = view;
    this.#controls.noteFocus(this.#host.renderRoot, this.#surface);
    if (!view) return nothing;
    const handlers = this.#handlers;
    const groups = this.#compact ? compactGroups(view.groups) : view.groups;
    return html`<div
      part=${PART}
      class="selection-toolbar"
      aria-label=${view.label}
      @keydown=${this.#keyDown}
    >
      ${repeat(
        groups,
        (group) => group.key,
        (group, index) =>
          html`${
              index
                ? html`<tp-separator
                    class="toolbar-separator"
                    orientation="vertical"
                  ></tp-separator>`
                : nothing
            }<tp-button-group
              class="toolbar-buttons"
              label=""
              .joined=${false}
              data-group=${group.key}
              >${renderToolControls(group.items, handlers)}</tp-button-group
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
        // Block-start, centered on the first line fragment (block-end on the last after a flip).
        placement: 'top',
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
    // Focus that the render took from the toolbar returns to the editing root with its
    // selection, as when the toolbar hides with focus inside; a shown toolbar stays shown.
    if (this.#controls.restoreFocus(root, surface)) this.#host.focusEditing();
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
      if (contextual.shown && !this.#motion.exiting) void contextual.reposition();
      else {
        contextual.show(this.#anchor);
        this.#motion.entered();
      }
      this.#fit();
    } else {
      this.#openMenu?.setOpen(false, 'programmatic');
      if (contextual.shown) this.#motion.exit(() => contextual.hide());
    }
  }

  connected(): void {
    this.#surface = null;
  }

  /** How far above the selection the shown toolbar reaches: its block size and its offset. */
  #reach(): number {
    const surface = this.#surface;
    return surface ? surface.getBoundingClientRect().height + themeSpacing(surface, 2) : 0;
  }

  /**
   * Drops the labels of label triggers while the shown toolbar is wider than the viewport less
   * the collision padding on both sides, and shows them again once the full width fits.
   */
  #fit(): void {
    const surface = this.#surface;
    const view = surface?.ownerDocument.defaultView;
    if (!surface || !view) return;
    const available = view.innerWidth - 2 * themeSpacing(surface, 2);
    const width = surface.getBoundingClientRect().width;
    if (!width) return;
    const compact = this.#compact ? this.#fullWidth > available : width > available;
    if (!this.#compact) this.#fullWidth = width;
    if (compact === this.#compact) return;
    this.#compact = compact;
    this.#host.requestUpdate();
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
    // The Menu takes its trigger once it accepts the opening, after this proposal: read the
    // proposal's own trigger first, so that the opening record exists (`uwg-te-req-a11y-6`).
    const trigger = (event.detail.trigger as HTMLElement | undefined) ?? menu.triggerElement;
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
    this.#motion.cancel();
    this.#controls.clear();
    this.#contextual?.dispose();
    this.#contextual = null;
    this.#surface = null;
    this.#openMenu = null;
    this.#changed = false;
  }
}
