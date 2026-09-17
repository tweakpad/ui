export type MotionKind = 'presence' | 'state' | 'ambient';

export type MotionPhase = 'enter' | 'exit' | 'change' | 'start' | 'stop';

export type MotionCompletion = 'blocking' | 'non-blocking';

export type MotionPolicy = 'inherit' | 'normal' | 'reduce';

export type MotionValue = string | number | boolean | null;

export interface MotionRoleDefinition {
  name: string;
  kind: MotionKind;
  phases: readonly MotionPhase[];
  completion: MotionCompletion;
}

export interface MotionRequest {
  role: string;
  kind: MotionKind;
  phase: MotionPhase;
  owner: HTMLElement;
  target: HTMLElement;
  fromState?: MotionValue | undefined;
  toState?: MotionValue | undefined;
  context: Readonly<Record<string, MotionValue>>;
  reducedMotion: boolean;
  signal: AbortSignal;
}

export interface MotionPlayback {
  finished: PromiseLike<void>;
  cancel(): void;
}

export interface MotionDriver {
  play(request: MotionRequest): MotionPlayback;
}

export interface MotionRequestOptions {
  phase: MotionPhase;
  fromState?: MotionValue;
  toState?: MotionValue;
  context?: Readonly<Record<string, MotionValue>>;
}

export interface MotionHandle {
  readonly claimed: boolean;
  readonly request: MotionRequest | null;
  readonly playback: MotionPlayback | null;
  readonly finished: Promise<void>;
  start(): MotionPlayback | null;
  cancel(): void;
}

const ACTIVE_MOTION = new WeakMap<HTMLElement, Map<string, MotionHandle>>();
const DRIVEN_ROLES = new WeakMap<HTMLElement, Set<string>>();
const MAX_PLAYBACK_DURATION = 10_000;

export function cancelMotions(owner: HTMLElement): void {
  const active = ACTIVE_MOTION.get(owner);
  if (!active) return;
  for (const handle of [...active.values()]) handle.cancel();
  ACTIVE_MOTION.delete(owner);
}

export class TpMotionRequestEvent extends Event {
  readonly request: MotionRequest;
  #driver: MotionDriver | null = null;
  #dispatching = true;

  constructor(request: MotionRequest) {
    super('tp-motion-request', { bubbles: true, composed: true, cancelable: true });
    this.request = request;
  }

  get claimed(): boolean {
    return this.#driver !== null;
  }

  respondWith(driver: MotionDriver): boolean {
    if (!this.#dispatching) {
      reportMotionDiagnostic(
        this.request.owner,
        'motion-claim-too-late',
        `Motion role "${this.request.role}" can only be claimed synchronously while tp-motion-request is dispatching.`,
      );
      return false;
    }
    if (this.#driver) {
      reportMotionDiagnostic(
        this.request.owner,
        'motion-already-claimed',
        `Motion role "${this.request.role}" was already claimed; the later claim was ignored.`,
      );
      return false;
    }
    this.#driver = driver;
    this.preventDefault();
    return true;
  }

  finishDispatch(): MotionDriver | null {
    this.#dispatching = false;
    return this.#driver;
  }
}

declare global {
  interface HTMLElementEventMap {
    'tp-motion-request': TpMotionRequestEvent;
  }
}

