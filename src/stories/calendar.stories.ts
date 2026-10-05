import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/calendar.md?raw';
import { calendarExamples } from './calendar.examples.js';
import type {
  TpCalendar,
  CalendarCaptionLayout,
  CalendarMessages,
} from '../components/calendar/index.js';
import type { CalendarSelectionMode } from '../foundation/calendar.js';

interface Args {
  selectionMode: CalendarSelectionMode;
  captionLayout: CalendarCaptionLayout;
  visibleMonths: number;
  pagedNavigation: boolean;
  showOutsideDays: boolean;
  fixedWeeks: boolean;
  showWeekNumber: boolean;
  buttonVariant: TpCalendar['buttonVariant'];
  weekStartsOn: number;
  locale: string;
  messages: CalendarMessages;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
}

const meta = {
  title: 'Components/Calendar',
  component: 'tp-calendar',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      examples: calendarExamples,
      source: {
        transform: (_source: string, context: { args: Args }) => {
          const args = context.args;
          const attributes = [
            'label="Date"',
            args.selectionMode !== 'single' && `selection-mode="${args.selectionMode}"`,
            args.captionLayout !== 'label' && `caption-layout="${args.captionLayout}"`,
            args.visibleMonths !== 1 && `visible-months="${args.visibleMonths}"`,
            args.pagedNavigation && 'paged-navigation',
            args.fixedWeeks && 'fixed-weeks',
            args.showWeekNumber && 'show-week-number',
            args.buttonVariant !== 'ghost' && `button-variant="${args.buttonVariant}"`,
            args.weekStartsOn >= 0 && `week-starts-on="${args.weekStartsOn}"`,
            args.locale && `locale="${args.locale}"`,
            args.disabled && 'disabled',
            args.readOnly && 'readonly',
            args.required && 'required',
          ].filter(Boolean);
          const markup = `<tp-calendar ${attributes.join(' ')}></tp-calendar>`;
          // show-outside-days defaults to true; like other default-true booleans it is
          // disabled through the property. messages is property-only.
          const properties = [
            !args.showOutsideDays && 'calendar.showOutsideDays = false;',
            Object.keys(args.messages ?? {}).length &&
              `calendar.messages = ${JSON.stringify(args.messages, null, 2).replaceAll('\n', '\n  ')};`,
          ].filter(Boolean);
          return properties.length
            ? `${markup}\n<script type="module">\n  const calendar = document.querySelector('tp-calendar');\n  ${properties.join('\n  ')}\n</script>`
            : markup;
        },
      },
    },
  },
  args: {
    selectionMode: 'single',
    captionLayout: 'label',
    visibleMonths: 1,
    pagedNavigation: false,
    showOutsideDays: true,
    fixedWeeks: false,
    showWeekNumber: false,
    buttonVariant: 'ghost',
    weekStartsOn: -1,
    locale: '',
    messages: {},
    disabled: false,
    readOnly: false,
    required: false,
  },
  argTypes: {
    selectionMode: { control: 'select', options: ['single', 'multiple', 'range'] },
    captionLayout: {
      control: 'select',
      options: ['label', 'dropdown', 'dropdown-months', 'dropdown-years'],
    },
    visibleMonths: { control: { type: 'number', min: 1, max: 3 } },
    pagedNavigation: { control: 'boolean' },
    showOutsideDays: { control: 'boolean' },
    fixedWeeks: { control: 'boolean' },
    showWeekNumber: { control: 'boolean' },
    buttonVariant: {
      control: 'select',
      options: ['ghost', 'outline', 'secondary', 'default'],
      description: 'Button variant for the previous and next month controls.',
    },
    weekStartsOn: {
      control: { type: 'number', min: -1, max: 6 },
      description: '0 (Sunday) through 6; -1 uses the locale week start.',
    },
    locale: { control: 'text', description: 'BCP 47 tag; empty inherits the document language.' },
    messages: {
      control: 'object',
      description:
        'User-facing strings: previous, next, monthDropdown, yearDropdown, weekNumberHeader (strings here; previous/next, day and validity also accept functions in code).',
    },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-calendar
      label="Date"
      .selectionMode=${args.selectionMode}
      .captionLayout=${args.captionLayout}
      .visibleMonths=${args.visibleMonths}
      .pagedNavigation=${args.pagedNavigation}
      .showOutsideDays=${args.showOutsideDays}
      .fixedWeeks=${args.fixedWeeks}
      .showWeekNumber=${args.showWeekNumber}
      .buttonVariant=${args.buttonVariant}
      .weekStartsOn=${args.weekStartsOn}
      .locale=${args.locale}
      .messages=${args.messages}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .required=${args.required}
    ></tp-calendar>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
