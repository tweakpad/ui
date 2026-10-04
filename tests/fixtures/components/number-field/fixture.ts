const built = new URL(location.href).searchParams.has('package');
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.prepend(stylesheet);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
const { plusIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/plus.js' : '/src/icons/plus.ts'
);
const { minusIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/minus.js' : '/src/icons/minus.ts'
);
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await Promise.all(
  [...document.querySelectorAll('*')].map(
    (element) => (element as Element & { updateComplete?: Promise<boolean> }).updateComplete,
  ),
);
const root = document.getElementById('number')!;
const input = document.getElementById('editor')!;
Object.assign(document.querySelector('#increment tp-icon')!, { icon: plusIcon });
Object.assign(document.querySelector('#decrement tp-icon')!, { icon: minusIcon });
const field = document.getElementById('field')!;
const scrubElement = document.createElement('span');
scrubElement.textContent = 'Drag to adjust quantity';
root.prepend(scrubElement);
const cursorElement = document.createElement('span');
const cursorIcon = document.createElement('tp-icon');
Object.assign(cursorIcon, { icon: plusIcon });
cursorElement.append(cursorIcon);
scrubElement.append(cursorElement);
const changes: unknown[] = [],
  commits: unknown[] = [];
root.addEventListener('tp-value-change', (event) => changes.push((event as CustomEvent).detail));
root.addEventListener('tp-value-commit', (event) => commits.push((event as CustomEvent).detail));
const number = new api.NumberFieldController(root, input, {
  defaultValue: 3,
  minimum: 0,
  maximum: 20,
});
const scrub = number.registerScrubArea(scrubElement);
const cursor = scrub.registerCursor(cursorElement);
const group = number.registerGroup(
  document.getElementById('group')!.shadowRoot!.querySelector('[part~=input-group]'),
);
const decrement = number.registerDecrement(document.getElementById('decrement')!);
const increment = number.registerIncrement(document.getElementById('increment')!);
Object.assign(window, {
  numberFixture: {
    api,
    root,
    input,
    field,
    number,
    group,
    increment,
    decrement,
    changes,
    commits,
    built,
    scrub,
    cursor,
    scrubElement,
    cursorElement,
  },
});
