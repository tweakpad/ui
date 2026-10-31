import { TpColorInput } from './runtime.js';
import type { TpColorInput as ColorInput } from './runtime.js';

const $ = <T extends HTMLElement = ColorInput>(id: string) => document.getElementById(id) as T;
const events: {
  target: string;
  type: string;
  value: unknown;
  previous: unknown;
  reason: unknown;
  cancelable: boolean;
}[] = [];
const log = $<HTMLPreElement>('log');
for (const type of ['tp-value-change', 'tp-value-commit', 'tp-field-value'])
  document.addEventListener(type, (event) => {
    const detail = (event as CustomEvent).detail ?? {};
    const entry = {
      target: (event.target as HTMLElement).id || (event.target as HTMLElement).localName,
      type,
      value: detail.value,
      previous: detail.previousValue,
      reason: detail.reason,
      cancelable: event.cancelable,
    };
    events.push(entry);
    log.textContent = `${entry.target} ${type} ${String(entry.value)} (${String(entry.reason)})\n${log.textContent}`;
  });

const submissions: [string, FormDataEntryValue][][] = [];
$<HTMLFormElement>('form').addEventListener('submit', (event) => {
  event.preventDefault();
  submissions.push([...new FormData(event.currentTarget as HTMLFormElement)]);
});

// A controlled input whose owner writes each accepted proposal back, and one that never does.
const owner = $('controlled-owner');
const controlled = new TpColorInput() as ColorInput;
controlled.id = 'controlled';
controlled.variant = 'inline';
controlled.label = 'Controlled';
controlled.value = '#334155';
controlled.addEventListener('tp-value-change', (event) => {
  const value = (event as CustomEvent<{ value: string }>).detail.value;
  queueMicrotask(() => (controlled.value = value));
});
const frozen = new TpColorInput() as ColorInput;
frozen.id = 'frozen';
frozen.variant = 'inline';
frozen.label = 'Never written back';
frozen.value = '#334155';
const rejecting = new TpColorInput() as ColorInput;
rejecting.id = 'rejecting';
rejecting.label = 'Rejects proposals';
rejecting.defaultValue = '#65a30d';
rejecting.addEventListener('tp-value-change', (event) => event.preventDefault());
owner.append(controlled, frozen, rejecting);

const control = (el: ColorInput) =>
  el.shadowRoot!.querySelector<HTMLInputElement | HTMLButtonElement>(
    '[part~="color-input-control"]',
  );
const editor = (el: ColorInput) =>
  el.shadowRoot!.querySelector<HTMLElement & { inputElement: HTMLInputElement | null }>(
    '[part~="color-input-value"]',
  );

async function settle(...elements: ColorInput[]): Promise<void> {
  for (let turn = 0; turn < 3; turn++) {
    await Promise.all(elements.map((el) => el.updateComplete));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/**
 * Applies colors as the browser's picker reports them: `input` per color, then `change` when it
 * closes. API evidence: DevTools cannot operate the operating system's picker window.
 */
async function pick(el: ColorInput, colors: string[], close = true): Promise<void> {
  const input = control(el) as HTMLInputElement;
  for (const value of colors) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settle(el);
  }
  if (close) input.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
}

/** Types text into the value editor the way the editor reports it, then commits it. */
async function type(el: ColorInput, text: string, commit: 'Enter' | 'blur' | 'Escape' = 'Enter') {
  const native = editor(el)!.inputElement!;
  native.focus();
  native.value = text;
  native.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  );
  await settle(el);
  if (commit === 'blur') native.blur();
  else
    native.dispatchEvent(
      new KeyboardEvent('keydown', { key: commit, bubbles: true, composed: true }),
    );
  await settle(el);
}

const paint = (el: ColorInput) =>
  getComputedStyle(el.shadowRoot!.querySelector('[part~="color-input-chip"]')!).getPropertyValue(
    '--_tp-color-input-paint',
  );

Object.assign(window, {
  colorInputFixture: { $, events, submissions, control, editor, settle, pick, type, paint },
});
await customElements.whenDefined('tp-color-input');
await settle(...document.querySelectorAll<ColorInput>('tp-color-input'));
document.documentElement.toggleAttribute('data-ready', true);
