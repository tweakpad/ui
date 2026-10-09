import { composedParent } from './focus.js';
import { collator as intlCollator, numberFormatter } from './intl.js';
import { NumberLocale } from './number-locale.js';
import {
  dateTimeFormatter,
  durationFormatter,
  relativeTimeFormatter,
  type DurationRecord,
  type DurationStyle,
} from './date-locale.js';
import type { NumericText } from './number-locale.js';
import {
  formatDuration,
  formatDurationParts,
  type DurationTextOptions,
  type DurationTextParts,
} from './duration-format.js';

export class CleanupScope {
  readonly #cleanups = new Set<() => void>();
  #disposed = false;

  constructor(
    private readonly onError: (error: unknown) => void = (error) =>
      console.error('Tweakpad cleanup failed; remaining resources were released.', error),
  ) {}

  #release(cleanup: () => void): void {
    try {
      cleanup();
    } catch (error) {
      // Reporting is consumer code too; it cannot interrupt mandatory release.
      try {
        this.onError(error);
      } catch {
        // Continue releasing this scope even when its diagnostic sink throws.
      }
    }
  }

  add(cleanup: () => void): () => void {
    if (this.#disposed) {
      this.#release(cleanup);
      return () => undefined;
    }
    this.#cleanups.add(cleanup);
    return () => {
      if (this.#cleanups.delete(cleanup)) this.#release(cleanup);
    };
  }

  listen<K extends keyof GlobalEventHandlersEventMap>(
    target: EventTarget,
    type: K,
    listener: (event: GlobalEventHandlersEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): () => void {
    const callback = listener as EventListener;
    target.addEventListener(type, callback, options);
    return this.add(() => target.removeEventListener(type, callback, options));
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    const cleanups = [...this.#cleanups].reverse();
    this.#cleanups.clear();
    for (const cleanup of cleanups) this.#release(cleanup);
  }
}

export class Scheduler {
  readonly #scope = new CleanupScope();

  constructor(private readonly owner: Window | undefined = globalThis.window) {}

  microtask(callback: () => void): () => void {
    let active = true;
    const release = this.#scope.add(() => {
      active = false;
    });
    queueMicrotask(() => {
      if (!active) return;
      release();
      callback();
    });
    return release;
  }

  timeout(callback: () => void, delay: number): () => void {
    if (this.owner) {
      const owner = this.owner;
      const id = owner.setTimeout(() => {
        release();
        callback();
      }, delay);
      const release = this.#scope.add(() => owner.clearTimeout(id));
      return release;
    }
    const id = globalThis.setTimeout(() => {
      release();
      callback();
    }, delay);
    const release = this.#scope.add(() => globalThis.clearTimeout(id));
    return release;
  }

  interval(callback: () => void, delay: number): () => void {
    if (this.owner) {
      const owner = this.owner;
      const id = owner.setInterval(callback, delay);
      return this.#scope.add(() => owner.clearInterval(id));
    }
    const id = globalThis.setInterval(callback, delay);
    return this.#scope.add(() => globalThis.clearInterval(id));
  }

  animationFrame(callback: FrameRequestCallback): () => void {
    const owner = this.owner;
    if (!owner?.requestAnimationFrame)
      throw new Error('A presentation frame requires an owner window with requestAnimationFrame.');
    const id = owner.requestAnimationFrame((time) => {
      release();
      callback(time);
    });
    const release = this.#scope.add(() => owner.cancelAnimationFrame(id));
    return release;
  }

  dispose(): void {
    this.#scope.dispose();
  }
}

export type DiagnosticSeverity = 'info' | 'warning' | 'error';
export interface Diagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  context?: unknown;
}

export class DiagnosticChannel extends EventTarget {
  report(diagnostic: Diagnostic): void {
    this.dispatchEvent(new CustomEvent<Diagnostic>('diagnostic', { detail: diagnostic }));
  }
}

/** The detail of a `tp-diagnostic` event: exactly a code, a message and a severity. */
export interface DiagnosticDetail {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
}

/**
 * Dispatches a bubbling, composed `tp-diagnostic` event from `host` (Foundation diagnostics
 * channel). With `once`, a code already in the set is not reported again; the set records it.
 * Returns whether the event was dispatched.
 */
export function reportDiagnostic(
  host: EventTarget,
  detail: DiagnosticDetail,
  options: { once?: Set<string> } = {},
): boolean {
  if (options.once) {
    if (options.once.has(detail.code)) return false;
    options.once.add(detail.code);
  }
  const { code, message, severity } = detail;
  const Event = (host as Partial<Node>).ownerDocument?.defaultView?.CustomEvent ?? CustomEvent;
  host.dispatchEvent(
    new Event<DiagnosticDetail>('tp-diagnostic', {
      bubbles: true,
      composed: true,
      detail: { code, message, severity },
    }),
  );
  return true;
}

export class LocaleService {
  constructor(readonly locale: string | string[] | undefined = undefined) {}
  number(value: number, options?: Intl.NumberFormatOptions): string {
    return numberFormatter(this.locale, options).format(value);
  }
  numberLocale(options?: Intl.NumberFormatOptions): NumberLocale {
    return new NumberLocale(this.locale, options);
  }
  parseNumber(text: string, options?: Intl.NumberFormatOptions, committed = false): NumericText {
    return this.numberLocale(options).parse(text, committed);
  }
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return dateTimeFormatter(this.locale, options).format(value);
  }
  relativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ): string {
    return relativeTimeFormatter(this.locale, options).format(value, unit);
  }
  /**
   * Formats seconds as media clock text (`style: 'digital'`, the default, with optional `guide`)
   * or as a spoken phrase (`style: 'long'`); see `formatDuration`. A duration record formats
   * through `Intl.DurationFormat` or its unit-list fallback.
   */
  duration(seconds: number, options?: DurationTextOptions): string;
  duration(value: DurationRecord, style?: DurationStyle): string;
  duration(value: number | DurationRecord, options?: DurationTextOptions | DurationStyle): string {
    if (typeof value === 'number')
      return formatDuration(value, typeof options === 'object' ? options : {}, this.locale);
    return durationFormatter(this.locale, typeof options === 'string' ? options : undefined).format(
      value,
    );
  }
  /** Digital or spoken duration text with its sign separated; see `formatDurationParts`. */
  durationParts(seconds: number, options?: DurationTextOptions): DurationTextParts {
    return formatDurationParts(seconds, options, this.locale);
  }
  compare(a: string, b: string, options?: Intl.CollatorOptions): number {
    return this.collator(options).compare(a, b);
  }
  collator(options?: Intl.CollatorOptions): Intl.Collator {
    return intlCollator(this.locale, options);
  }
}

/** The closest rendered language owner, including slots and shadow hosts. */
export function resolveLocale(element: Element): string | undefined {
  for (let node: Node | null = element; node; node = composedParent(node)) {
    if (node.nodeType !== 1) continue;
    const language = (node as Element).getAttribute('lang');
    if (language !== null && language.trim()) return language;
  }
  return element.ownerDocument.documentElement.lang || undefined;
}
