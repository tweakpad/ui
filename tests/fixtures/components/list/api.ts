/** Contract checks for CL List (q1–q4); run through Chrome DevTools MCP evaluation. */
export async function verifyList() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 60));
  const root = document.createElement('section');
  document.querySelector('main')!.append(root);
  root.innerHTML = `
    <tp-list id="t-list" aria-label="Teams">
      <tp-list-item id="t-a">Design</tp-list-item>
      <tp-list-item id="t-b" role="article">Research</tp-list-item>
      <tp-separator id="t-sep"></tp-separator>
      <tp-list-item id="t-c">Support</tp-list-item>
    </tp-list>
    <tp-list id="t-authored" role="menu" aria-label="Authored role"><tp-list-item id="t-d">One</tp-list-item></tp-list>
    <tp-list-item id="t-alone">Alone</tp-list-item>`;
  await settle();
  const byId = (id: string) => root.querySelector<HTMLElement>('#' + id)!;
  const list = byId('t-list');
  const [design, research] = [byId('t-a'), byId('t-b')];

  assert(list.getAttribute('role') === 'list', 'q4 the List host has the list role');
  assert(list.getAttribute('aria-label') === 'Teams', 'q4 the List is named by aria-label');
  assert(byId('t-a').getAttribute('role') === 'listitem', 'q4 a direct item is a list item');
  assert(byId('t-b').getAttribute('role') === 'article', 'q4 an authored item role is preserved');
  assert(!byId('t-alone').hasAttribute('role'), 'q4 a standalone item has no list item role');
  assert(
    byId('t-authored').getAttribute('role') === 'menu',
    'q4 an authored host role is preserved',
  );

  assert(list.shadowRoot!.querySelector('[part~="list"]'), 'parts: the List exposes list');
  assert(
    byId('t-a').shadowRoot!.querySelector('[part~="list-item"]') &&
      byId('t-a').shadowRoot!.querySelector('[part~="list-item-content"]'),
    'parts: the item exposes list-item and its sub-parts',
  );
  const separator = document.querySelector<HTMLElement>('#files tp-list-separator')!;
  assert(
    separator.shadowRoot!.querySelector('[part~="list-separator"]'),
    'parts: tp-list-separator exposes list-separator',
  );
  assert(
    parseFloat(getComputedStyle(byId('t-sep')).marginBlockStart) > 0,
    'parts: a plain tp-separator member takes the list-separator presentation',
  );

  const added = document.createElement('tp-list-item');
  added.textContent = 'Operations';
  list.append(added);
  await settle();
  assert(added.getAttribute('role') === 'listitem', 'q4 an added item becomes a list item');
  const moved = byId('t-c');
  root.append(moved);
  await settle();
  assert(!moved.hasAttribute('role'), 'q4 an item moved out of the List loses the list item role');
  list.remove();
  await settle();
  assert(
    !list.hasAttribute('role') && !design.hasAttribute('role'),
    'q4 a removed List releases the roles it set',
  );
  assert(research.getAttribute('role') === 'article', 'q4 release keeps authored roles');

  const grid = document.createElement('tp-list') as HTMLElement & { partPresentation?: unknown };
  grid.innerHTML = '<tp-list-item>A</tp-list-item><tp-list-item>B</tp-list-item>';
  root.append(grid);
  grid.partPresentation = { list: { styleHook: { display: 'grid' } } };
  await settle();
  assert(
    getComputedStyle(grid.shadowRoot!.querySelector('[part~="list"]')!).display === 'grid',
    'customization: partPresentation reaches the list part',
  );
  root.remove();
  return results;
}
