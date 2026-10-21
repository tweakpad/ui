/**
 * The contextual Toolbar owner (Foundation Toolbar contextual profile, `uwg-te-tb-req-context`): a
 * toolbar that its owner shows and hides from its own state, without a trigger, in a non-modal
 * surface anchored to an element or a virtual anchor, such as one over a text selection. It hosts
 * the toolbar's roving focus, never moves focus when it shows, returns focus to the owner's
 * editing target on Escape (and on Tab while out of the sequential order) and when it hides with
 * focus inside, and follows a changed anchor without a closed interval.
 */
import { composedContains, deepActiveElement, focusManaged, isAvailable } from './focus.js';
import { keyEventPreempted } from './key-bindings.js';
import {
  positionSurface,
  type AnchorGeometry,
  type AutoUpdatePolicy,
  type CollisionPolicy,
  type InlineFragmentOptions,
  type Placement,
  type PositioningHandle,
  type PositioningOffset,
  type PositioningOffsetResolver,
  type PositioningStrategy,
} from './positioning.js';
import { CleanupScope } from './services.js';
import { resolveSurfaceFocus, type SurfaceFocusTarget } from './surface-focus.js';
import { ToolbarController, type ToolbarOptions } from './toolbar.js';

/** Where the surface lives: in its owner's tree, or promoted to the top layer as a manual popover. */
export type ContextualToolbarLayer = 'inline' | 'top';

/** The positioning of a contextual toolbar; each member as `positionSurface` takes it. */
export interface ContextualToolbarPositioning {
  /** Default `top`. */
  placement?: Placement | undefined;
  offset?: PositioningOffset | PositioningOffsetResolver | undefined;
  /** Default flip on the side and shift on the alignment. */
  collision?: CollisionPolicy | undefined;
  strategy?: PositioningStrategy | undefined;
  padding?: number | undefined;
  /** Pointer coordinates and padding for an anchor with several client rectangles. */
  inline?: InlineFragmentOptions | undefined;
  tracking?: AutoUpdatePolicy | false | undefined;
}

export interface ContextualToolbarOptions
  extends
    Pick<ToolbarOptions, 'orientation' | 'loopFocus' | 'disabled' | 'preserveFocusOnPress'>,
    ContextualToolbarPositioning {
  /** The element with the toolbar role that holds the controls; default the surface. */
  root?: HTMLElement | undefined;
  /** Default `inline`. */
  layer?: ContextualToolbarLayer | undefined;
  /**
   * Whether the toolbar is a stop of the sequential focus order; false keeps it out, so the
   * owner's key binding and `focus()` are the only way in, and Tab or Shift+Tab inside it return
   * focus as Escape does. Default true.
   */
  sequentialFocus?: boolean | undefined;
  /**
   * Where Escape, Tab out of the sequential order, and hiding with focus inside return focus: the
   * owner's editing target. A function may restore the target's selection itself and return
   * false. Without it, the toolbar leaves those keys alone and hiding moves no focus.
   */
  finalFocus?: SurfaceFocusTarget | undefined;
  /** Called when the toolbar hides because its anchor was removed. */
  onAnchorRemoved?: (() => void) | undefined;
}

/** The attribute that marks a surface positioned again at a moved anchor, without a transition. */
export const CONTEXTUAL_TOOLBAR_REANCHORED = 'data-reanchored';

export class ContextualToolbarController {
  readonly surface: HTMLElement;
  /** The roving focus of the controls, which the owner registers its items with. */
  readonly toolbar: ToolbarController;
  readonly #scope = new CleanupScope();
  #options: ContextualToolbarOptions;
  #anchor: AnchorGeometry | null = null;
  #shown = false;
  #handle: PositioningHandle | null = null;
  #positioned = false;
  #previous: Element | null = null;
  #disposed = false;
  readonly #ownsPopover: boolean;