export function prepareMotion(
  owner: HTMLElement,
  target: HTMLElement | null,
  role: MotionRoleDefinition,
  options: MotionRequestOptions,
): MotionHandle {
  const active = ACTIVE_MOTION.get(owner) ?? new Map<string, MotionHandle>();
  ACTIVE_MOTION.set(owner, active);
  active.get(role.name)?.cancel();

  if (!target) {
    reportMotionDiagnostic(
      owner,
      'motion-target-missing',
      `Motion role "${role.name}" has no current presentation target.`,
    );
    return settledHandle();
  }
  if (!role.phases.includes(options.phase)) {
    reportMotionDiagnostic(
      owner,
      'motion-phase-unsupported',
      `Motion role "${role.name}" does not declare the "${options.phase}" phase.`,
    );
    return settledHandle();
  }

  const controller = new AbortController();
  const request: MotionRequest = Object.freeze({
    role: role.name,
    kind: role.kind,
    phase: options.phase,
    owner,
    target,
    fromState: options.fromState,
    toState: options.toState,
    context: Object.freeze({ ...(options.context ?? {}) }),
    reducedMotion: resolvesReducedMotion(owner),
    signal: controller.signal,
  });
  const event = new TpMotionRequestEvent(request);
  owner.dispatchEvent(event);
  const driver = event.finishDispatch();
  let playback: MotionPlayback | null = null;
  let targetObserver: MutationObserver | null = null;
  let timeout: number | undefined;
  let started = false;
  let cancelled = false;
  let resolveFinished!: () => void;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });

  const handle: MotionHandle = {
    claimed: driver !== null,
    request,
    get playback() {
      return playback;
    },
    finished,
    start() {
      if (started || cancelled || !driver) return playback;
      started = true;
      if (!owner.isConnected || !target.isConnected) {
        cancelled = true;
        controller.abort();
        reportMotionDiagnostic(
          owner,
          'motion-target-destroyed',
          `Motion role "${role.name}" cannot start because its owner or target is no longer mounted.`,
        );
        finish();
        return null;
      }
      setDriven(target, role.name, true);
      const targetRoot = target.getRootNode();
      targetObserver = new MutationObserver(() => {
        if (!target.isConnected || target.getRootNode() !== targetRoot) handle.cancel();
      });
      targetObserver.observe(targetRoot, { childList: true, subtree: true });
      if (request.reducedMotion) {
        queueMicrotask(finish);
        return null;
      }
      try {
        playback = driver.play(request);
        if (!isPlayback(playback)) {
          throw new TypeError('MotionDriver.play() must return a MotionPlayback.');
        }
        timeout =
          role.kind === 'ambient' && options.phase === 'start'
            ? undefined
            : window.setTimeout(() => {
                reportMotionDiagnostic(
                  owner,
                  'motion-playback-timeout',
                  `Motion role "${role.name}" did not settle within ${MAX_PLAYBACK_DURATION}ms.`,
                );
                controller.abort();
                cancelPlayback();
                finish();
              }, MAX_PLAYBACK_DURATION);
        void Promise.resolve(playback.finished).then(
          () => {
            finish();
          },
          (error: unknown) => {
            if (!controller.signal.aborted && !finishedOnce) {
              reportMotionDiagnostic(
                owner,
                'motion-playback-rejected',
                `Motion role "${role.name}" rejected: ${errorMessage(error)}.`,
              );
            }
            finish();
          },
        );
      } catch (error) {
        reportMotionDiagnostic(
          owner,
          'motion-driver-error',
          `Motion role "${role.name}" failed to start: ${errorMessage(error)}.`,
        );
        finish();
      }
      return playback;
    },
    cancel() {
      if (cancelled) return;
      cancelled = true;
      controller.abort();
      cancelPlayback();
      finish();
    },
  };

  const cancelPlayback = (): void => {
    if (!playback) return;
    const current = playback;
    playback = null;
    try {
      current.cancel();
    } catch (error) {
      reportMotionDiagnostic(
        owner,
        'motion-cancel-error',
        `Motion role "${role.name}" failed to cancel: ${errorMessage(error)}.`,
      );
    }
  };
  let finishedOnce = false;
  const finish = (): void => {
    if (finishedOnce) return;
    finishedOnce = true;
    targetObserver?.disconnect();
    targetObserver = null;
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
      timeout = undefined;
    }
    setDriven(target, role.name, false);
    if (active.get(role.name) === handle) active.delete(role.name);
    if (!active.size) ACTIVE_MOTION.delete(owner);
    resolveFinished();
  };

  active.set(role.name, handle);
  if (!driver) queueMicrotask(finish);
  return handle;
}

export function resolvesReducedMotion(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    const value = current.getAttribute('motion-policy');
    if (value === 'reduce') return true;
    if (value === 'normal') return false;
    const root = current.getRootNode();
    current = current.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function reportMotionDiagnostic(owner: HTMLElement, code: string, message: string): void {
  queueMicrotask(() =>
    owner.dispatchEvent(
      new CustomEvent('tp-diagnostic', {
        bubbles: true,
        composed: true,
        detail: { code, message, severity: 'error' as const },
      }),
    ),
  );
}

function settledHandle(): MotionHandle {
  return {
    claimed: false,
    request: null,
    playback: null,
    finished: Promise.resolve(),
    start: () => null,
    cancel: () => undefined,
  };
}

function isPlayback(value: unknown): value is MotionPlayback {
  return (
    typeof value === 'object' &&
    value !== null &&
    'finished' in value &&
    'cancel' in value &&
    typeof (value as MotionPlayback).cancel === 'function'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function setDriven(target: HTMLElement, role: string, driven: boolean): void {
  const roles = DRIVEN_ROLES.get(target) ?? new Set<string>();
  if (driven) roles.add(role);
  else roles.delete(role);
  if (roles.size) {
    DRIVEN_ROLES.set(target, roles);
    target.setAttribute('data-tp-motion-driven', [...roles].join(' '));
  } else {
    DRIVEN_ROLES.delete(target);
    target.removeAttribute('data-tp-motion-driven');
  }
}
