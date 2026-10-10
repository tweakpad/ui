import { html } from 'lit';
import { bindPart } from '../../../foundation/part.js';
import { PointerDrag, type PointerDragPoint } from '../../../foundation/pointer-drag.js';
import { clampChannel } from '../color/channels.js';
import { areaToSv, svToArea } from './geometry.js';
import { ColorSurfaceElement, SATURATION_CHANNEL, VALUE_CHANNEL } from './surface-element.js';

/**
 * The saturation/brightness plane. Two hidden range inputs (Saturation, Brightness) share the
 * thumb; both handle every arrow so the axes never depend on which input has focus.
 */
export class TpColorPickerArea extends ColorSurfaceElement {
  static tagName = 'tp-color-picker-area';

  #surface: HTMLElement | null = null;
  #drag: PointerDrag | undefined;
  #pressed: { s: number; v: number } | undefined;

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
      // A press inside the thumb drags it from where it was pressed.
      grip: (event) => (event.target as Element | null)?.closest?.('.thumb'),
      focusTarget: () =>
        this.renderRoot.querySelector<HTMLElement>('input[data-dimension="saturation"]'),
      handlers: {
        begin: (point, event) => {
          this.#pressed = { s: this.saturation, v: this.brightness };
          this.propose({
            hsv: this.#svAt(point),
            reason: 'track-press',
            sourceEvent: event,
            phase: 'press',
          });
          return undefined;
        },
        move: (point, event) => {
          this.setDragging(true);
          this.propose({
            hsv: this.#svAt(point),
            reason: 'drag',
            sourceEvent: event,
            phase: 'propose',
          });
        },
        end: (point, event, dragged) => {
          this.setDragging(false);
          this.#pressed = undefined;
          this.propose({
            hsv: this.#svAt(point),
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
            hsv: pressed,
            reason: reason === 'escape' ? 'escape-key' : 'pointer',
            sourceEvent: event ?? new Event('tp-pointer-cancel'),
            phase: 'restore',
          });
        },
      },
    });
    this.#drag.connect();
  };

  override disconnectedCallback(): void {
    this.#drag?.disconnect();
    this.#drag = undefined;
    this.#surface = null;
    super.disconnectedCallback();
  }

  #svAt(point: PointerDragPoint): { s: number; v: number } {
    return areaToSv(point, point.width, point.height, this.rtl);
  }

  #keyDown = (event: KeyboardEvent): void => {
    if (!this.editable) return;
    const saturation = this.keyboardValue(event, SATURATION_CHANNEL, this.saturation, 'horizontal');
    const brightness = this.keyboardValue(event, VALUE_CHANNEL, this.brightness, 'vertical');
    if (saturation === null && brightness === null) {
      // Page and Home/End act on the focused dimension only.
      const focused = (event.currentTarget as HTMLElement).dataset.dimension;
      const definition = focused === 'value' ? VALUE_CHANNEL : SATURATION_CHANNEL;
      const current = focused === 'value' ? this.brightness : this.saturation;
      const next = this.keyboardValue(event, definition, current, 'both');
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
    const amount = event.shiftKey ? SATURATION_CHANNEL.step : VALUE_CHANNEL.step;
    this.propose({
      hsv: event.shiftKey
        ? { s: clampChannel(SATURATION_CHANNEL, this.saturation + direction * amount) }
        : { v: clampChannel(VALUE_CHANNEL, this.brightness + direction * amount) },
      reason: 'wheel',
      sourceEvent: event,
      phase: 'commit',
    });
  };

  protected override render() {
    const text = this.text;
    const position = svToArea(this.saturation, this.brightness, this.rtl);
    const state = {
      saturation: this.saturation,
      brightness: this.brightness,
      dragging: this.dragging,
    };
    const thumb = this.renderPart('color-picker-area-thumb', state, {
      tag: 'span',
      properties: {
        part: 'color-picker-area-thumb',
        class: 'thumb',
        style: { left: `${position.left}%`, top: `${position.top}%` },
        ...this.markers(),
      },
      content: html`<input
          ${bindPart(this.dimensionInput(SATURATION_CHANNEL, this.saturation, text.saturation, 'horizontal', this.#keyDown), [])}
        /><input
          ${bindPart(this.dimensionInput(VALUE_CHANNEL, this.brightness, text.value, 'vertical', this.#keyDown), [])}
        />`,
    });
    return this.renderPart('color-picker-area', state, {
      tag: 'div',
      reference: this.#surfaceReference,
      properties: {
        part: 'color-picker-area',
        class: 'surface area',
        role: 'group',
        'aria-label': this.label ? `${this.label}: ${text.areaGroup}` : text.areaGroup,
        '@wheel': this.#wheel,
        ...this.markers(),
      },
      content: thumb,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-color-picker-area': TpColorPickerArea;
  }
}
