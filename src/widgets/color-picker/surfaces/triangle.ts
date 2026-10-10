import { html } from 'lit';
import { CanvasSurface } from '../../../foundation/canvas-surface.js';
import { bindPart } from '../../../foundation/part.js';
import { PointerDrag, type PointerDragPoint } from '../../../foundation/pointer-drag.js';
import { clampChannel } from '../color/channels.js';
import { dimensionLabel } from '../dimensions.js';
import { inRingBand, ringToHue, svToTriangle, triangleToSv, triangleVertices } from './geometry.js';
import { paintTriangle } from './paint.js';
import {
  ColorSurfaceElement,
  HUE_CHANNEL,
  SATURATION_CHANNEL,
  VALUE_CHANNEL,
} from './surface-element.js';

type Mode = 'hue' | 'sv';
interface Pressed {
  readonly mode: Mode;
  readonly h: number;
  readonly s: number;
  readonly v: number;
}

/**
 * The hue ring around an HSV triangle. The ring band edits hue (one hidden input); the
 * triangle edits saturation and brightness (two hidden inputs) and is rasterized through the
 * shared `CanvasSurface`, repainted only on hue, size, pixel-ratio and theme changes.
 */
export class TpColorPickerTriangle extends ColorSurfaceElement {
  static tagName = 'tp-color-picker-triangle';

  #surface: HTMLElement | null = null;
  #triangle: HTMLElement | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #drag: PointerDrag | undefined;
  #raster: CanvasSurface | undefined;
  #pressed: Pressed | undefined;
  #paintedHue = NaN;

  /** The canvas raster owner; exposed for repaint-count evidence. */
  get rasterSurface(): CanvasSurface | undefined {
    return this.#raster;
  }

