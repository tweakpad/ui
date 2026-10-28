import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
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
  parameters: { docs: libraryDocs('components/calendar') },
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
    buttonVariant: { control: 'select', options: ['ghost', 'outline', 'secondary', 'default'] },
    weekStartsOn: { control: { type: 'number', min: -1, max: 6 } },
    locale: { control: 'text' },
    messages: { control: 'object' },
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
