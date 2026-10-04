import type { Direction } from './types.js';
import { composedParent } from './focus.js';
import { NumberLocale, numberFormatter } from './number-locale.js';
import type { NumericText } from './number-locale.js';

export class CleanupScope {
  readonly #cleanups = new Set<() => void>();
  #disposed = false;

  add(cleanup: () => void): () => void {
    if (this.#disposed) {
      cleanup();
      return () => undefined;
    }
    this.#cleanups.add(cleanup);
    return () => {
      if (this.#cleanups.delete(cleanup)) cleanup();
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
    for (const cleanup of [...this.#cleanups].reverse()) cleanup();
    this.#cleanups.clear();
  }
}

export class Scheduler {
  readonly #scope = new CleanupScope();

  microtask(callback: () => void): () => void {
    let active = true;
    queueMicrotask(() => {
      if (active) callback();
    });
    return this.#scope.add(() => {
      active = false;
    });
  }

  timeout(callback: () => void, delay: number): () => void {
    const id = window.setTimeout(callback, delay);
    return this.#scope.add(() => window.clearTimeout(id));
  }

  animationFrame(callback: FrameRequestCallback): () => void {
    const id = requestAnimationFrame(callback);
    return this.#scope.add(() => cancelAnimationFrame(id));
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

export class EnvironmentService {
  constructor(readonly document: Document = globalThis.document) {}

  direction(element?: Element | null): Direction {
    const explicit = element?.closest('[dir]')?.getAttribute('dir');
    if (explicit === 'rtl' || explicit === 'ltr') return explicit;
    return this.document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
  }

  get reducedMotion(): boolean {
    return (
      this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false
    );
  }

  activeElement(root: Document | ShadowRoot = this.document): Element | null {
    let active: Element | null = root.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active;
  }
}

export class LocaleService {
  readonly #collators = new Map<string, Intl.Collator>();
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
    return new Intl.DateTimeFormat(this.locale, options).format(value);
  }
  compare(a: string, b: string, options?: Intl.CollatorOptions): number {
    return this.collator(options).compare(a, b);
  }
  collator(options?: Intl.CollatorOptions): Intl.Collator {
    const key = JSON.stringify(options ?? {});
    let collator = this.#collators.get(key);
    if (!collator) {
      collator = new Intl.Collator(this.locale, options);
      this.#collators.set(key, collator);
    }
    return collator;
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
