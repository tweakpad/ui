import { ObservableStore } from '../../foundation/store.js';
import { html, nothing, type PropertyValues } from 'lit';
import { TpDialog, dialogMotionRoles, type DialogModality } from '../dialog/dialog.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { resolveSide } from '../../foundation/positioning.js';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';
import type { HostProperties } from '../../foundation/part.js';
import type { ChangeReason } from '../../foundation/types.js';
import { DrawerGesture } from './gesture.js';
import { clamp, nearestPoint, resolveSnapPoints, settleSnap, snapExtent } from './geometry.js';
import {
  directionSign,
  horizontalDirection,
  oppositeDirection,
  type DrawerDimensions,
  type DrawerDirection,
  type DrawerEdge,
  type DrawerGestureOutput,
  type DrawerSnapPoint,
  type DrawerVisualState,
  type ResolvedSnapPoint,
} from './types.js';
import { inactiveDrawerState, nearestDrawerService, type TpDrawerProvider } from './provider.js';
import type {
  DrawerKeyboardGeometry,
  TpDrawerVirtualKeyboardProvider,
} from './virtual-keyboard.js';
import { drawerStyles } from './styles.js';

const drawerModalities: readonly DialogModality[] = ['modal', 'non-modal', 'trap-focus-only'];
const edges: readonly DrawerEdge[] = ['block-start', 'block-end', 'inline-start', 'inline-end'];
const directions: Record<string, DrawerDirection> = {
  top: 'up',
  bottom: 'down',
  left: 'left',
  right: 'right',
};
export class TpDrawer extends TpDialog {
  static override tagName = 'tp-drawer';
  static override properties = {
    ...TpDialog.properties,
    edge: { type: String, reflect: true },
    swipeDirection: { type: String, attribute: 'swipe-direction', noAccessor: true },
    side: { type: String, noAccessor: true },
    snapPoints: { attribute: false },
    snapPoint: { attribute: false, noAccessor: true },
    activeSnapPoint: { attribute: false, noAccessor: true },
    defaultSnapPoint: { attribute: false },
    onSnapPointChange: { attribute: false },
    snapToSequentialPoints: { type: Boolean, attribute: 'snap-to-sequential-points' },
    dismissible: { type: Boolean },
    showSwipeHandle: { type: Boolean, attribute: 'show-swipe-handle' },
    swipeEnabled: {
      attribute: 'swipe-enabled',
      converter: { fromAttribute: (value: string | null) => value !== 'false' },
    },
    backdrop: { type: String },
  };
  static override styles = [TpDialog.styles, drawerStyles];
  edge: DrawerEdge = 'block-end';
  snapPoints: readonly DrawerSnapPoint[] = [];
  defaultSnapPoint: DrawerSnapPoint | null | undefined;
  snapToSequentialPoints = false;
  dismissible = true;
  showSwipeHandle = false;
  swipeEnabled = true;
  backdrop: 'dark' | 'blur' = 'dark';
  protected override get overlayProperties(): HostProperties {
    return { 'data-backdrop': this.backdrop === 'blur' ? 'blur' : 'dark' };
  }
  onSnapPointChange: ((event: TpValueChangeEvent<DrawerSnapPoint | null>) => void) | undefined;
  #providedSnap: DrawerSnapPoint | null | undefined;
  #physicalDirection: DrawerDirection | undefined;
  readonly #snap = new ControllableState<DrawerSnapPoint | null>({
    host: this,
    initialValue: null,
    readControlledValue: () => this.#providedSnap,
    readDefaultValue: () => this.defaultSnapPoint ?? this.snapPoints[0] ?? null,
    hasDefaultValue: () => this.defaultSnapPoint !== undefined,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-snap-point-change'),
    onChange: (event) => this.onSnapPointChange?.(event),
    onCommit: () => this.#measure(),
    diagnostic: (message) =>
      this.emit('tp-diagnostic', { code: 'drawer-snap-mode', severity: 'warning', message }),
  });
  get snapPoint(): DrawerSnapPoint | null {
    return this.#snap.value;
  }
  set snapPoint(value: DrawerSnapPoint | null | undefined) {
    this.#providedSnap = value;
    this.#snap.sync();
    this.requestUpdate('snapPoint');
  }
  get activeSnapPoint(): DrawerSnapPoint | null {
    return this.snapPoint;
  }
  set activeSnapPoint(value: DrawerSnapPoint | null | undefined) {
    this.snapPoint = value;
  }
  get swipeDirection(): DrawerDirection {
    return directions[resolveSide(edges.includes(this.edge) ? this.edge : 'block-end', this)]!;
  }
  set swipeDirection(value: DrawerDirection) {
    if (!['up', 'down', 'left', 'right'].includes(value)) return;
    this.#physicalDirection = value;
    this.#normalizeEdge();
    this.requestUpdate('swipeDirection');
  }
  get side(): 'left' | 'right' | 'top' | 'bottom' {
    return resolveSide(this.edge, this);
  }
  set side(value: 'left' | 'right' | 'top' | 'bottom') {
    if (directions[value]) this.swipeDirection = directions[value];
  }
  #normalizeEdge(): void {
    if (!this.#physicalDirection || !this.isConnected) return;
    this.edge =
      edges.find((edge) => directions[resolveSide(edge, this)] === this.#physicalDirection) ??
      'block-end';
    this.#physicalDirection = undefined;
  }
  override get closeOnOutsideInteraction(): boolean {
    return this.dismissible && super.closeOnOutsideInteraction;
  }
  override set closeOnOutsideInteraction(value: boolean) {
    super.closeOnOutsideInteraction = value;
  }
  override setOpen(
    open: boolean,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): void {
    if (
      !open &&
      !this.dismissible &&
      ['swipe', 'outside-press', 'focus-outside', 'escape-key', 'close-watcher'].includes(reason)
    )
      return;
    super.setOpen(open, reason, sourceEvent);
  }
  protected override get allowSystemDismissal(): boolean {
    return this.dismissible && super.allowSystemDismissal;
  }
  protected override render() {
    return html`${super.render()}<slot name="swipe-area"></slot>`;
  }
  protected override projectSurfaceNode(node: Node): boolean {
    return (
      super.projectSurfaceNode(node) &&
      (!(node instanceof Element) || node.getAttribute('slot') !== 'swipe-area')
    );
  }
  protected override get partPrefix(): string {
    return 'drawer';
  }
  /** Drawer geometry is viewport-relative; container modality is not supported (uses modal). */
  protected override get supportedModalities(): readonly DialogModality[] {
    return drawerModalities;
  }
  protected override get surfacePartName(): string {
    return 'surface';
  }
  protected override get previewPresent(): boolean {
    return this.#output.swiping && this.#output.opening;
  }
  protected override motionTargets() {
    return [
      ...super.motionTargets(),
      { target: this.contentElement, role: dialogMotionRoles.surface },
    ];
  }
  protected override requestSurfaceChange(
    open: boolean,
    reason: ChangeReason,
    sourceEvent?: Event,
    trigger?: HTMLElement,
    accept?: () => void,
  ): void {
    const desired = open
      ? this.#snap.controlled
        ? this.snapPoint
        : this.#validDefault(this.snapPoint)
      : this.#validDefault(this.defaultSnapPoint ?? this.snapPoints[0] ?? null);
    if (Object.is(desired, this.snapPoint)) {
      super.requestSurfaceChange(open, reason, sourceEvent, trigger, accept);
      return;
    }
    this.surfaceState.requestTogether(
      [this.#snap.proposal(desired, reason, sourceEvent)],
      open,
      reason,
      sourceEvent,
      trigger,
      accept,
    );
  }
  #validDefault(value: DrawerSnapPoint | null): DrawerSnapPoint | null {
    return value !== null && this.snapPoints.some((point) => Object.is(point, value))
      ? value
      : (this.snapPoints[0] ?? null);
  }
  setSnapPoint(
    value: DrawerSnapPoint,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): boolean {
    if (
      this.snapPoints.filter((point) => Object.is(point, value)).length !== 1 ||
      snapExtent(value, this.#dimensions) === undefined
    ) {
      this.emit('tp-diagnostic', {
        code: 'drawer-snap-identifier',
        severity: 'warning',
        message: 'A snap proposal must identify exactly one snapPoints member.',
      });
      return false;
    }
    return this.#snap.set(value, reason, sourceEvent);
  }
  #dimensions: DrawerDimensions = {
    extent: 0,
    viewport: 0,
    width: 0,
    height: 0,
    font: 16,
    rootFont: 16,
  };
  #resolved: ResolvedSnapPoint[] = [];
  #currentExtent = 0;
  #output: DrawerGestureOutput = { movement: 0, velocity: 0, swiping: false, opening: false };
  #swipeDismissed = false;
  #openingRelease = false;
  readonly visualState = new ObservableStore<DrawerVisualState>(inactiveDrawerState());
  #resize: ResizeObserver | undefined;
  #observed: HTMLElement | null = null;
  #provider: TpDrawerProvider | null = null;
  #parentDrawer: TpDrawer | null = null;
  #nested = new Map<TpDrawer, DrawerVisualState>();
  #keyboard: DrawerKeyboardGeometry = { inset: 0, height: 0, top: 0 };
  #keyboardRelease: (() => void) | undefined;
  readonly #environment = new ComposedEnvironmentObserver(this, () => {
    this.gesture.cancel();
    this.requestUpdate();
    this.#measure();
  });
  readonly gesture = new DrawerGesture({
    enabled: () =>
      this.isConnected &&
      this.swipeEnabled &&
      !this.disabled &&
      (!this.open || this.dismissController.isTopmost),
    direction: () => this.swipeDirection,
    canExpand: () => this.#resolved.length > 0,
    surface: () => this.contentElement,
    publish: (output) => {
      this.#output = output;
      this.#paint();
      this.requestUpdate();
    },
    release: (output) => this.#releaseGesture(output),
  });
  startSwipe(
    event: PointerEvent | TouchEvent,
    element: HTMLElement,
    opening = false,
    direction?: DrawerDirection,
  ): void {
    this.gesture.start(
      event,
      element,
      opening,
      direction ?? (opening ? oppositeDirection[this.swipeDirection] : this.swipeDirection),
    );
  }
  #releaseGesture(output: DrawerGestureOutput): void {
    const extent = this.#dimensions.extent || this.#dimensions.viewport;
    this.#output = { movement: 0, velocity: output.velocity, swiping: false, opening: false };
    if (output.opening) {
      this.#openingRelease = true;
      if (
        output.movement > Math.max(10, extent / 2) ||
        (output.movement > 1 && output.velocity >= 0.1)
      )
        this.setOpen(true, 'swipe', output.sourceEvent);
    } else if (this.#resolved.length) {
      const point = settleSnap(
        this.#resolved,
        this.#currentExtent,
        output.movement,
        output.velocity,
        extent,
        this.snapToSequentialPoints,
        this.dismissible,
      );
      if (point) this.setSnapPoint(point.value, 'swipe', output.sourceEvent);
      else this.setOpen(false, 'swipe', output.sourceEvent);
    } else if (
      output.movement > Math.max(10, extent * 0.5) ||
      (output.movement > 0 && output.velocity >= 0.5)
    )
      this.setOpen(false, 'swipe', output.sourceEvent);
    this.#swipeDismissed = !output.opening && !this.open;
    this.#paint();
    this.requestUpdate();
  }
  protected override renderSurfaceChildren(content: unknown): unknown {
    const points = [...this.#resolved].sort((a, b) => a.extent - b.extent);
    return html`${
      this.showSwipeHandle && this.swipeEnabled
        ? this.dialogPart('swipe-handle', {
            properties: {
              class: 'swipe-handle',
              'data-drawer-swipe-handle': '',
              role: points.length > 1 ? 'slider' : undefined,
              tabindex: points.length > 1 ? 0 : undefined,
              'aria-hidden': points.length > 1 ? undefined : 'true',
              'aria-label': points.length > 1 ? 'Drawer position' : undefined,
              'aria-orientation': horizontalDirection(this.swipeDirection)
                ? 'horizontal'
                : 'vertical',
              'aria-valuemin': points.length > 1 ? points[0]!.extent : undefined,
              'aria-valuemax': points.length > 1 ? points.at(-1)!.extent : undefined,
              'aria-valuenow': points.length > 1 ? this.#currentExtent : undefined,
              'aria-valuetext': points.length > 1 ? String(this.snapPoint ?? '') : undefined,
              '@keydown': this.#snapKey,
            },
          })
        : nothing
    }${this.dialogPart('content', { properties: { class: 'drawer-content', 'data-drawer-content': '' }, content })}`;
  }
  protected override renderSurface(properties: HostProperties, content: unknown): unknown {
    const direction = this.swipeDirection;
    return this.dialogPart('viewport', {
      properties: {
        class: 'drawer-viewport',
        'data-dialog-layer': '',
        popover: 'manual',
        'data-modal': String(this.modality === 'modal'),
        '@pointerdown': properties['@pointerdown'],
      },
      content: this.dialogPart('surface', {
        protectedProperties: ['id'],
        properties: {
          ...properties,
          class: 'content drawer-surface',
          'data-swipe-direction': direction,
          'data-swipe-axis': horizontalDirection(direction) ? 'x' : 'y',
          'data-snap-points': this.snapPoints.length > 0,
          'data-opening-swipe': this.#openingRelease,
          '@pointerdown': (event: PointerEvent) =>
            this.startSwipe(event, event.currentTarget as HTMLElement),
          '@touchstart': (event: TouchEvent) =>
            this.startSwipe(event, event.currentTarget as HTMLElement),
        },
        content,
      }),
    });
  }
  #snapKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || this.disabled) return;
    const ordered = [...this.#resolved].sort((a, b) => a.extent - b.extent);
    let index = ordered.indexOf(nearestPoint(ordered, this.#currentExtent)!);
    const horizontal = horizontalDirection(this.swipeDirection);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = ordered.length - 1;
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      if (
        (horizontal && ['ArrowUp', 'ArrowDown'].includes(event.key)) ||
        (!horizontal && ['ArrowLeft', 'ArrowRight'].includes(event.key))
      )
        return;
      const closing =
        (
          { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as Record<
            string,
            string
          >
        )[event.key] === this.swipeDirection;
      index += closing ? -1 : 1;
    } else return;
    event.preventDefault();
    event.stopPropagation();
    const point = ordered[clamp(index, 0, ordered.length - 1)];
    if (point) this.setSnapPoint(point.value, 'keyboard', event);
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#normalizeEdge();
    this.#environment.connect();
    this.#provider = nearestDrawerService<TpDrawerProvider>(this, 'tp-drawer-provider');
    this.#parentDrawer = nearestDrawerService<TpDrawer>(this, 'tp-drawer');
    this.#keyboardRelease = nearestDrawerService<TpDrawerVirtualKeyboardProvider>(
      this,
      'tp-drawer-virtual-keyboard-provider',
    )?.geometry.subscribe(({ value }) => {
      this.#keyboard = value;
      this.#measure();
    }, true);
    this.#resize = new ResizeObserver(() => this.#measure());
    this.ownerDocument.defaultView?.addEventListener('resize', this.#measure);
  }
  override disconnectedCallback(): void {
    this.gesture.dispose();
    this.#resize?.disconnect();
    this.#observed = null;
    this.#environment.disconnect();
    this.ownerDocument.defaultView?.removeEventListener('resize', this.#measure);
    this.#keyboardRelease?.();
    this.#keyboardRelease = undefined;
    this.#provider?.removeDrawer(this);
    this.#provider = null;
    if (this.#parentDrawer) {
      this.#parentDrawer.#nested.delete(this);
      this.#parentDrawer.#paint();
    }
    this.#parentDrawer = null;
    this.#nested.clear();
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#normalizeEdge();
    if (
      changed.has('edge') ||
      changed.has('disabled') ||
      changed.has('snapPoints') ||
      changed.has('swipeEnabled')
    )
      this.gesture.cancel();
    if (this.open) this.#swipeDismissed = false;
    if (!this.open) this.#openingRelease = false;
    if (
      changed.has('snapPoints') &&
      !this.#snap.controlled &&
      this.snapPoint !== null &&
      !this.snapPoints.includes(this.snapPoint)
    ) {
      this.#snap.set(this.#validDefault(this.defaultSnapPoint ?? null), 'programmatic');
    }
    const surface = this.contentElement;
    if (surface !== this.#observed) {
      this.#resize?.disconnect();
      if (surface) this.#resize?.observe(surface);
      this.#observed = surface;
    }
    this.#measure();
  }
  #measure = (): void => {
    if (!this.isConnected) return;
    const win = this.ownerDocument.defaultView!,
      surface = this.contentElement;
    const viewport = this.surfaceRoot.querySelector<HTMLElement>('.drawer-viewport');
    const height = this.#keyboard.height || win.innerHeight;
    if (viewport) {
      viewport.style.setProperty('--drawer-viewport-height', `${height}px`);
      viewport.style.setProperty('--drawer-keyboard-inset', `${this.#keyboard.inset}px`);
      viewport.style.top = `${this.#keyboard.top}px`;
      viewport.style.bottom = 'auto';
    }
    const horizontal = horizontalDirection(this.swipeDirection);
    this.#dimensions = {
      extent: surface ? (horizontal ? surface.offsetWidth : surface.offsetHeight) : 0,
      viewport: horizontal ? win.innerWidth : height,
      width: win.innerWidth,
      height,
      font: parseFloat(getComputedStyle(this).fontSize),
      rootFont: parseFloat(getComputedStyle(this.ownerDocument.documentElement).fontSize),
      resolveLength: this.#resolveLength,
    };
    const next = resolveSnapPoints(this.snapPoints, this.#dimensions);
    const changed = JSON.stringify(next) !== JSON.stringify(this.#resolved);
    this.#resolved = next;
    const raw = snapExtent(this.snapPoint, this.#dimensions);
    const active =
      next.find((p) => Object.is(p.value, this.snapPoint)) ??
      (raw === undefined ? next[0] : nearestPoint(next, raw));
    const previous = this.#currentExtent;
    this.#currentExtent = active?.extent ?? this.#dimensions.extent;
    this.#paint();
    if (changed || previous !== this.#currentExtent) this.requestUpdate();
  };
  #resolveLength = (value: string): number | undefined => {
    // Let the owning CSS environment resolve font/logical/container units and
    // length expressions. This is snap geometry, never a presentation override.
    if (
      !/^(?:[+-]?(?:\d+\.?\d*|\.\d+)[a-z]+|(?:calc|min|max|clamp)\(.+\))$/i.test(value.trim()) ||
      !CSS.supports('width', value)
    )
      return undefined;
    const probe = this.ownerDocument.createElement('span');
    probe.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;contain:strict;height:0;';
    probe.style.width = value;
    this.surfaceRoot.append(probe);
    try {
      const extent = parseFloat(getComputedStyle(probe).width);
      return Number.isFinite(extent) ? extent : undefined;
    } finally {
      probe.remove();
    }
  };
  #paint(): void {
    const surface = this.contentElement;
    const offset = Math.max(0, this.#dimensions.extent - this.#currentExtent);
    let movement = this.#output.movement;
    if (this.#output.opening) movement = this.#dimensions.extent - movement - offset;
    const displaced = offset + movement;
    const translation = displaced < 0 ? -Math.sqrt(-displaced) : displaced;
    const sign = directionSign(this.swipeDirection),
      horizontal = horizontalDirection(this.swipeDirection);
    const progress = clamp(translation / Math.max(1, this.#dimensions.extent), 0, 1);
    const nested = [...this.#nested.values()].filter((state) => state.active);
    const front = nested.at(-1);
    const height = front?.height || surface?.offsetHeight || 0;
    for (const element of [surface, this.surfaceRoot.querySelector<HTMLElement>('.overlay')]) {
      if (!element) continue;
      element.toggleAttribute('data-swiping', this.#output.swiping);
      element.toggleAttribute('data-swipe-dismiss', this.#swipeDismissed);
      element.dataset.swipeDirection = this.swipeDirection;
      element.style.setProperty('--drawer-swipe-progress', String(front?.progress ?? progress));
      element.style.setProperty(
        '--drawer-swipe-strength',
        String(clamp(1 / Math.max(1, Math.abs(this.#output.velocity)), 0.1, 1)),
      );
    }
    if (surface) {
      surface.toggleAttribute(
        'data-expanded',
        this.#currentExtent >= Math.min(this.#dimensions.extent, this.#dimensions.viewport) - 1,
      );
      surface.toggleAttribute('data-nested-drawer-open', nested.length > 0);
      surface.toggleAttribute('data-nested-drawer-swiping', Boolean(front?.swiping));
      surface.dataset.snapPoint = String(this.snapPoint ?? '');
      surface.style.setProperty('--drawer-height', `${surface.offsetHeight}px`);
      surface.style.setProperty('--drawer-frontmost-height', `${height}px`);
      surface.style.setProperty(
        '--nested-drawers',
        String(nested.reduce((sum, state) => sum + 1 + state.count, 0)),
      );
      surface.style.setProperty('--drawer-snap-point-offset', `${offset * sign}px`);
      surface.style.setProperty(
        '--drawer-swipe-movement-x',
        `${horizontal ? (translation - offset) * sign : 0}px`,
      );
      surface.style.setProperty(
        '--drawer-swipe-movement-y',
        `${horizontal ? 0 : (translation - offset) * sign}px`,
      );
    }
    const state = this.open
      ? {
          active: true,
          count: nested.reduce((sum, state) => sum + 1 + state.count, 0),
          progress: front?.progress ?? progress,
          height,
          swiping: this.#output.swiping || Boolean(front?.swiping),
        }
      : {
          ...inactiveDrawerState(),
          swiping: this.#output.swiping,
          progress,
          height: this.previewPresent ? height : 0,
        };
    this.toggleAttribute('data-swiping', this.#output.swiping);
    this.dataset.swipeDirection = this.swipeDirection;
    if (
      Object.keys(state).some(
        (key) =>
          state[key as keyof DrawerVisualState] !==
          this.visualState.value[key as keyof DrawerVisualState],
      )
    )
      this.visualState.set(state);
    this.#provider?.updateDrawer(this, state);
    if (this.#parentDrawer) {
      if (this.open) this.#parentDrawer.#nested.set(this, state);
      else this.#parentDrawer.#nested.delete(this);
      this.#parentDrawer.#paint();
    }
  }
}
