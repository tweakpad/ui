import { html } from 'lit';
import {
  TpInput,
  TpField,
  TpTextArea,
  TpForm,
  plusIcon,
  preventComponentHandling,
  defaultPresentationDictionary,
  setPresentationDictionary,
} from './runtime.js';
import type { TpIcon } from './runtime.js';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const controlled = new TpInput();
controlled.id = 'controlled';
controlled.label = 'Controlled';
controlled.name = 'controlled';
controlled.value = 'owner';
byId('controlled-owner').append(controlled);
byId<TpField>('errors').errors = [
  'Repeated',
  { message: 'Another error' },
  { message: 'Another error' },
];
byId<TpField>('no-label-forward').nativeLabel = false;
byId<TpIcon>('description-icon').icon = plusIcon;
const validation = byId<TpField>('validation');
validation.validationMode = 'on-change';
validation.validationDebounce = 25;
validation.validator = (value, values) => {
  (window as unknown as { lastValues: unknown }).lastValues = values;
  return String(value).length < 3 ? 'Use at least three characters.' : null;
};
const log: unknown[] = [];
document.addEventListener('tp-value-change', (event) => {
  const e = event as CustomEvent;
  log.push({
    target: (event.target as HTMLElement).id,
    value: e.detail.value,
    previousValue: e.detail.previousValue,
    reason: e.detail.reason,
    cancelable: e.cancelable,
  });
});
let submissions = 0;
let submitted: unknown[] = [];
document.querySelectorAll('form').forEach((form) =>
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submissions++;
    submitted = [...new FormData(form, (event.submitter as HTMLButtonElement | null) ?? undefined)];
  }),
);
Object.assign(window, {
  textAPI: {
    byId,
    log,
    get submissions() {
      return submissions;
    },
    get submitted() {
      return submitted;
    },
    controlled,
    validation,
    ready: Promise.all(
      [...document.querySelectorAll<HTMLElement>('tp-input,tp-text-area,tp-field')].map(
        (el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete,
      ),
    ),
  },
});

async function settle(...elements: (TpInput | TpTextArea | TpField)[]): Promise<void> {
  for (let turn = 0; turn < 4; turn++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}
async function runAssertions(): Promise<{ name: string; passed: boolean; actual?: unknown }[]> {
  const results: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, condition: boolean, actual?: unknown) =>
    results.push({ name, passed: condition, actual });
  const container = byId('dynamic');
  container.replaceChildren();
  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());
  container.append(form);
  const input = new TpInput();
  input.name = 'text';
  input.defaultValue = 'initial';
  input.label = 'Dynamic text';
  form.append(input);
  const area = new TpTextArea();
  area.name = 'note';
  area.defaultValue = 'One\nTwo';
  area.label = 'Dynamic note';
  form.append(area);
  await settle(input, area);
  check(
    'uncontrolled-default-and-newlines',
    input.value === 'initial' && area.value === 'One\nTwo',
    [input.value, area.value],
  );
  input.setValue('changed');
  area.setValue('Three\nFour');
  await settle(input, area);
  check(
    'form-data-single-participants',
    JSON.stringify([...new FormData(form)]) ===
      JSON.stringify([
        ['text', 'changed'],
        ['note', 'Three\nFour'],
      ]),
    [...new FormData(form)],
  );
  input.readOnly = true;
  check('readonly-clear-rejected', !input.clear() && input.value === 'changed');
  input.readOnly = false;
  input.setSelectionRange(1, 4);
  input.setRangeText('Z');
  check('native-range-proposal', input.value === 'cZged', input.value);
  input.setCustomValidity('Authored custom message');
  check(
    'custom-native-validity',
    !input.checkValidity() && input.validationMessage === 'Authored custom message',
  );
  input.setCustomValidity('');
  const cancel = (event: Event) => event.preventDefault();
  input.addEventListener('tp-value-change', cancel);
  input.setValue('rejected');
  check(
    'cancellation-atomic-native-form',
    input.value === 'cZged' &&
      input.inputElement?.value === 'cZged' &&
      new FormData(form).get('text') === 'cZged',
  );
  input.removeEventListener('tp-value-change', cancel);
  form.reset();
  await settle(input, area);
  check('native-reset-defaults', input.value === 'initial' && area.value === 'One\nTwo');
  input.formStateRestoreCallback('restored');
  await settle(input);
  check(
    'state-restoration',
    input.value === 'restored' && new FormData(form).get('text') === 'restored',
  );
  const owner = new TpInput();
  owner.value = 'owner';
  owner.label = 'Dynamic controlled';
  form.append(owner);
  await settle(owner);
  owner.setValue('ignored');
  await settle(owner);
  check('controlled-rejection', owner.value === 'owner' && owner.inputElement?.value === 'owner');
  owner.onValueChange = (event) => {
    owner.value = event.detail.value.toUpperCase();
  };
  owner.setValue('rewrite');
  await settle(owner);
  check(
    'controlled-owner-rewrite',
    owner.value === 'REWRITE' && owner.inputElement?.value === 'REWRITE',
  );
  owner.addEventListener('tp-value-change', cancel);
  owner.setValue('cancel');
  await settle(owner);
  check(
    'controlled-canceled-owner-write',
    owner.value === 'REWRITE' && owner.inputElement?.value === 'REWRITE',
  );
  owner.removeEventListener('tp-value-change', cancel);
  form.reset();
  await settle(owner);
  check('controlled-reset-owner-preserved', owner.value === 'REWRITE');
  input.hostProperties = {
    spellcheck: false,
    inputMode: 'search',
    'aria-label': 'Native provided label',
  };
  await settle(input);
  check(
    'host-properties-native-forwarding',
    input.inputElement?.spellcheck === false && input.inputElement.inputMode === 'search',
  );
  const references: (HTMLElement | null)[] = [];
  input.partContracts = {
    input: {
      classHook: 'consumer-control',
      styleHook: { 'font-size': '19px' },
      elementReference: (node) => references.push(node),
      renderDelegate: ({ bind }) => html`<input ${bind} />`,
    },
  };
  await settle(input);
  check(
    'delegate-behavior-native-ref',
    input.inputElement?.classList.contains('consumer-control') === true &&
      references.at(-1) === input.inputElement &&
      input.inputElement?.value === input.value,
  );
  const field = new TpField();
  field.name = 'project';
  field.label = 'Project';
  field.description = 'Description';
  field.validationMode = 'on-change';
  const control = new TpInput();
  control.name = 'authored';
  control.defaultValue = 'baseline';
  field.append(control);
  form.append(field);
  await settle(field, control);
  check(
    'field-name-priority-preserves-authored',
    control.name === 'authored' &&
      control.effectiveName === 'project' &&
      new FormData(form).get('project') === 'baseline',
  );
  field.disabled = true;
  await settle(field, control);
  check(
    'field-context-disabled',
    !control.disabled &&
      control.effectiveDisabled &&
      control.inputElement?.disabled &&
      new FormData(form).get('project') === null,
  );
  field.disabled = false;
  await settle(field, control);
  check(
    'field-context-enabled-restored',
    !control.effectiveDisabled && new FormData(form).get('project') === 'baseline',
  );
  control.disabled = true;
  field.disabled = true;
  await settle(field, control);
  field.disabled = false;
  await settle(field, control);
  check('independent-disabled-preserved', control.disabled && control.effectiveDisabled);
  control.disabled = false;
  field.errors = ['Repeated', { message: 'Repeated' }, { message: 'Second' }];
  await settle(field, control);
  check(
    'ordered-errors-deduplicated',
    JSON.stringify(field.validityState.errors) === JSON.stringify(['Repeated', 'Second']) &&
      field.shadowRoot?.querySelectorAll('li').length === 2,
    field.validityState.errors,
  );
  field.errors = [];
  let snapshots: unknown;
  field.validator = (value, values) => {
    snapshots = { value, values };
    return String(value).length < 3 ? 'Too short' : null;
  };
  control.setValue('x');
  await settle(field, control);
  check(
    'sync-validator-value-and-record',
    field.validityState.validity.valid === false && field.validityState.errors[0] === 'Too short',
    snapshots,
  );
  control.setValue('valid');
  await settle(field, control);
  check(
    'successful-edit-clears-custom-error',
    field.validityState.validity.valid === true && field.validityState.errors.length === 0,
  );
  const resolvers: ((value: string | null) => void)[] = [];
  field.validator = () => new Promise<string | null>((resolve) => resolvers.push(resolve));
  control.setValue('first');
  await settle(field, control);
  const old = field.validationRun;
  control.setValue('second');
  await settle(field, control);
  resolvers[0]?.('stale');
  resolvers.at(-1)?.(null);
  await settle(field, control);
  check(
    'stale-async-canceled',
    old?.status === 'cancelled' &&
      field.validityState.errors.length === 0 &&
      field.validityState.validity.valid === true,
  );
  field.validate();
  const removed = field.validationRun;
  field.remove();
  resolvers.at(-1)?.('removed error');
  await settle(control);
  check(
    'disconnect-cancels-validation-and-context',
    removed?.status === 'cancelled' && control.effectiveName === 'authored',
    { status: removed?.status, effectiveName: control.effectiveName, authoredName: control.name },
  );
  form.append(field);
  await settle(field, control);
  field.validator = undefined;
  const replacement = new TpTextArea();
  replacement.name = 'replacement';
  replacement.defaultValue = 'different';
  control.replaceWith(replacement);
  await settle(field, replacement);
  check(
    'replacement-registers-original-baseline',
    field.control === replacement &&
      field.validityState.initialValue === 'baseline' &&
      field.validityState.dirty &&
      replacement.inputElement?.getAttribute('aria-label') === 'Project' &&
      control.inputElement?.getAttribute('aria-label') === null,
  );
  const item = document.createElement('div');
  item.slot = 'item';
  item.setAttribute('disabled', '');
  replacement.replaceWith(item);
  item.append(replacement);
  await settle(field, replacement);
  check('item-disabled-scope', replacement.effectiveDisabled);
  item.removeAttribute('disabled');
  await settle(field, replacement);
  check('item-disabled-clears', !replacement.effectiveDisabled);
  field.error = 'Authored';
  field.errorMatch = false;
  await settle(field, replacement);
  check(
    'error-match-false-removes-reference',
    !replacement.inputElement?.hasAttribute('aria-errormessage'),
  );
  field.errorMatch = true;
  await settle(field, replacement);
  check(
    'error-match-true-adds-reference',
    replacement.inputElement?.hasAttribute('aria-errormessage') === true,
  );
  field.remove();
  await settle(replacement);
  check(
    'relationship-cleanup',
    replacement.inputElement?.getAttribute('aria-label') === null &&
      !replacement.inputElement?.hasAttribute('aria-errormessage') &&
      replacement.effectiveName === 'replacement',
  );
  input.remove();
  await settle(area);
  check('delegate-reference-released', references.at(-1) === null);
  form.append(input);
  await settle(input);
  check('delegate-reference-reconnected', references.at(-1) === input.inputElement);
  return results;
}
(window as unknown as { textAPI: Record<string, unknown> }).textAPI.runAssertions = runAssertions;

