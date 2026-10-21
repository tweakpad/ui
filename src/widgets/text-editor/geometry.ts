/**
 * Overlay geometry of the text editor (`uwg-te-req-engine-10`, `uwg-te-req-perf-1`,
 * `uwg-te-req-render-2`, `uwg-te-req-ana-2`). One invalidation flag per editor wakes the shared
 * frame loop; the frame queues at most one layout pass, batched with every other instance in the
 * window; layers measure against the ready instance, or before ready against the widget-owned
 * preview root, and write only their own overlay elements.
 */
import { frameLoopFor, type FrameSubscription } from '../../foundation/frame-loop.js';
import { scheduleLayoutPass } from '../../foundation/layout-batch.js';
import {
  observeFonts,
  observeResize,
  observeScroll,
  observeSubtree,
} from '../../foundation/observation.js';
import { CleanupScope } from '../../foundation/services.js';
import type { TextEditorEngineInstance } from '../../foundation/text-editor/engine.js';

/** Why the overlay geometry needs a pass. */
export type OverlayInvalidation =
  /** A layer's model changed (the published state, `placeholder`, strings or access). */
  | 'state'
  /** An instance became ready, or the ready instance went away (ready, failed, detach, swap). */
  | 'instance'
  /**
   * A mutation under the content part (the preview root rendered or removed included), or an
   * image load in it.
   */
  | 'content'
  /** The content part or the viewport changed size, or gained or lost its layout box. */
  | 'resize'
  /** A font finished loading in the owner document. */
  | 'fonts'
  /** The owner document became visible. */
  | 'visibility'
  /** The viewport scrolled. */
  | 'scroll';

/** The instance members a layer may read: lookups and client geometry, never a write. */
export type OverlayInstance = Pick<
  TextEditorEngineInstance,
  'getBlocks' | 'blockElement' | 'blockRects' | 'blockAt'
>;

/**
 * What a pass measures against: the ready instance, or before ready the widget-owned preview
 * root.
 */
export type OverlaySource =
  | { readonly kind: 'instance'; readonly instance: OverlayInstance }
  | { readonly kind: 'preview'; readonly root: HTMLElement };

export interface OverlayGeometryHost {
  /**
   * The instance while the editor is ready; `null` before ready, after a failure and while
   * detached.
   */
  instance(): OverlayInstance | null;
  /**
   * The widget-owned preview root while no instance is ready and the root is in the content part;
   * `null` otherwise. Read only while `instance()` is `null`.
   */
  preview(): HTMLElement | null;
}

/** The widget's own parts the geometry observes and measures against. */
export interface OverlayParts {
  /** `text-editor-viewport`: its size is observed. */
  readonly viewport: HTMLElement;
  /**
   * `text-editor-content`: its size, subtree mutations and loads are observed; its client width
   * over its layout width gives the scale.
   */
  readonly content: HTMLElement;
  /**
   * `text-editor-overlay`: the zero-size positioned box whose client position is the origin of
   * every mark.
   */
  readonly overlay: HTMLElement;
}

export interface OverlayPoint {
  readonly left: number;
  readonly top: number;
}

export interface OverlayScale {
  readonly x: number;
  readonly y: number;
}

/** A box in overlay coordinates: unscaled CSS pixels from the overlay's origin. */
export interface OverlayBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface OverlayMeasureContext {
  /** The instance when one is ready, else the preview root. */
  readonly source: OverlaySource;
  /** The owner window, for computed styles. */
  readonly owner: Window;
  /** A client rectangle in overlay coordinates (origin and scale read once per pass). */
  toOverlay(rect: DOMRectReadOnly): OverlayBox;
}

/** One kind of overlay mark. A pass runs only while some layer wants one. */
export interface OverlayLayer<M> {
  /** Whether the layer has a mark to place now; read without layout. */
  wanted(): boolean;
  /**
   * Layout reads only: adapter geometry, computed styles of adapter-looked-up elements, or of the
   * preview's block.
   */
  measure(context: OverlayMeasureContext): M;
  /** Writes on the layer's own overlay elements only. */
  apply(measured: M): void;
  /** Hides every mark of the layer at once, with no read (source lost, release). */
  hide(): void;
}

