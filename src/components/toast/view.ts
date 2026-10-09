import type { ReactiveControllerHost } from 'lit';
import { PresenceController } from '../../foundation/presence.js';
import { createId } from '../../foundation/id.js';
import { prepareMotion, type MotionHandle, presenceRole } from '../../foundation/motion.js';
import type { ToastObject } from './types.js';
import type { ToastManager } from './manager.js';
import type { PositioningHandle } from '../../foundation/positioning.js';

/** Per-notification rendering lifetime; state and timers remain in the shared manager. */
export class ToastView {
  readonly labelId = createId('tp-toast-message');
  readonly presence: PresenceController;
  positioner: PositioningHandle | null = null;
  positioningKey: object | undefined;
  observer: ResizeObserver | null = null;
  motion: MotionHandle | null = null;
  element: HTMLElement | null = null;
  toast: ToastObject;
  #present: boolean | undefined;
  #motionPhase: boolean | undefined;
  constructor(
    readonly host: HTMLElement & ReactiveControllerHost,
    toast: ToastObject,
    readonly manager: ToastManager,
    readonly changed: () => void,
  ) {
    this.toast = toast;
    this.presence = new PresenceController(host, {
      surface: () => this.element,
      onStateChange: changed,
      onComplete: (present) => {
        const current = this.toast;
        if (present) manager.completeEntrance(current.identifier, current.lifecycleKey);
        else manager.remove(current.identifier, current.lifecycleKey);
      },
    });
    this.sync(toast);
  }
  sync(toast: ToastObject): void {
    this.toast = toast;
    const present = toast.transitionStatus !== 'ending';
    if (present !== this.#present) {
      this.#present = present;
      this.#motionPhase = undefined;
      this.motion?.cancel();
      this.motion = null;
      this.presence.setPresent(present);
    }
  }
  rendered(element: HTMLElement): void {
    if (this.element && this.element !== element) {
      this.motion?.cancel();
      this.observer?.disconnect();
      this.observer = null;
      this.positioner?.destroy();
      this.positioner = null;
      this.positioningKey = undefined;
      this.#motionPhase = undefined;
    }
    this.element = element;
    const present = this.#present ?? true;
    if (this.#motionPhase === present) return;
    this.#motionPhase = present;
    this.motion = prepareMotion(element, element, presenceRole('toast.presence'), {
      phase: present ? 'enter' : 'exit',
      fromState: !present,
      toState: present,
      context: {
        identifier: this.toast.identifier,
        type: this.toast.type ?? '',
        cause: this.toast.cause ?? '',
      },
    });
    if (this.motion.claimed) {
      element.setAttribute('data-tp-motion-driven', '');
      this.presence.trackCompletion(this.motion.finished);
      this.motion.start();
    } else element.removeAttribute('data-tp-motion-driven');
  }
  destroy(): void {
    this.motion?.cancel();
    this.presence.destroy();
    this.positioner?.destroy();
    this.observer?.disconnect();
    this.element = null;
  }
}
