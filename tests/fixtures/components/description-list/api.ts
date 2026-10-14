import type {
  TpDescriptionList,
  TpDescriptionListItem,
} from '../../../../src/components/description-list/index.js';

/** Contract checks for CL Description list q1–q7; run through Chrome DevTools MCP evaluation. */
export async function verifyDescriptionLists() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  const settle = async (list: TpDescriptionList) => {
    for (let n = 0; n < 3; n++) {
      await list.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await frame();
    }
  };
  const part = (list: TpDescriptionList, name: string) =>
    list.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`);
  const pairOf = (item: Element) =>
    item.assignedSlot?.closest<HTMLElement>('[part~="description-list-item"]') ?? null;
  const overflowed = (item: Element) => pairOf(item)?.hasAttribute('data-overflow') ?? false;
  const visible = (element: Element) =>
    element.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });
  // Items render as their description (display: contents); their pair carries the box.
  const shown = (element: Element) =>
    visible(element.localName === 'tp-description-list-item' ? pairOf(element)! : element);
  const root = document.createElement('section');
  document.querySelector('main')!.append(root);
  const make = async (markup: string) => {
    root.innerHTML = markup;
    const list = root.querySelector<TpDescriptionList>('tp-description-list')!;
    await settle(list);
    return list;
  };
  const items = (labels: string[]) =>
    labels
      .map(
        (label) =>
          `<tp-description-list-item label="${label}">${label} value</tp-description-list-item>`,
      )
      .join('');

  // q1: one native dl with a term and a description per Item, in document order.
  let list = await make(`<tp-description-list>
    <tp-description-list-item label="Plot">B-14</tp-description-list-item>
    <tp-description-list-item label="Size">3 × 4 m</tp-description-list-item>
  </tp-description-list>`);
  const dl = part(list, 'description-list')!;
  assert(dl.localName === 'dl', 'q1 the list is a native dl');
  const pairs = [...dl.children];
  assert(
    pairs.length === 2 &&
      pairs.every(
        (pair) =>
          pair.localName === 'div' &&
          pair.children[0]?.localName === 'dt' &&
          pair.children[1]?.localName === 'dd',
      ),
    'q1 each Item is a div holding a dt and a dd directly inside the dl',
  );
  const [first, second] = list.querySelectorAll<TpDescriptionListItem>('tp-description-list-item');
  assert(
    pairs[0]!.querySelector('dt')!.textContent!.trim() === 'Plot' &&
      first!.assignedSlot?.parentElement === pairs[0]!.querySelector('dd'),
    'q1 the label is the term and the Item is its description',
  );
  second!.label = 'Plot size';
  await settle(list);
  assert(
    pairs[1]!.querySelector('dt')!.textContent!.trim() === 'Plot size',
    'q1 a label change updates the term',
  );
  assert(list.items.length === 2 && list.items[0] === first, 'q1 Items keep document order');

  // q1: stray children are not presented and produce one diagnostic.
  const diagnostics: string[] = [];
  root.addEventListener('tp-diagnostic', (event) =>
    diagnostics.push((event as CustomEvent<{ code: string }>).detail.code),
  );
  list = await make(
    `<tp-description-list>${items(['A'])}<p id="stray">Stray</p></tp-description-list>`,
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert(
    !root.querySelector('#stray')!.assignedSlot && !shown(root.querySelector('#stray')!),
    'q1 a non-Item child is not presented',
  );
  assert(diagnostics.includes('description-list-child'), 'q1 a non-Item child is diagnosed');

  // q2: the limit split.
  list = await make(
    `<tp-description-list limit="3">${items(['A', 'B', 'C', 'D', 'E', 'F'])}</tp-description-list>`,
  );
  const all = [...list.querySelectorAll('tp-description-list-item')];
  assert(
    all.slice(0, 3).every((item) => !overflowed(item)) &&
      all.slice(3).every((item) => overflowed(item)),
    'q2 Items past the limit are marked as overflow',
  );
  assert(
    all.slice(0, 3).every(shown) && !all.slice(3).some(shown),
    'q2 Items past the limit are hidden while closed',
  );
  assert(
    all.slice(3).every((item) => pairOf(item)!.hasAttribute('data-concealed')) &&
      part(list, 'description-list-viewport')!.getBoundingClientRect().height <
        part(list, 'description-list')!.getBoundingClientRect().height,
    'q2 concealed pairs stay laid out below the clipped Viewport',
  );
  const trigger = part(list, 'description-list-trigger')!;
  assert(
    trigger.localName === 'tp-button' &&
      part(list, 'description-list-viewport')!.nextElementSibling === trigger,
    'q2 the Trigger follows the Items',
  );
  assert(list.hiddenCount === 3, 'q2 hiddenCount counts the Items past the limit');

  // q2: no limit, invalid limits, and few Items show everything without a Trigger.
  for (const limit of [null, '0', '-2', 'many', '6', '9']) {
    list = await make(
      `<tp-description-list${limit === null ? '' : ` limit="${limit}"`}>${items(['A', 'B', 'C', 'D', 'E', 'F'])}</tp-description-list>`,
    );
    assert(
      !part(list, 'description-list-trigger') &&
        !list.hasAttribute('data-limited') &&
        [...list.querySelectorAll('tp-description-list-item')].every(shown),
      `q2 limit ${limit ?? 'unset'} shows every Item without a Trigger`,
    );
  }

  // q2: the split follows membership and limit changes without changing open.
  list = await make(
    `<tp-description-list limit="2">${items(['A', 'B', 'C'])}</tp-description-list>`,
  );
  const added = document.createElement('tp-description-list-item');
  added.setAttribute('label', 'Z');
  list.prepend(added);
  await settle(list);
  assert(
    !overflowed(added) && list.hiddenCount === 2 && !list.open,
    'q2 a prepended Item takes a visible place and pushes one into the Overflow',
  );
  list.querySelectorAll('tp-description-list-item')[3]!.remove();
  list.querySelectorAll('tp-description-list-item')[2]!.remove();
  await settle(list);
  assert(
    !part(list, 'description-list-trigger'),
    'q2 removing Items below the limit removes the Trigger',
  );
  list.open = true;
  const extra = document.createElement('tp-description-list-item');
  extra.setAttribute('label', 'Y');
  list.append(extra);
  await settle(list);
  assert(
    list.open && overflowed(extra) && part(list, 'description-list-trigger'),
    'q2 an Item past the limit brings back the Trigger and keeps the open state',
  );
  list.append(added);
  await settle(list);
  assert(
    list.open && list.items.at(-1) === added && overflowed(added),
    'q2 moving an Item to the end moves it into the Overflow and keeps the open state',
  );
  list.limit = 1;
  await settle(list);
  assert(list.hiddenCount === 2 && list.open, 'q2 changing limit keeps the open state');

  // q3/q7: trigger semantics and messages.
  list = await make(
    `<tp-description-list limit="2">${items(['A', 'B', 'C', 'D'])}</tp-description-list>`,
  );
  const button = list.triggerElement!;
  assert(
    button.localName === 'button' &&
      part(list, 'description-list-trigger')!.getAttribute('variant') === 'link',
    'q3 the Trigger is a link Button',
  );
  assert(
    button.getAttribute('aria-expanded') === 'false' &&
      button.ariaControlsElements?.[0] === part(list, 'description-list-viewport'),
    'q3 the Trigger exposes its expanded state and controls the Viewport',
  );
  const text = () => part(list, 'description-list-trigger-label')!.textContent?.trim();
  assert(text() === 'Show more', 'q7 default show-more text');
  list.open = true;
  await settle(list);
  assert(
    text() === 'Show less' && button.getAttribute('aria-expanded') === 'true',
    'q7 default show-less text while open',
  );
  const counts: unknown[] = [];
  list.messages = {
    showMore: (value) => (counts.push(value), `Show ${value.hidden} more`),
    showLess: 'Fewer details',
  };
  list.open = false;
  await settle(list);
  assert(
    text() === 'Show 2 more' && JSON.stringify(counts.at(-1)) === '{"hidden":2,"total":4}',
    'q7 a function message receives the hidden and total counts',
  );
  list.open = true;
  await settle(list);
  assert(text() === 'Fewer details', 'q7 string messages replace the defaults');

  // q3: activation proposes through the cancelable open-change event.
  list = await make(`<tp-description-list limit="1">${items(['A', 'B'])}</tp-description-list>`);
  const events: { value: boolean; reason: string }[] = [];
  let cancel = true;
  list.addEventListener('tp-open-change', (event) => {
    const detail = (event as CustomEvent<{ value: boolean; reason: string }>).detail;
    events.push({ value: detail.value, reason: detail.reason });
    if (cancel) event.preventDefault();
  });
  list.triggerElement!.click();
  await settle(list);
  assert(
    !list.open && events[0]?.value === true && events[0]?.reason === 'trigger-press',
    'q3 a canceled proposal keeps the list closed',
  );
  cancel = false;
  let callback = 0;
  list.onOpenChange = () => callback++;
  list.triggerElement!.click();
  await settle(list);
  assert(list.open && callback === 1, 'q3 an accepted proposal opens and calls onOpenChange');
  list.disabled = true;
  await settle(list);
  list.triggerElement!.click();
  await settle(list);
  assert(
    list.open && list.triggerElement!.disabled && list.triggerElement!.tabIndex === -1,
    'q3 disabled prevents activation and removes the Trigger from the tab order',
  );

  // q4: default-open, completion and the unnamed Viewport.
  list = await make(
    `<tp-description-list limit="1" default-open>${items(['A', 'B'])}</tp-description-list>`,
  );
  const last = () => list.querySelectorAll('tp-description-list-item')[1]!;
  assert(
    list.open && !pairOf(last())!.hasAttribute('data-concealed'),
    'q4 default-open starts open',
  );
  const region = part(list, 'description-list-viewport')!;
  assert(
    !region.hasAttribute('role') &&
      !region.hasAttribute('hidden') &&
      !region.hasAttribute('aria-labelledby') &&
      !region.ariaLabelledByElements?.length,
    'q4 the Viewport adds no role or name',
  );
  const complete = new Promise<boolean>((resolve) =>
    list.addEventListener(
      'tp-open-change-complete',
      (event) => resolve((event as CustomEvent<{ open: boolean }>).detail.open),
      { once: true },
    ),
  );
  list.open = false;
  assert(
    !pairOf(last())!.hasAttribute('data-concealed'),
    'q4 hidden Items stay shown while closing',
  );
  assert((await complete) === false, 'q4 tp-open-change-complete reports the closed state');
  await settle(list);
  assert(
    pairOf(last())!.hasAttribute('data-concealed'),
    'q4 Items are concealed after the exit completes',
  );

  // q5: hidden until found.
  list = await make(
    `<tp-description-list limit="1" hidden-until-found>${items(['A', 'Lantern'])}</tp-description-list>`,
  );
  const foundPair = pairOf(list.querySelectorAll('tp-description-list-item')[1]!)!;
  assert(foundPair.getAttribute('hidden') === 'until-found', 'q5 hidden Items stay searchable');
  const reasons: string[] = [];
  list.addEventListener('tp-open-change', (event) =>
    reasons.push((event as CustomEvent<{ reason: string }>).detail.reason),
  );
  foundPair.dispatchEvent(new Event('beforematch', { bubbles: true }));
  await settle(list);
  assert(list.open && reasons[0] === 'programmatic', 'q5 a find match opens the list');

  // q6: shared label column including the Overflow, and vertical stacking.
  list = await make(
    `<tp-description-list limit="1" style="inline-size:480px">${items(['A', 'A much longer label'])}</tp-description-list>`,
  );
  const values = [...part(list, 'description-list')!.querySelectorAll('dd')];
  const closedLeft = values[0]!.getBoundingClientRect().left;
  list.open = true;
  await settle(list);
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert(
    values[0]!.getBoundingClientRect().left === closedLeft &&
      values[1]!.getBoundingClientRect().left === closedLeft,
    'q6 hidden Labels share the column, so opening never moves the values',
  );
  list.layout = 'stacked';
  await settle(list);
  const pair = part(list, 'description-list-item')!;
  assert(
    pair.querySelector('dd')!.getBoundingClientRect().top >=
      pair.querySelector('dt')!.getBoundingClientRect().bottom,
    'q6 a stacked layout places the Label above the Value',
  );

  // q6: one stacked Item in an inline list spans both columns; the others keep the column.
  list = await make(`<tp-description-list style="inline-size:480px">
    <tp-description-list-item label="Plot">B-14</tp-description-list-item>
    <tp-description-list-item label="Notes" layout="stacked">Long notes</tp-description-list-item>
  </tp-description-list>`);
  const [inlinePair, stackedPair] = [...part(list, 'description-list')!.children] as HTMLElement[];
  const rect = (pair: HTMLElement, tag: string) => pair.querySelector(tag)!.getBoundingClientRect();
  assert(
    inlinePair!.dataset.layout === 'inline' &&
      stackedPair!.dataset.layout === 'stacked' &&
      rect(inlinePair!, 'dd').left > rect(inlinePair!, 'dt').right &&
      rect(stackedPair!, 'dd').left === rect(stackedPair!, 'dt').left &&
      rect(stackedPair!, 'dd').top >= rect(stackedPair!, 'dt').bottom,
    'q6 an Item layout overrides the list for its pair',
  );

  // q6: horizontal orientation places pairs side by side, wraps, and hidden pairs take no space.
  list = await make(
    `<tp-description-list orientation="horizontal" layout="stacked" limit="2" style="inline-size:480px">${items(['Status', 'Type', 'Owner'])}</tp-description-list>`,
  );
  const row = [...part(list, 'description-list')!.children] as HTMLElement[];
  assert(
    row[1]!.getBoundingClientRect().left > row[0]!.getBoundingClientRect().right &&
      row[1]!.getBoundingClientRect().top === row[0]!.getBoundingClientRect().top,
    'q6 horizontal pairs sit side by side',
  );
  assert(
    getComputedStyle(row[2]!).display === 'none',
    'q6 a concealed horizontal pair takes no space',
  );
  list.open = true;
  await settle(list);
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert(
    getComputedStyle(row[2]!).display !== 'none' &&
      row[2]!.getBoundingClientRect().left > row[1]!.getBoundingClientRect().right,
    'q6 opening adds the hidden pair to the row',
  );
  list.style.inlineSize = '120px';
  await settle(list);
  assert(
    row[1]!.getBoundingClientRect().top > row[0]!.getBoundingClientRect().top,
    'q6 horizontal pairs wrap onto further lines',
  );

  // q8: center alignment.
  list = await make(
    `<tp-description-list align="center" limit="1" style="inline-size:480px">${items(['A', 'A longer label'])}</tp-description-list>`,
  );
  const centered = part(list, 'description-list')!;
  const labelColumnEnd = Math.max(
    ...[...centered.querySelectorAll('dt')].map((dt) => dt.getBoundingClientRect().right),
  );
  const shortLabel = document.createRange();
  shortLabel.selectNodeContents(centered.querySelector('dt')!);
  assert(
    Math.abs(shortLabel.getBoundingClientRect().right - labelColumnEnd) < 1,
    'q8 inline Labels align to the end of the Label column',
  );
  const triggerText = document.createRange();
  triggerText.selectNodeContents(part(list, 'description-list-trigger-label')!);
  assert(
    Math.abs(
      triggerText.getBoundingClientRect().left -
        centered.querySelector('dd')!.getBoundingClientRect().left,
    ) < 1,
    'q8 the Trigger starts at the Value column',
  );
  list.layout = 'stacked';
  await settle(list);
  const stackedLabel = centered.querySelector('dt')!;
  const labelText = document.createRange();
  labelText.selectNodeContents(stackedLabel);
  const listBox = centered.getBoundingClientRect();
  const triggerBox = part(list, 'description-list-trigger')!.getBoundingClientRect();
  const middle = (box: DOMRect) => box.left + box.width / 2;
  assert(
    Math.abs(middle(labelText.getBoundingClientRect()) - middle(listBox)) < 1 &&
      Math.abs(middle(triggerBox) - middle(listBox)) < 1,
    'q8 stacked pairs and the Trigger center',
  );

  // q7: Label and Value colors.
  list = await make(`<tp-description-list>${items(['A'])}</tp-description-list>`);
  const probe = document.createElement('span');
  probe.style.color = 'var(--tp-muted-foreground)';
  document.body.append(probe);
  const muted = getComputedStyle(probe).color;
  probe.style.color = 'var(--tp-foreground)';
  const foreground = getComputedStyle(probe).color;
  probe.remove();
  const shadow = part(list, 'description-list')!;
  assert(
    getComputedStyle(shadow.querySelector('dt')!).color === muted &&
      getComputedStyle(shadow.querySelector('dd')!).color === foreground,
    'q7 Labels are muted and Values use the foreground',
  );

  root.remove();
  return results;
}
