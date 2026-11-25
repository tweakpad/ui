// Shared checks of a hydrated page: the server markup, the elements' state after hydration and
// the warnings the framework raised while hydrating.
import type { TpCheckbox } from '../../../../src/components/checkbox/checkbox.js';
import type { TpDialog } from '../../../../src/components/dialog/dialog.js';
import type { TpSelect } from '../../../../src/components/select/select.js';

/** The props every app renders, on the server and the client alike. */
export const items = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
];

interface Check {
  check: string;
  passed: boolean;
  detail?: unknown;
}

/** Development-build notices about the environment, not about this page. */
const environment = [/^Lit is in dev mode/u, /^Feature flags __VUE_/u];

/** Records every console error and warning from now on (hydration mismatches land there). */
export function collectWarnings(): string[][] {
  const messages: string[][] = [];
  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      const text = args.map((value) => String(value)).join(' ');
      if (!environment.some((notice) => notice.test(text))) messages.push([level, text]);
      original(...args);
    };
  }
  return messages;
}

const frames = (count: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
    step(count);
  });

/** Checks the hydrated page and publishes `window.ssrFixture`, then marks `html[data-ready]`. */
export async function report(
  framework: 'react' | 'vue',
  serverMarkup: string,
  messages: string[][],
): Promise<void> {
  await frames(10);
  const dialog = document.getElementById('dialog') as TpDialog;
  const select = document.getElementById('select') as TpSelect;
  const checked = document.getElementById('checked') as TpCheckbox;
  const uncontrolled = document.getElementById('default-checked') as TpCheckbox;
  // The server markup, parsed without upgrading anything: its attributes as the server wrote them.
  const parsed = document.createElement('template');
  parsed.innerHTML = serverMarkup;
  const attribute = (id: string, name: string) =>
    parsed.content.getElementById(id)?.getAttribute(name) ?? null;
  const checks: Check[] = [
    {
      check: 'the server markup carries primitive props under the elements’ attribute names',
      passed:
        attribute('dialog', 'default-open') === '' &&
        attribute('dialog', 'label') === 'Notice' &&
        attribute('select', 'default-value') === 'b' &&
        attribute('select', 'label') === 'Fruit' &&
        attribute('checked', 'checked') === '' &&
        attribute('default-checked', 'default-checked') === '',
      detail: serverMarkup,
    },
    {
      check: 'the server markup has no prop names in place of attribute names',
      passed: !/\b(?:defaultopen|defaultvalue|defaultchecked|showclosecontrol)\b/iu.test(
        serverMarkup,
      ),
      detail: serverMarkup,
    },
    { check: 'Dialog opens from defaultOpen', passed: dialog.open === true, detail: dialog.open },
    {
      check: 'Dialog takes showCloseControl={false}',
      passed: dialog.showCloseControl === false,
      detail: dialog.showCloseControl,
    },
    { check: 'Select takes its items', passed: select.items?.length === 2, detail: select.items },
    { check: 'Select starts at defaultValue', passed: select.value === 'b', detail: select.value },
    { check: 'controlled Checkbox is checked', passed: checked.checked === true },
    { check: 'Checkbox starts at defaultChecked', passed: uncontrolled.checked === true },
    {
      check: 'hydration raises no warning or error',
      passed: messages.length === 0,
      detail: messages,
    },
  ];
  const result = { framework, passed: checks.every((check) => check.passed), checks };
  (window as unknown as { ssrFixture: unknown }).ssrFixture = result;
  document.documentElement.dataset.ready = '';
}