async function runFormAssertions() {
  const results: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, passed: boolean, actual?: unknown) =>
    results.push({ name, passed, actual });
  const owner = new TpForm();
  owner.id = 'api-form';
  owner.validationMode = 'on-blur';
  const field = new TpField();
  field.name = 'logical';
  field.label = 'Logical name';
  const input = new TpInput();
  input.defaultValue = 'one';
  input.name = 'authored';
  field.append(input);
  const duplicate = new TpField();
  duplicate.name = 'logical';
  duplicate.label = 'Duplicate';
  const area = new TpTextArea();
  area.defaultValue = 'two';
  duplicate.append(area);
  const unnamed = new TpField();
  unnamed.label = 'Unnamed';
  const unnamedInput = new TpInput();
  unnamed.append(unnamedInput);
  owner.append(field, duplicate, unnamed);
  document.getElementById('dynamic')!.append(owner);
  await settle(field, input, duplicate, area, unnamed, unnamedInput);
  check('form-mode-inherited', field.mode === 'on-blur' && duplicate.mode === 'on-blur', {
    fieldMode: field.mode,
    duplicateMode: duplicate.mode,
    formMode: owner.validationMode,
    legacyTiming: owner.validationTiming,
  });
  field.validationMode = 'on-change';
  check('field-mode-overrides-form', field.mode === 'on-change');
  owner.errors = { logical: 'Server error' };
  await settle(field, input, duplicate, area);
  check(
    'server-name-lane',
    field.validityState.errors[0] === 'Server error' &&
      duplicate.validityState.errors[0] === 'Server error',
  );
  input.setValue('edit');
  await settle(field, input);
  check(
    'server-errors-authoritative-after-edit',
    field.validityState.errors.includes('Server error'),
  );
  owner.errors = {};
  field.validate();
  duplicate.validate();
  await settle(field, input, duplicate, area);
  check(
    'server-lane-clears-explicitly',
    field.validityState.errors.length === 0 && field.validityState.validity.valid === true,
  );
  let values: Record<string, unknown> | undefined;
  field.validator = (_value, record) => {
    values = record;
    return null;
  };
  field.validate();
  await settle(field, input);
  check(
    'form-values-duplicate-and-unnamed',
    JSON.stringify(values?.logical) === JSON.stringify(['edit', 'two']) &&
      !Object.hasOwn(values ?? {}, ''),
    values,
  );
  let callbacks = 0;
  let submitted: unknown;
  owner.onFormSubmit = (record, detail) => {
    callbacks++;
    submitted = { record, reason: detail.sourceEvent.type, data: [...detail.data] };
  };
  owner.requestSubmit();
  await settle(field, input, duplicate, area);
  check(
    'form-submit-callback-values',
    callbacks === 1 &&
      JSON.stringify((submitted as { record: Record<string, unknown> })?.record.logical) ===
        JSON.stringify(['edit', 'two']),
    submitted,
  );
  field.validator = () => 'Synchronous invalid';
  owner.requestSubmit();
  await settle(field, input);
  check(
    'sync-validation-blocks-submit',
    callbacks === 1 &&
      field.validityState.touched &&
      field.validityState.errors[0] === 'Synchronous invalid',
  );
  field.validator = async () => null;
  owner.requestSubmit();
  await settle(field, input);
  check('async-submit-does-not-block', callbacks === 2);
  field.validator = () => {
    throw new Error('Validator failed');
  };
  const rejected = field.validate();
  await rejected.completion;
  await settle(field, input);
  check(
    'validator-exception-fails-run',
    rejected.status === 'failed' && field.validityState.errors[0] === 'Validator failed',
  );
  field.validator = (() => ({ bad: true })) as never;
  const malformed = field.validate();
  await malformed.completion;
  await settle(field, input);
  check('malformed-validator-fails-run', malformed.status === 'failed');
  field.validator = undefined;
  const outer = new TpField();
  outer.disabled = true;
  outer.legend = 'Related settings';
  const nested = new TpField();
  nested.slot = 'group';
  nested.label = 'Nested';
  const nestedInput = new TpInput();
  nestedInput.name = 'nested';
  nestedInput.defaultValue = 'retain';
  nested.append(nestedInput);
  outer.append(nested);
  owner.append(outer);
  await settle(outer, nested, nestedInput);
  check(
    'field-set-disables-nested-field',
    !nested.disabled &&
      nested.effectiveDisabled &&
      !nestedInput.disabled &&
      nestedInput.effectiveDisabled &&
      new FormData(owner.form!).get('nested') === null,
    {
      nestedAuthored: nested.disabled,
      nestedEffective: nested.effectiveDisabled,
      inputAuthored: nestedInput.disabled,
      inputEffective: nestedInput.effectiveDisabled,
      controlAssociated: nested.control === nestedInput,
      submitted: new FormData(owner.form!).get('nested'),
    },
  );
  outer.disabled = false;
  await settle(outer, nested, nestedInput);
  check(
    'field-set-enable-preserves-author-state',
    !nested.effectiveDisabled &&
      !nestedInput.effectiveDisabled &&
      new FormData(owner.form!).get('nested') === 'retain',
  );
  nested.disabled = true;
  outer.disabled = true;
  await settle(outer, nested, nestedInput);
  outer.disabled = false;
  await settle(outer, nested, nestedInput);
  check('nested-authored-disabled-preserved', nested.disabled && nestedInput.effectiveDisabled, {
    nestedAuthored: nested.disabled,
    nestedEffective: nested.effectiveDisabled,
    inputEffective: nestedInput.effectiveDisabled,
    controlAssociated: nested.control === nestedInput,
  });
  const noControl = new TpField();
  owner.append(noControl);
  await settle(noControl);
  const pending = noControl.validate();
  check('missing-control-pending', pending.status === 'pending');
  noControl.remove();
  check('missing-control-disconnect-canceled', pending.status === 'cancelled');
  owner.remove();
  return results;
}
(window as unknown as { textAPI: Record<string, unknown> }).textAPI.runFormAssertions =
  runFormAssertions;

