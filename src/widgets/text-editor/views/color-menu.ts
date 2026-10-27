/**
 * Color menus of the text editor (`uwg-te-req-surfaces-5`, `uwg-te-req-pres-3`): one named radio
 * group per channel of a color tool, each holding Default and the nine palette hues with a
 * swatch, the current value checked, Default when there is none and no item when it is mixed.
 */
import { html, nothing, type TemplateResult } from 'lit';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import type { TextEditorCellAddress } from '../../../foundation/text-editor/model.js';
import {
  TEXT_EDITOR_COLORS,
  type TextEditorColor,
  type TextEditorColorChoice,
} from '../../../foundation/text-editor/palette.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import {
  toolChannels,
  type TextEditorColorChannel,
  type TextEditorColorToolValue,
  type TextEditorTool,
  type TextEditorToolContext,
} from '../../../foundation/text-editor/tools.js';
import { stableValue } from '../tools/stable.js';

/** One item of a color group: Default or a hue. */
export interface TextEditorColorItem {
  readonly color: TextEditorColorChoice;
  readonly label: string;
}

/** One channel of a color menu, a named radio group. */
export interface TextEditorColorGroup {
  readonly channel: TextEditorColorChannel;
  /** The group's name: text color, highlight or background. */
  readonly label: string;
  /** The checked item: a hue, `default` for no color, or `null` when the selection is mixed. */
  readonly value: TextEditorColorChoice | null;
  readonly items: readonly TextEditorColorItem[];
}

const CHOICES: readonly TextEditorColorChoice[] = Object.freeze(['default', ...TEXT_EDITOR_COLORS]);

const HUE_LABELS: Readonly<Record<TextEditorColor, keyof TextEditorStrings>> = {
  gray: 'colorGray',
  brown: 'colorBrown',
  orange: 'colorOrange',
  yellow: 'colorYellow',
  green: 'colorGreen',
  blue: 'colorBlue',
  purple: 'colorPurple',
  pink: 'colorPink',
  red: 'colorRed',
};

const CHANNEL_LABELS: Readonly<Record<TextEditorColorChannel, keyof TextEditorStrings>> = {
  text: 'textColor',
  highlight: 'highlight',
  background: 'background',
};

/** The label of a color choice from the strings. */
export function colorLabel(strings: TextEditorStrings, color: TextEditorColorChoice): string {
  return color === 'default' ? strings.colorDefault : strings[HUE_LABELS[color]];
}

/** A stored color as a choice: `null` and `undefined` are Default, `mixed` stays `null`. */
function choice(
  stored: TextEditorColor | 'mixed' | null | undefined,
): TextEditorColorChoice | null {
  if (stored === 'mixed') return null;
  return stored ?? 'default';
}

/** The cells that a cell background acts on: a table menu's line, else the selected range. */
function targetCells(context: TextEditorToolContext): TextEditorCellAddress[] {
  const table = context.table;
  if (!table) return [];
  const { target } = context;
  const all = (rows: [number, number], columns: [number, number]) => {
    const cells: TextEditorCellAddress[] = [];
    for (let row = rows[0]; row <= rows[1]; row++)
      for (let column = columns[0]; column <= columns[1]; column++) cells.push({ row, column });
    return cells;
  };
  if (target.kind === 'table' && target.index !== undefined && target.axis !== 'cells')
    return target.axis === 'row'
      ? all([target.index, target.index], [0, table.columns - 1])
      : all([0, table.rows - 1], [target.index, target.index]);
  const state = context.state.table;
  if (!state || state.id !== table.id) return [];
  const range = state.range ?? { anchor: state.cell, head: state.cell };
  return all(
    [Math.min(range.anchor.row, range.head.row), Math.max(range.anchor.row, range.head.row)],
    [
      Math.min(range.anchor.column, range.head.column),
      Math.max(range.anchor.column, range.head.column),
    ],
  );
}

