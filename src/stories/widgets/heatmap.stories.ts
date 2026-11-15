import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { todayCalendarDate } from '../../foundation/calendar.js';
import type {
  HeatmapAxis,
  HeatmapCellState,
  HeatmapColor,
  HeatmapFit,
  HeatmapGroups,
  HeatmapLabels,
  HeatmapSelectionMode,
  HeatmapShape,
  HeatmapSize,
} from '../../widgets/heatmap/types.js';
import { libraryDocs } from '../library-docs.js';
import { focusSessions, hourlyCheckIns, releaseHints, sequenceValues } from './heatmap-samples.js';

interface Args {
  size: HeatmapSize;
  shape: HeatmapShape;
  fit: HeatmapFit;
  groups: HeatmapGroups;
  color: HeatmapColor;
  levels: number;
  columnLabels: HeatmapLabels;
  rowLabels: HeatmapLabels;
  legend: boolean;
  legendFilter: boolean;
  tooltip: boolean;
  loading: boolean;
  selectionMode: HeatmapSelectionMode;
  weekStartsOn: number;
}

const today = todayCalendarDate();
const sessions = focusSessions(today);
const sessionsWithReleases = [...sessions, ...releaseHints(today)];

const meta: Meta<Args> = {
  title: 'Widgets/Heatmap',
  component: 'tp-heatmap',
  parameters: { docs: libraryDocs('widgets/heatmap') },
  args: {
    size: 'default',
    shape: 'rounded',
    fit: 'stretch',
    groups: 'separated',
    color: 'primary',
    levels: 5,
    columnLabels: 'auto',
    rowLabels: 'auto',
    legend: true,
    legendFilter: false,
    tooltip: true,
    loading: false,
    selectionMode: 'none',
    weekStartsOn: -1,
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'default', 'lg'] },
    shape: { control: 'select', options: ['square', 'rounded', 'circle'] },
    fit: { control: 'select', options: ['stretch', 'scroll', 'trim'] },
    groups: { control: 'select', options: ['joined', 'separated'] },
    color: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'destructive'],
    },
    levels: { control: { type: 'number', min: 2, max: 9 } },
    columnLabels: { control: 'select', options: ['auto', 'all', 'alternate', 'none'] },
    rowLabels: { control: 'select', options: ['auto', 'all', 'alternate', 'none'] },
    legend: { control: 'boolean' },
    legendFilter: { control: 'boolean' },
    tooltip: { control: 'boolean' },
    loading: { control: 'boolean' },
    selectionMode: { control: 'select', options: ['none', 'single', 'multiple', 'range'] },
    weekStartsOn: { control: { type: 'number', min: -1, max: 6 } },
  },
  render: (args) =>
    html`<tp-heatmap
      label="Focus sessions"
      .data=${sessionsWithReleases}
      .size=${args.size}
      .shape=${args.shape}
      .fit=${args.fit}
      .groups=${args.groups}
      .color=${args.color}
      .levels=${args.levels}
      .columnLabels=${args.columnLabels}
      .rowLabels=${args.rowLabels}
      .legend=${args.legend}
      .legendFilter=${args.legendFilter}
      .tooltip=${args.tooltip}
      .loading=${args.loading}
      .selectionMode=${args.selectionMode}
      .weekStartsOn=${args.weekStartsOn}
      .messages=${{
        cell: (cell: HeatmapCellState, value: string, where: string) =>
          cell.value === null ? `No sessions on ${where}` : `${value} sessions on ${where}`,
      }}
    ></tp-heatmap>`,
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Sizes: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<div style="display: grid; gap: var(--tp-space-6)">
      ${(['xs', 'sm', 'default', 'lg'] as const).map(
        (size) =>
          html`<tp-heatmap
            label=${`Focus sessions, ${size}`}
            size=${size}
            fit="scroll"
            .legend=${size === 'lg'}
            .data=${sessions}
          ></tp-heatmap>`,
      )}
    </div>`,
};

export const ShapesAndColors: Story = {
  tags: ['!autodocs'],
  name: 'Shapes and colors',
  render: () =>
    html`<div
      style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: var(--tp-space-6)"
    >
      <tp-heatmap
        label="Sessions, circles"
        unit="index"
        start="0"
        end="255"
        columns="16"
        shape="circle"
        color="destructive"
        .legend=${false}
        .data=${sequenceValues(256, 'circles')}
      ></tp-heatmap>
      <tp-heatmap
        label="Sessions, squares"
        unit="index"
        start="0"
        end="255"
        columns="16"
        shape="square"
        color="success"
        .legend=${false}
        .data=${sequenceValues(256, 'squares')}
      ></tp-heatmap>
    </div>`,
};

export const Vertical: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-heatmap
      style="max-inline-size: 22rem"
      label="Focus sessions by day of the month"
      columns="month"
      rows="day-of-month"
      start=${`${today.slice(0, 4)}-01-01`}
      end=${`${today.slice(0, 4)}-12-31`}
      .colors=${['muted', 'destructive-subtle', 'warning', 'destructive']}
      .data=${focusSessions(`${today.slice(0, 4)}-12-31`, 365)}
    ></tp-heatmap>`,
};