// API event simulations are intentionally separate from MCP pointer/keyboard evidence.
async function runExtendedAssertions(): Promise<
  { name: string; passed: boolean; actual?: unknown }[]
> {
  const results: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, condition: boolean, actual?: unknown) =>
    results.push({ name, passed: condition, actual });
  const form = document.createElement('form');
  const field = new TpField();
  field.name = 'extended';
  field.label = 'Extended';
  const input = new TpInput();
  input.defaultValue = 'draft';
  const area = new TpTextArea();
  area.label = 'Extended note';
  area.name = 'note';
  area.defaultValue = 'line';
  field.append(input);
  form.append(field, area);
  byId('dynamic').append(form);
  await settle(field, input, area);
  const native = input.inputElement!;
  const events: CustomEvent[] = [];
  input.addEventListener('tp-value-change', (event) => events.push(event as CustomEvent));
  field.legendScale = 'field';
  field.partContracts = {
    'field-label': { content: html`<strong>Content name</strong>` },
    'field-description': { content: html`<span>Content description</span>` },
    'field-legend': { content: 'Contract legend' },
  };
  await settle(field, input);
  check(
    'part-content-label-association',
    native.getAttribute('aria-label') === 'Content name',
    native.getAttribute('aria-label'),
  );
  check(
    'part-content-description-association',
    [...input.shadowRoot!.querySelectorAll('[id^=tp-field-description-]')].some(
      (node) => node.textContent === 'Content description',
    ),
  );
  check(
    'legend-field-scale-independent',
    field.shadowRoot!.querySelector('[part=field-legend]')?.getAttribute('data-scale') ===
      'field' &&
      getComputedStyle(field.shadowRoot!.querySelector('[part=field-legend]')!).fontSize === '14px',
  );
  field.partContracts = {};
  await settle(field, input);

  input.hostProperties = { '@input': (event: Event) => event.preventDefault() };
  await settle(input);
  native.value = 'native default prevented';
  native.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, cancelable: true }),
  );
  await settle(input, field);
  check(
    'native-default-prevention-independent',
    input.value === 'native default prevented' &&
      new FormData(form).get('extended') === input.value,
  );
  input.hostProperties = { '@input': (event: Event) => preventComponentHandling(event) };
  await settle(input);
  const committed = input.value;
  native.value = 'consumer canceled';
  native.setSelectionRange(3, 5, 'backward');
  native.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  await settle(input, field);
  check(
    'explicit-component-prevention-rolls-back',
    input.value === committed &&
      native.value === committed &&
      new FormData(form).get('extended') === committed &&
      native.selectionStart === 3 &&
      native.selectionEnd === 5,
  );
  input.hostProperties = {};
  await settle(input);
  const beforeComposition = events.length;
  native.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));
  native.value = 'あ';
  native.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, isComposing: true }),
  );
  input.placeholder = 'updated while composing';
  await settle(input);
  check(
    'composition-draft-retained',
    input.value === committed && native.value === 'あ' && events.length === beforeComposition,
  );
  native.dispatchEvent(
    new CompositionEvent('compositionend', { bubbles: true, composed: true, data: 'あ' }),
  );
  await settle(input, field);
  check(
    'composition-one-committed-edit',
    input.value === 'あ' && events.length === beforeComposition + 1,
  );
  native.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  check('post-composition-input-no-duplicate', events.length === beforeComposition + 1);
  const paste = new ClipboardEvent('paste', { bubbles: true, composed: true });
  native.dispatchEvent(paste);
  native.value = 'pasted';
  native.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertFromPaste' }),
  );
  await settle(input, field);
  check(
    'paste-reason-original-event',
    events.at(-1)?.detail.reason === 'input-paste' && events.at(-1)?.detail.sourceEvent === paste,
  );

  input.type = 'email';
  input.setValue('bad');
  await settle(input, field);
  field.validate();
  check(
    'native-email-validity',
    field.validityState.validity.typeMismatch === true &&
      field.validityState.validity.valid === false,
  );
  input.type = 'number';
  input.min = '1';
  input.max = '10';
  input.step = '2';
  input.setValue('12');
  await settle(input, field);
  field.validate();
  check(
    'native-number-validity',
    field.validityState.validity.rangeOverflow === true &&
      field.validityState.validity.stepMismatch === true,
  );
  input.type = 'text';
  input.pattern = '[A-Z]+';
  input.setValue('lower');
  await settle(input, field);
  field.validate();
  check('native-pattern-validity', field.validityState.validity.patternMismatch === true);
  input.pattern = '';
  input.required = true;
  input.clear();
  await settle(input, field);
  field.validate();
  check('native-required-validity', field.validityState.validity.valueMissing === true);
  input.required = false;
  input.setValue('valid');
  await settle(input, field);
  field.validate();
  check(
    'full-validity-flags',
    [
      'badInput',
      'customError',
      'patternMismatch',
      'rangeOverflow',
      'rangeUnderflow',
      'stepMismatch',
      'tooLong',
      'tooShort',
      'typeMismatch',
      'valueMissing',
    ].every(
      (key) => typeof (field.validityState.validity as Record<string, unknown>)[key] === 'boolean',
    ),
  );

  const first = document.createElement('span');
  first.slot = 'description';
  first.textContent = 'First description';
  const second = document.createElement('span');
  second.slot = 'description';
  second.textContent = 'Second description';
  field.append(first, second);
  native.setAttribute('aria-describedby', 'authored-description');
  await settle(field, input);
  check(
    'ordered-description-preserves-authored-id',
    native.getAttribute('aria-describedby')?.startsWith('authored-description ') === true &&
      [...input.shadowRoot!.querySelectorAll('[id^=tp-field-description-]')].some(
        (element) => element.textContent === 'First description Second description',
      ),
    native.getAttribute('aria-describedby'),
  );
  const force = document.createElement('span');
  force.slot = 'error';
  force.setAttribute('match', 'true');
  force.textContent = 'Always shown';
  const missing = document.createElement('span');
  missing.slot = 'error';
  missing.setAttribute('match', 'valueMissing');
  missing.textContent = 'Missing required value';
  const mismatch = document.createElement('span');
  mismatch.slot = 'error';
  mismatch.setAttribute('match', 'typeMismatch');
  mismatch.textContent = 'Malformed email';
  field.append(force, missing, mismatch);
  input.required = false;
  input.setValue('valid');
  await settle(field, input);
  field.validate();
  await settle(field, input);
  check(
    'forced-error-presence-keeps-valid-state',
    !force.hidden &&
      field.validityState.validity.valid === true &&
      native.getAttribute('aria-invalid') !== 'true',
    {
      fieldValid: field.validityState.validity.valid,
      nativeInvalid: native.getAttribute('aria-invalid'),
    },
  );
  input.required = true;
  input.clear();
  await settle(field, input);
  field.validate();
  await settle(field, input);
  check('multiple-error-match-independent', !force.hidden && !missing.hidden && mismatch.hidden);
  input.type = 'email';
  input.setValue('malformed');
  await settle(field, input);
  field.validate();
  await settle(field, input);
  check('error-key-replacement', !force.hidden && missing.hidden && !mismatch.hidden);
  field.validityContent = (state) =>
    html`<output>${state.errors.length}:${String(state.dirty)}</output>`;
  await settle(field);
  check(
    'validity-content-resolver',
    field.shadowRoot!.querySelector('output')?.textContent?.includes(':true') === true,
  );

  area.rows = 4;
  area.resize = 'inline';
  area.hostProperties = { style: { writingMode: 'vertical-rl' }, wrap: 'hard', cols: 30 };
  await settle(area);
  check(
    'textarea-native-and-logical-resize',
    area.inputElement!.rows === 4 &&
      getComputedStyle(area.inputElement!).resize === 'inline' &&
      getComputedStyle(area.inputElement!).writingMode === 'vertical-rl' &&
      (area.inputElement as HTMLTextAreaElement).wrap === 'hard',
  );
  area.resize = 'none';
  await settle(area);
  check('textarea-resize-disabled', getComputedStyle(area.inputElement!).resize === 'none');

  input.focus();
  const identity = input.inputElement;
  input.partContracts = {
    input: { classHook: 'custom-input', styleHook: { '--consumer-color': 'teal' } },
  };
  input.partPresentation = { input: { styleHook: { color: 'rgb(1, 2, 3)' } } };
  await settle(input);
  check(
    'part-hooks-preserve-focused-native',
    input.inputElement === identity &&
      input.shadowRoot!.activeElement === identity &&
      identity!.classList.contains('custom-input') &&
      getComputedStyle(identity!).color === 'rgb(1, 2, 3)',
  );
  const alternate = Object.fromEntries(
    Object.keys(defaultPresentationDictionary).map((key) => [
      key,
      key === 'input' ? [{ declarations: { background: 'rgb(4, 5, 6)' } }] : [],
    ]),
  );
  setPresentationDictionary(alternate);
  await settle(input, area, field);
  check(
    'complete-alternate-dictionary-preserves-state-focus',
    input.inputElement === identity &&
      input.shadowRoot!.activeElement === identity &&
      input.value === 'malformed' &&
      getComputedStyle(identity!).backgroundColor === 'rgb(4, 5, 6)',
  );
  setPresentationDictionary(defaultPresentationDictionary);
  await settle(input, area, field);

  let calls = 0;
  field.validationMode = 'on-change';
  field.validationDebounce = 80;
  field.validator = () => {
    calls++;
    return null;
  };
  input.type = 'text';
  input.required = false;
  input.setValue('one');
  await new Promise((resolve) => setTimeout(resolve, 10));
  input.setValue('two');
  await new Promise((resolve) => setTimeout(resolve, 100));
  await settle(field, input);
  check(
    'change-validation-debounces-latest',
    calls === 1 && field.validityState.validity.valid === true,
    calls,
  );
  field.validationMode = 'on-blur';
  field.validationDebounce = 10000;
  calls = 0;
  input.setValue('blur');
  await settle(input, field);
  input.focus();
  area.focus();
  await settle(field, input, area);
  check(
    'blur-validation-ignores-change-debounce',
    calls === 1 && field.validityState.touched === true,
    calls,
  );
  field.remove();
  await settle(input);
  check(
    'aria-description-release-preserves-authored',
    native.getAttribute('aria-describedby') === 'authored-description',
    native.getAttribute('aria-describedby'),
  );
  form.remove();
  return results;
}
(window as unknown as { textAPI: Record<string, unknown> }).textAPI.runExtendedAssertions =
  runExtendedAssertions;

