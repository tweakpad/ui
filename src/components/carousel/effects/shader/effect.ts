import {
  stackEffectConstraint,
  type CarouselEffect,
  type CarouselEffectContext,
  type CarouselEffectFrame,
  type CarouselEffectInstance,
  type CarouselEffectItem,
} from '../../../../foundation/carousel/effect.js';
import { WebGLHost } from '../../../../foundation/webgl/host.js';
import { createProgram, type WebGLProgramHandle } from '../../../../foundation/webgl/program.js';
import {
  WebGLTextureCache,
  type WebGLTextureSource,
} from '../../../../foundation/webgl/texture.js';
import { renderCrossfade } from '../crossfade.js';
import {
  EffectStyles,
  carouselItemLayers,
  carouselItemMedia,
  clamp01,
  easeOutCubic,
  smoothstep,
  easings,
  type CarouselEffectTiming,
} from '../shared.js';
import {
  coverMap,
  focalPoint,
  fragmentSource,
  revealDirection,
  shaderVariants,
  vertexSource,
  type CarouselShaderVariant,
} from './shaders.js';

export interface CarouselShaderOptions extends CarouselEffectTiming {
  /** Transition look. Default `wipe`. */
  variant?: CarouselShaderVariant;
  /** Noise and distortion strength, 0–1. Default 0.35. */
  intensity?: number;
  /** Half-width of the soft transition edge in viewport fractions, 0–0.5. Default 0.08. */
  softness?: number;
  /** Noise frequency across the viewport. Default 3. */
  scale?: number;
  /** Fixed reveal angle in degrees; by default the reveal follows the carousel axis. */
  angle?: number;
  /** Distance `data-carousel-layer` elements rise while revealing, in pixels. Default 24. */
  rise?: number;
}

const maximumPixels = 4_000_000;
/** One compiled program per context, shared by every shader carousel. */
const programs = new WeakMap<WebGL2RenderingContext, WebGLProgramHandle>();
function sharedProgram(gl: WebGL2RenderingContext): WebGLProgramHandle {
  let program = programs.get(gl);
  if (!program) programs.set(gl, (program = createProgram(gl, vertexSource, fragmentSource)));
  return program;
}

/**
 * WebGL2 transition drawn over the incoming item's `data-carousel-media`. Items keep their DOM,
 * text and controls; `data-carousel-layer` elements stay above the canvas and reveal in order.
 * Renders only while transitioning and falls back to a crossfade when WebGL2, the media or
 * motion is unavailable.
 */
export function carouselShaderEffect(options: CarouselShaderOptions = {}): CarouselEffect {
  return {
    name: 'shader',
    duration: options.duration ?? 1200,
    easing: options.easing ?? easings.inOut,
    layout: 'stack',
    constrain: stackEffectConstraint('shader'),
    attach: (context) => new ShaderTransition(context, options),
  };
}

