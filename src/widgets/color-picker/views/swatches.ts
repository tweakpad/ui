import { html, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { parseColor } from '../color/parse.js';
import { serializeColor } from '../color/serialize.js';
import { flatGradient } from '../gradients.js';

/** One labelled grid or strip of swatches. */
export interface SwatchRow {
  readonly label: string;
  readonly colors: readonly string[];
}

export interface SwatchRowOptions {
  /** `swatches`: wrapping grid of saved/recent colors; `scheme`: a joined strip. */
  readonly kind: 'swatches' | 'scheme';
  /** Hex identity (`#rrggbb` / `#rrggbbaa`) of the current color, or null when empty. */
  readonly selected: string | null;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly onChange: (event: TpValueChangeEvent<readonly string[]>) => void;
}

const stop = (event: Event): void => event.stopPropagation();

/** The hex identity of a swatch string; null when it does not parse. */
export function swatchIdentity(text: string): string | null {
  const parsed = parseColor(text);
  return parsed ? serializeColor(parsed, 'hex') : null;
}

/**
 * A Toggle Group of Toggles, one per color; the fill span inside each Toggle is value-domain
 * paint. Single selection mirrors the current color; the widget owns the selection lane.
 */
export function renderSwatchRow(row: SwatchRow, options: SwatchRowOptions) {
  const seen = new Set<string>();
  const items = row.colors.map((text) => {
    const parsed = parseColor(text);
    if (!parsed) return nothing;
    const identity = serializeColor(parsed, 'hex');
    if (seen.has(identity)) return nothing;
    seen.add(identity);
    return html`<tp-toggle
      value=${identity}
      aria-label=${text}
      ?disabled=${options.disabled || options.readOnly}
      @tp-field-value=${stop}
      ><span
        class="swatch"
        part="color-picker-swatch"
        style=${styleMap({ '--_tp-color-picker-paint': flatGradient(parsed) })}
      ></span
    ></tp-toggle>`;
  });
  return html`<tp-toggle-group
    class=${options.kind}
    variant="outline"
    .spacing=${options.kind === 'scheme' ? 0 : 1}
    label=${row.label}
    .value=${options.selected ? [options.selected] : []}
    ?disabled=${options.disabled}
    .readOnly=${options.readOnly}
    @tp-value-change=${options.onChange}
    @tp-field-value=${stop}
    >${items}</tp-toggle-group
  >`;
}