async function runLifecycleAssertions(): Promise<
  { name: string; passed: boolean; actual?: unknown }[]
> {
  const results: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, passed: boolean, actual?: unknown) =>
    results.push({ name, passed, actual });
  const field = new TpField();
  field.name = 'native-context';
  field.label = 'Native compatible control';
  const native = document.createElement('input');
  native.name = 'authored-native';
  native.value = 'native';
  native.setAttribute('aria-label', 'Authored label');
  field.append(native);
  byId('dynamic').append(field);
  await settle(field);
  check('native-control-field-name', native.name === 'native-context' && field.value === 'native');
  field.disabled = true;
  await settle(field);
  check('native-control-context-disability', native.disabled);
  field.disabled = false;
  await settle(field);
  check('native-control-context-enable', !native.disabled);
  const replacement = new TpInput();
  replacement.name = 'replacement';
  field.replaceChildren(replacement);
  await settle(field, replacement);
  check(
    'native-replacement-releases-context',
    native.name === 'authored-native' &&
      !native.disabled &&
      native.getAttribute('aria-label') === 'Authored label' &&
      !native.hasAttribute('data-invalid'),
  );
  replacement.disabled = true;
  replacement.invalid = true;
  replacement.readOnly = true;
  await settle(field, replacement);
  check(
    'authored-control-markers-inside-enabled-field',
    replacement.hasAttribute('data-disabled') &&
      replacement.hasAttribute('data-invalid') &&
      replacement.hasAttribute('data-readonly') &&
      !replacement.hasAttribute('data-valid') &&
      replacement.inputElement!.disabled &&
      replacement.inputElement!.readOnly,
  );
  field.remove();
  await settle(replacement);
  check(
    'authored-control-markers-after-context-clear',
    replacement.hasAttribute('data-disabled') &&
      replacement.hasAttribute('data-invalid') &&
      replacement.hasAttribute('data-readonly') &&
      !replacement.hasAttribute('data-valid'),
  );

  const checkField = new TpField();
  checkField.name = 'agree';
  checkField.label = 'Agree';
  const checkbox = document.createElement('tp-checkbox') as HTMLElement & {
    checked: boolean;
    defaultChecked?: boolean;
    value: string;
    setChecked(value: boolean): boolean;
    updateComplete: Promise<unknown>;
  };
  checkbox.value = 'submitted-payload';
  checkField.append(checkbox);
  byId('dynamic').append(checkField);
  await checkbox.updateComplete;
  await settle(checkField);
  check(
    'checkbox-field-domain-initial',
    checkField.value === false &&
      checkField.validityState.initialValue === false &&
      !checkField.validityState.filled,
  );
  checkbox.setChecked(true);
  await checkbox.updateComplete;
  await settle(checkField);
  check(
    'checkbox-field-domain-edited',
    checkField.value === true && checkField.validityState.dirty && checkField.validityState.filled,
    {
      value: checkField.value,
      initial: checkField.validityState.initialValue,
      dirty: checkField.validityState.dirty,
    },
  );
  checkField.remove();

  const form = new TpForm();
  form.nativeValidation = 'suppressed';
  byId('dynamic').append(form);
  await form.updateComplete;
  form.remove();
  const disconnectedInput = new TpInput();
  disconnectedInput.name = 'disconnected';
  disconnectedInput.defaultValue = 'one';
  form.append(disconnectedInput);
  byId('dynamic').append(form);
  await settle(disconnectedInput);
  const late = new TpInput();
  late.name = 'late';
  late.defaultValue = 'two';
  form.append(late);
  await settle(late, disconnectedInput);
  check(
    'form-reconnect-registers-new-children',
    form.form?.contains(disconnectedInput) === true &&
      form.form?.contains(late) === true &&
      new FormData(form.form!).get('late') === 'two',
  );
  const file = new TpInput();
  const sanitized = new TpInput();
  sanitized.type = 'number';
  sanitized.name = 'sanitized';
  sanitized.value = 'bad number';
  form.append(sanitized);
  await settle(sanitized);
  check(
    'native-sanitized-form-representation',
    sanitized.value === 'bad number' &&
      sanitized.inputElement!.value === '' &&
      new FormData(form.form!).get('sanitized') === '',
    {
      owner: sanitized.value,
      native: sanitized.inputElement!.value,
      serialized: new FormData(form.form!).get('sanitized'),
    },
  );
  file.type = 'file';
  file.name = 'file';
  form.append(file);
  await settle(file);
  const transfer = new DataTransfer();
  transfer.items.add(new File(['proof'], 'proof.txt', { type: 'text/plain' }));
  (file.inputElement as HTMLInputElement).files = transfer.files;
  file.inputElement!.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  await settle(file);
  const serialized = new FormData(form.form!).get('file');
  check(
    'native-file-list-api-serialization',
    serialized instanceof File && serialized.name === 'proof.txt' && serialized.size === 5,
    {
      name: serialized instanceof File ? serialized.name : null,
      size: serialized instanceof File ? serialized.size : null,
    },
  );
  file.clear();
  await settle(file);
  const emptyFile = new FormData(form.form!).get('file');
  check(
    'empty-native-file-participant',
    emptyFile instanceof File &&
      emptyFile.name === '' &&
      emptyFile.size === 0 &&
      emptyFile.type === 'application/octet-stream',
  );
  file.name = '';
  await settle(file);
  check('unnamed-native-file-omitted', !new FormData(form.form!).has(''));
  check(
    'native-file-clear-list',
    (file.inputElement as HTMLInputElement).files!.length === 0 && file.value === '',
  );
  form.remove();
  return results;
}
(window as unknown as { textAPI: Record<string, unknown> }).textAPI.runLifecycleAssertions =
  runLifecycleAssertions;

