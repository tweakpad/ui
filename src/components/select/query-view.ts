import { html, nothing } from 'lit';
import { autofillProperties } from '../../foundation/autofill.js';
import { repeat } from 'lit/directives/repeat.js';
import type { ComponentPartContract, PartRenderOptions, PartState } from '../../foundation/part.js';
import { chevronDownIcon } from '../../icons/chevron-down.js';
import { xIcon } from '../../icons/x.js';
import type { TpSelect } from './select.js';
import type { SelectQueryController } from './query.js';
export interface QueryView {
  part(
    name: string,
    state: PartState,
    options: PartRenderOptions,
    contract?: ComponentPartContract,
  ): unknown;
  ref(
    key: string,
    part: string,
    commit?: (element: HTMLElement | null) => void,
  ): (element: HTMLElement | null) => void;
  values(): unknown[];
  text(value: unknown): string;
  state: PartState;
  prefix: unknown;
  focusOut(): void;
  clearMounted: boolean;
  clearVisible: boolean;
  bindClear(element: HTMLElement | null): void;
  bindEditor(element: HTMLElement | null): void;
}
/** Composition only: native combobox editor, InputGroup boundary, Badge values and Button actions. */
export function renderQuery(h: TpSelect, q: SelectQueryController, v: QueryView): unknown {
  const state = v.state;
  const input = v.part('select-input', state, {
    tag: 'input',
    properties: {
      class: 'select-editor',
      id: h.identifier,
      type: 'text',
      role: 'combobox',
      'aria-label': h.label || undefined,
      '.value': q.completion || q.value,
      placeholder: h.placeholder,
      '.disabled': h.effectiveDisabled,
      '.readOnly': h.readOnly,
      'aria-expanded': String(h.open),
      'aria-controls': h.open ? `${h.identifier}-list` : undefined,
      'aria-autocomplete': h.completionMode,
      ...autofillProperties(h.effectiveNoAutofill, h.autocomplete || 'off'),
      'aria-required': String(h.required),
      'aria-invalid': String(h.effectiveInvalid),
      '@input': (event: Event) => q.input(event),
      '@keydown': (event: KeyboardEvent) => q.key(event),
      '@click': (event: Event) => {
        if (h.openOnInputClick) h.setOpen(true, 'input-press', event);
      },
      '@compositionstart': () => {
        q.composing = true;
        q.completion = '';
      },
      '@compositionend': (event: Event) => {
        q.composing = false;
        q.input(event);
      },
      '@focusout': v.focusOut,
    },
    reference: v.ref('query-input', 'select-input', v.bindEditor),
    onHandlerPrevented: { '@input': () => q.restore() },
  });
  const chips =
    h.multiple && v.values().length
      ? v.part('select-chip-list', state, {
          properties: {
            class: 'select-chips',
            role: 'list',
            'aria-label': `${h.label} selected values`,
          },
          content: repeat(
            v.values(),
            (value) => value,
            (value, index) =>
              v.part(
                'select-chip',
                { ...state, value },
                {
                  tag: 'tp-badge',
                  properties: { class: 'select-chip', role: 'listitem', '.variant': 'secondary' },
                  content: html`${h.itemToLabel?.(value) ?? v.text(value)}${
                    h.showChipRemove
                      ? v.part(
                          'select-chip-remove',
                          { ...state, value },
                          {
                            tag: 'tp-button',
                            properties: {
                              '.variant': 'ghost',
                              '.size': 'icon-xs',
                              '.icon': xIcon,
                              '.ariaLabel': `Remove ${v.text(value)}`,
                              '.disabled': h.effectiveDisabled || h.readOnly,
                              'data-chip-index': index,
                              '@click': (event: Event) => q.remove(value, event),
                              '@keydown': (event: KeyboardEvent) => q.chipKey(event, index),
                            },
                            reference: v.ref(`chip-remove-${index}`, 'select-chip-remove'),
                          },
                        )
                      : nothing
                  }`,
                },
              ),
          ),
        })
      : nothing;
  const trigger =
    h.showTrigger && !(h.showClear && v.clearVisible)
      ? v.part('select-trigger', state, {
          tag: 'tp-button',
          properties: {
            slot: 'action',
            '.variant': 'ghost',
            '.size': 'icon-xs',
            '.icon': chevronDownIcon,
            '.nativeAction': h.nativeAction,
            '.ariaLabel': 'Toggle suggestions',
            '.disabled': h.effectiveDisabled || h.readOnly,
            '@pointerdown': (event: PointerEvent) => {
              if (event.pointerType !== 'touch') event.preventDefault();
            },
            '@click': (event: Event) => {
              h.setOpen(!h.open, 'trigger-press', event);
              q.editor?.focus({ preventScroll: true });
            },
          },
        })
      : nothing;
  const clear =
    h.showClear && v.clearMounted
      ? v.part('select-clear', state, {
          tag: 'tp-button',
          properties: {
            slot: 'action',
            '.variant': 'ghost',
            '.size': 'icon-xs',
            '.icon': xIcon,
            '.ariaLabel': 'Clear',
            '.disabled': h.effectiveDisabled || h.readOnly,
            hidden: !v.clearVisible,
            'aria-hidden': !v.clearVisible ? 'true' : undefined,
            '@pointerdown': (event: Event) => event.preventDefault(),
            '@click': (event: Event) => q.clear(event),
          },
          reference: v.ref('query-clear', 'select-clear', v.bindClear),
        })
      : nothing;
  return v.part('select-anchor', state, {
    tag: 'tp-input-group',
    properties: { class: 'select-anchor', '.invalid': h.effectiveInvalid },
    reference: v.ref('query-anchor', 'select-anchor', (element) => {
      q.anchor = element;
    }),
    content: html`${v.prefix}
      <div class="select-editor-contents">${chips}${input}</div>
      ${clear}${trigger}`,
  });
}
