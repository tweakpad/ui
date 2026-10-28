/**
 * The presence of a context bar editor (`uwg-te-req-pres-9`): the alternative text field and the
 * link editor enter sliding down from under the fixed toolbar while they fade in, and leave the
 * way they came. The editor stays mounted through its exit: `hidden` follows the presence,
 * `data-starting-style` and `data-ending-style` mark the two phases for the recipe, and the
 * `context-bar` motion role lets a listener claim either phase, whose settlement then ends it.
 * `motionPolicy` `reduce` shows and hides the editor at once.
 */
import type { ReactiveControllerHost } from 'lit';
import { nothing } from 'lit';
import { type MotionHandle, prepareMotion, presenceRole } from '../../../foundation/motion.js';
import { PresenceController } from '../../../foundation/presence.js';
import type { PresenceState } from '../../../foundation/types.js';

/** The motion role of the context bar editors; its public context names the editor. */
export const CONTEXT_BAR_MOTION = presenceRole('context-bar');

export type ContextBarEditor = 'image-alt' | 'link';

export interface ContextBarPresenceHost {
  /** The widget: the owner of the motion role and the host of the presence. */
  readonly element: HTMLElement & ReactiveControllerHost;
  /** The editor's element while it is rendered. */
  surface(): HTMLElement | null;
}

/** The presence of one context bar editor, requested from its render and driven after each update. */
export class TextEditorContextBarPresence {
  readonly #host: ContextBarPresenceHost;
  readonly #editor: ContextBarEditor;
  readonly #presence: PresenceController;
  #motion: MotionHandle | null = null;
  #phase: PresenceState | null = null;

  constructor(host: ContextBarPresenceHost, editor: ContextBarEditor) {
    this.#host = host;
    this.#editor = editor;
    this.#presence = new PresenceController(host.element, { surface: () => host.surface() });
  }

  get state(): PresenceState {
    return this.#presence.state;
  }

  /** Whether the editor renders: shown, entering or still leaving. */
  get mounted(): boolean {
    return this.#presence.mounted;
  }

  /** The phase markers of the editor's element, for its render. */
  get starting(): '' | typeof nothing {
    return this.#presence.state === 'starting' ? '' : nothing;
  }

  get ending(): '' | typeof nothing {
    return this.#presence.state === 'ending' ? '' : nothing;
  }

  /** Requests the presence the editor's visibility asks for; the widget re-renders on a change. */
  set(visible: boolean): void {
    this.#presence.setPresent(visible);
  }

  /**
   * After the widget rendered: an entering or leaving editor requests its phase's motion, which
   * starts once the open or ending style is in place; its settlement completes the presence.
   */
  updated(): void {
    const state = this.#presence.state;
    if (state === this.#phase) return;
    this.#phase = state;
    if (state === 'starting' || state === 'ending') {
      this.#motion?.cancel();
      this.#motion = prepareMotion(this.#host.element, this.#host.surface(), CONTEXT_BAR_MOTION, {
        phase: state === 'starting' ? 'enter' : 'exit',
        fromState: state === 'starting' ? 'closed' : 'open',
        toState: state === 'starting' ? 'open' : 'closed',
        context: { editor: this.#editor },
      });
    }
    if ((state === 'open' || state === 'ending') && this.#motion) {
      this.#motion.start();
      this.#presence.trackCompletion(this.#motion.finished);
    }
    if (state === 'absent') this.#motion = null;
  }

  /** Stops a playing motion and leaves the widget. */
  dispose(): void {
    this.#motion?.cancel();
    this.#motion = null;
    this.#presence.destroy();
  }
}
