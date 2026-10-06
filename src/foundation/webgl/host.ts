/**
 * One WebGL2 context per document, shared by every consumer. Rendering happens off-screen and
 * each consumer displays finished frames in its own canvas, so pages with many effects never
 * approach the browser's live-context limit.
 */
const attributes: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power',
};

type GLCanvas = OffscreenCanvas | HTMLCanvasElement;
const hosts = new WeakMap<Document, WebGLHost>();

export class WebGLHost {
  /** Shared host for a document, or null when WebGL2 is unavailable. */
  static acquire(document: Document): WebGLHost | null {
    let host = hosts.get(document);
    if (!host) {
      const created = WebGLHost.#create(document);
      if (!created) return null;
      host = created;
      hosts.set(document, host);
    }
    host.#references++;
    return host;
  }
  static #create(document: Document): WebGLHost | null {
    const view = document.defaultView;
    try {
      const canvas: GLCanvas =
        view && 'OffscreenCanvas' in view
          ? new view.OffscreenCanvas(1, 1)
          : document.createElement('canvas');
      const gl = canvas.getContext('webgl2', attributes) as WebGL2RenderingContext | null;
      return gl ? new WebGLHost(document, canvas, gl) : null;
    } catch {
      return null;
    }
  }

  readonly canvas: GLCanvas;
  readonly gl: WebGL2RenderingContext;
  #references = 0;
  #lost = false;
  /** Increments whenever the context is restored; resources from older generations are invalid. */
  #generation = 0;
  readonly #listeners = new Set<() => void>();
  private constructor(
    readonly document: Document,
    canvas: GLCanvas,
    gl: WebGL2RenderingContext,
  ) {
    this.canvas = canvas;
    this.gl = gl;
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.#lost = true;
      for (const listener of this.#listeners) listener();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.#lost = false;
      this.#generation++;
      for (const listener of this.#listeners) listener();
    });
  }
  get lost(): boolean {
    return this.#lost || this.gl.isContextLost();
  }
  get generation(): number {
    return this.#generation;
  }
  /** Notified when the context is lost or restored. */
  onChange(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  resize(width: number, height: number): void {
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }
  /** Copy the finished frame into a consumer's display canvas. */
  present(
    target: HTMLCanvasElement,
    display: ImageBitmapRenderingContext | CanvasRenderingContext2D,
  ): void {
    if ('transferFromImageBitmap' in display && 'transferToImageBitmap' in this.canvas) {
      display.transferFromImageBitmap(this.canvas.transferToImageBitmap());
      return;
    }
    const context = display as CanvasRenderingContext2D;
    context.globalCompositeOperation = 'copy';
    context.drawImage(this.canvas, 0, 0, target.width, target.height);
  }
  /** Display context for a consumer canvas matching how this host presents frames. */
  displayContext(
    target: HTMLCanvasElement,
  ): ImageBitmapRenderingContext | CanvasRenderingContext2D | null {
    if ('transferToImageBitmap' in this.canvas) {
      const bitmap = target.getContext('bitmaprenderer');
      if (bitmap) return bitmap;
    }
    return target.getContext('2d');
  }
  release(): void {
    if (--this.#references > 0) return;
    this.#references = 0;
    hosts.delete(this.document);
    this.#listeners.clear();
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
