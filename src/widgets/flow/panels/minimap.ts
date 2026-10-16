import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { CanvasSurface } from '../../../foundation/canvas-surface.js';
import { Scheduler } from '../../../foundation/services.js';
import type { FlowPoint, FlowRect } from '../../../foundation/flow/types.js';
import { PointerDrag, type PointerDragPoint } from '../../../foundation/pointer-drag.js';
import { TpButton } from '../../../components/button/button.js';
import { TpIcon } from '../../../components/icon/icon.js';
import { chevronDownIcon } from '../../../icons/chevron-down.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { resolveStrings } from '../strings.js';
import type { FlowGesturePhase, FlowStrings } from '../types.js';

export const MINIMAP_STEP = 'flow-minimap-step';
export const MINIMAP_PAN = 'flow-minimap-pan';

export interface FlowMinimapNode {
  rect: FlowRect;
  /** Tone key (`chart-1`, `success`, …) painted through `--tp-<tone>`. */
  tone?: string;
  selected?: boolean;
}

/** What the minimap paints; every rect in flow units. */
export interface FlowMinimapScene {
  /** Document bounds; the paint area also covers the viewport. */
  bounds: FlowRect;
  nodes: readonly FlowMinimapNode[];
  /** The visible flow rect. */
  viewport: FlowRect;
}

/** A keyboard pan request: move the viewport by `dx`/`dy` flow units (one tenth of it). */
export interface FlowMinimapStepDetail {
  dx: number;
  dy: number;
  sourceEvent: Event;
}
/** A pointer pan: center the viewport on `center` (flow units). */
export interface FlowMinimapPanDetail {
  center: FlowPoint;
  phase: FlowGesturePhase;
  sourceEvent: Event | null;
}

type Direction = 'up' | 'down' | 'left' | 'right';
const DIRECTIONS: readonly { key: Direction; dx: number; dy: number; string: keyof FlowStrings }[] =
  [
    { key: 'up', dx: 0, dy: -1, string: 'panUp' },
    { key: 'left', dx: -1, dy: 0, string: 'panLeft' },
    { key: 'right', dx: 1, dy: 0, string: 'panRight' },
    { key: 'down', dx: 0, dy: 1, string: 'panDown' },
  ];
/** One chevron glyph turned toward each pan direction. */
const ROTATION: Record<Direction, string> = {
  up: '180deg',
  left: '90deg',
  right: '-90deg',
  down: '0deg',
};

interface Colors {
  key: string;
  background: string;
  node: string;
  selected: string;
  mask: string;
  viewport: string;
  tones: Map<string, string>;
}

const PADDING = 4;

const minimapStyles = css`
  :host {
    display: inline-block;
  }

  .minimap {
    position: relative;
    display: block;
    contain: layout paint;
  }

  canvas {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    touch-action: none;
  }

  .pad {
    position: absolute;
    inset-block-end: var(--tp-space-1);
    inset-inline-end: var(--tp-space-1);
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-areas:
      '. up .'
      'left . right'
      '. down .';
  }

  .pad > [data-direction='up'] {
    grid-area: up;
  }

  .pad > [data-direction='down'] {
    grid-area: down;
  }

  .pad > [data-direction='left'] {
    grid-area: left;
  }

  .pad > [data-direction='right'] {
    grid-area: right;
  }

  .probe {
    position: absolute;
    inline-size: 0;
    block-size: 0;
    overflow: hidden;
    pointer-events: none;
  }
`;

/**
 * The minimap (Widgets 6.3 Anatomy): a canvas render surface (`role="img"`) painting the node
 * boxes and the viewport mask, with four named pan Buttons for the keyboard. `setScene` repaints
 * once per changed scene; colors resolve through the recipe's `--_tp-flow-minimap-*` knobs and
 * the tone tokens, re-read when the theme changes. The parts `flow-minimap-node` and
 * `flow-minimap-viewport` are canvas paint, not elements: they keep their names reserved and take
 * their colors from the `flow-minimap` part's custom properties.
 */
