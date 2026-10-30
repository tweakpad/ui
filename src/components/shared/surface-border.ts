import { css, html, nothing, svg, type PropertyValues } from 'lit';
import { GlowRenderer, type GlowLook } from '../../foundation/border-ring/glow-renderer.js';
import {
  parseCornerRadius,
  ringPath,
  type RingBox,
} from '../../foundation/border-ring/ring-path.js';
import { TpElement } from '../../foundation/element.js';
import { frameLoopFor, type FrameSubscription } from '../../foundation/frame-loop.js';
import { scheduleLayoutPass } from '../../foundation/layout-batch.js';
import { transitionTimings, type TransitionTiming } from '../../foundation/motion.js';
import { observeResize } from '../../foundation/observation.js';
import { registerProperty } from '../../foundation/register-property.js';
import { ViewportTrigger } from '../../foundation/viewport-trigger.js';
import { setPartComposition } from '../../presentation/controller.js';
import { surfaceMember } from './group-members.js';

const HIDDEN_BORDER = { 'border-color': 'transparent' } as const;

/**
 * The look every surface border resolves for its script: each element's stylesheet maps its own
 * public properties onto these, and registration resolves lengths to pixels and colors to colors.
 */
const LOOK = {
  width: '--_tp-surface-border-width',
  colors: '--_tp-surface-border-colors',
  core: '--_tp-surface-border-core',
  angle: '--_tp-surface-border-angle',
  intensity: '--_tp-surface-border-intensity',
  fill: '--_tp-surface-border-fill',
  spread: '--_tp-surface-border-spread',
} as const;

registerProperty({
  name: LOOK.width,
  syntax: '<length> | auto',
  inherits: false,
  initialValue: 'auto',
});
registerProperty({
  name: LOOK.colors,
  syntax: '<color>#',
  inherits: false,
  initialValue: 'transparent',
});
registerProperty({
  name: LOOK.core,
  syntax: '<color>',
  inherits: false,
  initialValue: 'transparent',
});
registerProperty({ name: LOOK.angle, syntax: '<angle>', inherits: false, initialValue: '0deg' });
registerProperty({ name: LOOK.intensity, syntax: '<number>', inherits: false, initialValue: '1' });
registerProperty({ name: LOOK.fill, syntax: '<number>', inherits: false, initialValue: '0' });
registerProperty({ name: LOOK.spread, syntax: '<length>', inherits: false, initialValue: '12px' });

/** The measured surface: its border box relative to the owner and the border it draws. */
export interface SurfaceGeometry {
  /**
   * Offset from the owner's inline-start edge, so a change of direction, which moves a child
   * to the other side along with that edge, keeps the ring on it.
   */
  readonly inlineStart: number;
  readonly y: number;
  readonly box: RingBox;
  /** The surface's widest border side, in pixels. */
  readonly borderWidth: number;
  /** The wrapped child lays out inline. */
  readonly inline: boolean;
}

/** The shadow part names of an element's drawing, from its presentation family. */
export interface SurfaceBorderParts {
  readonly ring: string;
  readonly line: string;
  readonly glow: string;
  readonly bloom: string;
}

/** The surface with the line drawn over it. */
export interface SurfaceBorderGeometry extends SurfaceGeometry {
  /** Line width in pixels. */
  readonly stroke: number;
  /** Bloom spread in pixels. */
  readonly spread: number;
}

/**
 * The surface a surface border draws over: the boundary part of the wrapped library component,
 * the wrapped element itself, or the owner's own box. Its border color is hidden while it keeps
 * its width, so nothing moves, and is given back on release.
 */
export class BorderSurface {
  #child: Element | null = null;
  #composed: TpElement | null = null;
  #styled: { element: HTMLElement | SVGElement; value: string; priority: string } | null = null;
  #boundary: Element | null = null;

  constructor(
    private readonly owner: HTMLElement,
    private readonly changed: () => void,
    /** Children that describe the drawing rather than being the surface. */
    private readonly describesDrawing: (element: Element) => boolean = () => false,
  ) {}

  /** The element whose border box is measured. */
  get boundary(): Element {
    return this.#boundary ?? this.owner;
  }