class ShaderTransition implements CarouselEffectInstance {
  readonly #styles = new EffectStyles();
  readonly #canvas: HTMLCanvasElement;
  readonly #reported = new Set<string>();
  readonly #direction: [number, number];
  #host: WebGLHost | null = null;
  #unavailable = false;
  #program: WebGLProgramHandle | null = null;
  #textures: WebGLTextureCache | null = null;
  #display: ImageBitmapRenderingContext | CanvasRenderingContext2D | null = null;
  #releaseHost: (() => void) | undefined;
  #releaseTextures: (() => void) | undefined;
  #observer: IntersectionObserver | undefined;
  #onScreen = true;
  #idle: (() => void) | undefined;
  #focal = new WeakMap<Element, [number, number]>();
  #positioned = new WeakMap<Element, boolean>();
  constructor(
    readonly context: CarouselEffectContext,
    readonly options: CarouselShaderOptions,
  ) {
    const document = context.owner.ownerDocument;
    this.#canvas = document.createElement('canvas');
    this.#canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.#canvas.style, {
      position: 'absolute',
      display: 'none',
      pointerEvents: 'none',
    });
    context.surface.append(this.#canvas);
    this.#direction = revealDirection(context.orientation, context.direction, options.angle);
    const view = document.defaultView;
    if (view?.IntersectionObserver) {
      this.#observer = new view.IntersectionObserver((entries) => {
        this.#onScreen = entries.some((entry) => entry.isIntersecting);
      });
      this.#observer.observe(context.viewport);
    }
    // Compile ahead of the first transition so it does not stall.
    if (view?.requestIdleCallback) {
      const id = view.requestIdleCallback(() => this.#ensure(), { timeout: 1500 });
      this.#idle = () => view.cancelIdleCallback(id);
    } else if (view) {
      const id = view.setTimeout(() => this.#ensure(), 200);
      this.#idle = () => view.clearTimeout(id);
    }
  }

  frame(frame: CarouselEffectFrame): void {
    const { current, next, amount } = frame;
    if (!current) return;
    if (!next || amount <= 0) {
      this.#rest(frame, current);
      return;
    }
    this.#layers(current, next, amount);
    if (!frame.reducedMotion && this.#onScreen && this.#draw(frame, current, next)) return;
    this.#canvas.style.display = 'none';
    for (const item of [current, next]) {
      const media = carouselItemMedia(item);
      if (media) this.#styles.set(media, 'visibility', 'visible');
    }
    renderCrossfade(this.#styles, frame);
  }

  detach(): void {
    this.#idle?.();
    this.#observer?.disconnect();
    this.#styles.dispose();
    this.#canvas.remove();
    this.#disposeResources();
    this.#releaseHost?.();
    this.#host?.release();
    this.#host = null;
  }

  #report(message: string): void {
    if (this.#reported.has(message)) return;
    this.#reported.add(message);
    this.context.diagnose(`Carousel shader effect: ${message} Falling back to a crossfade.`);
  }

  #ensure(): boolean {
    if (this.#unavailable) return false;
    if (!this.#host) {
      const host = WebGLHost.acquire(this.context.owner.ownerDocument);
      if (!host) {
        this.#unavailable = true;
        this.#report('WebGL2 is unavailable.');
        return false;
      }
      this.#host = host;
      this.#releaseHost = host.onChange(() => {
        // Lost or restored: every resource belongs to the previous context.
        this.#disposeResources(false);
        this.context.invalidate();
      });
      this.#display = host.displayContext(this.#canvas);
    }
    const host = this.#host;
    if (host.lost) return false;
    const gl = host.gl;
    this.#program ??= sharedProgram(gl);
    if (!this.#textures) {
      this.#textures = WebGLTextureCache.shared(gl);
      // A finished upload (or failure) re-renders the current frame so it can use or report it.
      this.#releaseTextures = this.#textures.listen(() => this.context.invalidate());
    }
    const error = this.#program.error();
    if (error) {
      this.#unavailable = true;
      this.#report(`the shader failed to compile (${error.trim()}).`);
      return false;
    }
    return this.#program.ready();
  }

  #disposeResources(deleteGl = true): void {
    // Shared programs and textures outlive this effect; after context loss they are invalid.
    if (!deleteGl && this.#host) {
      programs.delete(this.#host.gl);
      this.#textures?.reset();
    }
    this.#releaseTextures?.();
    this.#releaseTextures = undefined;
    this.#program = null;
    this.#textures = null;
  }

  #source(item: CarouselEffectItem): WebGLTextureSource | null {
    const media = carouselItemMedia(item);
    if (!media) {
      this.#report('items need a data-carousel-media img, video or canvas.');
      return null;
    }
    if (
      media instanceof HTMLImageElement ||
      media instanceof HTMLVideoElement ||
      media instanceof HTMLCanvasElement
    )
      return media;
    this.#report('data-carousel-media must be an img, video or canvas.');
    return null;
  }

  #rest(frame: CarouselEffectFrame, current: CarouselEffectItem): void {
    this.#canvas.style.display = 'none';
    for (const item of frame.items) {
      const media = carouselItemMedia(item);
      if (media) this.#styles.set(media, 'visibility', 'visible');
      // Shells must not form stacking contexts, so layers can rise above the canvas.
      this.#styles.set(item.shell, 'opacity', '1');
      this.#styles.set(item.shell, 'z-index', 'auto');
    }
    this.#layers(current, null, 0);
    // Warm the neighbours so the next transition can start on the GPU immediately.
    if (this.#ensure())
      for (const item of frame.items)
        if (Math.abs(item.progress) <= 1.5) {
          const source = this.#source(item);
          if (!source) continue;
          this.#textures?.get(source);
          // Report unusable media while idle, before any transition depends on it.
          const failure = this.#textures?.failure(source);
          if (failure) this.#report(failure);
        }
  }

  #layers(current: CarouselEffectItem, next: CarouselEffectItem | null, amount: number): void {
    const rise = this.options.rise ?? 24;
    const horizontal = this.context.orientation === 'horizontal';
    const place = (item: CarouselEffectItem, reveal: (order: number) => number) =>
      carouselItemLayers(item).forEach((layer, order) => {
        const value = reveal(order);
        // Layers sit above the canvas inside the viewport's stacking context; z-index needs a
        // positioned box, so only static layers are made relative.
        if (this.#static(layer)) this.#styles.set(layer, 'position', 'relative');
        this.#styles.set(layer, 'z-index', '2');
        this.#styles.set(layer, 'opacity', String(value));
        this.#styles.set(
          layer,
          'translate',
          horizontal ? `0 ${(1 - value) * rise}px` : `${(1 - value) * rise}px 0`,
        );
      });
    place(current, () => 1 - smoothstep(0, 0.3, amount));
    if (next)
      place(next, (order) => {
        const start = Math.min(0.5 + order * 0.1, 0.9);
        return easeOutCubic(clamp01((amount - start) / (1 - start)));
      });
  }

  #static(layer: HTMLElement): boolean {
    let value = this.#positioned.get(layer);
    if (value === undefined) {
      const view = this.context.owner.ownerDocument.defaultView;
      value = (view?.getComputedStyle(layer).position ?? 'static') === 'static';
      this.#positioned.set(layer, value);
    }
    return value;
  }

  #draw(
    frame: CarouselEffectFrame,
    current: CarouselEffectItem,
    next: CarouselEffectItem,
  ): boolean {
    if (!this.#ensure()) return false;
    const fromSource = this.#source(current),
      toSource = this.#source(next);
    if (!fromSource || !toSource) return false;
    const textures = this.#textures!,
      program = this.#program!,
      host = this.#host!;
    const from = textures.get(fromSource),
      to = textures.get(toSource);
    for (const source of [fromSource, toSource]) {
      const failure = textures.failure(source);
      if (failure) this.#report(failure);
    }
    if (!from || !to) return false;
    // Read layout before writing any style this frame.
    const viewportBox = this.context.viewport.getBoundingClientRect();
    const mediaBox = (toSource as HTMLElement).getBoundingClientRect();
    const width = mediaBox.width,
      height = mediaBox.height;
    if (width < 1 || height < 1) return false;
    const view = this.context.owner.ownerDocument.defaultView;
    let ratio = Math.min(view?.devicePixelRatio ?? 1, 2);
    if (width * height * ratio * ratio > maximumPixels)
      ratio = Math.sqrt(maximumPixels / (width * height));
    const pixelWidth = Math.max(1, Math.round(width * ratio)),
      pixelHeight = Math.max(1, Math.round(height * ratio));
    const focal = (source: WebGLTextureSource) => {
      let point = this.#focal.get(source);
      if (!point) {
        point = focalPoint(view?.getComputedStyle(source).objectPosition ?? '50% 50%');
        this.#focal.set(source, point);
      }
      return point;
    };
    const gl = host.gl;
    host.resize(pixelWidth, pixelHeight);
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.disable(gl.BLEND);
    gl.useProgram(program.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, from.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, to.texture);
    gl.uniform1i(program.uniform('uFrom'), 0);
    gl.uniform1i(program.uniform('uTo'), 1);
    gl.uniform4f(
      program.uniform('uFromMap'),
      ...coverMap(width, height, from.width, from.height, ...focal(fromSource)),
    );
    gl.uniform4f(
      program.uniform('uToMap'),
      ...coverMap(width, height, to.width, to.height, ...focal(toSource)),
    );
    gl.uniform1f(program.uniform('uProgress'), frame.amount);
    gl.uniform2f(program.uniform('uDirection'), ...this.#direction);
    gl.uniform1f(program.uniform('uVelocity'), clamp01(Math.abs(frame.velocity) / 4));
    gl.uniform1f(
      program.uniform('uSoftness'),
      Math.min(0.5, Math.max(0.001, this.options.softness ?? 0.08)),
    );
    gl.uniform1f(program.uniform('uIntensity'), clamp01(this.options.intensity ?? 0.35));
    gl.uniform1f(program.uniform('uScale'), Math.max(0.1, this.options.scale ?? 3));
    gl.uniform1f(program.uniform('uSeed'), ((current.index * 7.13 + next.index * 3.71) % 10) + 0.5);
    gl.uniform1i(program.uniform('uVariant'), shaderVariants[this.options.variant ?? 'wipe'] ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!this.#display) return false;
    if (this.#canvas.width !== pixelWidth) this.#canvas.width = pixelWidth;
    if (this.#canvas.height !== pixelHeight) this.#canvas.height = pixelHeight;
    host.present(this.#canvas, this.#display);
    Object.assign(this.#canvas.style, {
      display: 'block',
      left: `${mediaBox.left - viewportBox.left}px`,
      top: `${mediaBox.top - viewportBox.top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    // The canvas now shows both images; hide the DOM media beneath it.
    for (const source of [fromSource, toSource]) this.#styles.set(source, 'visibility', 'hidden');
    for (const item of [current, next]) {
      this.#styles.set(item.shell, 'opacity', '1');
      this.#styles.set(item.shell, 'z-index', 'auto');
    }
    return true;
  }
}
