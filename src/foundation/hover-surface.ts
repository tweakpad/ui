import { componentHandlingPrevented } from './part.js';
import { deepActiveElement } from './focus.js';
import type { DelayGroup } from './delay-group.js';
import { safeCorridor } from './safe-corridor.js';
import type { ChangeReason } from './types.js';
import { SyntheticPress } from './synthetic-press.js';

export interface HoverTriggerOptions {
  nativeAction?: boolean;
  disabled?: boolean;
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
  closeOnClick?: boolean;
}
export interface HoverSurfaceOptions {
  document: () => Document;
  open: () => boolean;
  trigger: () => HTMLElement | null;
  popup: () => HTMLElement | null;
  inside: (node: Node | null) => boolean;
  disabled: (element: HTMLElement, options: HoverTriggerOptions) => boolean;
  enabled: () => boolean;
  focusOpens: () => boolean;
  delayedKeyboardFocus?: () => boolean;
  pressToggles: () => boolean;
  closeOnClick: () => boolean;
  hoverable: () => boolean;
  openDelay: () => number;
  closeDelay: () => number;
  group: () => DelayGroup;
  request: (open: boolean, reason: ChangeReason, event?: Event, trigger?: HTMLElement) => void;
  moved: () => void;
}
const delay = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** One pointer intent/lifetime owner shared by anchored and navigation families. */
export class HoverSurfaceController {
  #timer: number | undefined;
  #timerWindow: Window | undefined;
  #corridor: (() => void) | undefined;
  #focusOpened = false;
  #pinned = false;
  #hoverOpenedAt = -Infinity;
  #activeGroup: DelayGroup | undefined;
  #groupOpen = false;
  point: { x: number; y: number } | undefined;
  instant: string | undefined;
  constructor(private options: HoverSurfaceOptions) {}
  get focusOpened(): boolean {
    return this.#focusOpened;
  }
  close(): void {
    this.options.request(false, 'trigger-hover');
  }
  cancel = (): void => {
    if (this.#timer !== undefined) this.#timerWindow?.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#timerWindow = undefined;
    this.#corridor?.();
    this.#corridor = undefined;
  };
  #schedule(callback: () => void, duration: number): void {
    this.cancel();
    this.#timerWindow = this.options.document().defaultView ?? undefined;
    this.#timer = this.#timerWindow?.setTimeout(() => {
      this.#timer = undefined;
      this.#timerWindow = undefined;
      callback();
    }, delay(duration));
  }
  #focusedInside(): boolean {
    return this.options.inside(deepActiveElement(this.options.document()));
  }
  #scheduleClose(event: Event, config: HoverTriggerOptions = {}): void {
    if (
      this.#pinned ||
      this.#focusOpened ||
      (!event.type.startsWith('focus') && this.#focusedInside())
    )
      return;
    this.#schedule(() => {
      if (!this.#pinned && !this.#focusOpened && !this.#focusedInside())
        this.options.request(
          false,
          event.type.startsWith('focus') ? 'focus-outside' : 'trigger-hover',
          event,
        );
    }, config.closeDelay ?? this.options.closeDelay());
  }
  bind(element: HTMLElement, config: HoverTriggerOptions = {}): () => void {
    let touch = false;
    let generation = 0;
    const press = new SyntheticPress((event) => activate(event), false);
    const resetPress = (): void => {
      generation++;
      press.reset();
    };
    const enabled = () =>
      (config.openOnHover ?? this.options.enabled()) && !this.options.disabled(element, config);
    const enter = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !enabled() || componentHandlingPrevented(event)) return;
      this.cancel();
      this.point = { x: event.clientX, y: event.clientY };
      if (this.options.open() && this.options.trigger() === element) return;
      this.#focusOpened = false;
      const group = this.options.group();
      this.instant = group.instant ? 'delay' : undefined;
      group.reserve(this, this.cancel);
      this.#schedule(
        () => this.options.request(true, 'trigger-hover', event, element),
        group.instant ? 0 : (config.openDelay ?? this.options.openDelay()),
      );
    };
    const leave = (event: PointerEvent) => {
      if (!enabled()) return;
      if (this.#focusOpened) return;
      this.cancel();
      if (this.#pinned || this.#focusedInside()) return;
      const popup = this.options.popup();
      if (this.options.open() && this.options.hoverable() && popup)
        this.#corridor = safeCorridor(
          element,
          popup,
          event,
          (e) => this.#scheduleClose(e, config),
          {
            contains: this.options.inside,
          },
        );
      else this.#scheduleClose(event, config);
    };
    const move = (event: PointerEvent) => {
      this.point = { x: event.clientX, y: event.clientY };
      if (this.options.open() && this.options.trigger() === element && !this.#focusOpened)
        this.options.moved();
    };
    const down = (event: PointerEvent) => {
      touch = event.pointerType === 'touch';
    };
    const focus = (event: FocusEvent) => {
      if (touch || !this.options.focusOpens() || this.options.disabled(element, config)) return;
      const delayed = this.options.delayedKeyboardFocus?.() ?? false;
      if (delayed && !(event.composedPath()[0] as Element)?.matches(':focus-visible')) return;
      this.cancel();
      this.#focusOpened = true;
      this.instant = delayed ? undefined : 'focus';
      if (delayed)
        this.#schedule(
          () => this.options.request(true, 'trigger-focus', event, element),
          config.openDelay ?? this.options.openDelay(),
        );
      else this.options.request(true, 'trigger-focus', event, element);
    };
    const blur = (event: FocusEvent) => {
      resetPress();
      this.#focusOpened = false;
      this.cancel();
      if (this.options.inside(event.relatedTarget as Node | null)) return;
      this.#scheduleClose(event, config);
    };
    const activate = (event: MouseEvent | KeyboardEvent) => {
      touch = false;
      queueMicrotask(() => {
        if (
          componentHandlingPrevented(event) ||
          (event.defaultPrevented && config.nativeAction !== false) ||
          this.options.disabled(element, config)
        )
          return;
        if (this.options.pressToggles()) {
          this.cancel();
          const same = this.options.open() && this.options.trigger() === element;
          const recentHover =
            !this.#pinned &&
            this.options.document().defaultView!.performance.now() - this.#hoverOpenedAt < 500;
          const next = !same || recentHover;
          this.options.request(next, 'trigger-press', event, element);
        } else if (config.closeOnClick ?? this.options.closeOnClick()) {
          this.cancel();
          this.instant = 'dismiss';
          this.options.request(false, 'trigger-press', event, element);
        }
      });
    };
    const key = (event: KeyboardEvent): void => {
      if (config.nativeAction !== false || !['Enter', ' '].includes(event.key)) return;
      // A nested native action or actual Button owns its own press. Its resulting
      // click bubbles here once; a second synthetic activation would toggle twice.
      const path = event.composedPath();
      for (const node of path) {
        const candidate = node as Element;
        if (
          candidate.nodeType === 1 &&
          (candidate.matches('button,a[href],input,select,textarea,[contenteditable="true"]') ||
            (candidate !== element && candidate.matches('[role="button"],[role="link"]')))
        )
          return;
        if (node === element) break;
      }
      if (componentHandlingPrevented(event) || this.options.disabled(element, config)) {
        resetPress();
        return;
      }
      if (event.key === ' ') event.preventDefault();
      const currentGeneration = generation;
      queueMicrotask(() => {
        if (currentGeneration !== generation) return;
        if (componentHandlingPrevented(event) || this.options.disabled(element, config)) {
          resetPress();
          return;
        }
        if (event.type === 'keydown') press.keyDown(event);
        else press.keyUp(event);
      });
    };
    const handlers = {
      pointerenter: enter,
      pointerleave: leave,
      pointermove: move,
      pointerdown: down,
      focusin: focus,
      focusout: blur,
      click: activate,
      keydown: key,
      keyup: key,
    };
    for (const [name, handler] of Object.entries(handlers))
      element.addEventListener(name, handler as EventListener);
    return () => {
      this.cancel();
      resetPress();
      for (const [name, handler] of Object.entries(handlers))
        element.removeEventListener(name, handler as EventListener);
    };
  }
  popupEnter = (): void => {
    if (this.options.hoverable()) this.cancel();
  };
  popupLeave = (event: PointerEvent): void => {
    this.#scheduleClose(event);
  };
  popupFocus = (): void => {
    this.cancel();
  };
  popupBlur = (event: FocusEvent): void => {
    if (!this.options.inside(event.relatedTarget as Node | null)) this.#scheduleClose(event);
  };
  accepted(open: boolean, reason: ChangeReason): void {
    if (open) {
      this.#pinned = this.options.pressToggles() && reason !== 'trigger-hover';
      if (reason === 'trigger-hover')
        this.#hoverOpenedAt = this.options.document().defaultView!.performance.now();
      this.options.group().activate(this);
    } else {
      this.cancel();
      this.#pinned = false;
      this.#focusOpened = false;
      this.options.group().release(this);
    }
  }
  sync(): void {
    const group = this.options.group();
    if (this.#activeGroup !== group) {
      this.#activeGroup?.release(this);
      this.#activeGroup = group;
      this.#groupOpen = false;
    }
    if (this.options.open() !== this.#groupOpen) {
      this.#groupOpen = this.options.open();
      if (this.#groupOpen) group.activate(this);
      else {
        this.cancel();
        this.#pinned = false;
        group.release(this);
      }
    }
  }
  disconnect(): void {
    this.cancel();
    this.#activeGroup?.release(this);
    this.options.group().release(this);
    this.#activeGroup = undefined;
    this.#groupOpen = false;
  }
}
