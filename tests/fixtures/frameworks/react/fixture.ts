// React 19 bindings, rendered under StrictMode. `?package` loads the built `@tweakpad/ui/react`.
import {
  createElement as h,
  Fragment,
  StrictMode,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type * as Bindings from '../../../../src/react/index.js';
import { laneRows, sameValue, type LaneChild, type LaneRow } from '../lanes.js';
import { carries, eventProp, propRows, type PropRow } from '../props.js';
import type { TpButton } from '../../../../src/components/button/button.js';
import type { TpCheckbox } from '../../../../src/components/checkbox/checkbox.js';
import type { TpDialog } from '../../../../src/components/dialog/dialog.js';
import type { TpInput } from '../../../../src/components/input/input.js';
import type { TpMenu } from '../../../../src/components/menu/menu.js';
import type { TpSelect } from '../../../../src/components/select/select.js';

const built = new URL(location.href).searchParams.has('package');
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(style);
const bindings = (await import(
  /* @vite-ignore */ built ? '/dist/react/index.js' : '/src/react/index.ts'
)) as typeof Bindings;
const { Button, Checkbox, Dialog, Input, Menu, MenuItem, Select } = bindings;
const { boldIcon } = (await import(
  /* @vite-ignore */ built ? '/dist/icons/text-formatting.js' : '/src/icons/text-formatting.ts'
)) as typeof import('../../../../src/icons/text-formatting.js');

interface Check {
  check: string;
  passed: boolean;
  detail?: unknown;
}
interface Result {
  scenario: string;
  passed: boolean;
  checks: Check[];
}

/** Diagnostics and React or element errors observed while a scenario runs. */
const problems: string[] = [];
addEventListener('tp-diagnostic', (event) => {
  const detail = (event as CustomEvent<{ code: string; message: string }>).detail;
  problems.push(`tp-diagnostic ${detail.code}: ${detail.message}`);
});
addEventListener('error', (event) => problems.push(`error: ${event.message}`));
for (const level of ['error', 'warn'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    const text = args.map(String).join(' ');
    // The dev server's own notice of Lit's dev mode.
    if (!text.includes('Lit is in dev mode')) problems.push(`console.${level}: ${text}`);
    original(...args);
  };
}

const stage = document.getElementById('stage')!;
/** Two frames: Lit updates and React's microtask-scheduled renders settle. */
const settle = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

async function mount(node: ReactNode): Promise<{ host: HTMLElement; root: Root }> {
  const host = document.createElement('section');
  stage.append(host);
  const root = createRoot(host);
  flushSync(() => root.render(h(StrictMode, null, node)));
  await settle();
  return { host, root };
}
async function unmount({ host, root }: { host: HTMLElement; root: Root }): Promise<void> {
  flushSync(() => root.unmount());
  host.remove();
  await settle();
}

type Scenario = (check: (name: string, passed: boolean, detail?: unknown) => void) => Promise<void>;

/** Mounts and unmounts `node` three times under StrictMode; no errors may surface. */
async function churn(node: () => ReactElement, check: Parameters<Scenario>[0]): Promise<void> {
  const before = problems.length;
  for (let round = 0; round < 3; round++) await unmount(await mount(node()));
  check(
    'mounts and unmounts 3× under StrictMode without errors',
    problems.length === before,
    problems.slice(before),
  );
}

const fruit = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

const scenarios: Record<string, Scenario> = {
  async button(check) {
    let element: TpButton | null = null;
    let clicks = 0;
    const mounted = await mount(
      h(
        Button,
        {
          ref: (node: TpButton | null) => {
            element = node;
          },
          variant: 'secondary',
          icon: boldIcon,
          className: 'extra',
          onClick: () => clicks++,
        },
        'Save',
      ),
    );
    const el = element as TpButton | null;
    check('defines tp-button on first render', Boolean(customElements.get('tp-button')));
    check(
      'ref is the element instance',
      el?.localName === 'tp-button' && el === mounted.host.firstElementChild,
    );
    check('a string prop is the property', el?.variant === 'secondary');
    check('an object prop is the property', el?.icon === boldIcon);
    check(
      'the object prop rendered (icon in the shadow root)',
      Boolean(el?.shadowRoot?.querySelector('tp-icon')),
    );
    check('className reaches class', el?.classList.contains('extra') === true);
    el?.click();
    check('React onClick receives the click once', clicks === 1, clicks);
    await unmount(mounted);
    await churn(() => h(Button, null, 'Save'), check);
  },

  async checkbox(check) {
    const proposals: boolean[] = [];
    const events: string[] = [];
    function Controlled({ accept }: { accept: boolean }): ReactElement {
      const [checked, setChecked] = useState(false);
      return h(Checkbox, {
        id: accept ? 'accepting' : 'rejecting',
        checked,
        onCheckedChange: (event) => {
          proposals.push(event.detail.value);
          if (accept) setChecked(event.detail.value);
        },
        onTpValueChange: (event) => events.push(`${event.type}:${event.detail.value}`),
      });
    }
    const accepting = await mount(h(Controlled, { accept: true }));
    const box = accepting.host.querySelector<TpCheckbox>('tp-checkbox')!;
    check('controlled: starts unchecked', box.checked === false);
    box.setChecked(true);
    await settle();
    check('the callback prop receives the proposal', proposals.join() === 'true', proposals);
    check(
      'the event prop receives tp-value-change once',
      events.join() === 'tp-value-change:true',
      events,
    );
    check('a late (React state) owner write-back publishes', box.checked === true);
    await unmount(accepting);

    const rejecting = await mount(h(Controlled, { accept: false }));
    const rejected = rejecting.host.querySelector<TpCheckbox>('tp-checkbox')!;
    rejected.setChecked(true);
    await settle();
    check(
      'controlled: an owner that does not write back keeps the value',
      rejected.checked === false,
    );
    await unmount(rejecting);

    const uncontrolled = await mount(h(Checkbox, { defaultChecked: true }));
    const free = uncontrolled.host.querySelector<TpCheckbox>('tp-checkbox')!;
    check('uncontrolled: defaultChecked applies', free.checked === true);
    free.setChecked(false);
    await settle();
    check('uncontrolled: a proposal commits', free.checked === false);
    await unmount(uncontrolled);
    await churn(() => h(Checkbox, { defaultChecked: true }), check);
  },

  async input(check) {
    const proposals: string[] = [];
    function Upper(): ReactElement {
      const [value, setValue] = useState('');
      return h(Input, {
        value,
        placeholder: 'Type',
        onValueChange: (event) => {
          proposals.push(event.detail.value);
          setValue(event.detail.value.toUpperCase());
        },
      });
    }
    const mounted = await mount(h(Upper));
    const input = mounted.host.querySelector<TpInput>('tp-input')!;
    input.setValue('abc');
    await settle();
    check('the callback prop receives the proposal', proposals.join() === 'abc', proposals);
    check('a transforming owner publishes its own value', input.value === 'ABC', input.value);
    await unmount(mounted);
    await churn(() => h(Input, { defaultValue: 'x' }), check);
  },

  async select(check) {
    const values: unknown[] = [];
    const completes: boolean[] = [];
    function Fruit(): ReactElement {
      const [value, setValue] = useState<unknown>('banana');
      return h(Select, {
        items: fruit,
        value,
        label: 'Fruit',
        onValueChange: (event) => {
          values.push(event.detail.value);
          setValue(event.detail.value);
        },
        onTpOpenChangeComplete: (event) => completes.push(event.detail.open),
      });
    }
    const mounted = await mount(h(Fruit));
    const select = mounted.host.querySelector<TpSelect>('tp-select')!;
    check('an array prop is the property', select.items === fruit);
    check(
      'controlled value applies before the first update',
      select.value === 'banana',
      select.value,
    );
    select.setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    check('opening reports tp-open-change-complete', completes.includes(true), completes);
    await unmount(mounted);
    await churn(() => h(Select, { items: fruit, defaultValue: 'apple' }), check);
  },

  async dialog(check) {
    const proposals: boolean[] = [];
    let setLines: (lines: number) => void = () => {};
    function Confirm(): ReactElement {
      const [open, setOpen] = useState(false);
      const [lines, setLineCount] = useState(1);
      setLines = setLineCount;
      return h(
        Dialog,
        {
          open,
          label: 'Rename layer',
          onOpenChange: (event) => {
            proposals.push(event.detail.value);
            setOpen(event.detail.value);
          },
        },
        h(Button, { slot: 'trigger' }, 'Rename'),
        h(
          Fragment,
          null,
          Array.from({ length: lines }, (_, index) => h('p', { key: index }, `Line ${index + 1}`)),
        ),
      );
    }
    const mounted = await mount(h(Confirm));
    const dialog = mounted.host.querySelector<TpDialog>('tp-dialog')!;
    dialog.setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    check('the open proposal reaches the callback prop', proposals.join() === 'true', proposals);
    check('the owner write-back opens the dialog', dialog.open === true);
    const before = problems.length;
    flushSync(() => setLines(3));
    await settle();
    flushSync(() => setLines(1));
    await settle();
    check(
      'children React adds and removes while open stay consistent',
      problems.length === before && dialog.querySelectorAll('p').length === 1,
      { problems: problems.slice(before), paragraphs: dialog.querySelectorAll('p').length },
    );
    dialog.setOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    check('closing through the owner closes', dialog.open === false);
    await unmount(mounted);
    await churn(
      () => h(Dialog, { defaultOpen: true, label: 'Notice' }, h('p', null, 'Body')),
      check,
    );
  },

  async menu(check) {
    const actions: unknown[] = [];
    const itemClicks: string[] = [];
    let setExtra: (extra: boolean) => void = () => {};
    function Actions(): ReactElement {
      const [extra, setShown] = useState(false);
      setExtra = setShown;
      return h(
        Menu,
        { onTpAction: (event) => actions.push(event.detail.value) },
        h(Button, { slot: 'trigger' }, 'Layer'),
        h(
          MenuItem,
          { value: 'duplicate', onClick: () => itemClicks.push('duplicate') },
          'Duplicate',
        ),
        extra ? h(MenuItem, { value: 'lock' }, 'Lock') : null,
        h(MenuItem, { value: 'delete' }, 'Delete'),
      );
    }
    const mounted = await mount(h(Actions));
    const menu = mounted.host.querySelector<TpMenu>('tp-menu')!;
    const before = problems.length;
    flushSync(() => setExtra(true));
    await settle();
    // Projected into the menu's portal: the owner's children, in order, are its items.
    const items = () =>
      (menu as unknown as { ownedChildren: readonly Node[] }).ownedChildren.filter(
        (node): node is HTMLElement & { value: unknown } =>
          (node as Element).localName === 'tp-menu-item',
      );
    const values = items().map((item) => item.value);
    check('a conditional item lands in order', values.join() === 'duplicate,lock,delete', values);
    flushSync(() => setExtra(false));
    await settle();
    check(
      'removing it leaves the rest, in order',
      items()
        .map((item) => item.value)
        .join() === 'duplicate,delete',
      items().map((item) => item.value),
    );
    check(
      'no React or element errors while items change',
      problems.length === before,
      problems.slice(before),
    );
    menu.setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    (items()[0] as unknown as { activate(event?: Event): void }).activate();
    await settle();
    check('tp-action reaches the event prop', actions.join() === 'duplicate', actions);
    check('the item onClick callback prop runs', itemClicks.join() === 'duplicate', itemClicks);
    await unmount(mounted);
    await churn(() => h(Menu, null, h(MenuItem, { value: 'a' }, 'A')), check);
  },
};

async function run(name: string): Promise<Result> {
  const checks: Check[] = [];
  const scenario = scenarios[name];
  if (!scenario) throw new Error(`No scenario ${name}`);
  const before = problems.length;
  try {
    await scenario((check, passed, detail) =>
      checks.push({ check, passed, ...(passed ? {} : { detail }) }),
    );
  } catch (error) {
    checks.push({ check: 'runs without throwing', passed: false, detail: String(error) });
  }
  const unexpected = problems.slice(before);
  if (unexpected.length)
    checks.push({ check: 'no diagnostics or errors', passed: false, detail: unexpected });
  return { scenario: name, passed: checks.every((entry) => entry.passed), checks };
}

/** A visible composition of the pilot bindings, for tool-driven clicks and screenshots. */
function Showcase(): ReactElement {
  const [checked, setChecked] = useState(false);
  const [fruitValue, setFruit] = useState<unknown>('apple');
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const record = (line: string) => setLog((lines) => [line, ...lines].slice(0, 6));
  return h(
    'div',
    { className: 'showcase' },
    h(
      Checkbox,
      {
        id: 'showcase-checkbox',
        checked,
        onCheckedChange: (event) => {
          setChecked(event.detail.value);
          record(`checked ${event.detail.value}`);
        },
      },
      'Snap to grid',
    ),
    h(Input, {
      id: 'showcase-input',
      value: text,
      placeholder: 'Layer name',
      onValueChange: (event) => {
        setText(event.detail.value);
        record(`input ${event.detail.value}`);
      },
    }),
    h(Select, {
      id: 'showcase-select',
      items: fruit,
      value: fruitValue,
      label: 'Fruit',
      onValueChange: (event) => {
        setFruit(event.detail.value);
        record(`select ${String(event.detail.value)}`);
      },
    }),
    h(
      Dialog,
      {
        id: 'showcase-dialog',
        open,
        label: 'Rename layer',
        onOpenChange: (event) => {
          setOpen(event.detail.value);
          record(`dialog ${event.detail.value}`);
        },
      },
      h(Button, { slot: 'trigger', id: 'showcase-dialog-trigger' }, 'Rename'),
      h('p', null, `Current name: ${text || 'Untitled'}`),
    ),
    h(
      Menu,
      { id: 'showcase-menu', onTpAction: (event) => record(`menu ${String(event.detail.value)}`) },
      h(Button, { slot: 'trigger', variant: 'outline', id: 'showcase-menu-trigger' }, 'Layer'),
      h(MenuItem, { value: 'duplicate' }, 'Duplicate'),
      h(MenuItem, { value: 'delete' }, 'Delete'),
    ),
    h('output', { id: 'showcase-log' }, log.join(' · ')),
  );
}
createRoot(document.getElementById('showcase')!).render(h(StrictMode, null, h(Showcase)));

const widgetBindings = (await import(
  /* @vite-ignore */ built ? '/dist/react/widgets/index.js' : '/src/react/widgets/index.ts'
)) as Record<string, unknown>;
/** Every binding of both entries, by name. */
const everyBinding = Object.entries({ ...bindings, ...widgetBindings })
  .filter(([, value]) => typeof value === 'function' && 'displayName' in value)
  .sort(([a], [b]) => (a < b ? -1 : 1)) as [string, (props: object) => ReactElement][];

/**
 * Mounts every binding (or `count` of them from `start`) alone, without props, under StrictMode,
 * then unmounts it: the element is defined and rendered, the ref is the element, and no error
 * surfaces. Diagnostics an element reports outside its usual composition are listed apart.
 */
async function smoke(start = 0, count = everyBinding.length) {
  const failures: { binding: string; problems: unknown }[] = [];
  const diagnostics: { binding: string; codes: string[] }[] = [];
  for (const [name, Binding] of everyBinding.slice(start, start + count)) {
    const before = problems.length;
    let element: Element | null = null;
    try {
      const mounted = await mount(
        h(Binding, { ref: (node: Element | null) => void (element = node ?? element) }),
      );
      const rendered = mounted.host.firstElementChild;
      if (!rendered?.localName.startsWith('tp-') || !customElements.get(rendered.localName))
        failures.push({ binding: name, problems: 'no defined tp- element rendered' });
      else if (element !== rendered)
        failures.push({ binding: name, problems: 'the ref is not the rendered element' });
      await unmount(mounted);
    } catch (error) {
      failures.push({ binding: name, problems: String(error) });
    }
    const raised = problems.slice(before);
    const codes = raised.filter((line) => line.startsWith('tp-diagnostic'));
    const errors = raised.filter((line) => !line.startsWith('tp-diagnostic'));
    if (errors.length) failures.push({ binding: name, problems: errors });
    if (codes.length) diagnostics.push({ binding: name, codes });
  }
  return {
    total: everyBinding.length,
    checked: Math.min(count, everyBinding.length - start),
    failures,
    diagnostics,
  };
}

const allBindings = { ...bindings, ...widgetBindings } as unknown as Record<
  string,
  (props: object) => ReactElement
>;
const capitalized = (name: string) => name[0]!.toUpperCase() + name.slice(1);
const laneChild = (child: LaneChild, index: number): ReactElement =>
  h(
    child.binding ? allBindings[child.binding]! : child.tag!,
    { key: index, ...child.props },
    child.text,
    ...(child.children?.map(laneChild) ?? []),
  );

/**
 * One lane row: a controlled owner that writes the proposal back publishes it, one that does
 * not keeps its value, and `default<Lane>` leaves the element free to commit it.
 */
async function lane(row: LaneRow): Promise<Result> {
  const checks: Check[] = [];
  const check = (name: string, passed: boolean, detail?: unknown) =>
    checks.push({ check: name, passed, ...(passed ? {} : { detail }) });
  const before = problems.length;
  const Binding = allBindings[row.binding]!;
  const callback = `on${capitalized(row.lane)}Change`;
  const children = row.children?.map(laneChild);
  const wait = async () => {
    await new Promise((resolve) => setTimeout(resolve, row.settle ?? 0));
    await settle();
  };
  const read = (host: HTMLElement) => {
    const element = host.querySelector<HTMLElement>(row.entry)!;
    return row.read ? row.read(element) : (element as unknown as Record<string, unknown>)[row.lane];
  };
  const route = (event: CustomEvent<{ sourceEvent?: Event | undefined }>) => {
    if (row.routed) event.detail.sourceEvent?.preventDefault();
  };
  try {
    let owned: unknown = row.initial;
    let calls = 0;
    function Owner(): ReactElement {
      const [value, setValue] = useState<unknown>(row.initial);
      owned = value;
      return h(
        Binding,
        {
          ...row.props,
          [row.lane]: value,
          [callback]: (event: CustomEvent<{ value: unknown }>) => {
            calls++;
            route(event);
            setValue(event.detail.value);
          },
        },
        children,
      );
    }
    const accepting = await mount(h(Owner));
    row.propose(accepting.host.querySelector(row.entry)!);
    await wait();
    check(`${callback} receives the proposal`, calls >= 1, calls);
    check(
      'a controlled owner that writes it back publishes it',
      !sameValue(owned, row.initial) && sameValue(read(accepting.host), owned),
      { owned, element: read(accepting.host) },
    );
    await unmount(accepting);

    const rejecting = await mount(
      h(
        Binding,
        {
          ...row.props,
          [row.lane]: row.initial,
          // A cancelable lane is rejected by cancelling the proposal, not by ignoring it.
          ...(row.cancelable
            ? { [eventProp(`tp-${row.lane}-change`)]: (event: Event) => event.preventDefault() }
            : { [callback]: route }),
        },
        children,
      ),
    );
    row.propose(rejecting.host.querySelector(row.entry)!);
    await wait();
    check(
      'a controlled owner that does not write keeps its value',
      sameValue(read(rejecting.host), row.initial),
      read(rejecting.host),
    );
    await unmount(rejecting);

    if (!row.routed) {
      const free = await mount(
        h(Binding, { ...row.props, [`default${capitalized(row.lane)}`]: row.initial }, children),
      );
      check('default<Lane> applies', sameValue(read(free.host), row.initial), read(free.host));
      row.propose(free.host.querySelector(row.entry)!);
      await wait();
      check(
        'uncontrolled, the proposal commits',
        !sameValue(read(free.host), row.initial),
        read(free.host),
      );
      await unmount(free);
    }
  } catch (error) {
    check('runs without throwing', false, String(error));
  }
  const unexpected = problems.slice(before);
  if (unexpected.length)
    checks.push({ check: 'no diagnostics, warnings or errors', passed: false, detail: unexpected });
  return {
    scenario: `lane ${row.entry} ${row.lane}`,
    passed: checks.every((entry) => entry.passed),
    checks,
  };
}

/**
 * One props row: the element is defined and the ref is the element, its properties arrive, a
 * second render's properties and children reach the same element, and an event reaches its
 * `onTp…` prop once, with no diagnostic, warning or error.
 */
async function prop(row: PropRow): Promise<Result> {
  const checks: Check[] = [];
  const check = (name: string, passed: boolean, detail?: unknown) =>
    checks.push({ check: name, passed, ...(passed ? {} : { detail }) });
  const before = problems.length;
  const Binding = allBindings[row.binding]!;
  const wait = async () => {
    await new Promise((resolve) => setTimeout(resolve, row.settle ?? 0));
    await settle();
  };
  let element: Element | null = null;
  let events = 0;
  const cleanup = row.setup?.();
  let setPhase: (phase: number) => void = () => undefined;
  function Owner(): ReactElement {
    const [phase, set] = useState(0);
    setPhase = set;
    const props = phase ? { ...row.props, ...row.update?.props } : row.props;
    const children = (phase ? row.update?.children : undefined) ?? row.children;
    return h(
      Binding,
      {
        ...props,
        ref: (node: Element | null) => void (element = node ?? element),
        ...(row.event ? { [eventProp(row.event.type)]: () => events++ } : {}),
      },
      ...(children?.map(laneChild) ?? []),
    );
  }
  try {
    const mounted = await mount(h(Owner));
    await wait();
    const rendered = mounted.host.querySelector<HTMLElement>(row.entry)!;
    check('the element is defined and rendered', !!rendered && !!customElements.get(row.entry));
    check('the ref is the element', element === rendered);
    const missing = Object.entries(row.props).filter(
      ([key, value]) => !carries(rendered, key, value),
    );
    check(
      'props arrive as properties',
      !missing.length,
      missing.map(([key]) => key),
    );
    if (row.text?.[0])
      check('children arrive', !!rendered.textContent?.includes(row.text[0]), rendered.textContent);
    if (row.update) {
      flushSync(() => setPhase(1));
      await wait();
      const after = mounted.host.querySelector<HTMLElement>(row.entry)!;
      check('the update keeps the element', after === rendered);
      const stale = Object.entries(row.update.props ?? {}).filter(
        ([key, value]) => !carries(after, key, value),
      );
      check(
        'updated props arrive',
        !stale.length,
        stale.map(([key]) => key),
      );
      if (row.text?.[1])
        check(
          'updated children arrive',
          !!after.textContent?.includes(row.text[1]),
          after.textContent,
        );
    }
    if (row.event) {
      row.event.fire(rendered);
      await wait();
      check(`${eventProp(row.event.type)} receives the event once`, events === 1, events);
    }
    await unmount(mounted);
  } catch (error) {
    check('runs without throwing', false, String(error));
  }
  cleanup?.();
  const unexpected = problems
    .slice(before)
    .filter((line) => !row.expected?.some((code) => line.startsWith(`tp-diagnostic ${code}:`)));
  if (unexpected.length)
    checks.push({ check: 'no diagnostics, warnings or errors', passed: false, detail: unexpected });
  return { scenario: `props ${row.entry}`, passed: checks.every((entry) => entry.passed), checks };
}

Object.assign(window, {
  reactBindings: {
    scenarios: Object.keys(scenarios),
    run,
    smoke,
    lanes: laneRows.map((row) => row.entry),
    props: propRows.map((row) => row.entry),
    async prop(entry: string): Promise<Result> {
      const row = propRows.find((candidate) => candidate.entry === entry);
      if (!row) throw new Error(`No props row ${entry}`);
      return prop(row);
    },
    async lane(entry: string): Promise<Result> {
      const row = laneRows.find((candidate) => candidate.entry === entry);
      if (!row) throw new Error(`No lane row ${entry}`);
      return lane(row);
    },
    async runAll(): Promise<Result[]> {
      const results: Result[] = [];
      for (const name of Object.keys(scenarios)) results.push(await run(name));
      return results;
    },
    problems,
  },
});
document.documentElement.dataset.ready = '';
