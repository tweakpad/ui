// Table layout checks (issue 18), executed through Chrome DevTools MCP `evaluate_script`.
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const settle = async () => {
  for (const table of document.querySelectorAll('tp-table')) await table.updateComplete;
  await frame();
  await frame();
};
const cell = (selector) => document.querySelector(selector).nativeElement;
const lines = (element) => {
  const style = getComputedStyle(element);
  const height =
    element.getBoundingClientRect().height -
    parseFloat(style.paddingBlockStart) -
    parseFloat(style.paddingBlockEnd);
  return Math.round(height / parseFloat(style.lineHeight || '20'));
};
const fail = (name, result) => {
  const failed = Object.entries(result).filter(([, value]) => value === false);
  if (failed.length) throw new Error(`${name} failed: ${failed.map(([key]) => key).join(', ')}`);
  return result;
};
const region = (table) => {
  const root = table.shadowRoot.querySelector("[part~='table']");
  return {
    role: root.getAttribute('role'),
    tabindex: root.getAttribute('tabindex'),
    label: root.getAttribute('aria-label'),
  };
};

/** `white-space` reaches the cells from the table and from a single cell; the default stays `nowrap`. */
export async function wrapping() {
  await settle();
  const prose = document.querySelector('#prose');
  const description = cell('#prose-description');
  return fail('wrapping', {
    proseWraps: getComputedStyle(description).whiteSpace === 'normal' && lines(description) > 1,
    proseFits: prose.getBoundingClientRect().width <= prose.parentElement.clientWidth,
    defaultNowrap: getComputedStyle(cell('#nowrap-cell')).whiteSpace === 'nowrap',
    singleCellWraps: getComputedStyle(cell('#wrap-cell')).whiteSpace === 'normal',
    captionWraps: getComputedStyle(cell('#early tp-table-caption')).whiteSpace === 'normal',
  });
}

/** Sizes and vertical alignment set on a part's host reach its native cell. */
export async function partLayout() {
  await settle();
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const quantity = cell('#quantity').getBoundingClientRect().width;
  const description = cell('#prose-description');
  const wrapCell = cell('#wrap-cell').getBoundingClientRect().width;
  return fail('partLayout', {
    quantity: Math.round(quantity),
    quantityIs8rem: Math.abs(quantity - 8 * rem) < 1,
    descriptionMin15rem: description.getBoundingClientRect().width >= 15 * rem - 1,
    descriptionTop: getComputedStyle(description).verticalAlign === 'top',
    defaultMiddle: getComputedStyle(cell('#nowrap-cell')).verticalAlign === 'middle',
    // Engines leave max-width on table cells undefined; check that the value arrives.
    wrapCellMax12rem: getComputedStyle(cell('#wrap-cell')).maxInlineSize === `${12 * rem}px`,
    wrapCell: Math.round(wrapCell),
  });
}

/** Only a Table that scrolls is a focusable region; resizing switches it. */
export async function conditionalRegion() {
  await settle();
  const fits = document.querySelector('#fits');
  const overflows = document.querySelector('#overflows');
  const before = { fits: region(fits), overflows: region(overflows) };
  // Grow the scrolling one until it fits, and squeeze the fitting one until it scrolls.
  overflows.style.maxBlockSize = 'none';
  fits.style.maxBlockSize = '1rem';
  await settle();
  const after = { fits: region(fits), overflows: region(overflows) };
  overflows.style.maxBlockSize = '6rem';
  fits.style.maxBlockSize = '';
  await settle();
  const restored = { fits: region(fits), overflows: region(overflows) };
  return fail('conditionalRegion', {
    before,
    after,
    fitsPlain: before.fits.role === null && before.fits.tabindex === null,
    fitsTableNamed:
      fits.shadowRoot.querySelector("[part~='table-table']").getAttribute('aria-label') ===
      'Watering days',
    overflowsRegion:
      before.overflows.role === 'region' &&
      before.overflows.tabindex === '0' &&
      before.overflows.label === 'Harvest log',
    switchedOn: after.fits.role === 'region' && after.fits.tabindex === '0',
    switchedOff: after.overflows.role === null && after.overflows.tabindex === null,
    restored: restored.fits.role === null && restored.overflows.role === 'region',
  });
}

/** The page-level rules lay out an undefined Table as a table (recorded before registration). */
export function preDefinition() {
  const { defined, ...result } = window.preDefinition;
  return fail('preDefinition', {
    ...result,
    notYetDefined: !defined,
    tableBlock: result.table === 'block',
    captionDisplay: result.caption === 'table-caption',
    headerDisplay: result.header === 'table-header-group',
    bodyDisplay: result.body === 'table-row-group',
    footerDisplay: result.footer === 'table-footer-group',
    rowDisplay: result.row === 'table-row',
    cellDisplay: result.head === 'table-cell' && result.cell === 'table-cell',
  });
}