  /** Resolves the surface from the first element child; returns whether the boundary changed. */
  resolve(): boolean {
    const child =
      [...this.owner.children].find((element) => !this.describesDrawing(element)) ?? null;
    if (child !== this.#child) {
      this.release();
      this.#child = child;
    }
    let boundary: Element | null = null;
    if (child) {
      const member = surfaceMember(child);
      if (member) {
        if (this.#composed !== member.host) {
          setPartComposition(member.host, this, { [member.part]: { styleHook: HIDDEN_BORDER } });
          this.#composed = member.host;
        }
        boundary = member.element;
        // A library component renders its boundary on its first update.
        if (!boundary && !member.host.hasUpdated)
          void member.host.updateComplete.then(() => {
            if (this.#child === child) this.changed();
          });
      } else if (!(child instanceof TpElement) && 'style' in child) {
        const element = child as HTMLElement | SVGElement;
        if (this.#styled?.element !== element) {
          this.#styled = {
            element,
            value: element.style.getPropertyValue('border-color'),
            priority: element.style.getPropertyPriority('border-color'),
          };
          element.style.setProperty('border-color', 'transparent');
        }
        boundary = element;
      } else boundary = child;
    }
    const changed = boundary !== this.#boundary;
    this.#boundary = boundary;
    return changed;
  }

  /** Gives the surface its own border back. */
  release(): void {
    if (this.#composed) setPartComposition(this.#composed, this);
    this.#composed = null;
    if (this.#styled) {
      const { element, value, priority } = this.#styled;
      if (value) element.style.setProperty('border-color', value, priority);
      else element.style.removeProperty('border-color');
    }
    this.#styled = null;
    this.#child = null;
    this.#boundary = null;
  }

  /** Layout reads only: the boundary's border box relative to the owner, its radii and width. */
  measure(): SurfaceGeometry {
    const view = this.owner.ownerDocument.defaultView!;
    const boundary = this.boundary;
    const origin = this.owner.getBoundingClientRect();
    const rect = boundary.getBoundingClientRect();
    const style = view.getComputedStyle(boundary);
    const width = rect.width;
    const height = rect.height;
    const corner = (value: string) => parseCornerRadius(value, width, height);
    const child = this.#child;
    const rtl = view.getComputedStyle(this.owner).direction === 'rtl';
    return {
      inlineStart: rtl ? origin.right - rect.right : rect.left - origin.left,
      y: rect.top - origin.top,
      box: {
        width,
        height,
        radii: [
          corner(style.borderTopLeftRadius),
          corner(style.borderTopRightRadius),
          corner(style.borderBottomRightRadius),
          corner(style.borderBottomLeftRadius),
        ],
      },
      borderWidth:
        boundary === this.owner
          ? 0
          : Math.max(
              parseFloat(style.borderTopWidth) || 0,
              parseFloat(style.borderRightWidth) || 0,
              parseFloat(style.borderBottomWidth) || 0,
              parseFloat(style.borderLeftWidth) || 0,
            ),
      inline: child ? view.getComputedStyle(child).display.startsWith('inline') : false,
    };
  }
}

/**
 * Host, ring and canvas layout every surface border shares. Each element maps its public
 * properties onto `--_tp-surface-border-*` and styles its own lines.
 */
export const surfaceBorderStyles = css`
  :host {
    /* A block, or an inline block around an inline child; never a grid or flex container, which
       would change how the child computes its display. */
    display: block;
    position: relative;
    border-radius: var(--_tp-surface-border-radius, var(--tp-radius-lg));
  }

  :host([data-tp-inline]) {
    display: inline-block;
  }

  .ring,
  .glow,
  .bloom {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    pointer-events: none;
  }

  .ring {
    overflow: visible;
  }

  /* The bloom: the lit strokes drawn wider, blurred by the compositor. */
  .bloom {
    opacity: 0.9;
    filter: blur(calc(var(--_tp-surface-border-spread) / 2));
  }

  path {
    fill: none;
  }

  /* The line where it is not lit: the surface's own border look. */
  .line {
    stroke: var(--_tp-surface-border-color, var(--tp-border));
    stroke-width: var(--_tp-surface-border-w, 1px);
  }
`;

/**
 * The base of the Motion › Surface elements: it wraps one surface, hides that surface's border
 * color and draws its own line at exactly the same place, radius and width, so nothing moves. It
 * owns the surface, the measured ring, the drawing (an SVG ring and, when the element glows, two
 * canvases painted by the shared glow renderer), the hover, focus and viewport state and one frame
 * subscription; each element decides what it draws and when.
 */
export abstract class SurfaceBorderElement extends TpElement {
  static override styles = [TpElement.styles, surfaceBorderStyles];

  /** The part names of the drawing. */
  protected abstract readonly parts: SurfaceBorderParts;

  /** Whether the glow canvases are drawn. */
  protected abstract get glows(): boolean;

  /** Advances the drawing by `elapsed` milliseconds; returns whether it still moves. */
  protected abstract step(elapsed: number, now: number): boolean;

  /** The hover, focus or viewport state changed. */
  protected abstract triggerChanged(): void;

  /** SVG drawn over the line along the path `d`, once the surface is measured. */
  protected ringContent(_d: string): unknown {
    void _d;
    return nothing;
  }

