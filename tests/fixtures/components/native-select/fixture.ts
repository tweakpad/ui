import { html, nothing } from 'lit';
import {
  TpNativeSelect,
  TpField,
  preventComponentHandling,
  plusIcon,
  defaultPresentationDictionary,
  setPresentationDictionary,
} from './runtime.js';
import type { TpNativeSelect as Select, TpField as Field } from './runtime.js';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
byId<Select>('no-indicator').partContracts = {
  'native-select-indicator': { renderDelegate: () => nothing },
};
(byId('custom-icon') as HTMLElement & { icon: unknown }).icon = plusIcon;
const controlled = new TpNativeSelect() as Select;
controlled.id = 'controlled';
controlled.label = 'Controlled picker';
controlled.value = 'a';
controlled.innerHTML = '<option value="a">Owner A</option><option value="b">Owner B</option>';
byId('controlled-owner').append(controlled);
const submissions: unknown[][] = [];
const log: unknown[] = [];
document.addEventListener('tp-value-change', (event) => {
  const e = event as CustomEvent;
  log.push({
    target: (event.target as HTMLElement).id,
    value: e.detail.value,
    reason: e.detail.reason,
    cancelable: e.cancelable,
    sourceType: e.detail.sourceEvent?.type,
  });
});
byId<HTMLFormElement>('form').addEventListener('submit', (event) => {
  event.preventDefault();
  submissions.push([...new FormData(event.currentTarget as HTMLFormElement)]);
});
async function settle(...elements: (Select | Field)[]): Promise<void> {
  for (let turn = 0; turn < 4; turn++) {
    await Promise.all(elements.map((el) => el.updateComplete));
    await new Promise<void>((resolve) => {
      let completed = false;
      const finish = () => {
        if (!completed) {
          completed = true;
          resolve();
        }
      };
      requestAnimationFrame(finish);
      setTimeout(finish, 32);
    });
  }
}
async function runAssertions() {
  const rows: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, passed: boolean, actual?: unknown) =>
    rows.push({ name, passed, actual });
  const visible = byId<Select>('main');
  const readonly = byId<Select>('readonly');
  await settle(visible, readonly);
  const visibleNative = visible.inputElement!;
  const indicator = visible.shadowRoot!.querySelector<HTMLElement>(
    '[part~="native-select-indicator"]',
  )!;
  const icon = indicator.querySelector<HTMLElement>('tp-icon')!;
  const bounds = visibleNative.getBoundingClientRect(),
    arrowBounds = indicator.getBoundingClientRect(),
    iconBounds = icon.getBoundingClientRect();
  check(
    'default-arrow-native-center-and-source-small-extent',
    Math.abs(arrowBounds.top + arrowBounds.height / 2 - (bounds.top + bounds.height / 2)) < 0.6 &&
      Math.abs(iconBounds.height - arrowBounds.height) < 0.6 &&
      Math.abs(iconBounds.width - arrowBounds.width) < 0.6 &&
      getComputedStyle(visibleNative).lineHeight === 'normal',
    {
      control: bounds.toJSON(),
      arrow: arrowBounds.toJSON(),
      icon: iconBounds.toJSON(),
      lineHeight: getComputedStyle(visibleNative).lineHeight,
    },
  );
  check(
    'readonly-distinct-neutral-paint-enabled-submission',
    getComputedStyle(readonly.inputElement!).backgroundColor !==
      getComputedStyle(visibleNative).backgroundColor &&
      getComputedStyle(readonly.inputElement!).cursor === 'default' &&
      !readonly.inputElement!.disabled &&
      readonly.inputElement!.getAttribute('aria-readonly') === 'true',
    {
      readonlyBackground: getComputedStyle(readonly.inputElement!).backgroundColor,
      editableBackground: getComputedStyle(visibleNative).backgroundColor,
    },
  );
  const form = document.createElement('form');
  byId('dynamic').append(form);
  const select = new TpNativeSelect() as Select;
  select.name = 'food';
  select.label = 'API food';
  select.innerHTML =
    '<optgroup label="Fruit"><option value="a">A</option><option value="b">B</option></optgroup><optgroup label="Veg"><option value="c">C</option><option value="d" disabled>D</option></optgroup>';
  form.append(select);
  await settle(select);
  const native = () => select.inputElement!;
  const data = () => [...new FormData(form)];
  check(
    'registered-native-anatomy-two-groups',
    native().localName === 'select' &&
      native().querySelectorAll('optgroup').length === 2 &&
      native().options.length === 4 &&
      select.value === 'a',
  );
  check(
    'single-form-entry-default',
    JSON.stringify(data()) === JSON.stringify([['food', 'a']]),
    data(),
  );
  select.focus();
  check('public-native-focus-target', native().matches(':focus'));
  select.blur();
  check('public-native-blur-target', !native().matches(':focus'));
  select.activateFromLabel();
  check('public-native-label-activation-target', native().matches(':focus'));
  select.blur();
  let reason = '',
    source: Event | undefined;
  select.addEventListener('tp-value-change', (event) => {
    const e = event as CustomEvent;
    reason = e.detail.reason;
    source = e.detail.sourceEvent;
  });
  const change = new Event('change', { bubbles: true });
  native().value = 'b';
  native().dispatchEvent(change);
  await settle(select);
  check(
    'native-change-shared-input-transaction',
    select.value === 'b' &&
      reason === 'input' &&
      source === change &&
      JSON.stringify(data()) === JSON.stringify([['food', 'b']]),
  );
  const veto = (event: Event) => event.preventDefault();
  select.addEventListener('tp-value-change', veto);
  native().value = 'c';
  native().dispatchEvent(new Event('change', { bubbles: true }));
  await settle(select);
  check(
    'native-change-veto-rolls-back-model-native-form',
    select.value === 'b' &&
      native().value === 'b' &&
      JSON.stringify(data()) === JSON.stringify([['food', 'b']]),
  );
  select.removeEventListener('tp-value-change', veto);
  select.hostProperties = {
    '@change': (event: Event) => preventComponentHandling(event),
    autocomplete: 'country-name',
    '.size': 3,
  };
  await settle(select);
  native().value = 'c';
  native().dispatchEvent(new Event('change', { bubbles: true }));
  await settle(select);
  check(
    'explicit-handler-prevention-native-rollback',
    select.value === 'b' && native().value === 'b',
  );
  check(
    'native-properties-row-size-distinct-visual-size',
    native().size === 3 &&
      native().getAttribute('autocomplete') === 'country-name' &&
      select.size === 'default',
  );
  select.hostProperties = {};
  select.defaultValue = 'c';
  form.reset();
  await settle(select);
  check(
    'latest-reset-default-and-form-reset-reason',
    select.value === 'c' && native().value === 'c' && reason === 'form-reset',
    [select.value, reason],
  );
  select.formStateRestoreCallback('"a"');
  await settle(select);
  check('platform-string-restoration', select.value === 'a' && native().value === 'a');
  native().selectedIndex = 1;
  select.selectedIndex = 1;
  await settle(select);
  check(
    'selected-index-shared-programmatic-proposal',
    select.value === 'b' && reason === 'programmatic',
  );
  select.setCustomValidity('Custom error');
  await settle(select);
  check(
    'native-custom-validity-internals-invalid',
    !select.checkValidity() &&
      native().validationMessage === 'Custom error' &&
      select.effectiveInvalid,
  );
  select.setCustomValidity('');
  await settle(select);
  check('custom-validity-cleared', select.checkValidity() && !select.effectiveInvalid);
  select.readOnly = true;
  await settle(select);
  native().value = 'c';
  native().dispatchEvent(new Event('change', { bubbles: true }));
  await settle(select);
  check(
    'read-only-native-rollback-still-submits',
    native().value === 'b' &&
      select.value === 'b' &&
      data().length === 1 &&
      native().getAttribute('aria-readonly') === 'true',
  );
  const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  native().dispatchEvent(tab);
  const arrow = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
  native().dispatchEvent(arrow);
  check('read-only-key-guard-preserves-tab', !tab.defaultPrevented && arrow.defaultPrevented);
  select.readOnly = false;
  select.disabled = true;
  await settle(select);
  check('disabled-native-serialization', native().disabled && data().length === 0);
  select.disabled = false;
  await settle(select);
  const sourceB = select.querySelector<HTMLOptionElement>('option[value="b"]')!;
  sourceB.textContent = 'Beta';
  sourceB.label = 'Explicit Beta';
  sourceB.disabled = true;
  await settle(select);
  check(
    'option-text-label-disabled-projection',
    native().options[1]!.text === 'Beta' &&
      native().options[1]!.label === 'Explicit Beta' &&
      native().options[1]!.disabled,
  );
  select.setValue('b');
  await settle(select);
  check('selected-disabled-option-native-excluded', native().value === 'b' && data().length === 0);
  sourceB.disabled = false;
  select.setValue('c');
  const veg = select.querySelectorAll('optgroup')[1]!;
  veg.disabled = true;
  await settle(select);
  check(
    'disabled-group-selected-excluded',
    native().value === 'c' &&
      native().querySelectorAll('optgroup')[1]!.disabled &&
      data().length === 0,
  );
  veg.disabled = false;
  select.querySelector('option[value="c"]')!.remove();
  await settle(select);
  check(
    'uncontrolled-removal-fallback-coherent',
    select.value === 'a' && native().value === 'a',
    select.value,
  );
  const first = select.querySelector('optgroup')!;
  first.label = 'Fresh group';
  select.prepend(veg);
  await settle(select);
  check(
    'groups-reorder-and-label-projection',
    native().querySelectorAll('optgroup')[1]!.label === 'Fresh group',
  );
  select.multiple = true;
  select.setValue(['a', 'd']);
  await settle(select);
  check(
    'multiple-native-selection-array',
    Array.isArray(select.value) &&
      native().multiple &&
      [...native().selectedOptions].map((option) => option.value).join(',') === 'd,a',
    [...native().selectedOptions].map((option) => option.value),
  );
  select.querySelector<HTMLOptionElement>('option[value="d"]')!.disabled = false;
  await settle(select);
  check(
    'multiple-form-entries-native-source-order',
    JSON.stringify(data()) ===
      JSON.stringify([
        ['food', 'd'],
        ['food', 'a'],
      ]),
    data(),
  );
  const restore = new FormData();
  restore.append('food', 'a');
  restore.append('food', 'b');
  select.formStateRestoreCallback(restore);
  await settle(select);
  check(
    'multiple-platform-form-data-restoration',
    JSON.stringify(select.value) === JSON.stringify(['a', 'b']) &&
      native().selectedOptions.length === 2,
  );
  select.defaultValue = ['b'];
  form.reset();
  await settle(select);
  check(
    'multiple-reset-default',
    JSON.stringify(select.value) === JSON.stringify(['b']) && native().selectedOptions.length === 1,
  );
  const controlledApi = new TpNativeSelect() as Select;
  controlledApi.name = 'owner';
  controlledApi.label = 'Owner API';
  controlledApi.value = 'a';
  controlledApi.innerHTML = '<option value="a">A</option><option value="b">B</option>';
  form.append(controlledApi);
  await settle(controlledApi);
  controlledApi.setValue('b');
  await settle(controlledApi);
  check(
    'controlled-owner-rejection',
    controlledApi.value === 'a' && controlledApi.inputElement!.value === 'a',
  );
  controlledApi.onValueChange = (event) => {
    controlledApi.value = event.detail.value;
  };
  controlledApi.setValue('b');
  await settle(controlledApi);
  check('controlled-synchronous-return', controlledApi.value === 'b');
  controlledApi.onValueChange = () => {
    controlledApi.value = 'a';
  };
  controlledApi.setValue('rewrite-proposal');
  await settle(controlledApi);
  check('controlled-owner-rewrite', controlledApi.value === 'a');
  controlledApi.onValueChange = (event) => {
    controlledApi.value = event.detail.value;
  };
  controlledApi.addEventListener('tp-value-change', veto);
  controlledApi.setValue('b');
  await settle(controlledApi);
  check(
    'controlled-late-veto-no-resurrection',
    controlledApi.value === 'a' && controlledApi.inputElement!.value === 'a',
  );
  controlledApi.removeEventListener('tp-value-change', veto);
  controlledApi.value = 'unknown';
  await settle(controlledApi);
  check(
    'controlled-unknown-no-fabricated-native-entry',
    controlledApi.value === 'unknown' &&
      controlledApi.inputElement!.selectedIndex === -1 &&
      !data().some(([name]) => name === 'owner'),
  );
  controlledApi.value = 'b';
  controlledApi.defaultValue = 'a';
  form.reset();
  await settle(controlledApi);
  check('controlled-reset-preserves-owner', controlledApi.value === 'b');
  controlledApi.formStateRestoreCallback('"a"');
  await settle(controlledApi);
  check('controlled-restoration-preserves-owner', controlledApi.value === 'b');
  const field = new TpField() as Field;
  field.label = 'Field name';
  field.description = 'Field help';
  field.name = 'associated';
  field.disabled = true;
  form.append(field);
  field.append(select);
  await settle(field, select);
  check(
    'field-name-disabled-accessible-association',
    select.name === 'food' &&
      select.effectiveName === 'associated' &&
      native().disabled &&
      native().getAttribute('aria-label') === 'Field name' &&
      !!native().getAttribute('aria-describedby'),
  );
  field.disabled = false;
  await settle(field, select);
  check('field-context-clearing-authored-preserved', !native().disabled && select.name === 'food');
  field.append(document.createElement('span'));
  select.required = true;
  select.setValue([]);
  await settle(field, select);
  check(
    'native-required-invalid-field',
    !select.checkValidity() && native().validity.valueMissing && select.effectiveInvalid,
  );
  select.required = false;
  select.multiple = false;
  select.setValue('a');
  await settle(field, select);
  const parts = [
    'native-select',
    'native-select-control',
    'native-select-option-group',
    'native-select-option',
    'native-select-indicator',
  ];
  const mounts: Record<string, number> = {};
  const cleanups: Record<string, number> = {};
  const states: Record<string, unknown[]> = {};
  select.partContracts = Object.fromEntries(
    parts.map((part) => [
      part,
      {
        classHook: () => `hook-${part}`,
        styleHook: () => ({ opacity: '0.85' }),
        hostProperties: { 'data-consumer-hook': 'yes' },
        elementReference: (element: HTMLElement | null) => {
          if (element) mounts[part] = (mounts[part] ?? 0) + 1;
          else cleanups[part] = (cleanups[part] ?? 0) + 1;
        },
        renderDelegate: ({
          state,
          content,
          bind,
        }: {
          state: unknown;
          content: unknown;
          bind: unknown;
        }) => {
          (states[part] ??= []).push(state);
          return part === 'native-select-control'
            ? html`<select ${bind}>
                ${content}
              </select>`
            : part === 'native-select-option-group'
              ? html`<optgroup ${bind}>${content}</optgroup>`
              : part === 'native-select-option'
                ? html`<option ${bind}>${content}</option>`
                : part === 'native-select-indicator'
                  ? html`<span ${bind}>${content}</span>`
                  : html`<div ${bind}>${content}</div>`;
        },
      },
    ]),
  );
  await settle(field, select);
  for (const part of parts) {
    const nodes = [...select.shadowRoot!.querySelectorAll<HTMLElement>(`[part~="${part}"]`)];
    check(
      `all-hooks-delegate-ref-${part}`,
      nodes.length > 0 &&
        nodes.every(
          (node) =>
            node.classList.contains(`hook-${part}`) &&
            node.style.opacity === '0.85' &&
            node.getAttribute('data-consumer-hook') === 'yes',
        ) &&
        (mounts[part] ?? 0) >= nodes.length &&
        (states[part]?.length ?? 0) > 0,
    );
  }
  check(
    'delegate-native-selection-form-coherent',
    native().value === 'a' &&
      select.value === 'a' &&
      data().some(([name, value]) => name === 'associated' && value === 'a'),
  );
  select.remove();
  await settle(field, select);
  for (const part of parts) check(`ref-disconnect-cleanup-${part}`, (cleanups[part] ?? 0) > 0);
  field.append(select);
  await settle(field, select);
  check(
    'delegate-reconnect-native-mounted',
    native().localName === 'select' && native().value === 'a',
  );
  select.partContracts = { 'native-select-indicator': { renderDelegate: () => nothing } };
  await settle(select);
  check(
    'indicator-absent-native-arrow-restored',
    !select.shadowRoot!.querySelector('[part~="native-select-indicator"]') &&
      getComputedStyle(native()).appearance !== 'none',
  );
  check(
    'shared-input-textarea-field-regression',
    byId<HTMLElement & { value: string }>('input').value === 'Ada' &&
      byId<HTMLElement & { value: string }>('area').value === 'Two lines' &&
      JSON.stringify([...new FormData(byId<HTMLFormElement>('text-form'))]) ===
        JSON.stringify([
          ['name', 'Ada'],
          ['notes', 'Two lines'],
        ]),
  );
  select.partContracts = {};
  await settle(select);
  const attrsSource = select.querySelector<HTMLOptionElement>('option[value="a"]')!;
  attrsSource.title = 'Authored hint';
  attrsSource.className = 'authored-option';
  attrsSource.dataset.neutral = 'yes';
  attrsSource.style.color = 'rgb(18, 52, 86)';
  await settle(select);
  const projectedA = () => [...native().options].find((option) => option.value === 'a')!;
  check(
    'neutral-authored-option-attributes-projected',
    projectedA().title === 'Authored hint' &&
      projectedA().classList.contains('authored-option') &&
      projectedA().dataset.neutral === 'yes' &&
      projectedA().style.color === 'rgb(18, 52, 86)',
  );
  let inputRef: HTMLElement | null = null;
  select.inputElementReference = (element) => {
    inputRef = element;
  };
  await settle(select);
  check('input-element-reference-mount', inputRef === native());
  select.partContracts = {
    'native-select-control': {
      hostProperties: { 'aria-label': 'Consumer name', '.size': 2 },
      renderDelegate: ({ bind, content }) =>
        html`<select ${bind}>
          ${content}
        </select>`,
    },
  };
  await settle(select);
  check('native-delegate-reference-replacement', inputRef === native() && native().size === 2);
  // Field keeps its own name above the native consumer fallback. Clearing association restores the consumer name.
  field.removeChild(select);
  form.append(select);
  await settle(field, select);
  check(
    'control-consumer-name-after-field-clear',
    native().getAttribute('aria-label') === 'Consumer name',
  );
  const outside = document.createElement('form');
  outside.id = 'native-api-external';
  document.body.append(outside);
  select.formOwner = outside;
  await settle(select);
  check(
    'external-form-element-identity-and-single-entry',
    select.formOwner === outside &&
      !data().some(([key]) => key === 'food') &&
      JSON.stringify([...new FormData(outside)]) === JSON.stringify([['food', 'a']]),
  );
  select.formOwner = null;
  await settle(select);
  outside.remove();
  check(
    'external-form-cleared-returns-entry',
    data().some(([key, value]) => key === 'food' && value === 'a'),
  );
  const fieldset = document.createElement('fieldset');
  form.append(fieldset);
  fieldset.append(select);
  fieldset.disabled = true;
  await settle(select);
  check(
    'native-fieldset-disable-preserves-authored-flag',
    native().disabled && select.disabled === false && !data().some(([key]) => key === 'food'),
  );
  fieldset.disabled = false;
  await settle(select);
  check(
    'native-fieldset-cleared-restores-authored',
    !native().disabled && select.disabled === false,
  );
  select.disabled = true;
  fieldset.disabled = true;
  await settle(select);
  fieldset.disabled = false;
  await settle(select);
  check('authored-disabled-survives-fieldset-clear', native().disabled && select.disabled === true);
  select.disabled = false;
  await settle(select);
  select.partContracts = {
    'native-select-option': { content: (state) => `Choice ${state.optionValue}` },
  };
  await settle(select);
  check(
    'native-option-content-resolver-visible-text',
    projectedA().text === 'Choice a' && projectedA().label === 'Choice a' && native().value === 'a',
  );
  select.partContracts = {
    'native-select-option-group': {
      content: html`<option value="a">Consumer group option</option>`,
    },
  };
  await settle(select);
  check(
    'native-group-content-preserves-native-children',
    native().querySelectorAll('optgroup').length === 2 &&
      native().querySelectorAll('optgroup option').length === 2 &&
      native().value === 'a',
  );
  select.partContracts = {
    'native-select-indicator': { content: html`<tp-icon .icon=${plusIcon}></tp-icon>` },
  };
  await settle(select);
  check(
    'indicator-content-actual-icon-decoration',
    select.shadowRoot!.querySelector('[part~="native-select-indicator"] tp-icon')?.localName ===
      'tp-icon' &&
      select
        .shadowRoot!.querySelector('[part~="native-select-indicator"]')!
        .getAttribute('aria-hidden') === 'true',
  );
  select.partContracts = {};
  select.partPresentation = {
    'native-select-control': {
      classHook: 'presentation-control',
      styleHook: { 'border-color': 'rgb(10, 20, 30)' },
    },
  };
  await settle(select);
  check(
    'part-presentation-paint-preserves-native-value',
    native().classList.contains('presentation-control') &&
      native().style.borderColor === 'rgb(10, 20, 30)' &&
      native().value === 'a',
  );
  select.partPresentation = {};
  select.style.setProperty('--tp-input', 'rgb(20, 40, 60)');
  select.style.setProperty('--tp-spacing', '4px');
  select.size = 'sm';
  await settle(select);
  check(
    'scoped-token-small-geometry-paint',
    getComputedStyle(native()).height === '28px' &&
      getComputedStyle(native()).borderColor === 'rgb(20, 40, 60)' &&
      native().value === 'a',
    getComputedStyle(native()).height,
  );
  try {
    setPresentationDictionary({
      'native-select-control': [
        {
          declarations: {
            background: 'rgb(24, 48, 72)',
            color: 'rgb(240, 240, 240)',
            padding: '4px',
            border: '1px solid rgb(80, 90, 100)',
          },
        },
      ],
    });
    await settle(select);
    check(
      'full-native-dictionary-replacement-behavior-anatomy',
      getComputedStyle(native()).backgroundColor === 'rgb(24, 48, 72)' &&
        native().localName === 'select' &&
        native().querySelectorAll('optgroup').length === 2 &&
        native().value === 'a' &&
        data().some(([key, value]) => key === 'food' && value === 'a') &&
        getComputedStyle(select.shadowRoot!.querySelector('[part~="native-select-indicator"]')!)
          .pointerEvents === 'none',
    );
  } finally {
    setPresentationDictionary(defaultPresentationDictionary);
  }
  select.remove();
  await settle(select);
  check('input-element-reference-null-on-disconnect', inputRef === null);
  fieldset.append(select);
  await settle(select);
  check('input-element-reference-on-reconnect', inputRef === native());
  const frame = document.createElement('iframe');
  frame.title = 'Native adoption test';
  document.body.append(frame);
  const foreignDoc = frame.contentDocument!;
  foreignDoc.body.innerHTML = '<form id="foreign-form"></form>';
  await new Promise<void>((resolve, reject) => {
    const link = foreignDoc.createElement('link');
    link.rel = 'stylesheet';
    link.href = location.pathname.endsWith('/package.html')
      ? '/dist/styles.css'
      : '/src/styles.css';
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Native adoption stylesheet failed'));
    foreignDoc.head.append(link);
    setTimeout(() => reject(new Error('Native adoption stylesheet timed out')), 3000);
  });
  const adopted = new TpNativeSelect() as Select;
  adopted.name = 'adopted';
  adopted.label = 'Adopted food';
  adopted.defaultValue = 'b';
  adopted.innerHTML = '<option value="a">A</option><option value="b">B</option>';
  form.append(adopted);
  await settle(adopted);
  const oldControl = adopted.inputElement!;
  foreignDoc.getElementById('foreign-form')!.append(foreignDoc.adoptNode(adopted));
  await settle(adopted);
  check(
    'iframe-adoption-native-owner-form-and-paint',
    adopted.ownerDocument === foreignDoc &&
      adopted.inputElement === oldControl &&
      adopted.inputElement!.ownerDocument === foreignDoc &&
      [
        ...new frame.contentWindow!.FormData(
          foreignDoc.getElementById('foreign-form') as HTMLFormElement,
        ),
      ].some(([key, value]) => key === 'adopted' && value === 'b') &&
      getComputedStyle(adopted.inputElement!).borderStyle === 'solid',
  );
  let foreignTrigger: EventTarget | null = null;
  adopted.onValueChange = (event) => {
    foreignTrigger = event.detail.trigger ?? null;
  };
  adopted.inputElement!.value = 'a';
  const foreignEvent = new frame.contentWindow!.Event('change', { bubbles: true });
  adopted.inputElement!.dispatchEvent(foreignEvent);
  await settle(adopted);
  check(
    'foreign-native-change-source-trigger-commit',
    foreignTrigger === adopted.inputElement &&
      adopted.value === 'a' &&
      adopted.inputElement!.value === 'a',
  );
  frame.remove();
  const customField = new TpField() as Field;
  customField.label = 'Custom option content';
  const custom = new TpNativeSelect() as Select;
  custom.name = 'custom';
  custom.partContracts = {
    'native-select-control': {
      content: html`<option value="custom-a">Custom A</option>
        <option value="custom-b" selected>Custom B</option>`,
    },
  };
  let initialProposals = 0;
  custom.addEventListener('tp-value-change', () => initialProposals++);
  customField.append(custom);
  form.append(customField);
  await settle(customField, custom);
  check(
    'control-content-native-initial-default-and-form',
    custom.children.length === 0 &&
      custom.value === 'custom-b' &&
      custom.inputElement!.value === 'custom-b' &&
      data().some(([key, value]) => key === 'custom' && value === 'custom-b') &&
      initialProposals === 0,
    [custom.value, custom.inputElement!.value, initialProposals],
  );
  check(
    'control-content-field-initial-baseline-not-dirty',
    customField.validityState.initialValue === 'custom-b' &&
      customField.validityState.dirty === false,
    customField.validityState,
  );
  custom.setValue('custom-a');
  await settle(customField, custom);
  check(
    'control-content-accepted-edit-dirties-field',
    custom.value === 'custom-a' &&
      customField.validityState.dirty === true &&
      customField.validityState.initialValue === 'custom-b',
    customField.validityState,
  );
  form.reset();
  await settle(customField, custom);
  check(
    'control-content-native-default-reset-restores-baseline',
    custom.value === 'custom-b' &&
      customField.validityState.dirty === false &&
      data().some(([key, value]) => key === 'custom' && value === 'custom-b'),
  );
  custom.partContracts = {
    'native-select-control': { content: html`<option value="next">Next</option>` },
  };
  await settle(customField, custom);
  check(
    'control-content-dynamic-options-reconcile-owner',
    custom.value === 'next' &&
      custom.inputElement!.value === 'next' &&
      customField.validityState.dirty === true,
  );
  const replacement = new TpNativeSelect() as Select;
  replacement.partContracts = {
    'native-select-control': {
      content: html`<option value="replacement" selected>Replacement</option>`,
    },
  };
  custom.replaceWith(replacement);
  await settle(customField, replacement);
  check(
    'field-replacement-cannot-rebase-initial',
    customField.validityState.initialValue === 'custom-b' &&
      customField.validityState.dirty === true,
    customField.validityState,
  );
  const customMultiple = new TpNativeSelect() as Select;
  customMultiple.name = 'custom-many';
  customMultiple.multiple = true;
  customMultiple.partContracts = {
    'native-select-control': {
      content: html`<option value="x" selected>X</option>
        <option value="y" selected>Y</option>`,
    },
  };
  form.append(customMultiple);
  await settle(customMultiple);
  check(
    'control-content-multiple-native-defaults-and-order',
    JSON.stringify(customMultiple.value) === '["x","y"]' &&
      JSON.stringify(data().filter(([key]) => key === 'custom-many')) ===
        '[["custom-many","x"],["custom-many","y"]]',
  );
  customMultiple.partContracts = {
    'native-select-control': {
      content: html`<option value="y" selected>Y</option>
        <option value="z">Z</option>`,
    },
  };
  await settle(customMultiple);
  check(
    'control-content-multiple-removal-filters-existing-owner',
    JSON.stringify(customMultiple.value) === '["y"]' &&
      customMultiple.inputElement!.selectedOptions[0]?.value === 'y',
  );
  form.reset();
  await settle(customMultiple);
  check(
    'control-content-multiple-reset-native-authored-defaults',
    JSON.stringify(customMultiple.value) === '["y"]',
  );
  const omitted = new TpNativeSelect() as Select;
  omitted.name = 'omitted';
  omitted.required = true;
  omitted.defaultValue = 'kept';
  omitted.innerHTML = '<option value="kept">Kept</option>';
  form.append(omitted);
  await settle(omitted);
  omitted.setCustomValidity('Saved custom error');
  check(
    'control-omission-initial-native-validity-and-entry',
    data().some(([key, value]) => key === 'omitted' && value === 'kept') &&
      omitted.validity?.customError === true,
  );
  omitted.partContracts = { 'native-select-control': { renderDelegate: () => nothing } };
  await settle(omitted);
  check(
    'control-omission-clears-entry-and-native-validity',
    omitted.inputElement === null &&
      !data().some(([key]) => key === 'omitted') &&
      omitted.value === 'kept' &&
      omitted.validity?.valid === true,
  );
  omitted.partContracts = {};
  await settle(omitted);
  check(
    'control-restoration-restores-entry-and-custom-validity',
    omitted.inputElement?.value === 'kept' &&
      data().some(([key, value]) => key === 'omitted' && value === 'kept') &&
      omitted.validity?.customError === true &&
      omitted.validationMessage === 'Saved custom error',
  );
  const initiallyOmitted = new TpNativeSelect() as Select;
  initiallyOmitted.name = 'initially-omitted';
  initiallyOmitted.partContracts = { 'native-select-control': { renderDelegate: () => nothing } };
  form.append(initiallyOmitted);
  await settle(initiallyOmitted);
  check(
    'initial-control-omission-no-native-entry',
    initiallyOmitted.inputElement === null && !data().some(([key]) => key === 'initially-omitted'),
  );
  initiallyOmitted.partContracts = {
    'native-select-control': {
      content: html`<option value="first">First native option</option>
        <option value="chosen" selected>Chosen native option</option>`,
    },
  };
  await settle(initiallyOmitted);
  check(
    'initial-control-restoration-discovers-native-default',
    initiallyOmitted.value === 'chosen' &&
      initiallyOmitted.inputElement?.value === 'chosen' &&
      data().some(([key, value]) => key === 'initially-omitted' && value === 'chosen'),
  );
  form.remove();
  return rows;
}
Object.assign(window, {
  nativeSelectAPI: {
    byId,
    controlled,
    log,
    get submissions() {
      return submissions;
    },
    settle,
    runAssertions,
    ready: Promise.all(
      [...document.querySelectorAll<Select>('tp-native-select')].map((el) => el.updateComplete),
    ),
  },
});