export class TpFlowMinimap extends TpElement {
  static tagName = 'tp-flow-minimap';
  static override presentation = flowPresentation;
  static get elementDependencies() {
    return [TpButton, TpIcon];
  }
  static override properties = {
    ...TpElement.properties,
    width: { type: Number },
    height: { type: Number },
    pannable: { type: Boolean, reflect: true },
    strings: { attribute: false },
    label: { type: String },
  };
  static override styles = [TpElement.styles, minimapStyles];

  /** CSS pixels; `0` keeps the recipe's size (the size axis knob). */
  width = 0;
  height = 0;
  pannable = true;
  strings: Partial<FlowStrings> | undefined;
  /** Overrides the accessible name of the image. */
  label = '';

  #surface: CanvasSurface | undefined;
  #drag: PointerDrag | undefined;
  #scene: FlowMinimapScene | undefined;
  #colors: Colors | undefined;
  #scheduler: Scheduler | undefined;
  #verify: (() => void) | undefined;
  #panning = false;

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get #strings(): FlowStrings {
    return resolveStrings(this.strings);
  }

  get canvas(): HTMLCanvasElement | null {
    return this.renderRoot?.querySelector('canvas') ?? null;
  }

  /** Paints a new scene; a scene equal to the last one does not repaint. */
  setScene(scene: FlowMinimapScene): void {
    if (this.#scene && sameScene(this.#scene, scene)) return;
    this.#scene = {
      bounds: { ...scene.bounds },
      viewport: { ...scene.viewport },
      nodes: scene.nodes.map((node) => ({
        rect: { ...node.rect },
        ...(node.tone ? { tone: node.tone } : {}),
        ...(node.selected ? { selected: true } : {}),
      })),
    };
    this.#surface?.invalidate();
  }

  /** Re-reads the tokens and repaints (the root calls it when its theme context changes). */
  themeChanged(): void {
    this.#colors = undefined;
    this.#surface?.invalidate();
  }

  override disconnectedCallback(): void {
    this.#scheduler?.dispose();
    this.#scheduler = undefined;
    this.#verify = undefined;
    this.#surface?.disconnect();
    this.#surface = undefined;
    this.#drag?.disconnect();
    this.#drag = undefined;
    super.disconnectedCallback();
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    const canvas = this.canvas;
    if (!canvas) return;
    this.#scheduler = new Scheduler(this.ownerDocument.defaultView ?? undefined);
    this.#surface = new CanvasSurface({
      canvas,
      render: (context, width, height, pixelRatio) =>
        this.#paint(context, width, height, pixelRatio),
    });
    this.#surface.connect();
    this.#drag = new PointerDrag({
      element: canvas,
      threshold: 0,
      disabled: () => this.disabled || !this.pannable,
      handlers: {
        begin: (point, event) => {
          this.#panning = true;
          this.#markPanning();
          this.#pan(point, 'start', event);
          return true;
        },
        move: (point, event) => this.#pan(point, 'move', event),
        end: (point, event) => {
          this.#panning = false;
          this.#markPanning();
          this.#pan(point, 'end', event);
        },
        cancel: (_reason, event) => {
          this.#panning = false;
          this.#markPanning();
          const scene = this.#scene;
          if (!scene) return;
          this.emit<FlowMinimapPanDetail>(
            MINIMAP_PAN,
            { center: rectCenter(scene.viewport), phase: 'cancel', sourceEvent: event },
            { composed: false },
          );
        },
      },
    });
    this.#drag.connect();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('disabled') || changed.has('pannable')) this.#surface?.invalidate();
  }

  #markPanning(): void {
    this.renderRoot
      .querySelector('.minimap')
      ?.toggleAttribute('data-panning', this.#panning && this.pannable);
  }

  // ---- geometry ------------------------------------------------------------------------------

  /** The painted area: the bounds extended to cover the viewport, in flow units. */
  #area(scene: FlowMinimapScene): FlowRect {
    return unionRect(scene.bounds, scene.viewport);
  }

  /** Flow-to-canvas transform for the current CSS box (CSS pixels). */
  #transform(scene: FlowMinimapScene, width: number, height: number) {
    const area = this.#area(scene);
    const inner = {
      width: Math.max(1, width - PADDING * 2),
      height: Math.max(1, height - PADDING * 2),
    };
    const scale = Math.min(
      inner.width / Math.max(1, area.width),
      inner.height / Math.max(1, area.height),
    );
    const offsetX = PADDING + (inner.width - area.width * scale) / 2 - area.x * scale;
    const offsetY = PADDING + (inner.height - area.height * scale) / 2 - area.y * scale;
    return { scale, offsetX, offsetY };
  }

  #pan(point: PointerDragPoint, phase: FlowGesturePhase, event: Event): void {
    const scene = this.#scene;
    if (!scene) return;
    const { scale, offsetX, offsetY } = this.#transform(scene, point.width, point.height);
    const center = { x: (point.x - offsetX) / scale, y: (point.y - offsetY) / scale };
    this.emit<FlowMinimapPanDetail>(
      MINIMAP_PAN,
      { center, phase, sourceEvent: event },
      { composed: false },
    );
  }

  #step = (event: MouseEvent): void => {
    const scene = this.#scene;
    const key = (event.currentTarget as HTMLElement).dataset['direction'] as Direction;
    const direction = DIRECTIONS.find((candidate) => candidate.key === key);
    if (!scene || !direction || this.disabled) return;
    this.emit<FlowMinimapStepDetail>(
      MINIMAP_STEP,
      {
        dx: (direction.dx * scene.viewport.width) / 10,
        dy: (direction.dy * scene.viewport.height) / 10,
        sourceEvent: event,
      },
      { composed: false },
    );
  };

  // ---- paint ---------------------------------------------------------------------------------

  #probeReader(): ((name: string) => string) | undefined {
    const part = this.renderRoot.querySelector<HTMLElement>('.minimap');
    const view = this.ownerDocument.defaultView;
    if (!part || !view) return undefined;
    const probes = [...part.querySelectorAll<HTMLElement>('.probe[data-color]')];
    return (name: string): string => {
      const probe = probes.find((element) => element.dataset['color'] === name);
      return probe ? view.getComputedStyle(probe).color : 'currentColor';
    };
  }

  /**
   * Token colors resolved through probe elements inside the part. The cache key is the resolved
   * card color, not the token text: `light-dark()` tokens keep one text across schemes. The key
   * is re-checked after each paint (`#verifyColors`), never inside it: a computed-style read
   * while hosts are being created would force a style recalculation mid-frame.
   */
  #resolveColors(): Colors {
    if (this.#colors) return this.#colors;
    const read = this.#probeReader();
    if (!read) return emptyColors();
    const key = read('background');
    this.#colors = {
      key,
      background: key,
      node: read('node'),
      selected: read('selected'),
      mask: read('mask'),
      viewport: read('viewport'),
      tones: new Map(),
    };
    return this.#colors;
  }

  /** Re-reads the cache key once the frame has settled; a changed theme repaints. */
  #verifyColors(): void {
    if (this.#verify || !this.#scheduler) return;
    this.#verify = this.#scheduler.timeout(() => {
      this.#verify = undefined;
      const read = this.#probeReader();
      if (read && this.#colors && read('background') !== this.#colors.key) this.themeChanged();
    }, 0);
  }

  #toneColor(colors: Colors, tone: string): string {
    const cached = colors.tones.get(tone);
    if (cached) return cached;
    const part = this.renderRoot.querySelector<HTMLElement>('.minimap');
    const view = this.ownerDocument.defaultView;
    if (!part || !view) return colors.node;
    const probe = this.ownerDocument.createElement('span');
    probe.className = 'probe';
    probe.style.color = `color-mix(in oklab, var(--tp-${tone}, var(--tp-foreground)) 45%, var(--tp-card))`;
    part.append(probe);
    const color = view.getComputedStyle(probe).color;
    probe.remove();
    colors.tones.set(tone, color);
    return color;
  }

  #paint(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    pixelRatio: number,
  ): void {
    const colors = this.#resolveColors();
    this.#verifyColors();
    context.clearRect(0, 0, width, height);
    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);
    const scene = this.#scene;
    if (!scene) return;
    const cssWidth = width / pixelRatio;
    const cssHeight = height / pixelRatio;
    const { scale, offsetX, offsetY } = this.#transform(scene, cssWidth, cssHeight);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const radius = Math.max(0.5, Math.min(2, 2 * scale));
    for (const node of scene.nodes) {
      const x = offsetX + node.rect.x * scale;
      const y = offsetY + node.rect.y * scale;
      const w = Math.max(1, node.rect.width * scale);
      const h = Math.max(1, node.rect.height * scale);
      context.fillStyle = node.tone ? this.#toneColor(colors, node.tone) : colors.node;
      context.beginPath();
      context.roundRect(x, y, w, h, radius);
      context.fill();
      if (node.selected) {
        context.strokeStyle = colors.selected;
        context.lineWidth = 1;
        context.stroke();
      }
    }
    // The mask dims everything outside the viewport; the viewport keeps a primary stroke.
    const vx = offsetX + scene.viewport.x * scale;
    const vy = offsetY + scene.viewport.y * scale;
    const vw = scene.viewport.width * scale;
    const vh = scene.viewport.height * scale;
    context.fillStyle = colors.mask;
    context.beginPath();
    context.rect(0, 0, cssWidth, cssHeight);
    context.rect(vx, vy, vw, vh);
    context.fill('evenodd');
    context.strokeStyle = colors.viewport;
    context.lineWidth = 1;
    context.strokeRect(vx + 0.5, vy + 0.5, Math.max(0, vw - 1), Math.max(0, vh - 1));
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---- render --------------------------------------------------------------------------------

  #renderPad() {
    const strings = this.#strings;
    return html`<div class="pad" role="group" aria-label=${strings.position}>
      ${DIRECTIONS.map(
        (direction) =>
          html`<tp-button
            class="pan"
            variant="ghost"
            size="icon-xs"
            data-direction=${direction.key}
            .disabled=${this.disabled}
            .ariaLabel=${strings[direction.string]}
            @click=${this.#step}
            ><tp-icon
              slot="icon-start"
              .icon=${chevronDownIcon}
              style=${`rotate: ${ROTATION[direction.key]}`}
            ></tp-icon
          ></tp-button>`,
      )}
    </div>`;
  }

  protected override render() {
    const strings = this.#strings;
    const style: Record<string, string> = {};
    if (this.width > 0) style['inline-size'] = `${this.width}px`;
    if (this.height > 0) style['block-size'] = `${this.height}px`;
    return this.renderPart(
      'flow-minimap',
      { pannable: this.pannable, disabled: this.disabled },
      {
        tag: 'div',
        properties: {
          part: 'flow-minimap',
          class: 'minimap',
          style,
          'data-pannable': this.pannable && !this.disabled,
        },
        content: html`<canvas role="img" aria-label=${this.label || strings.minimap}></canvas>
          <span class="probe" data-color="background" style="color: var(--tp-card)"></span>
          <span class="probe" data-color="node" style="color: var(--_tp-flow-minimap-node)"></span>
          <span class="probe" data-color="selected" style="color: var(--tp-primary)"></span>
          <span class="probe" data-color="mask" style="color: var(--_tp-flow-minimap-mask)"></span>
          <span
            class="probe"
            data-color="viewport"
            style="color: var(--_tp-flow-minimap-viewport, var(--tp-primary))"
          ></span>
          ${this.#renderPad()}`,
      },
    );
  }
}

function emptyColors(): Colors {
  return {
    key: '',
    background: 'transparent',
    node: 'currentColor',
    selected: 'currentColor',
    mask: 'transparent',
    viewport: 'currentColor',
    tones: new Map(),
  };
}

function rectCenter(rect: FlowRect): FlowPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function unionRect(a: FlowRect, b: FlowRect): FlowRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

function sameRect(a: FlowRect, b: FlowRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function sameScene(a: FlowMinimapScene, b: FlowMinimapScene): boolean {
  if (!sameRect(a.bounds, b.bounds) || !sameRect(a.viewport, b.viewport)) return false;
  if (a.nodes.length !== b.nodes.length) return false;
  for (let index = 0; index < a.nodes.length; index++) {
    const left = a.nodes[index]!;
    const right = b.nodes[index]!;
    if (
      !sameRect(left.rect, right.rect) ||
      (left.tone ?? '') !== (right.tone ?? '') ||
      !!left.selected !== !!right.selected
    )
      return false;
  }
  return true;
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-minimap': TpFlowMinimap;
  }
}