/** One pass that ran, for the fixture's per-frame counter. */
export interface OverlayPassRecord {
  readonly content: HTMLElement;
  /** The frame time of the shared frame loop's frame that queued the pass. */
  readonly time: number;
}

export class OverlayGeometry {
  readonly #host: OverlayGeometryHost;
  readonly #layers = new Set<OverlayLayer<unknown>>();
  #parts: OverlayParts | null = null;
  #owner: Window | null = null;
  #scope: CleanupScope | null = null;
  #subscription: FrameSubscription | null = null;
  /** Bumped by every release, so that a pass queued before it is dropped. */
  #generation = 0;
  #dirty = false;
  /** The content part has a layout box, from its size observation (0×0: none). */
  #boxed = false;

  /** Stores the host only; touches no global. */
  constructor(host: OverlayGeometryHost) {
    this.#host = host;
  }

  /**
   * Starts the observations for `parts`; idempotent for the same parts, re-targets for new ones.
   */
  observe(parts: OverlayParts): void {
    const current = this.#parts;
    if (
      current &&
      current.viewport === parts.viewport &&
      current.content === parts.content &&
      current.overlay === parts.overlay
    )
      return;
    if (current) this.#stop();
    const owner = parts.content.ownerDocument.defaultView;
    if (!owner) return;
    const document = owner.document;
    const scope = new CleanupScope();
    this.#parts = parts;
    this.#owner = owner;
    this.#scope = scope;
    const subscription = frameLoopFor(owner).subscribe(this.#frame);
    this.#subscription = subscription;
    scope.add(() => subscription.release());
    scope.add(
      observeResize(parts.content, (entry) => {
        this.#boxed = hasLayoutBox(entry);
        this.invalidate('resize');
      }),
    );
    scope.add(observeResize(parts.viewport, () => this.invalidate('resize')));
    scope.add(observeSubtree(parts.content, () => this.invalidate('content'), { content: true }));
    scope.add(observeFonts(document, () => this.invalidate('fonts')));
    const visibility = (): void => this.invalidate('visibility');
    document.addEventListener('visibilitychange', visibility);
    scope.add(() => document.removeEventListener('visibilitychange', visibility));
    // An image that loads above a mark moves it without resizing a content part held at its minimum.
    scope.listen(parts.content, 'load', () => this.invalidate('content'), { capture: true });
    scope.add(
      observeScroll(parts.viewport, {
        scroll: () => {
          this.invalidate('scroll');
          for (const listener of [...this.#scrollListeners]) listener();
        },
      }),
    );
    this.invalidate('resize');
  }

  /**
   * Stops every observation, listener and the frame subscription synchronously, and hides every
   * layer; a queued pass is dropped. `observe` may start it again.
   */
  release(): void {
    this.#stop();
    this.#hideLayers();
  }

  /** Marks the geometry dirty and wakes one frame of the shared loop while a pass can run. */
  invalidate(reason: OverlayInvalidation): void {
    void reason;
    this.#dirty = true;
    if (!this.#source()) {
      this.#hideLayers();
      return;
    }
    if (this.#runnable()) this.#subscription?.wake();
  }

  /** Adds a layer; the returned function removes it. */
  addLayer<M>(layer: OverlayLayer<M>): () => void {
    const entry = layer as OverlayLayer<unknown>;
    this.#layers.add(entry);
    return () => {
      this.#layers.delete(entry);
    };
  }

  // Blocks (M8): hit testing and scroll re-runs ------------------------------------------------

  readonly #scrollListeners = new Set<() => void>();

  /** The parts being observed, or `null` while released. */
  get parts(): OverlayParts | null {
    return this.#parts;
  }

  /**
   * Calls `listener` after each viewport scroll, so that a view re-runs a hit test under a
   * stationary pointer; the returned function removes it.
   */
  onScroll(listener: () => void): () => void {
    this.#scrollListeners.add(listener);
    return () => {
      this.#scrollListeners.delete(listener);
    };
  }

  /**
   * The block under a client point: the point's x clamped into the editing root's content box,
   * the elements there from `elementsFromPoint` of the content part's root, and the first one the
   * adapter maps to a block. `null` while no instance is ready, outside the content's block
   * extent, or between blocks.
   */
  hitBlock(clientX: number, clientY: number): string | null {
    const parts = this.#parts;
    const instance = this.#host.instance();
    const owner = this.#owner;
    if (!parts || !instance || !owner) return null;
    const root = parts.content.getRootNode() as Partial<DocumentOrShadowRoot>;
    if (typeof root.elementsFromPoint !== 'function') return null;
    const editing = parts.content.firstElementChild ?? parts.content;
    const box = editing.getBoundingClientRect();
    if (clientY < box.top || clientY >= box.bottom || box.width <= 0) return null;
    const style = owner.getComputedStyle(editing);
    const start = box.left + (Number.parseFloat(style.paddingLeft) || 0);
    const end = box.right - (Number.parseFloat(style.paddingRight) || 0);
    const x = Math.min(Math.max(clientX, start + 1), Math.max(start + 1, end - 1));
    for (const element of root.elementsFromPoint(x, clientY)) {
      if (element === parts.content || !parts.content.contains(element)) continue;
      const id = instance.blockAt(element);
      if (id) return id;
    }
    return null;
  }

  /**
   * Measures and applies one layer at once, outside the frame pass: for a mark that an opening
   * surface anchors to in the same task (the grip of a menu opened by a key).
   */
  layoutNow<M>(layer: OverlayLayer<M>): void {
    const parts = this.#parts;
    const owner = this.#owner;
    const source = this.#source();
    if (!parts || !owner || !source || !layer.wanted()) return;
    const origin = parts.overlay.getBoundingClientRect();
    const client = parts.content.getBoundingClientRect();
    const width = parts.content.offsetWidth;
    const height = parts.content.offsetHeight;
    const scale: OverlayScale =
      width && height ? { x: client.width / width, y: client.height / height } : { x: 1, y: 1 };
    layer.apply(
      layer.measure({ source, owner, toOverlay: (rect) => overlayBox(rect, origin, scale) }),
    );
  }

  #stop(): void {
    this.#generation++;
    this.#scope?.dispose();
    this.#scope = null;
    this.#subscription = null;
    this.#parts = null;
    this.#owner = null;
    this.#dirty = false;
    this.#boxed = false;
  }

  #hideLayers(): void {
    for (const layer of [...this.#layers]) layer.hide();
  }

  /** The ready instance, else the preview root (F-13); `null` when neither exists. */
  #source(): OverlaySource | null {
    const instance = this.#host.instance();
    if (instance) return { kind: 'instance', instance };
    const root = this.#host.preview();
    return root ? { kind: 'preview', root } : null;
  }

  /** Whether a pass can run now; every condition is read without layout. */
  #runnable(): boolean {
    const owner = this.#owner;
    return (
      owner !== null &&
      this.#boxed &&
      owner.document.visibilityState !== 'hidden' &&
      this.#source() !== null &&
      [...this.#layers].some((layer) => layer.wanted())
    );
  }

  readonly #frame = (_elapsed: number, time: number): boolean => {
    if (!this.#dirty || !this.#runnable()) return false;
    this.#dirty = false;
    const generation = this.#generation;
    scheduleLayoutPass(this, {
      active: () => generation === this.#generation && this.#runnable(),
      measure: () => this.#measure(time),
      apply: (measured) => {
        for (const [layer, mark] of measured) layer.apply(mark);
      },
    });
    return false;
  };

  #measure(time: number): (readonly [OverlayLayer<unknown>, unknown])[] {
    const parts = this.#parts;
    const owner = this.#owner;
    const source = this.#source();
    if (!parts || !owner || !source) return [];
    const origin = parts.overlay.getBoundingClientRect();
    const client = parts.content.getBoundingClientRect();
    const width = parts.content.offsetWidth;
    const height = parts.content.offsetHeight;
    const scale: OverlayScale =
      width && height ? { x: client.width / width, y: client.height / height } : { x: 1, y: 1 };
    const context: OverlayMeasureContext = {
      source,
      owner,
      toOverlay: (rect) => overlayBox(rect, origin, scale),
    };
    const measured = [...this.#layers]
      .filter((layer) => layer.wanted())
      .map((layer) => [layer, layer.measure(context)] as const);
    const record: OverlayPassRecord = { content: parts.content, time };
    for (const listener of [...passListeners]) listener(record);
    return measured;
  }
}

/** A size observation reports a layout box unless both sides are zero. */
function hasLayoutBox(entry: ResizeObserverEntry): boolean {
  const size = entry.borderBoxSize?.[0];
  const inline = size ? size.inlineSize : entry.contentRect.width;
  const block = size ? size.blockSize : entry.contentRect.height;
  return inline > 0 || block > 0;
}

/**
 * A client rectangle in overlay coordinates: the client delta from the origin over the
 * client-to-layout scale.
 */
export function overlayBox(
  rect: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>,
  origin: OverlayPoint,
  scale: OverlayScale,
): OverlayBox {
  const x = scale.x || 1;
  const y = scale.y || 1;
  return {
    left: (rect.left - origin.left) / x,
    top: (rect.top - origin.top) / y,
    width: rect.width / x,
    height: rect.height / y,
  };
}

const passListeners = new Set<(record: OverlayPassRecord) => void>();

/** Internal instrumentation: reports every pass that runs, until the returned function stops it. */
export function observeOverlayPasses(listener: (record: OverlayPassRecord) => void): () => void {
  const entry = (record: OverlayPassRecord): void => listener(record);
  passListeners.add(entry);
  return () => {
    passListeners.delete(entry);
  };
}

// Pooled writers (M8) ----------------------------------------------------------------------------

/**
 * A pool of mark elements of one part in a layer of the widget: `write` shows one element per box
 * at its overlay position and hides the rest, which stay connected for the next pass. Writes touch
 * only the pool's own elements: `transform`, `width`, `height` and `hidden`.
 */
export class OverlayPool {
  readonly #container: () => HTMLElement | null;
  readonly #part: string;
  readonly #elements: HTMLElement[] = [];

  /** Stores the container getter and the part name; touches no element. */
  constructor(container: () => HTMLElement | null, part: string) {
    this.#container = container;
    this.#part = part;
  }

  /** The elements created so far, shown or hidden. */
  get elements(): readonly HTMLElement[] {
    return this.#elements;
  }

  /** Shows one element per box, in order, and hides the others. */
  write(boxes: readonly OverlayBox[]): void {
    const container = this.#container();
    if (!container) return;
    for (let index = 0; index < boxes.length; index++) {
      let element = this.#elements[index];
      if (!element || element.parentNode !== container) {
        element = container.ownerDocument.createElement('div');
        element.setAttribute('part', this.#part);
        element.setAttribute('aria-hidden', 'true');
        container.append(element);
        this.#elements[index] = element;
      }
      const box = boxes[index]!;
      element.style.transform = `translate(${box.left}px, ${box.top}px)`;
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
      element.hidden = false;
    }
    for (let index = boxes.length; index < this.#elements.length; index++)
      this.#elements[index]!.hidden = true;
  }

  /** Hides every element, with no read. */
  hide(): void {
    for (const element of this.#elements) element.hidden = true;
  }

  /** Removes the elements; called when the widget releases its layers. */
  release(): void {
    for (const element of this.#elements) element.remove();
    this.#elements.length = 0;
  }
}
