import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { paginationExamples } from './pagination.examples.js';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import type { TpPagination } from '../components/pagination/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/pagination.md?raw';
interface Args {
  page: number;
  pages: number;
  label: string;
  disabled: boolean;
  previousLabel: string;
  nextLabel: string;
  pageLinkVariant: 'text' | 'icon';
  showPrevious: boolean;
  showNext: boolean;
  showPageLinks: boolean;
  showLabels: boolean;
}
const source = `<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
  const paging = document.querySelector('tp-pagination');
  paging.hrefForPage = page => '#page-' + page;
  paging.onPageChange = event => {
    if (event.defaultPrevented || event.detail.cancelled) return;
    event.detail.sourceEvent.preventDefault(); // This example routes in place.
    paging.page = event.detail.value;
  };
</script>
<tp-pagination label="Results pages" page="4" pages="12"></tp-pagination>`;
function control(args: Args, updateArgs: (args: Partial<Args>) => void) {
  return html`<tp-pagination
    .page=${args.page}
    .pages=${args.pages}
    .label=${args.label}
    .disabled=${args.disabled}
    .previousLabel=${args.previousLabel}
    .nextLabel=${args.nextLabel}
    .pageLinkVariant=${args.pageLinkVariant}
    .showPrevious=${args.showPrevious}
    .showNext=${args.showNext}
    .showPageLinks=${args.showPageLinks}
    .showLabels=${args.showLabels}
    .hrefForPage=${(page: number) => `#page-${page}`}
    @tp-value-change=${(event: TpValueChangeEvent<number>) => {
      if (event.defaultPrevented || event.detail.cancelled) return;
      event.detail.sourceEvent?.preventDefault();
      (event.currentTarget as TpPagination).page = event.detail.value;
      updateArgs({ page: event.detail.value });
    }}
  ></tp-pagination>`;
}
const meta = {
  title: 'Components/Pagination',
  component: 'tp-pagination',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: { code: source },
      examples: paginationExamples,
    },
  },
  args: {
    page: 4,
    pages: 12,
    label: 'Results pages',
    disabled: false,
    previousLabel: 'Previous',
    nextLabel: 'Next',
    pageLinkVariant: 'icon',
    showPrevious: true,
    showNext: true,
    showPageLinks: true,
    showLabels: true,
  },
  argTypes: {
    page: { control: { type: 'number', min: 1 } },
    pages: { control: { type: 'number', min: 1 } },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    previousLabel: { control: 'text' },
    nextLabel: { control: 'text' },
    pageLinkVariant: { control: 'select', options: ['text', 'icon'] },
    showPrevious: { control: 'boolean' },
    showNext: { control: 'boolean' },
    showPageLinks: { control: 'boolean' },
    showLabels: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return control(args, updateArgs);
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
