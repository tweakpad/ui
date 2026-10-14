import type { TpPopover } from '../../../../src/components/popover/popover.js';
import type {
  TpTableOfContents,
  TpTableOfContentsItem,
} from '../../../../src/components/table-of-contents/index.js';

/** Compact variant checks for CL §20.6; run on `?page=end` through Chrome DevTools MCP. */
export async function verifyTableOfContents() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const frames = async (count = 3) => {
    for (let index = 0; index < count; index++)
      await new Promise((resolve) => requestAnimationFrame(resolve));
  };
  const toc = document.getElementById('toc') as TpTableOfContents;
  const root = toc.shadowRoot!;
  const popover = () => root.querySelector<TpPopover>('tp-popover')!;
  const marks = () =>
    [...root.querySelectorAll('[part~="mark"]')]
      .map((mark) =>
        mark.hasAttribute('data-current') ? 'C' : mark.hasAttribute('data-active') ? 'A' : '-',
      )
      .join('');
  const rect = (element: Element) => {
    const box = element.getBoundingClientRect();
    return [box.left, box.top, box.width, box.height].map(Math.round).join(',');
  };
  const goTo = async (id: string) => {
    toc.navigate(id);
    await wait(700);
  };

  // Properties and anatomy.
  const fresh = document.createElement('tp-table-of-contents');
  assert(fresh.variant === 'list' && fresh.side === 'inline-start', 'defaults list, inline-start');
  assert(fresh.openDelay === 300 && fresh.closeDelay === 0, 'delays default to 300 and 0');
  assert(toc.getAttribute('variant') === 'compact', 'variant reflects');
  const nav = root.querySelector('nav')!;
  const trigger = root.querySelector('tp-button')!;
  assert(nav.getAttribute('aria-label') === 'On this page', 'compact landmark named by title');
  assert(
    trigger.shadowRoot?.querySelector('button')?.getAttribute('aria-label') === 'On this page',
    'trigger named by title',
  );
  assert(
    root.querySelector('[part~="marks"]')?.getAttribute('aria-hidden') === 'true',
    'marks hidden',
  );
  assert(root.querySelectorAll('[part~="mark"]').length === 6, 'one mark per top-level item');

  // States follow the spy; the strip never changes size.
  const strip = rect(toc);
  await goTo('welcome');
  assert(marks() === 'C-----', `welcome current: ${marks()}`);
  await goTo('respirators');
  assert(marks()[2] === 'C', `a subsection highlights its top-level mark: ${marks()}`);
  await goTo('kilns');
  assert(marks()[3] === 'C', `kilns current: ${marks()}`);
  assert(rect(toc) === strip, 'strip size unchanged by state changes');

  // Dynamic membership and depth.
  const hours = toc.querySelector<TpTableOfContentsItem>('[href="#hours"]')!;
  hours.depth = 1;
  await frames();
  assert(root.querySelectorAll('[part~="mark"]').length === 7, 'depth change adds a mark');
  hours.depth = 2;
  await frames();
  assert(root.querySelectorAll('[part~="mark"]').length === 6, 'depth change removes a mark');
  const extra = document.createElement('tp-table-of-contents-item');
  extra.href = '#cleanup';
  extra.textContent = 'Duplicate';
  toc.append(extra);
  await frames();
  assert(root.querySelectorAll('[part~="mark"]').length === 7, 'added item adds a mark');
  extra.remove();
  await frames();
  assert(root.querySelectorAll('[part~="mark"]').length === 6, 'removed item removes its mark');

  // The card covers the strip from its outer edge, centered, and holds the list.
  popover().setOpen(true);
  await wait(500);
  const card = popover().shadowRoot!.querySelector('.popup')!.getBoundingClientRect();
  const box = toc.getBoundingClientRect();
  assert(Math.abs(card.right - box.right) < 1, 'card aligned with the outer edge');
  assert(Math.abs(card.top + card.height / 2 - (box.top + box.height / 2)) < 2, 'card centered');
  const indicator = root.querySelector<HTMLElement>('[part~="indicator"]')!;
  assert(!indicator.hidden && indicator.getBoundingClientRect().height > 0, 'indicator placed');
  assert(
    toc.querySelector('[data-current]')?.linkElement?.getAttribute('aria-current') === 'location',
    'current link carries aria-current',
  );
  popover().setOpen(false);
  await wait(400);
  assert(!popover().open, 'card closes');

  // Token override reaches the current mark.
  toc.style.setProperty('--tp-table-of-contents-indicator', 'rgb(255, 0, 0)');
  await wait(400); // after the color fade
  const current = root.querySelector('[part~="mark"][data-current]')!;
  assert(getComputedStyle(current).color === 'rgb(255, 0, 0)', 'indicator token colors the mark');
  toc.style.removeProperty('--tp-table-of-contents-indicator');

  // Runtime variant switch keeps the value and the indicator.
  const value = toc.value;
  toc.variant = 'list';
  await wait(200);
  const listIndicator = root.querySelector<HTMLElement>('[part~="indicator"]')!;
  assert(!root.querySelector('tp-popover') && toc.value === value, 'list keeps the value');
  assert(
    !listIndicator.hidden && listIndicator.getBoundingClientRect().height > 0,
    'list indicator',
  );
  toc.variant = 'compact';
  await wait(200);
  assert(toc.value === value && marks().includes('C'), 'compact again keeps the value');

  return results;
}