  /** The ring was measured again. */
  protected geometryChanged(_geometry: SurfaceBorderGeometry): void {
    void _geometry;
  }

  /** The light-tree children changed. */
  protected childrenChanged(): void {}

  /** Children that describe the drawing rather than being the surface. */
  protected describesDrawing(_element: Element): boolean {
    void _element;
    return false;
  }

  readonly #surface = new BorderSurface(
    this,
    () => this.refresh(),
    (element) => this.describesDrawing(element),
  );
  #geometry: SurfaceBorderGeometry | null = null;
  #path = '';
  #releaseResize: (() => void)[] = [];
  #observed: Element | null = null;
  #hovered = false;
  #focused = false;
  #frame: FrameSubscription | null = null;
  #renderer: GlowRenderer | null = null;
  readonly #geometryPass = {};
  readonly #viewport = new ViewportTrigger(this, {
    repeat: () => false,
    near: true,
    changed: () => {
      this.toggleAttribute('data-tp-offscreen', !this.#viewport.near);
      this.triggerChanged();
      this.wake();
    },
  });

  /** The measured ring, once the surface has been measured. */
  protected get geometry(): SurfaceBorderGeometry | null {
    return this.#geometry;
  }

  /** The glow renderer, while the canvases exist. */
  protected get renderer(): GlowRenderer | null {
    return this.#renderer;
  }

  /** A mouse or pen is over the element. */
  protected get hovered(): boolean {
    return this.#hovered;
  }

  /** Focus is inside the element. */
  protected get focused(): boolean {
    return this.#focused;
  }

  /** Part of the element is in the viewport. */
  protected get inView(): boolean {
    return this.#viewport.inView;
  }

  /** The element is within a quarter of the viewport, where its motion runs. */
  protected get near(): boolean {
    return this.#viewport.near;
  }

  /** Measures the surface again (after a change the element cannot observe). */
  refresh(): void {
    if (!this.isConnected) return;
    if (this.#surface.resolve()) this.#observeBoundary();
    scheduleLayoutPass(this.#geometryPass, {
      active: () => this.isConnected,
      measure: () => this.#measure(),
      apply: (geometry) => this.#apply(geometry),
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#releaseResize.push(observeResize(this, () => this.refresh()));
    this.#viewport.sync(true);
    this.toggleAttribute('data-tp-offscreen', !this.#viewport.near);
    this.#frame = frameLoopFor(this.ownerDocument.defaultView!).subscribe((elapsed, now) =>
      this.isConnected ? this.step(elapsed, now) : false,
    );
    this.addEventListener('pointerenter', this.#hover);
    this.addEventListener('pointerleave', this.#hover);
    this.addEventListener('focusin', this.#focus);
    this.addEventListener('focusout', this.#focus);
    this.#hovered = this.matches(':hover');
    this.#focused = this.matches(':focus-within');
    this.#renderer?.connect();
    this.refresh();
    void this.updateComplete.then(() => this.triggerChanged());
  }

  override disconnectedCallback(): void {
    this.#surface.release();
    for (const release of this.#releaseResize) release();
    this.#releaseResize = [];
    this.#observed = null;
    this.#viewport.release();
    this.#frame?.release();
    this.#frame = null;
    this.removeEventListener('pointerenter', this.#hover);
    this.removeEventListener('pointerleave', this.#hover);
    this.removeEventListener('focusin', this.#focus);
    this.removeEventListener('focusout', this.#focus);
    this.#renderer?.disconnect();
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncRenderer();
    this.wake();
  }

  protected override render() {
    const geometry = this.#geometry;
    const parts = this.parts;
    const style = geometry
      ? `inset-inline-start:${geometry.inlineStart}px;inset-block-start:${geometry.y}px;width:${geometry.box.width}px;height:${geometry.box.height}px`
      : 'display:none';
    const margin = this.#margin(geometry);
    const canvas = geometry
      ? `inset-inline-start:${geometry.inlineStart - margin}px;inset-block-start:${geometry.y - margin}px;width:${geometry.box.width + margin * 2}px;height:${geometry.box.height + margin * 2}px`
      : 'display:none';
    return html`<slot @slotchange=${this.#slotChanged}></slot
      ><svg part=${parts.ring} class="ring" aria-hidden="true" focusable="false" style=${style}>
        <g class="timing"></g>
        ${
          geometry
            ? svg`<path part=${parts.line} class="line" d=${this.#path}></path>${this.ringContent(this.#path)}`
            : nothing
        }</svg
      >${
        this.glows
          ? html`<canvas
                part=${parts.bloom}
                class="bloom"
                aria-hidden="true"
                style=${canvas}
              ></canvas
              ><canvas part=${parts.glow} class="glow" aria-hidden="true" style=${canvas}></canvas>`
          : nothing
      }`;
  }

  /** Wakes the frame subscription; `step` runs until it reports nothing moves. */
  protected wake(): void {
    this.#frame?.wake();
  }

  /** The timings the stylesheet's `.timing` probe declares, in order. */
  protected timings(): TransitionTiming[] {
    const view = this.ownerDocument.defaultView;
    const probe = this.renderRoot.querySelector('.timing');
    return view && probe ? transitionTimings(view.getComputedStyle(probe)) : [];
  }

  /** The glow's look, read from the computed style at each paint; nothing is written per frame. */
  protected glowLook(): GlowLook | null {
    const view = this.ownerDocument.defaultView;
    if (!view) return null;
    const style = view.getComputedStyle(this);
    const number = (name: string, fallback: number) => {
      const value = parseFloat(style.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    return {
      colors: style.getPropertyValue(LOOK.colors),
      core: style.getPropertyValue(LOOK.core),
      angle: number(LOOK.angle, 0),
      intensity: clamp(number(LOOK.intensity, 1)),
      fill: clamp(number(LOOK.fill, 0)),
    };
  }

  readonly #slotChanged = (): void => {
    this.refresh();
    this.childrenChanged();
  };

  readonly #hover = (event: PointerEvent): void => {
    // Touches have no hover.
    if (event.pointerType === 'touch') return;
    this.#hovered = event.type === 'pointerenter';
    this.triggerChanged();
  };

  readonly #focus = (): void => {
    // Focus moving between the surface's own parts settles before the check.
    queueMicrotask(() => {
      const focused = this.matches(':focus-within');
      if (focused === this.#focused) return;
      this.#focused = focused;
      this.triggerChanged();
    });
  };

  /** Room around the ring box for the bloom, in CSS pixels. */
  #margin(geometry: SurfaceBorderGeometry | null): number {
    return geometry ? Math.ceil(geometry.spread * 1.5 + geometry.stroke * 3 + 4) : 0;
  }

  #observeBoundary(): void {
    const boundary = this.#surface.boundary;
    if (boundary === this.#observed) return;
    for (const release of this.#releaseResize.splice(1)) release();
    this.#observed = boundary;
    if (boundary !== this) this.#releaseResize.push(observeResize(boundary, () => this.refresh()));
  }

  /** Layout reads only. */
  #measure(): SurfaceBorderGeometry {
    const surface = this.#surface.measure();
    const style = this.ownerDocument.defaultView!.getComputedStyle(this);
    const width = style.getPropertyValue(LOOK.width).trim();
    const theme = parseFloat(style.getPropertyValue('--tp-border-width')) || 1;
    return {
      ...surface,
      stroke: width && width !== 'auto' ? parseFloat(width) || 0 : surface.borderWidth || theme,
      spread: parseFloat(style.getPropertyValue(LOOK.spread)) || 0,
    };
  }

  #apply(geometry: SurfaceBorderGeometry): void {
    this.toggleAttribute('data-tp-inline', geometry.inline);
    this.style.setProperty('--_tp-surface-border-w', `${geometry.stroke}px`);
    const path = ringPath(geometry.box, geometry.stroke / 2);
    const previous = this.#geometry;
    this.#geometry = geometry;
    if (
      path.d !== this.#path ||
      !previous ||
      previous.inlineStart !== geometry.inlineStart ||
      previous.y !== geometry.y ||
      previous.box.width !== geometry.box.width ||
      previous.box.height !== geometry.box.height ||
      previous.spread !== geometry.spread ||
      previous.stroke !== geometry.stroke
    ) {
      this.#path = path.d;
      this.#renderer?.setGeometry(
        geometry.box,
        geometry.stroke,
        geometry.spread,
        this.#margin(geometry),
      );
      this.requestUpdate();
    }
    this.geometryChanged(geometry);
    this.wake();
  }

  /** Creates the renderer once the glow's canvases exist, and drops it with them. */
  #syncRenderer(): void {
    const line = this.renderRoot.querySelector<HTMLCanvasElement>('canvas.glow');
    const bloom = this.renderRoot.querySelector<HTMLCanvasElement>('canvas.bloom');
    if (!line || !bloom) {
      this.#renderer?.disconnect();
      this.#renderer = null;
      return;
    }
    if (this.#renderer) return;
    this.#renderer = new GlowRenderer(line, bloom);
    this.#renderer.connect();
    const geometry = this.#geometry;
    if (geometry)
      this.#renderer.setGeometry(
        geometry.box,
        geometry.stroke,
        geometry.spread,
        this.#margin(geometry),
      );
  }
}