  #surfaceReference = (node: HTMLElement | null): void => {
    if (node === this.#surface) return;
    this.#drag?.disconnect();
    this.#drag = undefined;
    this.#surface = node;
    if (!node) return;
    this.#drag = new PointerDrag({
      element: node,
      owner: this.ownerDocument.defaultView,
      disabled: () => !this.editable,
      // A press inside the ring or triangle thumb drags it from where it was pressed.
      grip: (event) => (event.target as Element | null)?.closest?.('.thumb'),
      focusTarget: () =>
        this.renderRoot.querySelector<HTMLElement>(
          this.#pressed?.mode === 'hue'
            ? 'input[data-dimension="hue"]'
            : 'input[data-dimension="saturation"]',
        ),
      handlers: {
        begin: (point, event) => {
          const mode: Mode = inRingBand(point, this.#size(point), this.#ring(point)) ? 'hue' : 'sv';
          this.#pressed = { mode, h: this.hue, s: this.saturation, v: this.brightness };
          this.propose({
            hsv: this.#at(mode, point),
            reason: 'track-press',
            sourceEvent: event,
            phase: 'press',
          });
          return undefined;
        },
        move: (point, event) => {
          this.setDragging(true);
          const pressed = this.#pressed;
          if (!pressed) return;
          this.propose({
            hsv: this.#at(pressed.mode, point),
            reason: 'drag',
            sourceEvent: event,
            phase: 'propose',
          });
        },
        end: (point, event, dragged) => {
          this.setDragging(false);
          const pressed = this.#pressed;
          this.#pressed = undefined;
          if (!pressed) return;
          this.propose({
            hsv: this.#at(pressed.mode, point),
            reason: dragged ? 'drag' : 'track-press',
            sourceEvent: event,
            phase: 'commit',
          });
        },
        cancel: (reason, event) => {
          this.setDragging(false);
          const pressed = this.#pressed;
          this.#pressed = undefined;
          if (!pressed) return;
          this.propose({
            hsv: pressed.mode === 'hue' ? { h: pressed.h } : { s: pressed.s, v: pressed.v },
            reason: reason === 'escape' ? 'escape-key' : 'pointer',
            sourceEvent: event ?? new Event('tp-pointer-cancel'),
            phase: 'restore',
          });
        },
      },
    });
    this.#drag.connect();
  };

  #triangleReference = (node: HTMLElement | null): void => {
    this.#triangle = node;
  };

  #canvasReference = (node: HTMLElement | null): void => {
    const canvas = node as HTMLCanvasElement | null;
    if (canvas === this.#canvas) return;
    this.#raster?.disconnect();
    this.#raster = undefined;
    this.#canvas = canvas;
    if (!canvas) return;
    this.#raster = new CanvasSurface({
      canvas,
      owner: this.ownerDocument.defaultView,
      render: (context, width, height, pixelRatio) => {
        const outline = this.ownerDocument.defaultView
          ? this.ownerDocument.defaultView
              .getComputedStyle(canvas)
              .getPropertyValue('--tp-border')
              .trim()
          : '';
        paintTriangle(context, width, height, { hue: this.hue, outline, pixelRatio });
        this.#paintedHue = this.hue;
      },
    });
    this.#raster.connect();
  };

  override disconnectedCallback(): void {
    this.#drag?.disconnect();
    this.#drag = undefined;
    this.#raster?.disconnect();
    this.#raster = undefined;
    this.#surface = null;
    this.#triangle = null;
    this.#canvas = null;
    super.disconnectedCallback();
  }

  protected override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed as never);
    if (this.#raster && this.#paintedHue !== this.hue) this.#raster.invalidate();
  }

  #size(point: PointerDragPoint): number {
    return Math.min(point.width, point.height);
  }

  /** Ring thickness in CSS pixels, measured from the triangle box inset. */
  #ring(point: PointerDragPoint): number {
    const inner = this.#triangle?.getBoundingClientRect().width ?? 0;
    const size = this.#size(point);
    return inner > 0 && inner < size ? (size - inner) / 2 : size * 0.15;
  }

  #at(mode: Mode, point: PointerDragPoint): { h: number } | { s: number; v: number } {
    const size = this.#size(point);
    if (mode === 'hue') return { h: ringToHue(point, size) };
    const ring = this.#ring(point);
    const inner = size - 2 * ring;
    const local = { x: point.x - ring, y: point.y - ring };
    const vertices = triangleVertices({ x: inner / 2, y: inner / 2 }, inner / 2, this.hue);
    const { s, v } = triangleToSv(local, vertices);
    return { s: clampChannel(SATURATION_CHANNEL, s), v: clampChannel(VALUE_CHANNEL, v) };
  }

  #hueKeyDown = (event: KeyboardEvent): void => {
    if (!this.editable) return;
    const next = this.keyboardValue(event, HUE_CHANNEL, this.hue, 'both', true);
    if (next === null) return;
    event.preventDefault();
    this.propose({
      hsv: { h: clampChannel(HUE_CHANNEL, next) },
      reason: 'keyboard',
      sourceEvent: event,
      phase: 'commit',
    });
  };

  #svKeyDown = (event: KeyboardEvent): void => {
    if (!this.editable) return;
    const saturation = this.keyboardValue(
      event,
      SATURATION_CHANNEL,
      this.saturation,
      'horizontal',
      true,
    );
    const brightness = this.keyboardValue(event, VALUE_CHANNEL, this.brightness, 'vertical');
    if (saturation === null && brightness === null) {
      const focused = (event.currentTarget as HTMLElement).dataset.dimension;
      const definition = focused === 'value' ? VALUE_CHANNEL : SATURATION_CHANNEL;
      const current = focused === 'value' ? this.brightness : this.saturation;
      const next = this.keyboardValue(event, definition, current, 'both', true);
      if (next === null) return;
      event.preventDefault();
      this.propose({
        hsv:
          focused === 'value'
            ? { v: clampChannel(definition, next) }
            : { s: clampChannel(definition, next) },
        reason: 'keyboard',
        sourceEvent: event,
        phase: 'commit',
      });
      return;
    }
    event.preventDefault();
    this.propose({
      hsv: {
        ...(saturation === null ? {} : { s: clampChannel(SATURATION_CHANNEL, saturation) }),
        ...(brightness === null ? {} : { v: clampChannel(VALUE_CHANNEL, brightness) }),
      },
      reason: 'keyboard',
      sourceEvent: event,
      phase: 'commit',
    });
  };

  #wheel = (event: WheelEvent): void => {
    if (!this.allowWheelScrub || !this.editable) return;
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0;
    if (!direction) return;
    this.propose({
      hsv: event.shiftKey
        ? { h: clampChannel(HUE_CHANNEL, this.hue + direction * HUE_CHANNEL.step) }
        : { v: clampChannel(VALUE_CHANNEL, this.brightness + direction * VALUE_CHANNEL.step) },
      reason: 'wheel',
      sourceEvent: event,
      phase: 'commit',
    });
  };

  protected override render() {
    const text = this.text;
    const state = {
      hue: this.hue,
      saturation: this.saturation,
      brightness: this.brightness,
      dragging: this.dragging,
    };
    const radians = (this.hue * Math.PI) / 180;
    const ringThumb = this.renderPart('color-picker-ring-thumb', state, {
      tag: 'span',
      properties: {
        part: 'color-picker-ring-thumb',
        class: 'thumb ring-thumb',
        style: {
          left: `calc(50% + (50% - var(--_tp-color-picker-ring, 20px) / 2) * ${Math.cos(radians).toFixed(5)})`,
          top: `calc(50% + (50% - var(--_tp-color-picker-ring, 20px) / 2) * ${Math.sin(radians).toFixed(5)})`,
          '--_tp-color-picker-thumb-paint': `hsl(${Math.round(this.hue)} 100% 50%)`,
        },
        ...this.markers(),
      },
      content: html`<input
        ${bindPart(this.dimensionInput(HUE_CHANNEL, this.hue, text.hue, 'horizontal', this.#hueKeyDown), [])}
      />`,
    });
    // Thumb position in percentages of the triangle box (vertices on the unit circle).
    const vertices = triangleVertices({ x: 50, y: 50 }, 50, this.hue);
    const position = svToTriangle(this.saturation, this.brightness, vertices);
    const triangleThumb = this.renderPart('color-picker-triangle-thumb', state, {
      tag: 'span',
      properties: {
        part: 'color-picker-triangle-thumb',
        class: 'thumb triangle-thumb',
        style: { left: `${position.x}%`, top: `${position.y}%` },
        ...this.markers(),
      },
      content: html`<input
          ${bindPart(this.dimensionInput(SATURATION_CHANNEL, this.saturation, text.saturation, 'horizontal', this.#svKeyDown), [])}
        /><input
          ${bindPart(this.dimensionInput(VALUE_CHANNEL, this.brightness, text.value, 'vertical', this.#svKeyDown), [])}
        />`,
    });
    const triangle = this.renderPart('color-picker-triangle', state, {
      tag: 'div',
      reference: this.#triangleReference,
      properties: { part: 'color-picker-triangle', class: 'triangle', ...this.markers() },
      content: html`<canvas
          ${bindPart({ class: 'raster', 'aria-hidden': 'true' }, [this.#canvasReference])}
        ></canvas
        >${triangleThumb}`,
    });
    const ring = this.renderPart('color-picker-ring', state, {
      tag: 'div',
      properties: { part: 'color-picker-ring', class: 'ring', ...this.markers() },
    });
    return html`<div
      ${bindPart(
        {
          class: 'surface ring-box',
          role: 'group',
          'aria-label': dimensionLabel(this.label, text.triangleGroup),
          '@wheel': this.#wheel,
          ...this.markers(),
        },
        [this.#surfaceReference],
      )}
    >
      ${ring}${triangle}${ringThumb}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-color-picker-triangle': TpColorPickerTriangle;
  }
}
