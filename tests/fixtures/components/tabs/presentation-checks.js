/* global document, requestAnimationFrame, getComputedStyle */
// Public API and geometry assertions executed through Chrome DevTools MCP.
export async function run(api) {
  const results = [];
  const settle = async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  };
  const check = (name, passed, detail) => results.push({ name, passed: Boolean(passed), detail });
  const root = document.querySelector('#basic'),
    main = document.querySelector('main');
  root.setValue('activity');
  await settle();
  const selected = root.querySelector('[aria-selected=true]'),
    indicator = root.querySelector('[slot=indicator]');
  const aligned = (name) => {
    const a = selected.getBoundingClientRect(),
      b = indicator.getBoundingClientRect();
    const deltas = [b.x - a.x, b.y - a.y, b.width - a.width, b.height - a.height];
    check(
      name,
      deltas.every((n) => Math.abs(n) < 1),
      deltas,
    );
  };
  aligned('initial indicator');
  main.dir = 'rtl';
  await settle();
  aligned('inherited RTL update');
  main.removeAttribute('dir');
  await settle();
  root.style.transform = 'scale(.8)';
  await settle();
  aligned('scaled ancestor');
  root.style.transform = 'rotate(9deg)';
  await settle();
  aligned('rotated ancestor');
  root.style.transform = '';
  const first = root.querySelector('[slot=tab]'),
    original = first.textContent;
  first.textContent = 'A much longer preceding tab';
  await settle();
  aligned('preceding tab label grows');
  first.textContent = original;
  root.hidden = true;
  await settle();
  check('hidden root clears indicator', indicator.hidden);
  root.hidden = false;
  await settle();
  aligned('hidden root revealed');
  const narrow = document.querySelector('#narrow'),
    list = narrow.shadowRoot.querySelector('.list');
  narrow.setValue('c');
  await settle();
  list.scrollLeft = list.scrollWidth;
  await settle();
  const nr = narrow.querySelector('[aria-selected=true]').getBoundingClientRect(),
    ni = narrow.querySelector('[slot=indicator]').getBoundingClientRect();
  check('scrolled indicator', Math.abs(nr.x - ni.x) < 1 && Math.abs(nr.width - ni.width) < 1);
  const focused = document.activeElement,
    value = root.value;
  const names = ['tabs', 'tabs-list', 'tabs-trigger', 'tabs-indicator', 'tabs-content'];
  const parts = names.map(
    (n) => root.shadowRoot.querySelector(`[part~="${n}"]`) || root.querySelector(`[part~="${n}"]`),
  );
  const custom = { ...api.defaultPresentationDictionary };
  for (const name of names)
    custom[name] = [
      {
        declarations: {
          outline: '3px solid rgb(10, 90, 190)',
          'border-radius': '11px',
          'letter-spacing': '1px',
        },
      },
    ];
  api.setPresentationDictionary(custom);
  await settle();
  check(
    'all five dictionary parts replaced',
    parts.every(
      (p) =>
        getComputedStyle(p).outlineWidth === '3px' && getComputedStyle(p).borderRadius === '11px',
    ),
  );
  root.partPresentation = Object.fromEntries(
    names.map((n) => [n, { classHook: 'consumer-part', styleHook: { 'outline-width': '5px' } }]),
  );
  await settle();
  check(
    'per-instance hooks cover every part',
    parts.every(
      (p) => getComputedStyle(p).outlineWidth === '5px' && p.classList.contains('consumer-part'),
    ),
  );
  root.partPresentation = {};
  api.setPresentationDictionary({});
  await settle();
  const native = document.createElement('button');
  native.style.appearance = 'none';
  document.body.append(native);
  check(
    'missing dictionary keys do not retain paint',
    getComputedStyle(selected).backgroundColor === getComputedStyle(native).backgroundColor &&
      getComputedStyle(selected).borderRadius === '0px' &&
      getComputedStyle(selected).boxShadow === 'none' &&
      ['flex', 'inline-flex'].includes(getComputedStyle(selected).display),
  );
  native.remove();
  api.setPresentationDictionary(api.defaultPresentationDictionary);
  await settle();
  root.style.setProperty('--tp-muted', 'rgb(20, 30, 40)');
  await settle();
  check(
    'scoped token override',
    getComputedStyle(root.shadowRoot.querySelector('.list')).backgroundColor === 'rgb(20, 30, 40)',
  );
  root.style.removeProperty('--tp-muted');
  check(
    'presentation changes preserve node state and focus',
    root.value === value &&
      root.querySelector('[aria-selected=true]') === selected &&
      document.activeElement === focused,
  );
  root.setValue('overview');
  narrow.setValue('a');
  list.scrollLeft = 0;
  await settle();
  return results;
}