async function runSeparatorAssertions(): Promise<
  { name: string; passed: boolean; actual?: unknown }[]
> {
  const results: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, passed: boolean, actual?: unknown) =>
    results.push({ name, passed, actual });
  const field = new TpField();
  const caption = document.createElement('span');
  caption.slot = 'separator';
  caption.append('More ');
  const badge = document.createElement('tp-badge');
  badge.textContent = 'settings';
  caption.append(badge);
  field.append(caption);
  byId('dynamic').append(field);
  await settle(field);
  const wrapper = () => field.shadowRoot!.querySelector<HTMLElement>('[part=field-separator]')!;
  const label = () => wrapper().querySelector<HTMLElement>('.separator-content');
  const line = () => wrapper().querySelector<HTMLElement>('tp-separator')!;
  check(
    'separator-rich-caption-local-components',
    Boolean(label()?.querySelector('slot')?.assignedElements().includes(caption)) &&
      badge.constructor === customElements.get('tp-badge') &&
      line().constructor === customElements.get('tp-separator'),
  );
  const wrapperBox = wrapper().getBoundingClientRect();
  const lineBox = line().getBoundingClientRect();
  const labelBox = label()!.getBoundingClientRect();
  check(
    'separator-source-centered-line-caption',
    getComputedStyle(wrapper()).position === 'relative' &&
      getComputedStyle(line()).position === 'absolute' &&
      Math.abs(lineBox.top - wrapperBox.top - wrapperBox.height / 2) < 1 &&
      Math.abs(labelBox.left + labelBox.width / 2 - wrapperBox.left - wrapperBox.width / 2) < 1,
    { wrapper: wrapperBox.toJSON(), line: lineBox.toJSON(), label: labelBox.toJSON() },
  );
  field.partContracts = {
    'field-separator': { content: () => html`<strong>Custom caption</strong>` },
  };
  await settle(field);
  check(
    'separator-content-hook-retains-native-line',
    label()?.textContent?.trim() === 'Custom caption' &&
      Boolean(label()?.querySelector('strong')) &&
      line().constructor === customElements.get('tp-separator'),
  );
  field.style.setProperty('--tp-space-2', '12px');
  await settle(field);
  check(
    'separator-token-overrides',
    getComputedStyle(wrapper()).marginTop === '-12px' &&
      getComputedStyle(label()!).paddingInlineStart === '12px',
    {
      margin: getComputedStyle(wrapper()).marginTop,
      padding: getComputedStyle(label()!).paddingInlineStart,
    },
  );
  setPresentationDictionary(
    Object.fromEntries(Object.keys(defaultPresentationDictionary).map((key) => [key, []])),
  );
  await settle(field);
  const alternateWrapper = wrapper().getBoundingClientRect();
  const alternateLabel = label()!.getBoundingClientRect();
  check(
    'separator-structure-survives-full-dictionary-replacement',
    getComputedStyle(wrapper()).position === 'relative' &&
      getComputedStyle(line()).position === 'absolute' &&
      Math.abs(
        alternateLabel.left +
          alternateLabel.width / 2 -
          alternateWrapper.left -
          alternateWrapper.width / 2,
      ) < 1,
  );
  setPresentationDictionary(defaultPresentationDictionary);
  await settle(field);
  field.partContracts = { 'field-separator': { content: null } };
  await settle(field);
  check(
    'separator-empty-content-line-only',
    !label() && line().constructor === customElements.get('tp-separator'),
  );
  field.remove();
  return results;
}
(window as unknown as { textAPI: Record<string, unknown> }).textAPI.runSeparatorAssertions =
  runSeparatorAssertions;

