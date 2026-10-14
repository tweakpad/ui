import type { TpOverflowList } from '../../../../src/components/overflow-list/index.js';
import type { ValueChangeDetail } from '../../../../src/foundation/types.js';
import { groupLines } from '../../../../src/foundation/text-split/lines.js';

type ChangeEvent = CustomEvent<ValueChangeDetail<number>>;

/** Contract checks for Foundation §18.24 and CL Overflow list; run through Chrome DevTools MCP. */
export async function verifyOverflowList() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const frame = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const settle = async () => {
    for (let n = 0; n < 3; n++) {
      await frame();
      for (const el of document.querySelectorAll<TpOverflowList>('tp-overflow-list'))
        await el.updateComplete;
    }
  };
  const diagnostics: string[] = [];
  const collect = (event: Event) =>
    diagnostics.push((event as CustomEvent<{ code: string }>).detail.code);
  document.addEventListener('tp-diagnostic', collect);
  const errors: string[] = [];
  // The check that last passed when each error arrived, to locate it.
  const onError = (event: ErrorEvent) =>
    errors.push(`${event.message} after "${results.at(-1) ?? 'setup'}"`);
  window.addEventListener('error', onError);

  // Items of exact widths make the expected partitions computable.
  const item = (label: string, width = 60) =>
    `<span style="display:inline-block;inline-size:${width}px;block-size:20px;background:var(--tp-muted)">${label}</span>`;
  const items = (count: number, width = 60) =>
    Array.from({ length: count }, (_, i) => item(`i${i}`, width)).join('');
  const root = document.createElement('section');
  root.id = 'api-checks';
  document.querySelector('main')!.append(root);
  root.innerHTML = `
    <tp-overflow-list id="o-limit" limit="3">${items(8)}</tp-overflow-list>
    <tp-overflow-list id="o-start" limit="3" collapse-from="start">${items(8)}</tp-overflow-list>
    <tp-overflow-list id="o-none">${items(4)}</tp-overflow-list>
    <div id="o-box" style="inline-size:200px"><tp-overflow-list id="o-fit" max-rows="1">${items(6)}</tp-overflow-list></div>
    <p id="o-after">after</p>
    <div style="inline-size:200px"><tp-overflow-list id="o-fit-start" max-rows="1" collapse-from="start">${items(6)}</tp-overflow-list></div>
    <div style="inline-size:200px"><tp-overflow-list id="o-cap" max-rows="3" limit="4">${items(10)}</tp-overflow-list></div>
    <div style="inline-size:200px"><tp-overflow-list id="o-wide" max-rows="2">${item('wide', 320)}${items(3)}</tp-overflow-list></div>
    <div id="o-hidden-box" style="display:none;inline-size:200px"><tp-overflow-list id="o-hidden" max-rows="1">${items(6)}</tp-overflow-list></div>`;
  await settle();
  const byId = (id: string) => root.querySelector<TpOverflowList>('#' + id)!;
  const list = (el: TpOverflowList) =>
    el.shadowRoot!.querySelector<HTMLElement>('[part~="overflow-list"]')!;
  const shownItems = (el: TpOverflowList) =>
    [...el.children].filter(
      (child) => child.assignedSlot?.getAttribute('name') === 'shown',
    ) as HTMLElement[];
  // The default Count while rendered; it stays in the DOM as fallback content of the count slot.
  const badge = (el: TpOverflowList) => {
    const found = el.shadowRoot!.querySelector<HTMLElement>(
      'slot[name="count"]:not(.pooled) .count-badge',
    );
    return found?.getClientRects().length ? found : null;
  };
  const texts = (el: Element) => [...el.children].map((child) => child.textContent).join('|');
  const rows = (el: TpOverflowList) => {
    const boxes = [...shownItems(el), badge(el) ?? el.querySelector('[slot="count"]')]
      .filter((box): box is HTMLElement => Boolean(box))
      .map((box) => box.getBoundingClientRect())
      .filter((rect) => rect.width > 0)
      .map((rect) => ({ top: rect.top, bottom: rect.bottom }));
    return new Set(groupLines(boxes)).size;
  };

  // Count limit, collapse side and outputs (ovl-limit, ovl-collapse, ovl-outputs).
  const limited = byId('o-limit');
  assert(limited.hiddenCount === 5, 'ovl-limit shows limit items and omits the rest');
  assert(
    shownItems(limited)
      .map((el) => el.textContent)
      .join() === 'i0,i1,i2',
    'ovl-collapse end keeps the leading items',
  );
  assert(
    limited.hiddenItems.map((el) => el.textContent).join() === 'i3,i4,i5,i6,i7',
    'ovl-outputs hiddenItems lists the omitted items in document order',
  );
  assert(limited.hasAttribute('data-overflowing'), 'ovl-outputs data-overflowing while omitting');
  const count = badge(limited)!;
  assert(
    count.localName === 'tp-badge' && count.getAttribute('variant') === 'secondary',
    'ovl-count default Count is a secondary Badge',
  );
  assert(texts(count) === '+5|5 more', 'ovl-count presents +N and the accessible "N more"');
  assert(
    list(limited).lastElementChild?.matches('slot[name="count"]') ?? false,
    'ovl-collapse end places the Count after the Items',
  );
  const start = byId('o-start');
  assert(
    shownItems(start)
      .map((el) => el.textContent)
      .join() === 'i5,i6,i7' && list(start).firstElementChild?.matches('slot[name="count"]'),
    'ovl-collapse start keeps the trailing items with the Count before them',
  );
  const none = byId('o-none');
  assert(
    none.hiddenCount === 0 && !badge(none) && !none.hasAttribute('data-overflowing'),
    'ovl-edges no limits shows every item without a Count',
  );
  assert(
    limited.hiddenItems.every((el) => !el.assignedSlot && el.getClientRects().length === 0),
    'ovl-omitted count-only omitted items generate no boxes',
  );
  assert(
    limited.hiddenItems.every((el) => el.getAttributeNames().join() === 'style'),
    'ovl-omitted omission leaves item attributes untouched',
  );

  // Limit values (ovl-limit, ovl-invalid).
  limited.limit = 2.7;
  await settle();
  assert(limited.hiddenCount === 6, 'ovl-limit truncates fractions');
  limited.limit = 0;
  await settle();
  assert(limited.hiddenCount === 0, 'ovl-limit below one means no limit');
  limited.setAttribute('limit', 'abc');
  await settle();
  assert(
    limited.hiddenCount === 0 && diagnostics.includes('overflow-list-invalid-limit'),
    'ovl-invalid a limit that is not a number diagnoses and means no limit',
  );
  limited.setAttribute('limit', '3');
  await settle();

  // Membership (ovl-items).
  const events: ChangeEvent[] = [];
  limited.addEventListener('tp-overflow-change', (event) => events.push(event as ChangeEvent));
  limited.insertAdjacentHTML('afterbegin', item('new'));
  await settle();
  assert(
    shownItems(limited)[0]!.textContent === 'new' && limited.hiddenCount === 6,
    'ovl-items an added child repartitions in document order',
  );
  (limited.firstElementChild as HTMLElement).hidden = true;
  await settle();
  assert(
    shownItems(limited)[0]!.textContent === 'i0' && limited.hiddenCount === 5,
    'ovl-items a hidden child is not an item',
  );
  limited.firstElementChild!.remove();
  limited.append(document.createTextNode('stray text'));
  await settle();
  assert(diagnostics.includes('overflow-list-text-content'), 'ovl-items text children diagnose');
  assert(
    events.length === 2 && events.every((event) => !event.cancelable),
    'ovl-outputs one non-cancelable notification per changed partition',
  );
  assert(
    events[0]!.detail.value === 6 &&
      events[0]!.detail.previousValue === 5 &&
      events[0]!.detail.reason === 'layout',
    'ovl-outputs detail carries the count, the previous count and reason layout',
  );

  // Messages (ovl-count).
  limited.messages = {
    count: (hidden, total) => `${hidden}/${total}`,
    countLabel: 'Hidden skills',
  };
  await settle();
  assert(
    texts(badge(limited)!) === '5/8|Hidden skills',
    'ovl-count messages accept functions of hidden and total, or text',
  );

  // Consumer Count (ovl-count, ovl-invalid).
  limited.insertAdjacentHTML(
    'beforeend',
    '<span slot="count" id="o-count">more</span><span slot="count">extra</span>',
  );
  await settle();
  const consumer = limited.querySelector('#o-count')!;
  assert(
    consumer.assignedSlot?.getAttribute('name') === 'count' && !badge(limited),
    'ovl-count a Consumer Count replaces the default Count',
  );
  assert(
    diagnostics.includes('overflow-list-extra-count') &&
      !limited.querySelectorAll('[slot="count"]')[1]!.assignedSlot,
    'ovl-count further count elements are not presented and diagnose',
  );
  limited.limit = null;
  await settle();
  assert(
    !consumer.assignedSlot && consumer.getClientRects().length === 0,
    'ovl-count a Consumer Count is absent while nothing is omitted',
  );

  // Measured fit (ovl-fit): 60px items, 4px gap, 200px rows.
  const fit = byId('o-fit');
  const gap = parseFloat(getComputedStyle(list(fit)).columnGap);
  const countWidth = badge(fit)!.getBoundingClientRect().width;
  const expected = [3, 2, 1, 0].find((n) => n * 60 + n * gap + countWidth <= 200 + 0.01)!;
  assert(gap === 4, 'presentation the list separates items with --tp-space-1');
  assert(
    fit.hiddenCount === 6 - expected && rows(fit) === 1,
    `ovl-fit keeps the most items that fit one row beside the Count (${expected})`,
  );
  const startFit = byId('o-fit-start');
  assert(
    startFit.hiddenCount === 6 - expected &&
      shownItems(startFit).at(-1)!.textContent === 'i5' &&
      rows(startFit) === 1,
    'ovl-fit from the start keeps the trailing items that fit',
  );
  const cap = byId('o-cap');
  assert(cap.hiddenCount === 6 && rows(cap) <= 3, 'ovl-edges the fit never shows more than limit');
  const wide = byId('o-wide');
  assert(
    rows(wide) <= 2 && shownItems(wide)[0]!.textContent === 'wide',
    'ovl-fit an item wider than a row takes a row of its own',
  );
  const omittedInPool = fit.hiddenItems.every(
    (el) =>
      el.assignedSlot?.getAttribute('name') === 'omitted' &&
      el.assignedSlot.closest('[inert][aria-hidden="true"]'),
  );
  assert(
    omittedInPool,
    'ovl-omitted measured omitted items are inert and hidden from assistive technology',
  );

  // Refit on size changes, no stale block size, no loop errors (ovl-refit).
  const boxElement = root.querySelector<HTMLElement>('#o-box')!;
  const after = root.querySelector<HTMLElement>('#o-after')!;
  const shifts: number[] = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { value: number })[])
      shifts.push(entry.value);
  });
  observer.observe({ type: 'layout-shift' });
  let violations = 0;
  let afterMoves = 0;
  let lastAfter = after.getBoundingClientRect().top;
  let lastRows = rows(fit);
  for (let width = 600; width >= 0; width -= 20) {
    boxElement.style.inlineSize = `${width}px`;
    await settle();
    if (rows(fit) > 1 && fit.hiddenCount < 6) violations += 1;
    const top = after.getBoundingClientRect().top;
    if (Math.abs(top - lastAfter) > 0.5 && rows(fit) === lastRows) afterMoves += 1;
    lastAfter = top;
    lastRows = rows(fit);
  }
  assert(violations === 0, 'ovl-fit rows never exceed max-rows across a 600 → 0 px sweep');
  assert(fit.hiddenCount === 6 && badge(fit), 'ovl-fit the Count shows alone at zero width');
  assert(afterMoves === 0, 'ovl-refit following content moves only when the fitted rows change');
  boxElement.style.inlineSize = '200px';
  await settle();
  observer.disconnect();

  // Reconnection and unrendered roots (ovl-lifecycle).
  const reconnect: ChangeEvent[] = [];
  fit.addEventListener('tp-overflow-change', (event) => reconnect.push(event as ChangeEvent));
  const host = fit.parentElement!;
  fit.remove();
  host.style.inlineSize = '140px';
  host.append(fit);
  await settle();
  assert(
    reconnect.at(-1)?.detail.reason === 'initial' && rows(fit) === 1,
    'ovl-lifecycle reconnection refits and announces an initial partition',
  );
  const hidden = byId('o-hidden');
  const hiddenEvents: ChangeEvent[] = [];
  hidden.addEventListener('tp-overflow-change', (event) => hiddenEvents.push(event as ChangeEvent));
  await settle();
  assert(hiddenEvents.length === 0, 'ovl-lifecycle an unrendered Root neither fits nor notifies');
  root.querySelector<HTMLElement>('#o-hidden-box')!.style.display = 'block';
  await settle();
  assert(
    hiddenEvents.length === 1 && hiddenEvents[0]!.detail.reason === 'initial' && rows(hidden) === 1,
    'ovl-lifecycle a Root fits and notifies once it renders',
  );

  // Diagnostics for items that cannot be measured (ovl-invalid).
  const odd = document.createElement('tp-overflow-list') as TpOverflowList;
  odd.maxRows = 1;
  odd.innerHTML = `<div style="display:contents">${item('c')}</div>${item('g').replace('style="', 'style="flex-grow:1;')}`;
  host.append(odd);
  await settle();
  assert(
    diagnostics.includes('overflow-list-contents-item') &&
      diagnostics.includes('overflow-list-growing-item'),
    'ovl-invalid items without a box or that grow diagnose',
  );
  odd.maxRows = 0;
  await settle();
  assert(
    diagnostics.includes('overflow-list-invalid-max-rows'),
    'ovl-invalid max-rows below one diagnoses',
  );
  odd.remove();

  assert(errors.length === 0, `no window errors (${errors.join('; ')})`);
  document.removeEventListener('tp-diagnostic', collect);
  window.removeEventListener('error', onError);
  return { results, shifts };
}
