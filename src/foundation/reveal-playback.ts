/**
 * Reveal playback (Foundation §18.18 `vr-events`): plays a component's reveal through its motion
 * role, announces it and resolves once the motion has settled, and drives a standalone reveal from
 * the viewport trigger. Shared by every revealing component.
 */
import {
  prepareMotion,
  resolvesReducedMotion,
  type MotionRoleDefinition,
  type MotionValue,
} from './motion.js';
import { canObserveIntersection } from './observation.js';
import { ViewportTrigger } from './viewport-trigger.js';

/** Milliseconds of one CSS `<time>` value (`0.56s`, `560ms`); 0 when it does not parse. */
export function cssTimeMs(text: string): number {
  const value = text.trim();
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.endsWith('ms') ? number : number * 1000;
}

/** The longest `duration + delay` among an element's transitions, in milliseconds. */
export function transitionSpan(style: CSSStyleDeclaration): number {
  const times = (value: string) => value.split(',').map(cssTimeMs);
  const durations = times(style.transitionDuration);
  const delays = times(style.transitionDelay);
  return Math.max(
    0,
    ...durations.map((duration, index) => duration + (delays[index % delays.length] ?? 0)),
  );
}

/** Reduced motion or no intersection support: reveals present their rest state from the start. */
export function revealsImmediately(element: Element): boolean {
  return !canObserveIntersection(element) || resolvesReducedMotion(element);
}

export interface RevealPlaybackOptions {
  readonly owner: HTMLElement;
  readonly role: MotionRoleDefinition;
  emit(type: string, detail: unknown): void;
  /** The effect tokens announced with the reveal. */
  effect(): string;
  /** Additional motion request context. */
  context?(): Readonly<Record<string, MotionValue>>;
  /** Presents the revealed (or start) state, with a coordinator delay in milliseconds. */
  apply(revealed: boolean, delay: number): void;
  /** The rendered transition span in milliseconds, read after `apply`. */
  span(): number;
}

/**
 * One component's reveal: a serial guard so a later reveal or reset supersedes pending
 * completions, the motion role request, and completion from the claimed driver's playback or the
 * rendered transitions.
 */
export class RevealPlayback {
  #serial = 0;
  #revealed = false;

  constructor(private readonly options: RevealPlaybackOptions) {}

  get revealed(): boolean {
    return this.#revealed;
  }

  /** Plays the reveal after `delay` ms and resolves once its motion has settled. */
  play(delay = 0): Promise<void> {
    const { owner, role } = this.options;
    const serial = ++this.#serial;
    this.#revealed = true;
    this.options.apply(true, delay);
    const effect = this.options.effect();
    const motion = prepareMotion(owner, owner, role, {
      phase: 'change',
      fromState: 'pending',
      toState: 'revealed',
      context: { effect, ...this.options.context?.() },
    });
    motion.start();
    this.options.emit('tp-reveal-change', { revealed: true, effect });
    const view = owner.ownerDocument.defaultView;
    const settled: Promise<void> = motion.claimed
      ? motion.finished
      : new Promise((resolve) =>
          view ? view.setTimeout(resolve, this.options.span()) : resolve(),
        );
    return settled.then(() => {
      if (serial !== this.#serial || !this.#revealed) return;
      this.options.emit('tp-reveal-change-complete', { revealed: true });
    });
  }

  /** Returns instantly to the start state (a repeating reveal that left the view). */
  reset(): void {
    if (!this.#revealed) return;
    const serial = ++this.#serial;
    this.#revealed = false;
    this.options.apply(false, 0);
    this.options.emit('tp-reveal-change', { revealed: false, effect: this.options.effect() });
    queueMicrotask(() => {
      if (serial === this.#serial)
        this.options.emit('tp-reveal-change-complete', { revealed: false });
    });
  }
}

export interface StandaloneRevealOptions {
  readonly playback: RevealPlayback;
  repeat(): boolean;
  /** Has an effect to play. */
  revealing(): boolean;
  ready(): boolean;
  held(): boolean;
  /** Coordinated (or waiting for a coordinator): the coordinator owns the reveal instead. */
  coordinated(): boolean;
}

/**
 * The reveal of a component without a coordinator: it observes entry only while a reveal is
 * pending (or repeats), plays once in view, ready and not held, and resets when a repeating
 * reveal leaves the view entirely.
 */
export class StandaloneReveal {
  readonly #trigger: ViewportTrigger;

  constructor(
    private readonly element: HTMLElement,
    private readonly options: StandaloneRevealOptions,
  ) {
    this.#trigger = new ViewportTrigger(element, {
      repeat: () => this.#repeats(),
      changed: () => this.update(),
      left: () => {
        if (this.#repeats()) options.playback.reset();
      },
    });
  }

  /** Whether the reveal currently replays on re-entry. */
  #repeats(): boolean {
    return this.options.repeat() && !revealsImmediately(this.element);
  }

  /** Re-evaluates observation and plays the reveal when it may. */
  update(): void {
    const { playback } = this.options;
    const connected = this.element.isConnected;
    if (!connected || this.options.coordinated() || !this.options.revealing()) {
      this.#trigger.release();
      return;
    }
    const immediate = revealsImmediately(this.element);
    this.#trigger.sync(!immediate && (!playback.revealed || this.#repeats()));
    if (playback.revealed || this.options.held() || !this.options.ready()) return;
    if (!immediate && !this.#trigger.inView) return;
    void playback.play();
    this.#trigger.sync(!immediate && this.#repeats());
  }

  release(): void {
    this.#trigger.release();
  }
}
