export function setupPaginationExample(root) {
  const paging = root.querySelector('tp-pagination');
  const rows = root.querySelector('tp-select');
  const output = root.querySelector('output');
  if (paging.hasAttribute('data-numbered-only')) {
    paging.showPrevious = false;
    paging.showNext = false;
  }
  if (paging.hasAttribute('data-directions-only')) paging.showPageLinks = false;
  paging.hrefForPage = (page) => `#page-${page}`;
  const report = () => {
    output.textContent = `Page ${paging.page} of ${paging.pages}`;
  };
  const navigate = (event) => {
    if (event.defaultPrevented || event.detail.cancelled) return;
    event.detail.sourceEvent.preventDefault();
    paging.page = event.detail.value;
    report();
  };
  const resize = (event) => {
    if (event.defaultPrevented || event.detail.cancelled) return;
    paging.pages = Math.ceil(500 / Number(event.detail.value));
    paging.page = 1;
    report();
  };
  paging.addEventListener('tp-value-change', navigate);
  rows?.addEventListener('tp-value-change', resize);
  report();
  return () => {
    paging.removeEventListener('tp-value-change', navigate);
    rows?.removeEventListener('tp-value-change', resize);
  };
}
