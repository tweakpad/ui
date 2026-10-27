const built = new URL(location.href).searchParams.has('package');
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.prepend(stylesheet);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const settle = (host: HTMLElement) =>
  Promise.all(
    [...host.querySelectorAll('*')].map(
      (element) => (element as Element & { updateComplete?: Promise<boolean> }).updateComplete,
    ),
  );
const root = document.getElementById('toolbar')!;
const dialogRoot = document.getElementById('dialog-toolbar')!;
const pressRoot = document.getElementById('press-toolbar')!;
await Promise.all([settle(root), settle(dialogRoot), settle(pressRoot)]);
const toolbar = new api.ToolbarController(root);
// The Toggles are composite items; the Page view group is left unregistered, as consumers do.
const items = Object.fromEntries(
  ['save', 'undo', 'redo', 'ruler', 'grid', 'search', 'help'].map((id) => [
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
  const control = event
    .composedPath()
    .find((node) => ['tp-button', 'tp-toggle'].includes((node as Element).localName)) as
    HTMLElement | undefined;
  if (control)
    document.getElementById('events')!.textContent = `${++actions}: ${control.textContent}`;
});

/** The id of the innermost element with one on an event's composed path. */
const pathId = (event: Event) =>
  (event.composedPath().find((node) => (node as Element).id) as Element | undefined)?.id ?? null;
const keyLog: { key: string; target: string | null; defaultPrevented: boolean }[] = [];
document.addEventListener('keydown', (event) =>
  keyLog.push({ key: event.key, target: pathId(event), defaultPrevented: event.defaultPrevented }),
);
const valueLog: { target: string | null; value: unknown; reason: string }[] = [];
document.addEventListener('tp-value-change', (event) => {
  const { value, reason } = (event as CustomEvent<{ value: unknown; reason: string }>).detail;
  valueLog.push({ target: pathId(event), value, reason });
});

// A second controller inside a Dialog: its disabled items stay focusable.
const review = document.getElementById('review') as HTMLElement & { open: boolean };
const dialogToolbar = new api.ToolbarController(dialogRoot);
const dialogItems = Object.fromEntries(
  ['dialog-comment', 'dialog-approve', 'dialog-pin'].map((id) => [
    id,
    dialogToolbar.registerItem(document.getElementById(id)!, { kind: 'button' }),
  ]),
);
const openLog: { open: boolean; reason: string; cancelled: boolean }[] = [];
review.addEventListener('tp-open-change', (event) => {
  const { value, reason, cancelled } = (
    event as CustomEvent<{ value: boolean; reason: string; cancelled: boolean }>
  ).detail;
  openLog.push({ open: value, reason, cancelled });
});
review.addEventListener('tp-open-change-complete', () => dialogToolbar.refresh());

// A third controller asks to keep the editing focus on press (`uwg-te-tb-req-press`); Note opts
// out.
const pressOptions = { orientation: 'horizontal', preserveFocusOnPress: true };
const pressToolbar = new api.ToolbarController(pressRoot, pressOptions);
const pressItems = Object.fromEntries(
  ['press-highlight', 'press-strike', 'press-note'].map((id) => [
    id,
    pressToolbar.registerItem(document.getElementById(id)!, {
      kind: 'button',
      ...(id === 'press-note' ? { preserveFocusOnPress: false } : {}),
    }),
  ]),
);
const pressActivations: Record<string, number> = {};
pressRoot.addEventListener('click', (event) => {
  const id = pathId(event);
  if (id?.startsWith('press-')) pressActivations[id] = (pressActivations[id] ?? 0) + 1;
});
/** Focuses the paragraph and selects the first occurrence of `words` in its text. */
const selectPressText = (words = 'slate water') => {
  const paragraph = document.getElementById('press-text')!;
  const text = paragraph.firstChild as Text;
  const start = text.data.indexOf(words);
  paragraph.focus();
  const range = document.createRange();
  range.setStart(text, start);
  range.setEnd(text, start + words.length);
  const selection = getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection.toString();
};

// A contextual toolbar over the paragraph's selection (V-595), source mode only: shown while the
// selection is not collapsed, out of the Tab sequence, Alt+F10 moves focus in, and Escape, Tab,
// Shift+Tab and hiding return focus to the paragraph with its selection.
const contextualText = document.getElementById('contextual-text')!;
const contextualSurface = document.getElementById('contextual')!;
let contextualRange: Range | null = null;
const contextualPresses: Record<string, number> = {};
const contextualLog: string[] = [];
let contextual: {
  shown: boolean;
  show(anchor?: unknown): void;
  hide(): void;
  focus(): boolean;
  reposition(): Promise<void>;
  toolbar: { registerItem(element: HTMLElement, options: object): unknown };
} | null = null;
if (!built) {
  const { ContextualToolbarController } = await import('/src/foundation/index.ts');
  await settle(contextualSurface);
  const range = () => contextualRange;
  const anchor = {
    getBoundingRectangle: () =>
      range()?.getBoundingClientRect() ?? contextualText.getBoundingClientRect(),
    getClientRectangles: () => [...(range()?.getClientRects() ?? [])],
    contextElement: contextualText,
  };
  contextual = new ContextualToolbarController(contextualSurface, {
    layer: 'top',
    placement: 'top',
    sequentialFocus: false,
    preserveFocusOnPress: true,
    finalFocus: () => {
      contextualText.focus({ preventScroll: true });
      if (contextualRange) {
        const selection = getSelection()!;
        selection.removeAllRanges();
        selection.addRange(contextualRange.cloneRange());
      }
      contextualLog.push('final-focus');
      return false;
    },
  }) as unknown as typeof contextual;
  for (const id of ['ctx-bold', 'ctx-link', 'ctx-note'])
    contextual!.toolbar.registerItem(document.getElementById(id)!, { kind: 'button' });
  document.addEventListener('selectionchange', () => {
    const selection = getSelection();
    const current = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    if (current && contextualText.contains(current.commonAncestorContainer)) {
      if (current.collapsed) {
        contextualRange = null;
        if (contextual!.shown) contextualLog.push('hide');
        contextual!.hide();
      } else {
        contextualRange = current.cloneRange();
        if (!contextual!.shown) contextualLog.push('show');
        contextual!.show(anchor);
        void contextual!.reposition();
      }
    }
  });
  contextualText.addEventListener('keydown', (event) => {
    if (event.key === 'F10' && event.altKey) {
      event.preventDefault();
      contextualLog.push(`alt-f10:${contextual!.focus()}`);
    }
  });
  contextualSurface.addEventListener('click', (event) => {
    const id = pathId(event);
    if (id?.startsWith('ctx-')) contextualPresses[id] = (contextualPresses[id] ?? 0) + 1;
  });
}

Object.assign(window, {
  toolbarFixture: {
    api,
    root,
    toolbar,
    items,
    group,
    separator,
    built,
    actions: () => actions,
    keyLog,
    valueLog,
    clearLogs: () => {
      keyLog.length = 0;
      valueLog.length = 0;
      openLog.length = 0;
    },
    dialog: { review, toolbar: dialogToolbar, items: dialogItems, openLog },
    contextual: {
      controller: () => contextual,
      text: contextualText,
      surface: contextualSurface,
      presses: () => ({ ...contextualPresses }),
      log: contextualLog,
      range: () => contextualRange,
    },
    press: {
      toolbar: pressToolbar,
      items: pressItems,
      options: pressOptions,
      activations: () => ({ ...pressActivations }),
      select: selectPressText,
    },
  },
});
