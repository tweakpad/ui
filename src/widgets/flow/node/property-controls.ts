import { html, nothing, type TemplateResult } from 'lit';
import type { FlowPropertyControlContext, FlowPropertyControls } from '../types.js';

/**
 * Default property control factories (Widgets 6.3 Properties: each property definition names
 * the library control that edits it). Every factory marks its control with
 * `data-flow-property` so the node host re-proposes the control's lane events as node data
 * changes; `number` marks a NumberField root that the host binds after render.
 */

function optionItems(context: FlowPropertyControlContext) {
  return (context.definition.options ?? []).map((option) => ({
    value: String(option.value),
    label: option.label,
  }));
}

export const defaultPropertyControls: FlowPropertyControls = {
  text: (context) =>
    html`<tp-input
      class="control"
      data-flow-property=${context.definition.key}
      id=${context.id}
      size="sm"
      .value=${context.value == null ? '' : String(context.value)}
      placeholder=${context.definition.placeholder ?? ''}
      ?disabled=${context.disabled}
      ?readonly=${context.readOnly}
      aria-label=${context.definition.label}
    ></tp-input>`,
  textarea: (context) =>
    html`<tp-text-area
      class="control"
      data-flow-property=${context.definition.key}
      id=${context.id}
      .value=${context.value == null ? '' : String(context.value)}
      placeholder=${context.definition.placeholder ?? ''}
      ?disabled=${context.disabled}
      ?readonly=${context.readOnly}
      aria-label=${context.definition.label}
      rows="2"
    ></tp-text-area>`,
  number: (context) =>
    html`<tp-input-group
      class="control number"
      data-number-field=${context.definition.key}
      data-flow-property=${context.definition.key}
      size="sm"
      ><tp-input
        id=${context.id}
        type="text"
        inputmode="decimal"
        ?disabled=${context.disabled}
        ?readonly=${context.readOnly}
        aria-label=${context.definition.label}
      ></tp-input
    ></tp-input-group>`,
  slider: (context) =>
    html`<tp-slider
      class="control slider"
      data-flow-property=${context.definition.key}
      id=${context.id}
      size="sm"
      .value=${typeof context.value === 'number' ? context.value : (context.definition.min ?? 0)}
      .minimum=${context.definition.min ?? 0}
      .maximum=${context.definition.max ?? 100}
      .step=${context.definition.step ?? 1}
      ?disabled=${context.disabled}
      ?readonly=${context.readOnly}
      .getAccessibleLabel=${() => context.definition.label}
    ></tp-slider>`,
  select: (context) =>
    html`<tp-select
      class="control"
      data-flow-property=${context.definition.key}
      id=${context.id}
      size="sm"
      .items=${optionItems(context)}
      .value=${context.value == null ? '' : String(context.value)}
      placeholder=${context.definition.placeholder ?? ''}
      ?disabled=${context.disabled}
      ?readonly=${context.readOnly}
      label=${context.definition.label}
    ></tp-select>`,
  switch: (context) =>
    html`<tp-switch
      class="control"
      data-flow-property=${context.definition.key}
      id=${context.id}
      size="sm"
      .checked=${Boolean(context.value)}
      ?disabled=${context.disabled}
      ?readonly=${context.readOnly}
      aria-label=${context.definition.label}
    ></tp-switch>`,
  checkbox: (context) =>
    html`<tp-checkbox
      class="control"
      data-flow-property=${context.definition.key}
      id=${context.id}
      .checked=${Boolean(context.value)}
      ?disabled=${context.disabled}
      ?readonly=${context.readOnly}
      aria-label=${context.definition.label}
    ></tp-checkbox>`,
  color: (context) =>
    html`<tp-color-picker
      class="control"
      data-flow-property=${context.definition.key}
      id=${context.id}
      picker="popup"
      .value=${context.value == null ? '' : String(context.value)}
      ?disabled=${context.disabled}
      ?readonly=${context.readOnly}
      aria-label=${context.definition.label}
    ></tp-color-picker>`,
  easing: (context) =>
    html`<tp-easing-editor
      class="control"
      data-flow-property=${context.definition.key}
      id=${context.id}
      layout="compact"
      size="sm"
      .value=${context.value == null ? '' : String(context.value)}
      ?disabled=${context.disabled}
      ?readonly=${context.readOnly}
      aria-label=${context.definition.label}
      preset-picker="false"
      frames="false"
      preview="none"
    ></tp-easing-editor>`,
  custom: () => html`${nothing}`,
};

/** Reads the value a control's lane event carries, normalized per control kind. */
export function controlEventValue(control: Element, raw: unknown): unknown {
  if (control.localName === 'tp-slider') return Array.isArray(raw) ? raw[0] : raw;
  return raw;
}

export function renderControlWrapper(content: TemplateResult): TemplateResult {
  return html`<span class="control-wrapper">${content}</span>`;
}
