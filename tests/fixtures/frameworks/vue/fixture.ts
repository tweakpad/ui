// Vue 3 bindings, rendered with render functions. `?package` loads the built `@tweakpad/ui/vue`.
import { createApp, defineComponent, h, nextTick, ref, type App, type Component } from 'vue';
import type * as Bindings from '../../../../src/vue/index.js';
import { laneRows, sameValue, type LaneRow } from '../lanes.js';
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
  /* @vite-ignore */ built ? '/dist/vue/index.js' : '/src/vue/index.ts'
)) as typeof Bindings;
const { Button, Checkbox, Dialog, Input, Menu, MenuItem, Select } = bindings as unknown as Record<
  string,
  Component
>;
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

/** Diagnostics, Vue warnings and errors observed while a scenario runs. */
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
    // The dev server's own notices: Lit's dev mode and the esm-bundler build's feature flags.
    if (!/Lit is in dev mode|Feature flags __VUE/u.test(text))
      problems.push(`console.${level}: ${text}`);
    original(...args);
  };
}

const stage = document.getElementById('stage')!;
const settle = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

async function mount(component: Component): Promise<{ host: HTMLElement; app: App }> {
  const host = document.createElement('section');
  stage.append(host);
  const app = createApp(component);
  app.config.errorHandler = (error) => problems.push(`vue error: ${String(error)}`);
  app.config.warnHandler = (message) => problems.push(`vue warning: ${message}`);
  app.mount(host);
  await settle();
  return { host, app };
}
async function unmount({ host, app }: { host: HTMLElement; app: App }): Promise<void> {
  app.unmount();
  host.remove();
  await settle();
}

type Scenario = (check: (name: string, passed: boolean, detail?: unknown) => void) => Promise<void>;

