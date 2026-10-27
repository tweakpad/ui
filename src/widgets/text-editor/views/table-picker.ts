/**
 * The table size picker of the text editor (`uwg-te-req-tables-2`, `uwg-te-tab-anatomy-r16`):
 * `text-editor-table-picker`, a state-driven Popover with an 8 by 8 pointer grid hidden from
 * assistive technology, Rows and Columns Fields with NumberField behavior (1 to 100 rows, 1 to 20
 * columns, each 3 whenever the picker opens) and an Insert Button. Hovering cell (r, c) sets the
 * fields to r and c; a click on the grid, Enter in a field or Insert issues one request of the
 * `table` tool with the size and closes the picker. Focus starts in Rows.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TpInput } from '../../../components/input/input.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { focusManaged } from '../../../foundation/focus.js';
import { NumberFieldController } from '../../../foundation/number-field/controller.js';
import type { AnchorGeometry } from '../../../foundation/positioning.js';
import type { TpSurfaceOpenChangeEvent } from '../../../foundation/surface-state.js';
import { fillTemplate } from '../../../foundation/template.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorRequestSurface } from '../../../foundation/text-editor/tools.js';
import type { ChangeReason } from '../../../foundation/types.js';

/** The pointer grid's side. */
export const TABLE_PICKER_GRID = 8;

/** The ranges of the Rows and Columns Fields (`uwg-te-req-tables-2`). */
export const TABLE_PICKER_LIMITS = Object.freeze({
  rows: Object.freeze({ min: 1, max: 100 }),
  columns: Object.freeze({ min: 1, max: 20 }),
});

/** The size the fields hold whenever the picker opens. */
export const TABLE_PICKER_DEFAULT = 3;

export type TablePickerAxis = keyof typeof TABLE_PICKER_LIMITS;

