import { bindPart } from '../../foundation/part.js';
import { GeneratedStyleResource } from '../../foundation/generated-style.js';
import { css, html, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { TpResizablePanel } from './panel.js';
import { TpResizableHandle } from './handle.js';
import {
  equalSizes,
  extentInPixels,
  normalizeLayout,
  resizeBoundary,
  resizePanel,
} from './layout.js';
import type {
  PanelBounds,
  PanelExtent,
  PanelLayout,
  PanelPersistenceAdapter,
  PanelSize,
} from './types.js';

/** One layout/proposal/input owner for authored constituents and legacy native panels. */
export class TpResizablePanelGroup extends TpElement {
  static tagName = 'tp-resizable-panel-group';
  static override properties = {
    ...TpElement.properties,
    sizes: { attribute: false, noAccessor: true },
    defaultSizes: { attribute: false },
    defaultLayout: { attribute: false },
    min: { type: Number },
    keyboardStep: { type: Number, attribute: 'keyboard-step' },
    withHandle: { type: Boolean, attribute: 'with-handle' },
    disableCursor: { type: Boolean, attribute: 'disable-cursor' },
    disableDoubleClickReset: { type: Boolean, attribute: 'disable-double-click-reset' },
    resizeTargetMinimumSize: { attribute: false },
    persistenceKey: { type: String, attribute: 'persistence-key' },
    persistenceAdapter: { attribute: false },
    onSizesChange: { attribute: false },
    onLayoutChange: { attribute: false },
    onLayoutChanged: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        position: relative;
        inline-size: 100%;
        block-size: 100%;
        min-inline-size: 0;
        min-block-size: 0;
      }

      .group {
        position: relative;
        display: flex;
        flex-wrap: nowrap;
        inline-size: 100%;
        block-size: 100%;
        min-inline-size: 0;
        min-block-size: 0;
        overflow: auto;
      }

      :host([orientation='vertical']) .group {
        flex-direction: column;
      }

      slot {
        display: contents;
      }

      ::slotted(*) {
        min-inline-size: 0;
        min-block-size: 0;
      }

      .implicit {
        position: absolute;
        inset-block: 0;
      }

      :host([orientation='vertical']) .implicit {
        inset-inline: 0;
        inset-block-end: auto;
      }
    `,
  ];
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  #inputSizes: readonly PanelExtent[] | undefined;
  get sizes(): readonly PanelExtent[] {
    return this.#inputSizes ?? this.#state.value;
  }
  set sizes(value: readonly PanelExtent[] | undefined) {
    const old = this.#inputSizes;
    this.#inputSizes = value;
    this.#state.sync();
    this.requestUpdate('sizes', old);
  }
  defaultSizes: readonly PanelExtent[] | undefined;
  defaultLayout: PanelLayout | undefined;
  min: number | undefined;
  keyboardStep = 1;
  withHandle = false;
  disableCursor = false;
  disableDoubleClickReset = false;
  resizeTargetMinimumSize = { fine: 10, coarse: 20 };
  persistenceKey = '';
  persistenceAdapter: PanelPersistenceAdapter | undefined;
  onSizesChange: ((event: TpValueChangeEvent<readonly number[]>) => void) | undefined;
  onLayoutChange: ((layout: PanelLayout) => void) | undefined;
  onLayoutChanged: ((layout: PanelLayout) => void) | undefined;
  #panels: HTMLElement[] = [];
  #handles: TpResizableHandle[] = [];
  #authoredHandles: TpResizableHandle[] = [];
  #bounds: PanelBounds[] = [];
  #extent = 0;
  #lastExtent = 0;
  #cache = new Map<string, number>();
  #expanded = new Map<string, number>();
  #registrations = new Map<HTMLElement, () => void>();
  #oldFlex = new Map<HTMLElement, string>();
  #resize: ResizeObserver | undefined;
  #mutation: MutationObserver | undefined;
  #frame: number | undefined;
  #restoring = false;
  #restoreVersion = 0;
  #restored: PanelLayout | undefined;
  #initialized = false;
  #settled: readonly number[] = [];
  #diagnostics = new Set<string>();
  #drag:
    | {
        id: number;
        element: HTMLElement;
        handle: TpResizableHandle;
        start: number;
        sizes: readonly number[];
        scale: number;
        style: GeneratedStyleResource;
      }
    | undefined;
  readonly #state = new ControllableState<readonly number[]>({
    host: this,
    initialValue: [],
    equals: equalSizes,
    readControlledValue: () =>
      this.#inputSizes === undefined ? undefined : this.#normalizedInputs(this.#inputSizes),
    onChange: (event) => this.onSizesChange?.(event),
    onCommit: (sizes) => this.#commit(sizes),
  });
  getLayout(): PanelLayout {
    return Object.fromEntries(
      this.#panels.map((panel, i) => [
        panel.id,
        this.#extent ? ((this.#state.value[i] ?? 0) / this.#extent) * 100 : 0,
      ]),
    );
  }
  setLayout(layout: PanelLayout): PanelLayout {
    this.#measure();
    this.#propose(
      this.#panels.map((panel, i) =>
        Number.isFinite(layout[panel.id])
          ? (this.#extent * layout[panel.id]!) / 100
          : (this.#state.value[i] ?? 0),
      ),
      'programmatic',
    );
    this.#settle();
    return this.getLayout();
  }
  getPanelSize(panel: HTMLElement): PanelSize {
    const i = this.#panels.indexOf(panel);
    const value = this.#state.value[i] ?? 0;
    return { inPixels: value, asPercentage: this.#extent ? (value / this.#extent) * 100 : 0 };
  }
  getPanelElement(id: string): HTMLElement | undefined {
    return this.#panels.find((panel) => panel.id === id);
  }
  collapsePanel(panel: HTMLElement): void {
    const i = this.#panels.indexOf(panel);
    if (this.#bounds[i]?.collapsible) this.resizePanel(panel, this.#bounds[i]!.collapsed);
  }
  expandPanel(panel: HTMLElement): void {
    const i = this.#panels.indexOf(panel),
      bound = this.#bounds[i];
    if (!bound?.collapsible || this.#state.value[i] !== bound.collapsed) return;
    const value =
      this.#expanded.get(panel.id) ??
      this.#pixels(panel instanceof TpResizablePanel ? panel.defaultSize : undefined, panel) ??
      bound.min;
    this.resizePanel(panel, Math.max(bound.min, value));
  }
  resizePanel(panel: HTMLElement, size: PanelExtent): void {
    this.#measure();
    const i = this.#panels.indexOf(panel),
      value = this.#pixels(size, panel);
    if (i < 0 || value === undefined || this.disabled) return;
    this.#propose(resizePanel(this.#state.value, this.#bounds, i, value), 'programmatic');
    this.#settle();
  }
  #pixels(value: PanelExtent | undefined, panel: HTMLElement = this): number | undefined {
    const view = this.ownerDocument.defaultView!;
    return extentInPixels(
      value,
      this.#extent,
      parseFloat(view.getComputedStyle(panel).fontSize),
      parseFloat(view.getComputedStyle(this.ownerDocument.documentElement).fontSize),
      { width: view.innerWidth, height: view.innerHeight },
    );
  }
  #normalizedInputs(input: readonly PanelExtent[]): readonly number[] {
    if (!this.#panels.length) return [];
    const requested = this.#panels.map(
      (panel, i) =>
        this.#pixels(input[i], panel) ??
        this.#cache.get(panel.id) ??
        this.#extent / this.#panels.length,
    );
    return normalizeLayout(
      requested,
      this.#bounds,
      this.#extent,
      this.#panels.map((panel) => this.#cache.get(panel.id)!),
    ).sizes;
  }
  #diagnose(code: string, message: string): void {
    if (this.#diagnostics.has(code)) return;
    this.#diagnostics.add(code);
    this.emit('tp-diagnostic', { code, message });
  }
  #sync = (): void => {
    if (this.#drag?.handle.disabled) this.#stop();
    const children = [...this.children].filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
    const panels = children.filter((node) => !(node instanceof TpResizableHandle));
    const handles = children.filter(
      (node): node is TpResizableHandle => node instanceof TpResizableHandle,
    );
    if (
      this.#drag &&
      ((!handles.includes(this.#drag.handle) && this.#drag.handle.parentElement === this) ||
        panels.some((panel, i) => panel !== this.#panels[i]) ||
        panels.length !== this.#panels.length)
    )
      this.#stop();
    for (const old of this.#panels)
      if (!panels.includes(old)) {
        old.style.flex = this.#oldFlex.get(old) ?? '';
        this.#oldFlex.delete(old);
        this.#registrations.get(old)?.();
        this.#registrations.delete(old);
      }
    this.#panels = panels;
    this.#authoredHandles = handles;
    for (const panel of panels) {
      if (!panel.id) panel.id = createId('tp-panel');
      if (!this.#oldFlex.has(panel)) this.#oldFlex.set(panel, panel.style.flex);
      if (!(panel instanceof TpResizablePanel) && !this.#registrations.has(panel))
        this.#registrations.set(
          panel,
          this.presentationController.registerPart('resizable-panel-group-panel', panel),
        );
    }
    if (new Set(panels.map((panel) => panel.id)).size !== panels.length)
      this.#diagnose('duplicate-panel-id', 'Panel identifiers must be unique within a group.');
    for (const handle of handles) {
      const position = children.indexOf(handle),
        before = children[position - 1],
        after = children[position + 1];
      handle.boundary =
        before && after && panels.includes(before) && panels.includes(after)
          ? panels.indexOf(before)
          : -1;
      if (handle.boundary < 0)
        this.#diagnose('separator-order', 'A resize handle must be directly between two panels.');
    }
    this.requestUpdate();
    this.#schedule();
  };
  #schedule = (): void => {
    if (!this.isConnected || this.#frame !== undefined) return;
    this.#frame = this.ownerDocument.defaultView!.requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#measure();
    });
  };
  #memberChange = (event: Event): void => {
    if ((event.target as Element).parentElement === this) {
      event.stopPropagation();
      this.#sync();
    }
  };
  #measure(): void {
    if (!this.isConnected || this.#restoring || !this.#panels.length) return;
    const root = this.renderRoot.querySelector<HTMLElement>('.group');
    if (!root) return;
    const horizontal = this.orientation === 'horizontal';
    const reserved = this.#authoredHandles.reduce(
      (sum, handle) => sum + (horizontal ? handle.offsetWidth : handle.offsetHeight),
      0,
    );
    this.#extent = Math.max(0, (horizontal ? root.clientWidth : root.clientHeight) - reserved);
    if (!this.#extent) return;
    this.#bounds = this.#panels.map((panel) => {
      const part = panel instanceof TpResizablePanel ? panel : undefined;
      const min =
        this.#pixels(part?.minSize, panel) ??
        (Number.isFinite(this.min) ? (this.#extent * Math.max(0, this.min!)) / 100 : 0);
      const max = this.#pixels(part?.maxSize, panel) ?? this.#extent;
      if (max < min)
        this.#diagnose(
          'invalid-panel-bounds',
          `Panel ${panel.id} maximum is smaller than its minimum.`,
        );
      return {
        min,
        max: Math.max(min, max),
        collapsed: Math.min(min, this.#pixels(part?.collapsedSize, panel) ?? 0),
        collapsible: part?.collapsible ?? false,
        disabled: part?.disabled ?? panel.hasAttribute('disabled'),
      };
    });
    const fixed = this.#panels.map(
      (panel) =>
        panel instanceof TpResizablePanel && panel.resizeBehavior === 'preserve-pixel-size',
    );
    if (fixed.every(Boolean))
      this.#diagnose('relative-panel-required', 'At least one panel must preserve relative size.');
    const previous = this.#panels.map((panel) => this.#cache.get(panel.id)!);
    const requested = this.#panels.map((panel, i) => {
      const existing = this.#cache.get(panel.id);
      if (existing !== undefined)
        return this.#lastExtent && !fixed[i] && !this.#bounds[i]!.disabled
          ? (existing * this.#extent) / this.#lastExtent
          : existing;
      const identity = (this.#restored ?? this.defaultLayout)?.[panel.id];
      return identity !== undefined
        ? (identity * this.#extent) / 100
        : this.#pixels(
            this.defaultSizes?.[i] ??
              (panel instanceof TpResizablePanel ? panel.defaultSize : undefined),
            panel,
          );
    });
    const available =
        this.#extent - requested.reduce<number>((sum, value) => sum + (value ?? 0), 0),
      missing = requested.filter((value) => value === undefined).length;
    const normalized = normalizeLayout(
      requested.map((value) => value ?? Math.max(0, available) / Math.max(1, missing)),
      this.#bounds,
      this.#extent,
      previous,
      [
        ...fixed.flatMap((value, i) => (value ? [] : [i])),
        ...fixed.flatMap((value, i) => (value ? [i] : [])),
      ],
    );
    this.toggleAttribute('data-infeasible', !normalized.feasible);
    if (!normalized.feasible)
      this.#diagnose(
        'infeasible-layout',
        'Panel bounds and disabled sizes cannot fill the group; valid bounds are preserved with overflow or unused space.',
      );
    this.#lastExtent = this.#extent;
    if (this.#inputSizes !== undefined) this.#state.hostUpdate();
    else if (!equalSizes(this.#state.value, normalized.sizes))
      this.#state.set(normalized.sizes, 'programmatic', undefined, { cancelable: false });
    this.#initialized = true;
    this.#apply(this.#state.value);
    if (!this.#drag) this.#settle();
  }
  #commit(sizes: readonly number[]): void {
    this.#apply(sizes);
    const layout = this.getLayout();
    this.onLayoutChange?.(layout);
    this.emit('tp-layout-change', { layout, sizes: [...sizes] });
  }
  #apply(sizes: readonly number[]): void {
    for (const [i, panel] of this.#panels.entries()) {
      const size = sizes[i] ?? 0,
        old = this.#cache.get(panel.id),
        bound = this.#bounds[i];
      if (bound?.collapsible && size >= bound.min && size > bound.collapsed)
        this.#expanded.set(panel.id, size);
      this.#cache.set(panel.id, size);
      const flex = `0 0 ${size}px`;
      if (panel.style.flex !== flex) panel.style.flex = flex;
      const collapsed = !!bound?.collapsible && Math.abs(size - bound.collapsed) < 0.00001;
      if (panel.hasAttribute('data-collapsed') !== collapsed) {
        panel.toggleAttribute('data-collapsed', collapsed);
        if (panel instanceof TpResizablePanel) panel.requestUpdate();
      }
      if (panel instanceof TpResizablePanel) panel.orientation = this.orientation;
      if (
        panel instanceof TpResizablePanel &&
        (old === undefined || Math.abs(old - size) > 0.00001)
      ) {
        const next = {
            inPixels: size,
            asPercentage: this.#extent ? (size / this.#extent) * 100 : 0,
          },
          prev =
            old === undefined
              ? undefined
              : { inPixels: old, asPercentage: this.#extent ? (old / this.#extent) * 100 : 0 };
        panel.onResize?.(next, panel.id, prev);
        panel.dispatchEvent(
          new CustomEvent('tp-panel-resize', {
            detail: { size: next, previousSize: prev, id: panel.id },
            bubbles: true,
            composed: true,
          }),
        );
      }
    }
    this.#updateHandles();
    this.requestUpdate();
  }
  #propose(sizes: readonly number[], reason: ChangeReason, event?: Event): void {
    if (this.disabled || this.#restoring) return;
    // One shared lane publishes all panel sizes atomically; no-ack controlled proposals do not commit.
    this.#state.set(
      normalizeLayout(sizes, this.#bounds, this.#extent, this.#state.value).sizes,
      reason,
      event,
    );
    this.#apply(this.#state.value);
  }
  #settle(): void {
    if (equalSizes(this.#settled, this.#state.value) || !this.#initialized) return;
    this.#settled = [...this.#state.value];
    const layout = this.getLayout();
    this.onLayoutChanged?.(layout);
    this.emit('tp-layout-changed', { layout, sizes: [...this.#settled] });
    if (this.#inputSizes === undefined && this.persistenceAdapter && this.persistenceKey) {
      try {
        void Promise.resolve(this.persistenceAdapter.save(this.persistenceKey, layout)).catch(() =>
          this.#diagnose('persistence-save', 'Panel layout persistence failed.'),
        );
      } catch {
        this.#diagnose('persistence-save', 'Panel layout persistence failed.');
      }
    }
  }
  #target(handle: TpResizableHandle): number {
    const boundary = handle.boundary;
    if (!handle.target) return boundary;
    const index = this.#panels.findIndex((panel) => panel.id === handle.target);
    return index === boundary || index === boundary + 1 ? index : -1;
  }
  #updateHandles(): void {
    this.#handles = [
      ...this.#authoredHandles,
      ...this.renderRoot.querySelectorAll<TpResizableHandle>('tp-resizable-handle'),
    ].sort((a, b) => a.boundary - b.boundary);
    for (const handle of this.#handles) {
      const target = this.#target(handle),
        bound = this.#bounds[target],
        current = this.#state.value;
      const valid = handle.boundary >= 0 && handle.boundary < this.#panels.length - 1 && !!bound;
      const min = valid
        ? resizePanel(
            current,
            this.#bounds,
            target,
            bound!.collapsible ? bound!.collapsed : bound!.min,
          )[target]!
        : 0;
      const max = valid ? resizePanel(current, this.#bounds, target, bound!.max)[target]! : 0;
      handle.setHandleState({
        orientation: this.orientation,
        min: this.#extent ? (min / this.#extent) * 100 : 0,
        max: this.#extent ? (max / this.#extent) * 100 : 0,
        now: this.#extent ? ((current[target] ?? 0) / this.#extent) * 100 : 0,
        controls: this.#panels[target]?.id ?? '',
        disabled: this.disabled || handle.disabled || !valid || this.#restoring || min === max,
        dragging: this.#drag?.handle === handle,
      });
    }
  }
  startResize(handle: TpResizableHandle, event: PointerEvent): void {
    if (
      this.#drag ||
      event.button !== 0 ||
      !event.isPrimary ||
      this.disabled ||
      handle.disabled ||
      handle.boundary < 0 ||
      handle.separatorElement?.tabIndex === -1 ||
      this.#restoring
    )
      return;
    this.#measure();
    event.preventDefault();
    const element = event.currentTarget as HTMLElement;
    element.focus({ preventScroll: true });
    const horizontal = this.orientation === 'horizontal',
      rect = this.getBoundingClientRect(),
      extent = horizontal ? this.offsetWidth : this.offsetHeight;
    const style = new GeneratedStyleResource(this, this.ownerDocument);
    style.setText(
      `*{user-select:none!important;${this.disableCursor ? '' : `cursor:${horizontal ? 'col-resize' : 'row-resize'}!important;`}}`,
    );
    this.#drag = {
      id: event.pointerId,
      element,
      handle,
      start: horizontal ? event.clientX : event.clientY,
      sizes: [...this.#state.value],
      scale: extent ? (horizontal ? rect.width : rect.height) / extent : 1,
      style,
    };
    element.setPointerCapture(event.pointerId);
    this.#updateHandles();
  }
  moveResize(event: PointerEvent): void {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.id) return;
    if (!event.buttons || this.disabled || drag.handle.disabled) {
      this.#stop();
      return;
    }
    const coordinate = this.orientation === 'horizontal' ? event.clientX : event.clientY;
    const delta =
      ((coordinate - drag.start) / drag.scale) *
      (this.orientation === 'horizontal' && this.direction === 'rtl' ? -1 : 1);
    this.#propose(
      resizeBoundary(drag.sizes, this.#bounds, drag.handle.boundary, delta),
      'pointer',
      event,
    );
  }
  endResize(event: PointerEvent): void {
    if (event.pointerId === this.#drag?.id) this.#stop();
  }
  #stop(): void {
    const drag = this.#drag;
    this.#drag = undefined;
    if (!drag) return;
    if (drag.element.hasPointerCapture(drag.id)) drag.element.releasePointerCapture(drag.id);
    drag.style.dispose();
    this.#updateHandles();
    this.#settle();
  }
  handleKey(handle: TpResizableHandle, event: KeyboardEvent): void {
    if (
      this.disabled ||
      handle.disabled ||
      this.#restoring ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    this.#measure();
    const i = this.#target(handle),
      bound = this.#bounds[i];
    if (!bound) return;
    const horizontal = this.orientation === 'horizontal',
      increase = horizontal ? (this.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown',
      decrease = horizontal ? (this.direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
    let value: number | undefined;
    const current = this.#state.value[i] ?? 0,
      step = Number.isFinite(this.keyboardStep) && this.keyboardStep > 0 ? this.keyboardStep : 1;
    if (event.key === increase)
      value = bound.collapsible && current === bound.collapsed ? bound.min : current + step;
    else if (event.key === decrease) value = current - step;
    else if (event.key === 'Home') value = bound.collapsible ? bound.collapsed : bound.min;
    else if (event.key === 'End') value = bound.max;
    else if (event.key === 'Enter' && bound.collapsible)
      value =
        current === bound.collapsed
          ? (this.#expanded.get(this.#panels[i]!.id) ?? bound.min)
          : bound.collapsed;
    else if (event.key === 'F6') {
      event.preventDefault();
      const handles = this.#handles.filter(
          (item) => !item.disabled && item.separatorElement?.tabIndex === 0,
        ),
        index = handles.indexOf(handle);
      handles[
        (index + (event.shiftKey ? -1 : 1) + handles.length) % handles.length
      ]?.separatorElement?.focus();
      return;
    }
    if (value !== undefined) {
      event.preventDefault();
      this.#propose(resizePanel(this.#state.value, this.#bounds, i, value), 'keyboard', event);
      this.#settle();
    }
  }
  resetPanel(handle: TpResizableHandle, event: MouseEvent): void {
    if (
      this.disabled ||
      handle.disabled ||
      this.disableDoubleClickReset ||
      handle.disableDoubleClickReset
    )
      return;
    const i = this.#target(handle),
      panel = this.#panels[i];
    if (!(panel instanceof TpResizablePanel) || panel.defaultSize === undefined) return;
    const size = this.#pixels(panel.defaultSize, panel);
    if (size !== undefined) {
      event.preventDefault();
      this.#propose(resizePanel(this.#state.value, this.#bounds, i, size), 'pointer', event);
      this.#settle();
    }
  }
  async #restore(): Promise<void> {
    const version = ++this.#restoreVersion,
      adapter = this.persistenceAdapter,
      key = this.persistenceKey;
    if (this.#inputSizes !== undefined || !adapter || !key) {
      this.#restoring = false;
      return;
    }
    this.#restoring = true;
    try {
      const value = await adapter.load(key);
      if (version !== this.#restoreVersion || !this.isConnected) return;
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.values(value).every(
          (item) => typeof item === 'number' && Number.isFinite(item) && item >= 0,
        )
      )
        this.#restored = value as PanelLayout;
      else if (value !== undefined && value !== null)
        this.#diagnose(
          'persistence-invalid',
          'Invalid persisted panel layout; using declared defaults.',
        );
    } catch {
      this.#diagnose('persistence-load', 'Panel layout restore failed; using declared defaults.');
    } finally {
      if (version === this.#restoreVersion && this.isConnected) {
        this.#restoring = false;
        this.#schedule();
      }
    }
  }
  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.id) this.id = createId('tp-panel-group');
    this.addEventListener('tp-resizable-member-change', this.#memberChange);
    const view = this.ownerDocument.defaultView!;
    this.#resize = new view.ResizeObserver(this.#schedule);
    this.#resize.observe(this);
    this.#mutation = new view.MutationObserver(this.#sync);
    this.#mutation.observe(this, { childList: true });
    void this.#restore();
    this.#sync();
  }
  override disconnectedCallback(): void {
    this.#stop();
    this.#restoreVersion++;
    this.#resize?.disconnect();
    this.#mutation?.disconnect();
    this.removeEventListener('tp-resizable-member-change', this.#memberChange);
    if (this.#frame !== undefined)
      this.ownerDocument.defaultView?.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    for (const [panel, flex] of this.#oldFlex) panel.style.flex = flex;
    this.#oldFlex.clear();
    for (const cleanup of this.#registrations.values()) cleanup();
    this.#registrations.clear();
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (this.disabled || changed.has('orientation')) this.#stop();
    for (const [key, fallback] of [
      ['fine', 10],
      ['coarse', 20],
    ] as const) {
      const input = this.resizeTargetMinimumSize?.[key],
        value = typeof input === 'number' && Number.isFinite(input) && input > 0 ? input : fallback;
      const name = `--tp-resize-target-${key}`;
      if (this.style.getPropertyValue(name) !== `${value}px`)
        this.style.setProperty(name, `${value}px`);
    }
    this.#updateHandles();
    if (
      ['orientation', 'sizes', 'min', 'keyboardStep', 'resizeTargetMinimumSize'].some((key) =>
        changed.has(key as keyof TpResizablePanelGroup),
      )
    )
      this.#schedule();
  }
  protected override render() {
    let offset = 0;
    const implicit = this.#panels.slice(0, -1).flatMap((panel, i) => {
      offset += this.#state.value[i] ?? 0;
      const handle = this.#authoredHandles.find((item) => item.boundary === i);
      if (handle) {
        offset += this.orientation === 'horizontal' ? handle.offsetWidth : handle.offsetHeight;
        return [];
      }
      return [{ key: `${panel.id}:${this.#panels[i + 1]!.id}`, index: i, offset }];
    });
    return this.renderPart(
      'resizable-panel-group',
      { orientation: this.orientation, disabled: this.disabled },
      {
        properties: {
          class: 'group',
          'data-orientation': this.orientation,
          'data-disabled': this.disabled,
        },
        content: html`<slot @slotchange=${this.#sync}></slot>${repeat(
            implicit,
            (item) => item.key,
            (item) =>
              html`<tp-resizable-handle
                class="implicit"
                .ownerGroup=${this}
                .boundary=${item.index}
                .withHandle=${this.withHandle}
                ${bindPart({ style: this.orientation === 'horizontal' ? (this.direction === 'rtl' ? { right: `${item.offset}px`, left: 'auto' } : { left: `${item.offset}px`, right: 'auto' }) : { top: `${item.offset}px` } })}
              ></tp-resizable-handle>`,
          )}`,
      },
    );
  }
}