async function churn(component: () => Component, check: Parameters<Scenario>[0]): Promise<void> {
  const before = problems.length;
  for (let round = 0; round < 3; round++) await unmount(await mount(component()));
  check(
    'mounts and unmounts 3× without errors',
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
    let clicks = 0;
    const mounted = await mount(() =>
      h(
        Button,
        { variant: 'secondary', icon: boldIcon, class: 'extra', onClick: () => clicks++ },
        () => 'Save',
      ),
    );
    const el = mounted.host.querySelector<TpButton>('tp-button');
    check('defines tp-button on first render', Boolean(customElements.get('tp-button')));
    check('a string prop is the property', el?.variant === 'secondary');
    check('an object prop is the property', el?.icon === boldIcon);
    check('the object prop rendered', Boolean(el?.shadowRoot?.querySelector('tp-icon')));
    check('class falls through', el?.classList.contains('extra') === true);
    check('children reach the default slot', el?.textContent?.trim() === 'Save');
    el?.click();
    check('a native listener receives the click once', clicks === 1, clicks);
    await unmount(mounted);
    // `<Button disabled />` writes an empty string, which Vue casts to true for a boolean.
    const shorthand = await mount(() => h(Button, { disabled: '' }, () => 'Off'));
    check(
      'a shorthand boolean prop is true',
      shorthand.host.querySelector<TpButton>('tp-button')?.disabled === true,
    );
    await unmount(shorthand);
    await churn(() => () => h(Button, null, () => 'Save'), check);
  },

  async checkbox(check) {
    const events: string[] = [];
    const callbacks: boolean[] = [];
    const model = ref(false);
    const accepting = await mount(() =>
      h(Checkbox, {
        checked: model.value,
        'onUpdate:checked': (value: boolean) => (model.value = value),
        onCheckedChange: (event: CustomEvent<{ value: boolean }>) =>
          callbacks.push(event.detail.value),
        onTpValueChange: (event: CustomEvent<{ value: boolean }>) =>
          events.push(`${event.type}:${event.detail.value}`),
      }),
    );
    const box = accepting.host.querySelector<TpCheckbox>('tp-checkbox')!;
    check('v-model:checked starts unchecked', box.checked === false);
    box.setChecked(true);
    await nextTick();
    await settle();
    check('the update reaches the model', model.value === true);
    check('the model write-back publishes', box.checked === true);
    check('an own lane callback still runs', callbacks.join() === 'true', callbacks);
    check(
      '@tp-value-change receives the event once',
      events.join() === 'tp-value-change:true',
      events,
    );
    await unmount(accepting);

    const defaultModel = ref(true);
    const viaModelValue = await mount(() =>
      h(Checkbox, {
        modelValue: defaultModel.value,
        'onUpdate:modelValue': (value: boolean) => (defaultModel.value = value),
      }),
    );
    const bound = viaModelValue.host.querySelector<TpCheckbox>('tp-checkbox')!;
    check('v-model binds the checked lane', bound.checked === true);
    bound.setChecked(false);
    await nextTick();
    await settle();
    check('v-model updates and publishes', defaultModel.value === false && bound.checked === false);
    await unmount(viaModelValue);

    const rejecting = await mount(() => h(Checkbox, { checked: false }));
    const rejected = rejecting.host.querySelector<TpCheckbox>('tp-checkbox')!;
    rejected.setChecked(true);
    await settle();
    check('a controlled value without an owner keeps its value', rejected.checked === false);
    await unmount(rejecting);

    const uncontrolled = await mount(() => h(Checkbox, { defaultChecked: true }));
    const free = uncontrolled.host.querySelector<TpCheckbox>('tp-checkbox')!;
    check('uncontrolled: defaultChecked applies', free.checked === true);
    check('an omitted prop keeps the element default', free.variant === 'default', free.variant);
    await unmount(uncontrolled);
    await churn(() => () => h(Checkbox, { defaultChecked: true }), check);
  },

  async input(check) {
    const text = ref('');
    const mounted = await mount(() =>
      h(Input, {
        modelValue: text.value,
        'onUpdate:modelValue': (value: string) => (text.value = value.toUpperCase()),
        placeholder: 'Type',
      }),
    );
    const input = mounted.host.querySelector<TpInput>('tp-input')!;
    input.setValue('abc');
    await nextTick();
    await settle();
    check('v-model receives the proposal', text.value === 'ABC', text.value);
    check('a transforming owner publishes its own value', input.value === 'ABC', input.value);
    await unmount(mounted);
    await churn(() => () => h(Input, { defaultValue: 'x' }), check);
  },

  async select(check) {
    const value = ref<unknown>('banana');
    const completes: boolean[] = [];
    const mounted = await mount(() =>
      h(Select, {
        items: fruit,
        modelValue: value.value,
        'onUpdate:modelValue': (next: unknown) => (value.value = next),
        label: 'Fruit',
        onTpOpenChangeComplete: (event: CustomEvent<{ open: boolean }>) =>
          completes.push(event.detail.open),
      }),
    );
    const select = mounted.host.querySelector<TpSelect>('tp-select')!;
    check('an array prop is the property', select.items === fruit);
    check('the model value applies before the first update', select.value === 'banana');
    select.setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    check('opening reports tp-open-change-complete', completes.includes(true), completes);
    await unmount(mounted);
    await churn(() => () => h(Select, { items: fruit, defaultValue: 'apple' }), check);
  },

  async dialog(check) {
    const open = ref(false);
    const lines = ref(1);
    const Confirm = defineComponent(
      () => () =>
        h(
          Dialog,
          {
            open: open.value,
            'onUpdate:open': (value: boolean) => (open.value = value),
            label: 'Rename layer',
          },
          () => [
            h(Button, { slot: 'trigger' }, () => 'Rename'),
            ...Array.from({ length: lines.value }, (_, index) =>
              h('p', { key: index }, `Line ${index + 1}`),
            ),
          ],
        ),
    );
    const mounted = await mount(Confirm);
    const dialog = mounted.host.querySelector<TpDialog>('tp-dialog')!;
    dialog.setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    check('v-model:open receives the proposal and opens', open.value && dialog.open);
    const before = problems.length;
    lines.value = 3;
    await settle();
    lines.value = 1;
    await settle();
    check(
      'children Vue adds and removes while open stay consistent',
      problems.length === before && dialog.querySelectorAll('p').length === 1,
      { problems: problems.slice(before), paragraphs: dialog.querySelectorAll('p').length },
    );
    dialog.setOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    check('closing through the model closes', !open.value && !dialog.open);
    await unmount(mounted);
  },

  async menu(check) {
    const actions: unknown[] = [];
    const extra = ref(false);
    const Actions = defineComponent(
      () => () =>
        h(
          Menu,
          {
            onTpAction: (event: CustomEvent<{ value: unknown }>) =>
              actions.push(event.detail.value),
          },
          () => [
            h(Button, { slot: 'trigger' }, () => 'Layer'),
            h(MenuItem, { value: 'duplicate' }, () => 'Duplicate'),
            extra.value ? h(MenuItem, { value: 'lock' }, () => 'Lock') : null,
            h(MenuItem, { value: 'delete' }, () => 'Delete'),
          ],
        ),
    );
    const mounted = await mount(Actions);
    const menu = mounted.host.querySelector<TpMenu>('tp-menu')!;
    const items = () =>
      (menu as unknown as { ownedChildren: readonly Node[] }).ownedChildren.filter(
        (node): node is HTMLElement & { value: unknown } =>
          (node as Element).localName === 'tp-menu-item',
      );
    const before = problems.length;
    extra.value = true;
    await settle();
    check(
      'a conditional item lands in order',
      items()
        .map((item) => item.value)
        .join() === 'duplicate,lock,delete',
      items().map((item) => item.value),
    );
    extra.value = false;
    await settle();
    check(
      'removing it leaves the rest, in order',
      items()
        .map((item) => item.value)
        .join() === 'duplicate,delete',
    );
    check('no errors while items change', problems.length === before, problems.slice(before));
    menu.setOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    (items()[0] as unknown as { activate(event?: Event): void }).activate();
    await settle();
    check('@tp-action receives the item', actions.join() === 'duplicate', actions);
    await unmount(mounted);
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
    checks.push({ check: 'no diagnostics, warnings or errors', passed: false, detail: unexpected });
  return { scenario: name, passed: checks.every((entry) => entry.passed), checks };
}

/** A visible composition of the pilot bindings, for tool-driven clicks and screenshots. */
const Showcase = defineComponent(() => {
  const checked = ref(false);
  const text = ref('');
  const fruitValue = ref<unknown>('apple');
  const open = ref(false);
  const log = ref<string[]>([]);
  const record = (line: string) => (log.value = [line, ...log.value].slice(0, 6));
  return () =>
    h('div', { class: 'showcase' }, [
      h(
        Checkbox,
        {
          id: 'showcase-checkbox',
          checked: checked.value,
          'onUpdate:checked': (value: boolean) => {
            checked.value = value;
            record(`checked ${value}`);
          },
        },
        () => 'Snap to grid',
      ),
      h(Input, {
        id: 'showcase-input',
        modelValue: text.value,
        placeholder: 'Layer name',
        'onUpdate:modelValue': (value: string) => {
          text.value = value;
          record(`input ${value}`);
        },
      }),
      h(Select, {
        id: 'showcase-select',
        items: fruit,
        label: 'Fruit',
        modelValue: fruitValue.value,
        'onUpdate:modelValue': (value: unknown) => {
          fruitValue.value = value;
          record(`select ${String(value)}`);
        },
      }),
      h(
        Dialog,
        {
          id: 'showcase-dialog',
          open: open.value,
          label: 'Rename layer',
          'onUpdate:open': (value: boolean) => {
            open.value = value;
            record(`dialog ${value}`);
          },
        },
        () => [
          h(Button, { slot: 'trigger', id: 'showcase-dialog-trigger' }, () => 'Rename'),
          h('p', null, `Current name: ${text.value || 'Untitled'}`),
        ],
      ),
      h(
        Menu,
        {
          id: 'showcase-menu',
          onTpAction: (event: CustomEvent<{ value: unknown }>) =>
            record(`menu ${String(event.detail.value)}`),
        },
        () => [
          h(
            Button,
            { slot: 'trigger', variant: 'outline', id: 'showcase-menu-trigger' },
            () => 'Layer',
          ),
          h(MenuItem, { value: 'duplicate' }, () => 'Duplicate'),
          h(MenuItem, { value: 'delete' }, () => 'Delete'),
        ],
      ),
      h('output', { id: 'showcase-log' }, log.value.join(' · ')),
    ]);
});
createApp(Showcase).mount(document.getElementById('showcase')!);

const widgetBindings = (await import(
  /* @vite-ignore */ built ? '/dist/vue/widgets/index.js' : '/src/vue/widgets/index.ts'
)) as Record<string, unknown>;
/** Every binding of both entries, by name. */
const everyBinding = Object.entries({ ...bindings, ...widgetBindings })
  .filter(([, value]) => typeof value === 'object' && value !== null && 'setup' in value)
  .sort(([a], [b]) => (a < b ? -1 : 1)) as [string, Component][];

/**
 * Mounts every binding (or `count` of them from `start`) alone, without props, then unmounts it:
 * the element is defined and rendered and no error or warning surfaces. Diagnostics an element
 * reports outside its usual composition are listed apart.
 */
async function smoke(start = 0, count = everyBinding.length) {
  const failures: { binding: string; problems: unknown }[] = [];
  const diagnostics: { binding: string; codes: string[] }[] = [];
  for (const [name, Binding] of everyBinding.slice(start, start + count)) {
    const before = problems.length;
    try {
      const mounted = await mount(() => h(Binding));
      const rendered = mounted.host.firstElementChild;
      if (!rendered?.localName.startsWith('tp-') || !customElements.get(rendered.localName))
        failures.push({ binding: name, problems: 'no defined tp- element rendered' });
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

const allBindings = { ...bindings, ...widgetBindings } as unknown as Record<string, Component>;
const capitalized = (name: string) => name[0]!.toUpperCase() + name.slice(1);
const laneChildren = (row: LaneRow) =>
  row.children
    ? () =>
        row.children!.map((child, index) =>
          child.binding
            ? h(allBindings[child.binding]!, { key: index, ...child.props }, () => child.text)
            : h(child.tag!, { key: index, ...child.props }, child.text),
        )
    : undefined;

/**
 * One lane row: `v-model:<lane>` publishes the proposal it receives, a controlled value without
 * an update listener keeps its value, and `default<Lane>` leaves the element free to commit it.
 */
async function lane(row: LaneRow): Promise<Result> {
  const checks: Check[] = [];
  const check = (name: string, passed: boolean, detail?: unknown) =>
    checks.push({ check: name, passed, ...(passed ? {} : { detail }) });
  const before = problems.length;
  const Binding = allBindings[row.binding]!;
  const wait = async () => {
    await new Promise((resolve) => setTimeout(resolve, row.settle ?? 0));
    await nextTick();
    await settle();
  };
  const read = (host: HTMLElement) =>
    (host.querySelector(row.entry) as unknown as Record<string, unknown>)[row.lane];
  try {
    const model = ref<unknown>(row.initial);
    let callbacks = 0;
    const accepting = await mount(() =>
      h(
        Binding,
        {
          ...row.props,
          [row.lane]: model.value,
          [`onUpdate:${row.lane}`]: (value: unknown) => (model.value = value),
          [`on${capitalized(row.lane)}Change`]: () => callbacks++,
        },
        laneChildren(row),
      ),
    );
    row.propose(accepting.host.querySelector(row.entry)!);
    await wait();
    check(
      `v-model:${row.lane} receives the proposal`,
      !sameValue(model.value, row.initial),
      model.value,
    );
    check(
      'the model write-back publishes',
      sameValue(read(accepting.host), model.value),
      read(accepting.host),
    );
    check('an own lane callback still runs', callbacks >= 1, callbacks);
    await unmount(accepting);

    const rejecting = await mount(() =>
      h(Binding, { ...row.props, [row.lane]: row.initial }, laneChildren(row)),
    );
    row.propose(rejecting.host.querySelector(row.entry)!);
    await wait();
    check(
      'a controlled value without an owner keeps its value',
      sameValue(read(rejecting.host), row.initial),
      read(rejecting.host),
    );
    await unmount(rejecting);

    const free = await mount(() =>
      h(
        Binding,
        { ...row.props, [`default${capitalized(row.lane)}`]: row.initial },
        laneChildren(row),
      ),
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

Object.assign(window, {
  vueBindings: {
    scenarios: Object.keys(scenarios),
    run,
    smoke,
    lanes: laneRows.map((row) => row.entry),
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
