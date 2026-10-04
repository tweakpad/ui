import { html } from 'lit';
import type { TpPagination } from '../components/pagination/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
const accept = (event: TpValueChangeEvent<number>) => {
  if (event.defaultPrevented || event.detail.cancelled) return;
  event.detail.sourceEvent?.preventDefault();
  (event.currentTarget as TpPagination).page = event.detail.value;
};
export const paginationExamples = [
  {
    title: 'Simple',
    code: `<tp-pagination label="Results pages" page="2" pages="5"></tp-pagination>\n<script>\nconst paging = document.querySelector('tp-pagination');\npaging.showPrevious = false; paging.showNext = false;\npaging.hrefForPage = page => '#page-' + page;\n</script>`,
    render: () =>
      html`<tp-pagination
        label="Results pages"
        page="2"
        pages="5"
        .showPrevious=${false}
        .showNext=${false}
        .hrefForPage=${(page: number) => `#page-${page}`}
        @tp-value-change=${accept}
      ></tp-pagination>`,
  },
  {
    title: 'Rows per page',
    description:
      'Select and Pagination compose independently; changing the page size resets the page.',
    code: `<div style="display:flex;align-items:center;gap:var(--tp-space-4);flex-wrap:wrap">
  <tp-field label="Rows per page" orientation="horizontal"><tp-select default-value="25"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></tp-select></tp-field>
  <tp-pagination label="Results pages" page="1" pages="20"></tp-pagination>
</div>
<script>
  const paging = document.querySelector('tp-pagination');
  paging.showPageLinks = false; paging.showLabels = false;
  paging.hrefForPage = page => '#page-' + page;
  paging.addEventListener('tp-value-change', event => {
    event.detail.sourceEvent?.preventDefault(); paging.page = event.detail.value;
  });
  document.querySelector('tp-select').addEventListener('tp-value-change', event => {
    paging.pages = Math.ceil(500 / Number(event.detail.value)); paging.page = 1;
  });
</script>`,
    render: () =>
      html`<div style="display:flex;align-items:center;gap:var(--tp-space-4);flex-wrap:wrap">
        <tp-field label="Rows per page" orientation="horizontal"
          ><tp-select
            .defaultValue=${25}
            .items=${[10, 25, 50, 100]}
            @tp-value-change=${(event: TpValueChangeEvent<number>) => {
      if (event.defaultPrevented || event.detail.cancelled) return;
      const paging = (event.currentTarget as HTMLElement)
        .closest('div')
        ?.querySelector('tp-pagination');
      if (paging) {
        paging.pages = Math.ceil(500 / Number(event.detail.value));
        paging.page = 1;
      }
    }}
          ></tp-select
        ></tp-field>
        <tp-pagination
          label="Results pages"
          page="1"
          pages="20"
          .showPageLinks=${false}
          .showLabels=${false}
          .hrefForPage=${(page: number) => `#page-${page}`}
          @tp-value-change=${accept}
        ></tp-pagination>
      </div>`,
  },
];
