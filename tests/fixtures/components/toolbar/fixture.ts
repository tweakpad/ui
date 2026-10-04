const built = new URL(location.href).searchParams.has('package');
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.prepend(stylesheet);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const root = document.getElementById('toolbar')!;
await Promise.all(
  [...root.querySelectorAll('*')].map(
    (element) => (element as Element & { updateComplete?: Promise<boolean> }).updateComplete,
  ),
);
const toolbar = new api.ToolbarController(root);
const items = Object.fromEntries(
  ['save', 'undo', 'redo', 'search', 'help'].map((id) => [
    id,
    toolbar.registerItem(document.getElementById(id)!, {
      kind: id === 'search' ? 'input' : id === 'help' ? 'link' : 'button',
    }),
  ]),
);
const group = toolbar.registerGroup(
  document.getElementById('group')!.shadowRoot!.querySelector<HTMLElement>('[part~=button-group]')!,
);
const separator = toolbar.registerSeparator(document.getElementById('separator')!);
let actions = 0;
root.addEventListener('click', (event) => {
  const button = event
    .composedPath()
    .find((node) => (node as Element).localName === 'tp-button') as HTMLElement | undefined;
  if (button)
    document.getElementById('events')!.textContent = `${++actions}: ${button.textContent}`;
});
Object.assign(window, {
  toolbarFixture: { api, root, toolbar, items, group, separator, built, actions: () => actions },
});
