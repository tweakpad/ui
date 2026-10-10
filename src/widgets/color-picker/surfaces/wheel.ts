import { html, nothing, svg } from 'lit';
import { bindPart } from '../../../foundation/part.js';
import { PointerDrag, type PointerDragPoint } from '../../../foundation/pointer-drag.js';
import { clampChannel } from '../color/channels.js';
import { harmonyBaseIndex, harmonyColors, type HarmonyRule, type Hsv } from '../color/harmony.js';
import { displayColor } from '../color/serialize.js';
import { color } from '../color/types.js';
import { dimensionLabel } from '../dimensions.js';
import { discToHs, hsToDisc } from './geometry.js';
import { ColorSurfaceElement, HUE_CHANNEL, SATURATION_CHANNEL } from './surface-element.js';

interface Pressed {
  readonly handle: number;
  readonly hsv: Hsv;
}

/**
 * The hue/saturation disc with harmony handles (reference image 6). The base handle edits the
 * color; derived handles follow the rule; under `custom` every handle is its own dimension pair.
 * Brightness is not edited here: the widget dims the disc through `--_tp-color-picker-dim`.
 */
export class TpColorPickerWheel extends ColorSurfaceElement {
  static tagName = 'tp-color-picker-wheel';
  static override properties = {
    ...ColorSurfaceElement.properties,
    harmony: { type: String },
    handles: { attribute: false },
  };

  harmony: HarmonyRule = 'none';
  /** Custom handles in wheel order; index 0 is the base and follows the color. */
  handles: readonly Hsv[] = [];

  #surface: HTMLElement | null = null;
  #drag: PointerDrag | undefined;
  #pressed: Pressed | undefined;
  #active = -1;