async function runNativeSurfaceAssertions(): Promise<
  { name: string; passed: boolean; actual?: unknown }[]
> {
  const results: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, passed: boolean, actual?: unknown) =>
    results.push({ name, passed, actual });
  const input = new TpInput();
  const textarea = new TpTextArea();
  input.defaultValue = 'abcdef';
  textarea.defaultValue = 'abcdef';
  byId('dynamic').append(input, textarea);
  await settle(input, textarea);
  check(
    'input-native-defaults',
    input.type === 'text' &&
      input.min === '' &&
      input.max === '' &&
      input.step === '' &&
      input.pattern === '' &&
      input.placeholder === '' &&
      input.autocomplete === '' &&
      input.minLength === -1 &&
      input.maxLength === -1 &&
      !input.inputElement!.hasAttribute('minlength') &&
      !input.inputElement!.hasAttribute('maxlength'),
  );
  check(
    'textarea-native-defaults',
    textarea.rows === 2 &&
      textarea.resize === 'block' &&
      textarea.placeholder === '' &&
      textarea.autocomplete === '' &&
      textarea.minLength === -1 &&
      textarea.maxLength === -1,
  );
  for (const control of [input, textarea]) {
    control.placeholder = 'Native hint';
    control.autocomplete = 'off';
    control.minLength = 2;
    control.maxLength = 8;
    await settle(control);
    check(
      `${control.localName}-native-placeholder-autocomplete-length`,
      control.inputElement!.placeholder === 'Native hint' &&
        control.inputElement!.autocomplete === 'off' &&
        control.inputElement!.minLength === 2 &&
        control.inputElement!.maxLength === 8,
    );
    control.selectionStart = 1;
    control.selectionEnd = 4;
    control.selectionDirection = 'backward';
    check(
      `${control.localName}-native-selection-channels`,
      control.selectionStart === 1 &&
        control.selectionEnd === 4 &&
        control.selectionDirection === 'backward',
    );
    control.select();
    check(
      `${control.localName}-native-select-method`,
      control.selectionStart === 0 && control.selectionEnd === 6,
    );
    control.setSelectionRange(2, 5, 'forward');
    check(
      `${control.localName}-native-selection-range-method`,
      control.selectionStart === 2 &&
        control.selectionEnd === 5 &&
        control.selectionDirection === 'forward',
    );
    control.setRangeText('Z', 1, 3, 'select');
    await settle(control);
    check(
      `${control.localName}-native-range-text-method`,
      control.value === 'aZdef' &&
        control.inputElement!.value === 'aZdef' &&
        control.selectionStart === 1 &&
        control.selectionEnd === 2,
    );
  }
  input.type = 'number';
  await settle(input);
  check(
    'input-unavailable-selection-null',
    input.selectionStart === null &&
      input.selectionEnd === null &&
      input.selectionDirection === null,
  );
  input.remove();
  textarea.remove();
  return results;
}
(window as unknown as { textAPI: Record<string, unknown> }).textAPI.runNativeSurfaceAssertions =
  runNativeSurfaceAssertions;