  constructor(surface: HTMLElement, options: ContextualToolbarOptions = {}) {
    this.surface = surface;
    this.#options = { ...options };
    const root = options.root ?? surface;
    this.toolbar = new ToolbarController(root, {
      ...(options.orientation === undefined ? {} : { orientation: options.orientation }),
      ...(options.loopFocus === undefined ? {} : { loopFocus: options.loopFocus }),
      ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.preserveFocusOnPress === undefined
        ? {}
        : { preserveFocusOnPress: options.preserveFocusOnPress }),
      sequentialFocus: options.sequentialFocus ?? true,
    });
    this.#ownsPopover = this.#layer === 'top' && !surface.hasAttribute('popover');
    if (this.#ownsPopover) surface.setAttribute('popover', 'manual');
    surface.removeAttribute('data-open');
    this.#scope.listen(surface, 'keydown', this.#keyDown);
    this.#scope.listen(surface, 'focusin', this.#focusIn);
  }

  get #layer(): ContextualToolbarLayer {
    return this.#options.layer ?? 'inline';
  }

  /** Whether the owner shows the toolbar. */
  get shown(): boolean {
    return this.#shown;
  }

  get anchor(): AnchorGeometry | null {
    return this.#anchor;
  }

  /**
   * Shows the toolbar, at `anchor` when one is given (the current anchor otherwise); moves no
   * focus. Without any anchor it shows unpositioned, as a toolbar positioned by its owner does.
   */
  show(anchor?: AnchorGeometry | null): void {
    if (this.#disposed) return;
    if (anchor !== undefined) this.#setAnchor(anchor);
    if (!this.#shown) {
      this.#shown = true;
      this.surface.setAttribute('data-open', '');
      if (this.#layer === 'top' && !this.surface.matches(':popover-open'))
        this.surface.showPopover();
    }
    this.#position();
  }

  /** Hides the toolbar; focus inside it returns to the editing target first. */
  hide(): void {
    if (!this.#shown || this.#disposed) return;
    const active = deepActiveElement(this.surface.ownerDocument);
    const focused = active !== null && composedContains(this.surface, active);
    this.#shown = false;
    this.#release();
    this.surface.removeAttribute('data-open');
    if (focused) this.#returnFocus(undefined);
    if (this.#layer === 'top' && this.surface.matches(':popover-open')) this.surface.hidePopover();
  }

  /**
   * Replaces the anchor; a new one repositions without a closed interval. `null` hides a shown
   * toolbar.
   */
  setAnchor(anchor: AnchorGeometry | null): void {
    if (this.#disposed) return;
    if (anchor === null) {
      this.#setAnchor(null);
      this.hide();
      return;
    }
    this.#setAnchor(anchor);
    if (this.#shown) this.#position();
  }

  /** Changes options; positioning options take effect at once, re-anchoring the surface. */
  update(options: Partial<ContextualToolbarOptions> = {}): void {
    if (this.#disposed) return;
    this.#options = { ...this.#options, ...options };
    const toolbar: Partial<ToolbarOptions> = {};
    if ('orientation' in options) toolbar.orientation = options.orientation;
    if ('loopFocus' in options) toolbar.loopFocus = options.loopFocus;
    if ('disabled' in options) toolbar.disabled = options.disabled;
    if ('preserveFocusOnPress' in options)
      toolbar.preserveFocusOnPress = options.preserveFocusOnPress;
    if ('sequentialFocus' in options) toolbar.sequentialFocus = options.sequentialFocus ?? true;
    if (Object.keys(toolbar).length) this.toolbar.update(toolbar);
    const positioning: (keyof ContextualToolbarPositioning)[] = [
      'placement',
      'offset',
      'collision',
      'strategy',
      'padding',
      'inline',
      'tracking',
    ];
    if (positioning.some((key) => key in options)) {
      this.#release();
      if (this.#shown) this.#position();
    }
  }

  /** Positions the surface again at its anchor's current geometry. */
  async reposition(): Promise<void> {
    if (!this.#handle) return;
    await this.#handle.update();
  }

  /** Moves focus to the first enabled control; returns whether one took focus. */
  focus(): boolean {
    if (!this.#shown || this.#disposed) return false;
    return this.toolbar.focusFirst();
  }

  /** Whether `node` lies in the surface, its menus and popups included. */
  contains(node: Node | null): boolean {
    return node !== null && composedContains(this.surface, node);
  }

  dispose(): void {
    if (this.#disposed) return;
    if (this.#shown && this.#layer === 'top' && this.surface.matches(':popover-open'))
      this.surface.hidePopover();
    this.#disposed = true;
    this.#shown = false;
    this.#release();
    this.#scope.dispose();
    this.toolbar.dispose();
    this.surface.removeAttribute('data-open');
    if (this.#ownsPopover) this.surface.removeAttribute('popover');
    this.#anchor = null;
  }

  #setAnchor(anchor: AnchorGeometry | null): void {
    if (anchor === this.#anchor) return;
    this.#anchor = anchor;
    this.#release();
  }

  #position(): void {
    const anchor = this.#anchor;
    if (!anchor || !this.#shown) return;
    if (this.#handle) {
      void this.#handle.update();
      return;
    }
    const options = this.#options;
    this.#positioned = false;
    this.#handle = positionSurface(anchor, this.surface, {
      placement: options.placement ?? 'top',
      ...(options.offset === undefined ? {} : { offset: options.offset }),
      collision: options.collision ?? { side: 'flip', align: 'shift' },
      ...(options.strategy === undefined ? {} : { strategy: options.strategy }),
      ...(options.padding === undefined ? {} : { padding: options.padding }),
      ...(options.inline === undefined ? {} : { inline: options.inline }),
      ...(options.tracking === undefined ? {} : { tracking: options.tracking }),
      onPosition: () => {
        // Every later position follows a moved anchor: no movement transition runs.
        if (this.#positioned) this.surface.setAttribute(CONTEXTUAL_TOOLBAR_REANCHORED, '');
        this.#positioned = true;
      },
      onInvalid: () => {
        if (!this.#shown) return;
        this.#anchor = null;
        this.hide();
        this.#options.onAnchorRemoved?.();
      },
    });
  }

  #release(): void {
    this.#handle?.destroy();
    this.#handle = null;
    this.#positioned = false;
    this.surface.removeAttribute(CONTEXTUAL_TOOLBAR_REANCHORED);
  }

  /** Whether an event comes from a popup or dialog that a control opened (it handles its keys). */
  #fromNestedSurface(event: Event): boolean {
    for (const node of event.composedPath()) {
      if (node === this.surface) return false;
      const element = node as Partial<Element>;
      if (element.nodeType !== 1) continue;
      if (element.localName === 'dialog' || element.hasAttribute?.('popover')) return true;
    }
    return false;
  }

  #returnFocus(event: Event | undefined): boolean {
    const target = this.#options.finalFocus;
    if (target === undefined) return false;
    const resolved = resolveSurfaceFocus(target, {
      event,
      defaultTarget: () =>
        this.#previous instanceof HTMLElement && isAvailable(this.#previous)
          ? this.#previous
          : null,
      trigger: null,
      first: null,
      popup: this.surface,
      previous: this.#previous,
    });
    this.#previous = null;
    if (resolved && isAvailable(resolved)) focusManaged(resolved);
    return true;
  }

  readonly #focusIn = (event: FocusEvent): void => {
    const from = event.relatedTarget as Node | null;
    if (from && !composedContains(this.surface, from)) this.#previous = from as Element;
  };

  readonly #keyDown = (event: KeyboardEvent): void => {
    if (keyEventPreempted(event) || this.#options.finalFocus === undefined) return;
    const leaves =
      event.key === 'Escape' || (event.key === 'Tab' && !(this.#options.sequentialFocus ?? true));
    if (!leaves || event.altKey || event.ctrlKey || event.metaKey) return;
    if (this.#fromNestedSurface(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this.#returnFocus(event);
  };
}
