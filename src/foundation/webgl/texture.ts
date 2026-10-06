export type WebGLTextureSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

export interface WebGLMediaTexture {
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
}

type Entry =
  | { state: 'loading'; key: string }
  | { state: 'ready'; key: string; value: WebGLMediaTexture; used: number }
  | { state: 'failed'; key: string; reason: string };

/** Intrinsic pixel size of a texture source, or null until it has content. */
export function textureSourceSize(
  source: WebGLTextureSource,
): { width: number; height: number } | null {
  if (source instanceof HTMLImageElement)
    return source.complete && source.naturalWidth
      ? { width: source.naturalWidth, height: source.naturalHeight }
      : null;
  if (source instanceof HTMLVideoElement)
    return source.readyState >= 2 && source.videoWidth
      ? { width: source.videoWidth, height: source.videoHeight }
      : null;
  return source.width && source.height ? { width: source.width, height: source.height } : null;
}

const sourceKey = (source: WebGLTextureSource) =>
  source instanceof HTMLImageElement
    ? source.currentSrc || source.src
    : source instanceof HTMLVideoElement
      ? source.currentSrc || source.src
      : '';

/**
 * Media textures keyed by element and current source. Images upload once after decoding as
 * sRGB with mipmaps; video and canvas sources re-upload on request while a transition runs.
 * Cross-origin sources without CORS fail individually instead of breaking the renderer.
 */
const sharedCaches = new WeakMap<WebGL2RenderingContext, WebGLTextureCache>();

export class WebGLTextureCache {
  /** The cache shared by every consumer of one context, so equal media uploads once. */
  static shared(gl: WebGL2RenderingContext): WebGLTextureCache {
    let cache = sharedCaches.get(gl);
    if (!cache) sharedCaches.set(gl, (cache = new WebGLTextureCache(gl, 12)));
    return cache;
  }
  readonly #entries = new Map<WebGLTextureSource, Entry>();
  readonly #listeners = new Set<() => void>();
  #clock = 0;
  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly limit = 6,
  ) {}
  /** Notified whenever an upload finishes or fails. */
  listen(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
  /** Forget every texture after context loss; the old objects are already invalid. */
  reset(): void {
    this.#entries.clear();
  }
  get(source: WebGLTextureSource): WebGLMediaTexture | null {
    const key = sourceKey(source);
    const entry = this.#entries.get(source);
    if (entry && entry.key === key) {
      if (entry.state !== 'ready') return null;
      entry.used = ++this.#clock;
      if (!(source instanceof HTMLImageElement)) this.#upload(source, entry.value.texture);
      return entry.value;
    }
    if (entry?.state === 'ready') this.gl.deleteTexture(entry.value.texture);
    this.#entries.set(source, { state: 'loading', key });
    void this.#load(source, key);
    return null;
  }
  failure(source: WebGLTextureSource): string | null {
    const entry = this.#entries.get(source);
    return entry?.state === 'failed' ? entry.reason : null;
  }
  async #load(source: WebGLTextureSource, key: string): Promise<void> {
    try {
      if (source instanceof HTMLImageElement && !textureSourceSize(source)) await source.decode();
      else if (source instanceof HTMLImageElement) await source.decode().catch(() => {});
    } catch {
      this.#fail(source, key, 'Image could not be decoded.');
      return;
    }
    if (this.#entries.get(source)?.key !== key) return;
    const size = textureSourceSize(source);
    if (!size) {
      // Video or canvas without content yet: retry on the next request.
      this.#entries.delete(source);
      return;
    }
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) return this.#fail(source, key, 'Texture allocation failed.');
    try {
      this.#upload(source, texture, true);
    } catch (error) {
      gl.deleteTexture(texture);
      this.#fail(
        source,
        key,
        error instanceof DOMException && error.name === 'SecurityError'
          ? 'Cross-origin media requires CORS (crossorigin="anonymous" and an allowing server).'
          : 'Texture upload failed.',
      );
      return;
    }
    this.#entries.set(source, {
      state: 'ready',
      key,
      value: { texture, ...size },
      used: ++this.#clock,
    });
    this.#evict();
    this.#notify();
  }
  #upload(source: WebGLTextureSource, texture: WebGLTexture, initial = false): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (initial) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    const mipmaps = source instanceof HTMLImageElement;
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
    );
    if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
  }
  #fail(source: WebGLTextureSource, key: string, reason: string): void {
    if (this.#entries.get(source)?.key !== key) return;
    this.#entries.set(source, { state: 'failed', key, reason });
    this.#notify();
  }

  #evict(): void {
    const ready = [...this.#entries].filter(
      (entry): entry is [WebGLTextureSource, Extract<Entry, { state: 'ready' }>] =>
        entry[1].state === 'ready',
    );
    ready.sort((a, b) => a[1].used - b[1].used);
    while (ready.length > this.limit) {
      const [source, entry] = ready.shift()!;
      this.gl.deleteTexture(entry.value.texture);
      this.#entries.delete(source);
    }
  }
  dispose(): void {
    for (const entry of this.#entries.values())
      if (entry.state === 'ready') this.gl.deleteTexture(entry.value.texture);
    this.#entries.clear();
  }
}