async function runNestedSlotAssertions(
  keep = false,
): Promise<{ name: string; passed: boolean; actual?: unknown }[]> {
  const results: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, passed: boolean, actual?: unknown) =>
    results.push({ name, passed, actual });
  const outer = new TpField();
  outer.id = 'nested-slot-scenario';
  const child = new TpField();
  child.slot = 'group';
  const input = new TpInput();
  child.append(input);
  for (const [slot, text] of [
    ['label', 'Child label'],
    ['description', 'Child description'],
    ['legend', 'Child legend'],
    ['title', 'Child title'],
    ['separator', 'Child separator'],
  ]) {
    const member = document.createElement('span');
    member.slot = slot!;
    const strong = document.createElement('strong');
    strong.textContent = text!;
    member.append(strong);
    if (slot === 'label') member.setAttribute('native-label', 'false');
    child.append(member);
  }
  outer.append(child);
  byId('dynamic').append(outer);
  await settle(outer, child, input);
  check(
    'nested-rich-slots-no-phantom-parent-regions',
    ['field-label', 'field-description', 'field-legend', 'field-title', 'field-separator'].every(
      (part) => !outer.shadowRoot!.querySelector(`[part=${part}]`),
    ),
  );
  check(
    'nested-own-group-and-logical-control',
    outer.fieldSet &&
      outer.control === null &&
      child.control === input &&
      input.inputElement!.getAttribute('aria-label') === 'Child label',
  );
  check(
    'nested-child-rich-regions-remain-mounted',
    ['field-label', 'field-description', 'field-legend', 'field-title', 'field-separator'].every(
      (part) => !!child.shadowRoot!.querySelector(`[part=${part}]`),
    ),
  );
  const own = new TpInput();
  outer.label = 'Outer label';
  outer.append(own);
  await settle(outer, child, own, input);
  (outer.shadowRoot!.querySelector('tp-label') as HTMLElement).click();
  check(
    'nested-child-label-mode-does-not-disable-parent-label',
    outer.control === own &&
      own.shadowRoot!.activeElement === own.inputElement &&
      own.inputElement!.getAttribute('aria-label') === 'Outer label',
  );
  if (!keep) outer.remove();
  return results;
}
(window as unknown as { textAPI: Record<string, unknown> }).textAPI.runNestedSlotAssertions =
  runNestedSlotAssertions;
