import { CleanupScope, Scheduler } from './services.js';

/**
 * Lifecycle owner for a 2D canvas render surface (Widgets Specification §5.3): the
 * canvas is sized to its CSS box at the device pixel ratio, repainted on size, pixel
 * ratio and theme changes, recovers from context loss, schedules through the
 * Foundation scheduler, and stops while hidden or disconnected. The constructor only
 * stores options; observers and listeners are created on `connect()`.
 */
export interface CanvasSurfaceOptions {
  readonly canvas: HTMLCanvasElement;
  /** Paints the whole surface. `width` and `height` are device pixels; the transform is identity. */
  readonly render: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    pixelRatio: number,
  ) => void;
  /** Owner window; defaults to the canvas document's view. */
  readonly owner?: Window | null;
  /** Element whose `class`, `style` and theme attributes signal a theme change; defaults to the document element. */
  readonly themeRoot?: Element | null;
  readonly contextAttributes?: CanvasRenderingContext2DSettings;
}

const THEME_ATTRIBUTES = ['class', 'style', 'data-theme', 'data-color-scheme'];

export class CanvasSurface {
  readonly #options: CanvasSurfaceOptions;
  #scope: CleanupScope | undefined;
  #scheduler: Scheduler | undefined;
  #frame: (() => void) | undefined;
  #lost = false;
  #dirty = true;
  #pixelRatio = 1;
  #cssWidth = 0;
  #cssHeight = 0;
  #deviceWidth = 0;
  #deviceHeight = 0;
  #renders = 0;

  constructor(options: CanvasSurfaceOptions) {
    this.#options = options;
  }

  get #owner(): Window | undefined {
    return this.#options.owner ?? this.#options.canvas.ownerDocument?.defaultView ?? undefined;
  }

  get connected(): boolean {
    return this.#scope !== undefined;
  }

  get lost(): boolean {
    return this.#lost;
  }

  get pixelRatio(): number {
    return this.#pixelRatio;
  }

  /** Device-pixel extent of the last measurement. */
  get width(): number {
    return this.#deviceWidth;
  }

  get height(): number {
    return this.#deviceHeight;
  }

  /** Number of completed paints; evidence for repaint-once-per-change checks. */
  get renders(): number {
    return this.#renders;
  }

  connect(): void {
    if (this.#scope) return;
    const scope = (this.#scope = new CleanupScope());
    const owner = this.#owner;
    this.#scheduler = new Scheduler(owner);
    scope.add(() => this.#scheduler?.dispose());
    const canvas = this.#options.canvas;
    scope.listen(canvas, 'contextlost' as keyof GlobalEventHandlersEventMap, (event) => {
      event.preventDefault();
      this.#lost = true;
      this.#frame?.();
      this.#frame = undefined;
    });
    scope.listen(canvas, 'contextrestored' as keyof GlobalEventHandlersEventMap, () => {
      this.#lost = false;
      this.invalidate();
    });
    if (owner) {
      const globals = owner as unknown as typeof globalThis;
      this.#pixelRatio = owner.devicePixelRatio || 1;
      const Observer = globals.ResizeObserver;
      if (Observer) {
        const observer = new Observer((entries: ResizeObserverEntry[]) => this.#resized(entries));
        try {
          observer.observe(canvas, { box: 'device-pixel-content-box' });
        } catch {
          observer.observe(canvas);
        }
        scope.add(() => observer.disconnect());
      }
      this.#watchPixelRatio(owner, scope);
      // Monitor moves re-size the window; adopt a ratio the media query did not report.
      scope.listen(owner, 'resize', () => {
        if (!this.#adoptPixelRatio()) return;
        this.#measure();
        this.invalidate();
      });
      const scheme = owner.matchMedia?.('(prefers-color-scheme: dark)');
      if (scheme) scope.listen(scheme, 'change', () => this.invalidate());
      const root = this.#options.themeRoot ?? owner.document?.documentElement;
      const Mutation = globals.MutationObserver;
      if (root && Mutation) {
        const observer = new Mutation(() => this.invalidate());
        observer.observe(root, { attributes: true, attributeFilter: THEME_ATTRIBUTES });
        scope.add(() => observer.disconnect());
      }
      if (owner.document)
        scope.listen(
          owner.document,
          'visibilitychange' as keyof GlobalEventHandlersEventMap,
          () => {
            if (owner.document.visibilityState !== 'hidden' && this.#dirty) this.invalidate();
          },
        );
    }
    this.#measure();
    this.invalidate();
  }

  disconnect(): void {
    this.#frame = undefined;
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#scheduler = undefined;
  }

  /** Requests one repaint on the next frame; coalesces repeated requests. */
  invalidate(): void {
    this.#dirty = true;
    if (!this.#scope || !this.#scheduler || this.#lost || this.#frame) return;
    const owner = this.#owner;
    if (owner?.document?.visibilityState === 'hidden') return;
    if (this.#deviceWidth === 0 || this.#deviceHeight === 0) return;
    this.#frame = this.#scheduler.animationFrame(() => {
      this.#frame = undefined;
      this.#paint();
    });
  }

  #watchPixelRatio(owner: Window, scope: CleanupScope): void {
    const query = owner.matchMedia?.(`(resolution: ${this.#pixelRatio}dppx)`);
    if (!query) return;
    const release = scope.listen(query, 'change', () => {
      release();
      this.#pixelRatio = owner.devicePixelRatio || 1;
      this.#measure();
      this.#watchPixelRatio(owner, scope);
      this.invalidate();
    });
  }

  #measure(): void {
    const rect = this.#options.canvas.getBoundingClientRect?.();
    if (rect) {
      this.#cssWidth = rect.width;
      this.#cssHeight = rect.height;
    }
    this.#deviceWidth = Math.round(this.#cssWidth * this.#pixelRatio);
    this.#deviceHeight = Math.round(this.#cssHeight * this.#pixelRatio);
  }

  /** A pixel-ratio change that reached layout before its media query fired is adopted here. */
  #adoptPixelRatio(): boolean {
    const owner = this.#owner;
    const ratio = owner?.devicePixelRatio || 1;
    if (ratio === this.#pixelRatio) return false;
    this.#pixelRatio = ratio;
    return true;
  }

  #resized(entries: readonly ResizeObserverEntry[]): void {
    this.#adoptPixelRatio();
    for (const entry of entries) {
      this.#cssWidth = entry.contentRect.width;
      this.#cssHeight = entry.contentRect.height;
      const box = entry.devicePixelContentBoxSize?.[0];
      if (box) {
        this.#deviceWidth = box.inlineSize;
        this.#deviceHeight = box.blockSize;
      } else {
        this.#deviceWidth = Math.round(this.#cssWidth * this.#pixelRatio);
        this.#deviceHeight = Math.round(this.#cssHeight * this.#pixelRatio);
      }
    }
    this.invalidate();
  }

  #paint(): void {
    if (!this.#scope || this.#lost) return;
    const canvas = this.#options.canvas;
    const width = this.#deviceWidth;
    const height = this.#deviceHeight;
    if (width === 0 || height === 0) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext('2d', this.#options.contextAttributes);
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    this.#dirty = false;
    this.#renders++;
    this.#options.render(context, width, height, this.#pixelRatio);
  }
}