/** A field value as the picker keeps it: an integer within the axis's range. */
export function tablePickerValue(axis: TablePickerAxis, value: number): number {
  const { min, max } = TABLE_PICKER_LIMITS[axis];
  if (!Number.isFinite(value)) return TABLE_PICKER_DEFAULT;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Where the picker opened from and what its insertion reports. */
export interface TablePickerOpening {
  /** The control, the More menu's trigger or a virtual anchor over the selection. */
  readonly anchor: AnchorGeometry;
  /** The surface of the tool or source that showed it. */
  readonly surface: TextEditorRequestSurface;
  /** The element that opened it, which takes focus back when it closes without an insertion. */
  readonly opener: HTMLElement | null;
  /** The reason of the opening (`uwg-te-tab-reasons` r12); `imperative-action` without one. */
  readonly reason?: ChangeReason | undefined;
}

export interface TablePickerHost {
  strings(): TextEditorStrings;
  /** Whether the widget is disabled. */
  disabled(): boolean;
  /** Issues the `table` tool's request with the size. */
  insert(
    size: { readonly rows: number; readonly columns: number },
    surface: TextEditorRequestSurface,
    sourceEvent: Event,
    trigger: Element | null,
  ): void;
  /** Closing without an insertion: the editing root or the opener takes focus back. */
  restoreFocus(opener: HTMLElement | null): HTMLElement | boolean;
  requestUpdate(): void;
  /** The widget's one transient surface (`uwg-te-req-surfaces-6`). */
  transientOpened?(
    owner: object,
    close: (reason?: ChangeReason) => void,
    reason?: ChangeReason,
  ): void;
  transientClosed?(owner: object): void;
  /** A change of the open lane with its reason (`uwg-te-tab-reasons` r12, r13). */
  lane?(open: boolean, reason: ChangeReason): void;
}

interface FieldBinding {
  readonly root: HTMLElement;
  readonly input: TpInput;
  readonly controller: NumberFieldController;
  readonly release: () => void;
}

/** The table size picker (`views/table-picker.ts`). */
export class TextEditorTablePicker {
  readonly #host: TablePickerHost;
  #opening: TablePickerOpening | null = null;
  /**
   * The opening the body renders: kept after closing until the popover finished closing, so that
   * focus inside it is still there for the popover to return.
   */
  #shown: TablePickerOpening | null = null;
  #rows = TABLE_PICKER_DEFAULT;
  #columns = TABLE_PICKER_DEFAULT;
  #inserted = false;
  readonly #fields = new Map<TablePickerAxis, FieldBinding>();
  #rowsInput: TpInput | null = null;
  /**
   * The Rows field takes focus once it has rendered: it renders with the opening, after the
   * popover's own initial focus ran.
   */
  #focusPending = false;

  constructor(host: TablePickerHost) {
    this.#host = host;
  }

  get open(): boolean {
    return this.#opening !== null;
  }

  /** The size the fields hold. */
  get size(): { readonly rows: number; readonly columns: number } {
    return { rows: this.#rows, columns: this.#columns };
  }

  /** Opens the picker at an anchor, both fields at 3. Returns whether it opened. */
  show(opening: TablePickerOpening): boolean {
    if (this.#host.disabled()) return false;
    const reason = opening.reason ?? 'imperative-action';
    this.#host.transientOpened?.(this, (closing) => this.close(closing), reason);
    const opened = !this.#opening;
    this.#opening = opening;
    this.#shown = opening;
    this.#inserted = false;
    this.#focusPending = true;
    this.#setSize(TABLE_PICKER_DEFAULT, TABLE_PICKER_DEFAULT);
    if (opened) this.#host.lane?.(true, reason);
    this.#host.requestUpdate();
    return true;
  }

  /** Closes the picker; the lane records `reason`. */
  close(reason: ChangeReason = 'programmatic'): void {
    if (!this.#opening) return;
    this.#opening = null;
    this.#focusPending = false;
    this.#host.transientClosed?.(this);
    this.#host.lane?.(false, reason);
    this.#host.requestUpdate();
  }

  /** Hovering grid cell (r, c), counted from 1, sets the fields to r and c. */
  hover(rows: number, columns: number): void {
    this.#setSize(rows, columns);
    this.#host.requestUpdate();
  }

  /** Inserts the size the fields hold and closes the picker. */
  insert(sourceEvent: Event, trigger: Element | null): void {
    const opening = this.#opening;
    if (!opening) return;
    // A pending field edit counts: read the fields' values as they stand.
    const rows = this.#fields.get('rows')?.controller.value;
    const columns = this.#fields.get('columns')?.controller.value;
    if (typeof rows === 'number') this.#rows = tablePickerValue('rows', rows);
    if (typeof columns === 'number') this.#columns = tablePickerValue('columns', columns);
    this.#inserted = true;
    this.#opening = null;
    this.#focusPending = false;
    this.#host.transientClosed?.(this);
    this.#host.lane?.(false, 'item-press');
    this.#host.insert(
      { rows: this.#rows, columns: this.#columns },
      opening.surface,
      sourceEvent,
      trigger,
    );
    this.#host.requestUpdate();
  }

  #setSize(rows: number, columns: number): void {
    this.#rows = tablePickerValue('rows', rows);
    this.#columns = tablePickerValue('columns', columns);
    this.#fields.get('rows')?.controller.update({ value: this.#rows });
    this.#fields.get('columns')?.controller.update({ value: this.#columns });
  }

  /** Binds the NumberField owners of the rendered fields; call after every render. */
  updated(root: ParentNode): void {
    let created: TpInput | null = null;
    for (const axis of ['rows', 'columns'] as const) {
      const fieldRoot = root.querySelector<HTMLElement>(`[data-table-picker-field="${axis}"]`);
      const input = fieldRoot?.querySelector<TpInput>('tp-input') ?? null;
      const binding = this.#fields.get(axis);
      if (binding && (binding.root !== fieldRoot || binding.input !== input)) {
        binding.release();
        this.#fields.delete(axis);
      }
      if (!fieldRoot || !input || this.#fields.has(axis)) continue;
      if (!input.hasUpdated) {
        void input.updateComplete.then(() => this.#host.requestUpdate());
        continue;
      }
      const { min, max } = TABLE_PICKER_LIMITS[axis];
      const controller = new NumberFieldController(fieldRoot, input, {
        value: axis === 'rows' ? this.#rows : this.#columns,
        minimum: min,
        maximum: max,
        step: 1,
        smallStep: 1,
        largeStep: 10,
        format: { maximumFractionDigits: 0, useGrouping: false },
      });
      const change = (event: Event) => {
        const detail = (event as TpValueChangeEvent<number | null>).detail;
        if (event.target !== input || detail.value === null) return;
        event.stopPropagation();
        const value = tablePickerValue(axis, detail.value);
        if (axis === 'rows') this.#rows = value;
        else this.#columns = value;
        // The controlled field accepts its proposal inside the request (color picker precedent).
        controller.update({ value });
        this.#host.requestUpdate();
      };
      const key = (event: Event) => {
        const keyboard = event as KeyboardEvent;
        if (keyboard.key !== 'Enter' || keyboard.isComposing) return;
        keyboard.preventDefault();
        // The field commits its text on Enter first.
        queueMicrotask(() => this.insert(keyboard, input));
      };
      const stop = (event: Event) => event.stopPropagation();
      input.addEventListener('tp-value-change', change);
      input.addEventListener('keydown', key);
      input.addEventListener('tp-field-value', stop);
      this.#fields.set(axis, {
        root: fieldRoot,
        input,
        controller,
        release: () => {
          input.removeEventListener('tp-value-change', change);
          input.removeEventListener('keydown', key);
          input.removeEventListener('tp-field-value', stop);
          controller.dispose();
        },
      });
      if (axis === 'rows') created = input;
    }
    const rows = this.#focusPending && this.#opening ? this.#rowsInput?.inputElement : null;
    if (rows) {
      this.#focusPending = false;
      focusManaged(rows);
    }
    // A new Rows field shows the size after its owner's update; then typing replaces it.
    if (created) {
      const field = created;
      void field.updateComplete.then(() => this.#selectRows(field));
    }
  }

  /** Releases the field owners; called at disconnection. */
  disconnected(): void {
    for (const binding of this.#fields.values()) binding.release();
    this.#fields.clear();
    this.#opening = null;
    this.#shown = null;
  }

  readonly #openChange = (event: TpSurfaceOpenChangeEvent): void => {
    if (event.target !== event.currentTarget) return;
    // The state-driven profile: the picker follows the dismissal and keeps its own lane.
    if (!event.detail.value) this.close(event.detail.reason);
  };

  readonly #openComplete = (event: CustomEvent<{ open: boolean }>): void => {
    if (event.target !== event.currentTarget || event.detail.open || this.#opening) return;
    this.#shown = null;
    this.#host.requestUpdate();
  };

  /** The Rows field when it has rendered; otherwise `updated` focuses it once it has. */
  readonly #initialFocus = (): HTMLElement | boolean => {
    const rows = this.#rowsInput?.inputElement ?? null;
    if (rows) {
      this.#focusPending = false;
      // Typing replaces the size; a field still without it is selected once it shows it.
      if (rows.value !== '') rows.select();
    }
    return rows ?? false;
  };

  /** Selects the size in the focused Rows field, which shows it once it has rendered. */
  #selectRows(field: TpInput): void {
    const input = field.inputElement;
    if (this.#opening && input && input.value !== '' && input.matches(':focus')) input.select();
  }

  readonly #finalFocus = (): HTMLElement | boolean => {
    if (this.#inserted) {
      this.#inserted = false;
      return false;
    }
    return this.#host.restoreFocus(this.#lastOpener);
  };

  #lastOpener: HTMLElement | null = null;

  readonly #bindRows = (element: Element | undefined): void => {
    this.#rowsInput = (element as TpInput | undefined) ?? null;
  };

  /** The picker's popover, rendered while the widget renders. */
  render(): TemplateResult {
    const strings = this.#host.strings();
    const opening = this.#opening;
    if (opening) this.#lastOpener = opening.opener;
    const shown = opening ?? this.#shown;
    const rows = this.#rows;
    const columns = this.#columns;
    const cells: TemplateResult[] = [];
    for (let row = 1; row <= TABLE_PICKER_GRID; row++)
      for (let column = 1; column <= TABLE_PICKER_GRID; column++)
        cells.push(
          html`<span
            class="table-picker-cell"
            data-row=${row}
            data-column=${column}
            ?data-active=${row <= rows && column <= columns}
            @pointerenter=${() => this.hover(row, column)}
          ></span>`,
        );
    const size = fillTemplate(strings.tableSize, { rows, columns });
    return html`<tp-popover
      part="text-editor-table-picker"
      class="table-picker"
      side="block-end"
      align="start"
      .portal=${false}
      .modal=${false}
      .open=${opening !== null}
      .anchor=${shown?.anchor}
      label=${strings.table}
      .initialFocus=${this.#initialFocus}
      .finalFocus=${this.#finalFocus}
      @tp-open-change=${this.#openChange}
      @tp-open-change-complete=${this.#openComplete}
      >${
        shown
          ? html`<div class="table-picker-body">
              <div
                class="table-picker-grid"
                aria-hidden="true"
                @click=${(event: Event) => this.insert(event, event.currentTarget as Element)}
              >
                ${cells}
              </div>
              <span class="table-picker-size" aria-hidden="true">${size}</span>
              <div class="table-picker-fields">
                <div data-table-picker-field="rows">
                  <tp-field label=${strings.rows}
                    ><tp-input ${ref(this.#bindRows)}></tp-input
                  ></tp-field>
                </div>
                <div data-table-picker-field="columns">
                  <tp-field label=${strings.columns}><tp-input></tp-input></tp-field>
                </div>
              </div>
              <tp-button
                class="table-picker-insert"
                @click=${(event: Event) => this.insert(event, event.currentTarget as Element)}
                >${strings.insertTable}</tp-button
              >
            </div>`
          : nothing
      }</tp-popover
    >`;
  }
}