/** The background of the targeted cells: their shared hue, Default, or `null` when mixed. */
function backgroundValue(context: TextEditorToolContext): TextEditorColorChoice | null {
  const table = context.table;
  const cells = targetCells(context);
  if (!table || !cells.length) return 'default';
  const colors = new Set(
    cells.map(({ row, column }) => {
      const index = table.grid[row]?.[column];
      return index === undefined ? null : (table.cells[index]?.background ?? null);
    }),
  );
  return colors.size === 1 ? choice([...colors][0]) : null;
}

/** The checked choice of a channel in a context. */
export function colorChannelValue(
  channel: TextEditorColorChannel,
  context: TextEditorToolContext,
): TextEditorColorChoice | null {
  if (channel === 'text') return choice(context.state.marks.textColor);
  if (channel === 'highlight') return choice(context.state.marks.highlight);
  return backgroundValue(context);
}

/** The groups of a color tool's menu: one per channel that it offers, in the tool's order. */
export function colorGroups(
  tool: TextEditorTool,
  context: TextEditorToolContext,
): readonly TextEditorColorGroup[] {
  if (tool.kind !== 'color') return [];
  const { strings } = context;
  return toolChannels(tool).map((channel) => ({
    channel,
    label: strings[CHANNEL_LABELS[channel]],
    value: colorChannelValue(channel, context),
    items: CHOICES.map((color) => ({ color, label: colorLabel(strings, color) })),
  }));
}

/**
 * The value that activates a color tool for a choice: the choice alone for a tool with one
 * channel, `{ channel, color }` for one with several.
 */
export function colorToolValue(
  groups: readonly TextEditorColorGroup[],
  channel: TextEditorColorChannel,
  color: TextEditorColorChoice,
): TextEditorColorChoice | TextEditorColorToolValue {
  return groups.length > 1 ? { channel, color } : color;
}

/** The swatch of a choice: a letter for text color, a filled square otherwise; none for Default. */
export function renderSwatch(
  channel: TextEditorColorChannel,
  color: TextEditorColorChoice,
): TemplateResult {
  const letter = channel === 'text';
  return html`<span
    part="text-editor-swatch"
    aria-hidden="true"
    data-swatch=${letter ? 'letter' : 'fill'}
    data-color=${color}
    >${letter ? 'A' : nothing}</span
  >`;
}

export interface TextEditorColorMenuHandlers {
  /** A choice of a group's item, with the radio group as the element that issued it. */
  choose(
    channel: TextEditorColorChannel,
    color: TextEditorColorChoice,
    trigger: Element,
    sourceEvent: Event,
  ): void;
}

/**
 * The content of a color menu: one radio group per channel, named by the channel, whose items
 * close the menu tree when chosen; a choice is vetoed in the group and reported to `handlers`,
 * so the request decides the checked value.
 */
export function renderColorMenuContent(
  groups: readonly TextEditorColorGroup[],
  handlers: TextEditorColorMenuHandlers,
  disabled = false,
): TemplateResult {
  return html`${groups.map((group, index) => {
    const { channel } = group;
    // The group calls its callback as its own method, so `this` is the group. One callback per
    // handlers and channel keeps the group unchanged across renders (`stableValue`).
    const onValueChange = stableValue(
      handlers,
      `channel\u0000${channel}`,
      () =>
        function (this: Element, event: TpValueChangeEvent<unknown>) {
          event.preventDefault();
          const value = event.detail.value;
          if (typeof value === 'string')
            handlers.choose(
              channel,
              value as TextEditorColorChoice,
              this,
              event.detail.sourceEvent,
            );
        },
    );
    return html`${index ? html`<tp-separator></tp-separator>` : nothing}<tp-menu-radio-group
        data-channel=${group.channel}
        .value=${group.value}
        .onValueChange=${onValueChange}
        ><span data-menu-label>${group.label}</span>${group.items.map(
          (item) =>
            html`<tp-menu-radio-item value=${item.color} ?disabled=${disabled} .closeOnClick=${true}
              >${renderSwatch(group.channel, item.color)}${item.label}</tp-menu-radio-item
            >`,
        )}</tp-menu-radio-group
      >`;
  })}`;
}
