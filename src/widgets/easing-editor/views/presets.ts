import { html, nothing, svg } from 'lit';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { parseEasingCurve } from '../../../foundation/easing/parse.js';
import { thumbnailPolyline } from '../surfaces/geometry.js';
import type { EasingPresetGroup } from '../types.js';

export interface PresetGroupOptions {
  /** Id of the preset whose canonical value equals the current value, or null. */
  readonly selected: string | null;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly onChange: (event: TpValueChangeEvent<readonly string[]>) => void;
}

const stop = (event: Event): void => event.stopPropagation();
const thumbnails = new Map<string, string>();

/** The polyline of a preset's curve in a 32 × 32 frame; cached by value text. */
export function presetThumbnail(value: string): string | null {
  const cached = thumbnails.get(value);
  if (cached !== undefined) return cached || null;
  const curve = parseEasingCurve(value);
  const points = curve ? thumbnailPolyline(curve) : '';
  thumbnails.set(value, points);
  return points || null;
}

/**
 * One Label and Toggle group per preset group; each Toggle holds the thumbnail and the name.
 * Single selection mirrors the current value; the widget owns the selection lane.
 */
export function renderPresetGroups(
  groups: readonly EasingPresetGroup[],
  options: PresetGroupOptions,
) {
  return groups.map((group) => {
    const items = group.presets.map((preset) => {
      const points = presetThumbnail(preset.value);
      if (!points) return nothing;
      return html`<tp-toggle
        class="preset"
        value=${preset.id}
        aria-label=${preset.label}
        ?disabled=${options.disabled || options.readOnly}
        @tp-field-value=${stop}
        >${svg`<svg class="thumb" part="easing-editor-preset-thumb" viewBox="0 0 32 32" aria-hidden="true"><rect class="thumb-box" x="6" y="6" width="20" height="20" vector-effect="non-scaling-stroke"></rect><polyline class="thumb-curve" points=${points} vector-effect="non-scaling-stroke"></polyline></svg>`}<span
          class="preset-name"
          >${preset.label}</span
        ></tp-toggle
      >`;
    });
    return html`<div class="preset-group" part="easing-editor-preset-group" data-group=${group.id}>
      <tp-label class="heading">${group.label}</tp-label
      ><tp-toggle-group
        class="presets"
        variant="outline"
        .spacing=${1}
        label=${group.label}
        .value=${options.selected ? [options.selected] : []}
        ?disabled=${options.disabled}
        .readOnly=${options.readOnly}
        @tp-value-change=${options.onChange}
        @tp-field-value=${stop}
        >${items}</tp-toggle-group
      >
    </div>`;
  });
}