export const WeekdaysByHour: Story = {
  tags: ['!autodocs'],
  name: 'Weekdays by hour',
  render: () =>
    html`<tp-heatmap
      label="Check-ins by weekday and hour"
      unit="hour"
      columns="hour-of-day"
      rows="weekday"
      row-labels="all"
      color="success"
      .data=${hourlyCheckIns(today)}
    ></tp-heatmap>`,
};

const studioTicks = [
  { id: 'north', label: 'North' },
  { id: 'harbor', label: 'Harbor' },
  { id: 'lantern', label: 'Lantern' },
];
const weekTicks = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  label: `W${index + 1}`,
}));
const studios: HeatmapAxis<{ studio: string; week: number }> = {
  ticks: studioTicks,
  of: (key) => key.studio,
};
const weeks: HeatmapAxis<{ studio: string; week: number }> = {
  ticks: weekTicks,
  of: (key) => key.week,
};

export const CustomAxes: Story = {
  tags: ['!autodocs'],
  name: 'Custom axes',
  render: () =>
    html`<tp-heatmap
      label="Bookings by studio and week"
      unit="custom"
      .rows=${studios}
      .columns=${weeks}
      color="warning"
      .data=${studioTicks.flatMap((studio, row) =>
        weekTicks.map((week) => ({
          key: { studio: studio.id, week: week.id },
          value: ((week.id * (row + 3)) % 7) + row,
        })),
      )}
    ></tp-heatmap>`,
};

export const Scroll: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<div style="display: grid; grid-template-columns: 18rem 10rem; gap: var(--tp-space-6)">
      <tp-heatmap label="Focus sessions, scrolling" fit="scroll" .data=${sessions}></tp-heatmap>
      <tp-heatmap
        style="block-size: 14rem"
        label="Focus sessions, vertical scrolling"
        fit="scroll"
        columns="weekday"
        rows="week"
        .legend=${false}
        .data=${sessions}
      ></tp-heatmap>
    </div>`,
};

export const Trim: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-heatmap
      style="max-inline-size: 20rem"
      label="Focus sessions, recent weeks"
      fit="trim"
      .data=${sessions}
    ></tp-heatmap>`,
};

export const Selection: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-heatmap
        label="Focus sessions"
        selection-mode="range"
        .data=${sessions}
        @tp-value-commit=${(event: CustomEvent<{ value: unknown }>) => {
          const output = (event.currentTarget as HTMLElement).nextElementSibling;
          if (output)
            output.textContent =
              event.detail.value === undefined
                ? 'Nothing selected'
                : JSON.stringify(event.detail.value);
        }}
      ></tp-heatmap>
      <output style="display: block; margin-block-start: var(--tp-space-2)"
        >Nothing selected</output
      >`,
};

export const Loading: Story = {
  tags: ['!autodocs'],
  render: () => html`<tp-heatmap label="Focus sessions" loading></tp-heatmap>`,
};