  get #base(): Hsv {
    return { h: this.hue, s: this.saturation, v: this.brightness };
  }

  get #custom(): boolean {
    return this.harmony === 'custom';
  }

  /** Handle colors in wheel order; the base alone under `none`. */
  get colors(): readonly Hsv[] {
    if (this.harmony === 'none') return [this.#base];
    const base = this.#base;
    return harmonyColors(
      base,
      this.harmony,
      this.handles.length ? [base, ...this.handles.slice(1)] : undefined,
    );
  }

  get baseIndex(): number {
    return this.harmony === 'none' ? 0 : harmonyBaseIndex(this.harmony);
  }

  #editable(index: number): boolean {
    return index === this.baseIndex || this.#custom;
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
      // A press within reach of an editable handle drags it from where it was pressed, even
      // where a derived handle paints over it (complementary and analogous variants share the
      // base's position or overlap it).
      grip: (event) => this.#editableHandleUnder(event.clientX, event.clientY),
      focusTarget: () =>
        this.renderRoot.querySelector<HTMLElement>(
          `input[data-handle="${this.#active < 0 ? this.baseIndex : this.#active}"][data-dimension="hue"]`,
        ),
      handlers: {
        begin: (point, event) => {
          // A derived handle follows the base: pressing it edits nothing and moves nothing,
          // unless an editable handle is within reach of the press (overlapping handles).
          const pressed = (event.target as Element | null)?.closest?.('.handle');
          if (
            pressed &&
            !pressed.hasAttribute('data-editable') &&
            !this.#editableHandleUnder(event.clientX, event.clientY)
          )
            return false;
          const handle = this.#handleAt(point);
          this.#active = handle;
          const current = this.colors[handle] ?? this.#base;
          this.#pressed = { handle, hsv: current };
          this.#propose(handle, this.#hsAt(point), 'track-press', event, 'press');
          return undefined;
        },
        move: (point, event) => {
          this.setDragging(true);
          const pressed = this.#pressed;
          if (!pressed) return;
          this.#propose(pressed.handle, this.#hsAt(point), 'drag', event, 'propose');
        },
        end: (point, event, dragged) => {
          this.setDragging(false);
          const pressed = this.#pressed;
          this.#pressed = undefined;
          if (!pressed) return;
          this.#propose(
            pressed.handle,
            this.#hsAt(point),
            dragged ? 'drag' : 'track-press',
            event,
            'commit',
          );
        },
        cancel: (reason, event) => {
          this.setDragging(false);
          const pressed = this.#pressed;
          this.#pressed = undefined;
          if (!pressed) return;
          this.#propose(
            pressed.handle,
            { h: pressed.hsv.h, s: pressed.hsv.s },
            reason === 'escape' ? 'escape-key' : 'pointer',
            event ?? new Event('tp-pointer-cancel'),
            'restore',
          );
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

  #hsAt(point: PointerDragPoint): { h: number; s: number } {
    return discToHs(point, Math.min(point.width, point.height));
  }

  /** The editable handle whose reach (its box plus a 4 px margin) holds a viewport point. */
  #editableHandleUnder(x: number, y: number): HTMLElement | null {
    const surface = this.#surface;
    if (!surface) return null;
    let best: HTMLElement | null = null;
    let bestDistance = Infinity;
    for (const handle of surface.querySelectorAll<HTMLElement>('.handle[data-editable]')) {
      const rect = handle.getBoundingClientRect();
      const distance = Math.hypot(rect.left + rect.width / 2 - x, rect.top + rect.height / 2 - y);
      const radius = Math.max(rect.width / 2 + 4, 12);
      if (distance <= radius && distance < bestDistance) {
        best = handle;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** The editable handle under the pointer, or the base handle (which jumps to the point). */
  #handleAt(point: PointerDragPoint): number {
    const surface = this.#surface;
    if (!surface) return this.baseIndex;
    const box = surface.getBoundingClientRect();
    const handle = this.#editableHandleUnder(box.left + point.x, box.top + point.y);
    return handle ? Number(handle.dataset.index) : this.baseIndex;
  }

  #propose(
    handle: number,
    hs: { h: number; s: number },
    reason: 'track-press' | 'drag' | 'keyboard' | 'wheel' | 'escape-key' | 'pointer',
    sourceEvent: Event,
    phase: 'press' | 'propose' | 'commit' | 'restore',
  ): void {
    const hsv = {
      h: clampChannel(HUE_CHANNEL, hs.h),
      s: clampChannel(SATURATION_CHANNEL, hs.s),
    };
    this.propose({
      hsv,
      reason,
      sourceEvent,
      phase,
      ...(handle === this.baseIndex ? {} : { handle }),
    });
  }

  #keyDown = (event: KeyboardEvent): void => {
    if (!this.editable) return;
    const input = event.currentTarget as HTMLInputElement;
    const handle = Number(input.dataset.handle);
    const current = this.colors[handle] ?? this.#base;
    const hue = input.dataset.dimension === 'hue';
    const next = hue
      ? this.keyboardValue(event, HUE_CHANNEL, current.h, 'both', true)
      : this.keyboardValue(event, SATURATION_CHANNEL, current.s, 'both');
    if (next === null) return;
    event.preventDefault();
    this.#active = handle;
    this.#propose(
      handle,
      hue ? { h: next, s: current.s } : { h: current.h, s: next },
      'keyboard',
      event,
      'commit',
    );
  };

  #wheel = (event: WheelEvent): void => {
    if (!this.allowWheelScrub || !this.editable) return;
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0;
    if (!direction) return;
    const base = this.#base;
    this.#propose(
      this.baseIndex,
      event.shiftKey
        ? { h: base.h, s: base.s + direction * SATURATION_CHANNEL.step }
        : { h: base.h + direction * HUE_CHANNEL.step, s: base.s },
      'wheel',
      event,
      'commit',
    );
  };

  #handleInputs(index: number, hsv: Hsv) {
    const text = this.text;
    const own = index === this.baseIndex;
    const name = own ? '' : `${text.harmonyHandle} ${index + 1}: `;
    const extra = { 'data-handle': String(index) };
    return html`<input
        ${bindPart(this.dimensionInput(HUE_CHANNEL, hsv.h, `${name}${text.hue}`, 'horizontal', this.#keyDown, extra), [])}
      /><input
        ${bindPart(this.dimensionInput(SATURATION_CHANNEL, hsv.s, `${name}${text.saturation}`, 'horizontal', this.#keyDown, extra), [])}
      />`;
  }

  protected override render() {
    const text = this.text;
    const colors = this.colors;
    const baseIndex = this.baseIndex;
    const positions = colors.map((entry) => hsToDisc(entry.h, entry.s));
    const line =
      positions.length > 1
        ? svg`<svg class="line" part="color-picker-wheel-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points=${positions.map((p) => `${p.left},${p.top}`).join(' ')}></polyline></svg>`
        : nothing;
    const state = {
      hue: this.hue,
      saturation: this.saturation,
      harmony: this.harmony,
      dragging: this.dragging,
    };
    const handles = colors.map((entry, index) => {
      const editable = this.#editable(index);
      const position = positions[index]!;
      return this.renderPart(
        'color-picker-wheel-handle',
        { ...state, index, editable },
        {
          tag: 'span',
          properties: {
            part: 'color-picker-wheel-handle',
            class: 'handle',
            style: {
              left: `${position.left}%`,
              top: `${position.top}%`,
              '--_tp-color-picker-thumb-paint': displayColor(
                color('hsv', [entry.h, entry.s, entry.v], 1),
              ),
            },
            'data-index': String(index),
            'data-primary': index === baseIndex,
            'data-selected': index === this.#active && this.#custom,
            'data-editable': editable,
            'aria-hidden': editable ? undefined : 'true',
            ...this.markers(),
          },
          content: editable ? this.#handleInputs(index, entry) : nothing,
        },
      );
    });
    return this.renderPart('color-picker-wheel', state, {
      tag: 'div',
      reference: this.#surfaceReference,
      properties: {
        part: 'color-picker-wheel',
        class: 'surface wheel',
        role: 'group',
        'aria-label': dimensionLabel(this.label, text.wheelGroup),
        '@wheel': this.#wheel,
        ...this.markers(),
      },
      content: html`${line}${handles}`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-color-picker-wheel': TpColorPickerWheel;
  }
}
