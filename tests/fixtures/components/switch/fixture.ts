import { html, nothing } from 'lit';
import {
  TpSwitch,
  TpCheckbox,
  TpIcon,
  TpField,
  TpForm,
  CheckboxGroupController,
  preventComponentHandling,
  plusIcon,
  defaultPresentationDictionary,
  setPresentationDictionary,
} from './runtime.js';
import type { TpSwitch as Switch, TpCheckbox as Checkbox, TpField as Field } from './runtime.js';
import type { TpValueChangeEvent } from '../../../../src/foundation/events.js';
import type { TpMotionRequestEvent } from '../../../../src/foundation/motion.js';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
byId<Switch>('no-thumb').partContracts = { 'switch-thumb': { renderDelegate: () => nothing } };
byId<Switch>('rich').partContracts = {
  'switch-thumb': { content: html`<tp-icon .icon=${plusIcon} size="100%"></tp-icon>` },
};
const group = new CheckboxGroupController(byId('group'), {
  defaultValue: ['read'],
  allValues: ['read', 'write'],
});
const events: unknown[] = [],
  submissions: unknown[] = [];
document.addEventListener('tp-value-change', (event) => {
  const e = event as TpValueChangeEvent<boolean>;
  events.push({
    target: (event.target as HTMLElement).id,
    value: e.detail.value,
    previous: e.detail.previousValue,
    reason: e.detail.reason,
    source: e.detail.sourceEvent?.type,
    cancelable: e.cancelable,
  });
});
byId<HTMLFormElement>('form').addEventListener('submit', (event) => {
  event.preventDefault();
  submissions.push([...new FormData(event.currentTarget as HTMLFormElement)]);
});
async function settle(...elements: (Switch | Checkbox | Field)[]): Promise<void> {
  for (let n = 0; n < 4; n++) {
    await Promise.all(elements.map((el) => el.updateComplete));
    await new Promise<void>((resolve) => {
      const win = elements[0]?.ownerDocument.defaultView ?? window;
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      win.requestAnimationFrame(finish);
      win.setTimeout(finish, 32);
    });
  }
}
async function runAssertions() {
  const rows: { name: string; passed: boolean; actual?: unknown }[] = [];
  const check = (name: string, passed: boolean, actual?: unknown) =>
    rows.push({ name, passed, actual });
  const form = document.createElement('form');
  document.body.append(form);
  const setting = new TpSwitch();
  let initialState: Readonly<Record<string, unknown>> | undefined;
  setting.partContracts = {
    switch: {
      classHook: (state) => {
        initialState = state;
        return '';
      },
    },
  };
  setting.name = 'setting';
  setting.setAttribute('aria-label', 'Test setting');
  form.append(setting);
  await settle(setting);
  const control = () => setting.controlElement!;
  const thumb = () => setting.shadowRoot!.querySelector<HTMLElement>('[part~="switch-thumb"]')!;
  const data = () => [...new FormData(form)];
  check(
    'registered-switch-and-shared-checkbox-owner',
    setting instanceof TpCheckbox &&
      control().getAttribute('role') === 'switch' &&
      setting.inputElement?.localName === 'input',
  );
  check(
    'default-uncontrolled-false-no-entry',
    !setting.checked &&
      setting.inputElement?.getAttribute('type') === 'checkbox' &&
      data().length === 0,
  );
  check(
    'unknown-validity-snapshot-no-valid-markers',
    initialState?.valid === null &&
      !control().hasAttribute('data-valid') &&
      !thumb().hasAttribute('data-valid'),
  );
  setting.partContracts = {};
  await settle(setting);
  const firstThumb = thumb();
  setting.setChecked(true);
  await settle(setting);
  check(
    'shared-setchecked-native-aria-form',
    setting.checked &&
      (setting.inputElement as HTMLInputElement).checked &&
      control().getAttribute('aria-checked') === 'true' &&
      data()[0]?.[1] === 'on',
  );
  check(
    'thumb-always-mounted-same-identity',
    thumb() === firstThumb &&
      thumb().hasAttribute('data-checked') &&
      !thumb().hasAttribute('data-presence'),
  );
  setting.indeterminate = true;
  setting.parent = true;
  await settle(setting);
  check(
    'switch-rejects-mixed-and-parent-form-policy',
    !setting.indeterminate &&
      control().getAttribute('aria-checked') === 'true' &&
      data()[0]?.[1] === 'on',
  );
  setting.uncheckedValue = 'off';
  setting.setChecked(false);
  await settle(setting);
  check('custom-unchecked-value', data()[0]?.[1] === 'off');
  setting.value = 'enabled';
  setting.setChecked(true);
  await settle(setting);
  check('custom-checked-payload', data()[0]?.[1] === 'enabled');
  setting.addEventListener('tp-value-change', (event) => event.preventDefault(), { once: true });
  setting.setChecked(false);
  await settle(setting);
  check(
    'dom-veto-restores-native-owner-form',
    setting.checked &&
      (setting.inputElement as HTMLInputElement).checked &&
      data()[0]?.[1] === 'enabled',
  );
  setting.onCheckedChange = (event) => event.preventDefault();
  setting.setChecked(false);
  await settle(setting);
  check('callback-veto-retains-state', setting.checked);
  setting.onCheckedChange = undefined;
  setting.defaultChecked = false;
  form.reset();
  await settle(setting);
  check('uncontrolled-reset-latest-default', !setting.checked && data()[0]?.[1] === 'off');
  setting.formStateRestoreCallback('true');
  await settle(setting);
  check('platform-restoration-boolean-string', setting.checked);
  setting.readOnly = true;
  await settle(setting);
  control().click();
  await settle(setting);
  check(
    'readonly-rejects-press-still-submits',
    setting.checked &&
      data()[0]?.[1] === 'enabled' &&
      control().getAttribute('aria-readonly') === 'true',
  );
  setting.disabled = true;
  await settle(setting);
  check('disabled-negative-tabindex-no-entry', control().tabIndex === -1 && data().length === 0);
  setting.disabled = false;
  setting.readOnly = false;
  setting.required = true;
  setting.setChecked(false);
  setting.uncheckedValue = undefined;
  await settle(setting);
  check(
    'required-unchecked-native-validity',
    !setting.checkValidity() &&
      control().getAttribute('aria-required') === 'true' &&
      setting.effectiveInvalid,
  );
  setting.setChecked(true);
  await settle(setting);
  check('required-checked-valid', setting.checkValidity());
  const controlled = new TpSwitch();
  controlled.checked = false;
  controlled.name = 'controlled';
  controlled.setAttribute('aria-label', 'Controlled');
  form.append(controlled);
  await settle(controlled);
  controlled.setChecked(true);
  await settle(controlled);
  check('controlled-owner-rejection', !controlled.checked);
  controlled.onCheckedChange = (e) => {
    controlled.checked = e.detail.value;
  };
  controlled.setChecked(true);
  await settle(controlled);
  check('controlled-synchronous-owner-return', controlled.checked);
  controlled.onCheckedChange = () => {
    controlled.checked = false;
  };
  controlled.setChecked(false);
  await settle(controlled);
  check('controlled-owner-rewrite', !controlled.checked);
  controlled.onCheckedChange = (e) => {
    controlled.checked = e.detail.value;
  };
  controlled.addEventListener('tp-value-change', (e) => e.preventDefault(), { once: true });
  controlled.setChecked(true);
  await settle(controlled);
  check(
    'controlled-late-veto-no-resurrection',
    !controlled.checked && !(controlled.inputElement as HTMLInputElement).checked,
  );
  controlled.checked = true;
  controlled.defaultChecked = false;
  form.reset();
  await settle(controlled);
  check('controlled-reset-preserves-owner', controlled.checked);
  controlled.formStateRestoreCallback('false');
  await settle(controlled);
  check('controlled-restoration-preserves-owner', controlled.checked);
  check('form-reset-also-restores-uncontrolled-peer', !setting.checked);
  setting.setChecked(true);
  await settle(setting);
  let inputRef: HTMLElement | null = null;
  setting.inputElementReference = (element) => {
    inputRef = element;
  };
  await settle(setting);
  check('native-input-reference-mount', inputRef === setting.inputElement);
  setting.identifier = 'setting-control';
  await settle(setting);
  check('authored-control-identifier', control().id === 'setting-control');
  setting.focus();
  check('public-focus-target', setting.shadowRoot!.activeElement === control());
  setting.blur();
  check('public-blur-target', setting.shadowRoot!.activeElement !== control());
  const external = document.createElement('form');
  external.id = 'external-switch';
  document.body.append(external);
  setting.formOwner = external;
  await settle(setting);
  check(
    'external-form-single-entry-identity',
    setting.formOwner === external &&
      !data().some(([key]) => key === 'setting') &&
      [...new FormData(external)].filter(([key]) => key === 'setting').length === 1,
  );
  setting.formOwner = undefined;
  await settle(setting);
  check(
    'external-form-cleared-returns-entry',
    data().some(([key]) => key === 'setting'),
  );
  external.remove();
  setting.nativeAction = true;
  await settle(setting);
  check(
    'native-action-button-switch-not-submit',
    control().localName === 'button' &&
      (control() as HTMLButtonElement).type === 'button' &&
      control().getAttribute('role') === 'switch',
  );
  setting.partContracts = {
    switch: { hostProperties: { '@click': (e: Event) => preventComponentHandling(e) } },
  };
  await settle(setting);
  const before = setting.checked;
  control().click();
  await settle(setting);
  check('explicit-handler-prevention-retains-state', setting.checked === before);
  setting.partContracts = {
    switch: {
      hostProperties: { role: 'button', 'aria-checked': 'false', tabindex: -1, type: 'submit' },
    },
  };
  await settle(setting);
  check(
    'root-host-protected-semantics',
    control().getAttribute('role') === 'switch' &&
      control().getAttribute('aria-checked') === String(setting.checked) &&
      control().tabIndex === 0 &&
      control().getAttribute('type') === 'button',
  );
  setting.partContracts = {
    'switch-thumb': { hostProperties: { 'aria-hidden': 'false', tabindex: 0 } },
  };
  await settle(setting);
  check(
    'thumb-host-protected-presentational-semantics',
    thumb().getAttribute('aria-hidden') === 'true' && thumb().tabIndex === -1,
  );
  setting.partContracts = {};
  const refs = new Map<string, (HTMLElement | null)[]>();
  for (const name of ['switch', 'switch-thumb']) {
    const history: (HTMLElement | null)[] = [];
    refs.set(name, history);
    setting.partContracts = {
      ...setting.partContracts,
      [name]: {
        hostProperties: { title: name },
        classHook: (state) => (state.checked ? 'consumer-on' : 'consumer-off'),
        styleHook: { outlineOffset: '7px' },
        elementReference: (element) => history.push(element),
        renderDelegate: ({ bind, content }) =>
          name === 'switch'
            ? html`<button ${bind}>${content}</button>`
            : html`<span ${bind}>${content}</span>`,
      },
    };
    await settle(setting);
    const el = setting.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`)!;
    check(
      `all-host-class-style-ref-delegate-${name}`,
      el.title === name &&
        el.classList.contains('consumer-on') &&
        el.style.outlineOffset === '7px' &&
        history.at(-1) === el,
    );
  }
  let rootSnapshot: Readonly<Record<string, unknown>> | undefined,
    thumbSnapshot: Readonly<Record<string, unknown>> | undefined;
  setting.partContracts = {
    switch: {
      content: (state) => {
        rootSnapshot = state;
        return html`<span>Owned content</span>`;
      },
    },
    'switch-thumb': {
      content: (state) => {
        thumbSnapshot = state;
        return html`<tp-icon .icon=${plusIcon} size="100%"></tp-icon>`;
      },
    },
  };
  await settle(setting);
  check(
    'replaced-root-thumb-refs-cleared',
    refs.get('switch')?.at(-1) === null && refs.get('switch-thumb')?.at(-1) === null,
  );
  check(
    'root-content-hook-committed-snapshot',
    rootSnapshot?.checked === setting.checked &&
      Object.isFrozen(rootSnapshot) &&
      control().textContent?.includes('Owned content'),
  );
  setting.partContracts = {
    'switch-thumb': {
      content: (state) => {
        thumbSnapshot = state;
        return html`<tp-icon .icon=${plusIcon} size="100%"></tp-icon>`;
      },
    },
  };
  await settle(setting);
  check(
    'thumb-content-registered-icon-snapshot',
    thumbSnapshot?.checked === setting.checked &&
      Object.isFrozen(thumbSnapshot) &&
      thumb().querySelector('tp-icon') instanceof TpIcon,
  );
  setting.partContracts = { 'switch-thumb': { renderDelegate: () => nothing } };
  await settle(setting);
  check(
    'optional-thumb-omission-independent-owner',
    !setting.shadowRoot!.querySelector('[part~="switch-thumb"]') &&
      setting.checked &&
      data().some(([key]) => key === 'setting'),
  );
  setting.partContracts = {};
  await settle(setting);
  check('optional-thumb-restoration', !!thumb() && setting.checked);
  setting.motionPolicy = 'reduce';
  await settle(setting);
  setting.partPresentation = {
    switch: { classHook: 'presentation-switch', styleHook: { background: 'rgb(20, 40, 60)' } },
  };
  await settle(setting);
  check(
    'per-part-presentation-retains-value',
    control().classList.contains('presentation-switch') &&
      getComputedStyle(control()).backgroundColor === 'rgb(20, 40, 60)' &&
      setting.checked,
    {
      classes: control().className,
      inline: control().style.cssText,
      background: getComputedStyle(control()).backgroundColor,
      checked: setting.checked,
    },
  );
  setting.partPresentation = {};
  setting.style.setProperty('--tp-primary', 'rgb(30, 60, 90)');
  await settle(setting);
  check('scoped-primary-token', getComputedStyle(control()).backgroundColor === 'rgb(30, 60, 90)', {
    background: getComputedStyle(control()).backgroundColor,
    inline: control().style.cssText,
    checked: setting.checked,
  });
  setting.partContracts = {
    switch: { styleHook: { inlineSize: '60px' } },
    'switch-thumb': { styleHook: { inlineSize: '10px', blockSize: '10px' } },
  };
  setting.motionPolicy = 'reduce';
  await settle(setting);
  const cr = control().getBoundingClientRect(),
    tr = thumb().getBoundingClientRect();
  check(
    'public-width-override-two-rest-geometry',
    Math.abs(cr.right - tr.right - parseFloat(getComputedStyle(control()).borderRightWidth)) < 0.1,
    { control: cr.toJSON(), thumb: tr.toJSON() },
  );
  setting.setAttribute('dir', 'rtl');
  await settle(setting);
  const rtlC = control().getBoundingClientRect(),
    rtlT = thumb().getBoundingClientRect();
  check(
    'rtl-trailing-rest-geometry',
    Math.abs(rtlT.left - rtlC.left - parseFloat(getComputedStyle(control()).borderLeftWidth)) < 0.1,
    { control: rtlC.toJSON(), thumb: rtlT.toJSON() },
  );
  setting.removeAttribute('dir');
  setting.partContracts = {};
  try {
    setPresentationDictionary({
      switch: [{ declarations: { background: 'rgb(24, 48, 72)' } }],
      'switch-thumb': [{ declarations: { background: 'rgb(240, 240, 240)' } }],
    });
    await settle(setting);
    check(
      'full-dictionary-replacement-preserves-structure-state',
      getComputedStyle(control()).backgroundColor === 'rgb(24, 48, 72)' &&
        control().getBoundingClientRect().width > 0 &&
        thumb().getBoundingClientRect().width > 0 &&
        control().getAttribute('role') === 'switch' &&
        setting.checked &&
        data().some(([key]) => key === 'setting'),
    );
  } finally {
    setPresentationDictionary(defaultPresentationDictionary);
  }
  const field = new TpField();
  field.label = 'Field setting';
  field.name = 'field-setting';
  field.disabled = true;
  const child = new TpSwitch();
  child.name = 'authored';
  child.disabled = true;
  field.append(child);
  form.append(field);
  await settle(field, child);
  check(
    'field-context-disabled-name',
    child.effectiveDisabled &&
      child.effectiveName === 'field-setting' &&
      child.controlElement?.getAttribute('aria-label') === 'Field setting',
  );
  field.disabled = false;
  await settle(field, child);
  check(
    'field-context-clear-preserves-authored-disabled',
    child.disabled && child.effectiveDisabled,
  );
  child.disabled = false;
  await settle(field, child);
  check('field-context-clear-restores-enabled', !child.effectiveDisabled);
  child.setChecked(true);
  await settle(field, child);
  check(
    'field-boolean-dirty-filled-state',
    field.validityState.dirty && field.validityState.filled && child.checked,
  );
  child.focus();
  await settle(field, child);
  check(
    'field-focused-markers-both-parts',
    field.validityState.focused &&
      child.controlElement?.hasAttribute('data-focused') &&
      child.shadowRoot!.querySelector('[part="switch-thumb"]')?.hasAttribute('data-focused'),
  );
  child.blur();
  await settle(field, child);
  check('field-touched-after-blur', field.validityState.touched && !field.validityState.focused);
  let validationCalls = 0;
  field.validator = (value) => {
    validationCalls++;
    return value ? null : 'Enable the setting';
  };
  field.validationMode = 'on-change';
  child.setChecked(false);
  await settle(field, child);
  check(
    'field-on-change-invalid-boolean',
    validationCalls > 0 &&
      field.value === false &&
      field.validityState.errors.includes('Enable the setting') &&
      field.validityState.validity.valid === false,
  );
  check(
    'invalid-field-markers-both-parts',
    child.controlElement?.hasAttribute('data-invalid') &&
      !child.controlElement?.hasAttribute('data-valid') &&
      child.shadowRoot!.querySelector('[part="switch-thumb"]')?.hasAttribute('data-invalid') &&
      !child.shadowRoot!.querySelector('[part="switch-thumb"]')?.hasAttribute('data-valid'),
  );
  child.setChecked(true);
  await settle(field, child);
  check(
    'field-on-change-clear-errors',
    field.validityState.validity.valid === true && field.validityState.errors.length === 0,
  );
  check(
    'valid-field-markers-both-parts',
    child.controlElement?.hasAttribute('data-valid') &&
      !child.controlElement?.hasAttribute('data-invalid') &&
      child.shadowRoot!.querySelector('[part="switch-thumb"]')?.hasAttribute('data-valid') &&
      !child.shadowRoot!.querySelector('[part="switch-thumb"]')?.hasAttribute('data-invalid'),
  );
  child.invalid = true;
  await settle(field, child);
  check(
    'authored-invalid-overrides-field-valid-on-both-parts',
    child.controlElement?.hasAttribute('data-invalid') &&
      !child.controlElement?.hasAttribute('data-valid') &&
      child.shadowRoot!.querySelector('[part="switch-thumb"]')?.hasAttribute('data-invalid') &&
      !child.shadowRoot!.querySelector('[part="switch-thumb"]')?.hasAttribute('data-valid'),
  );
  child.invalid = false;
  await settle(field, child);
  field.validationMode = 'on-blur';
  const beforeBlurCalls = validationCalls;
  child.setChecked(false);
  await settle(field, child);
  check('field-on-blur-defers-edit-validation', validationCalls === beforeBlurCalls);
  child.focus();
  child.blur();
  await settle(field, child);
  check(
    'field-on-blur-validates',
    validationCalls > beforeBlurCalls && field.validityState.errors.includes('Enable the setting'),
  );
  field.validationMode = 'on-submit';
  child.setChecked(true);
  await settle(field, child);
  const beforeSubmitCalls = validationCalls;
  child.setChecked(false);
  await settle(field, child);
  check('field-on-submit-defers-edit-validation', validationCalls === beforeSubmitCalls);
  form.requestSubmit();
  await settle(field, child);
  check(
    'field-on-submit-validates-blocks',
    validationCalls > beforeSubmitCalls && field.validityState.validity.valid === false,
  );
  child.setChecked(true);
  await settle(field, child);
  check('field-after-submit-edits-revalidate', field.validityState.validity.valid === true);
  field.remove();
  const serverForm = new TpForm();
  const serverField = new TpField();
  serverField.name = 'server-setting';
  serverField.label = 'Server setting';
  const serverSetting = new TpSwitch();
  serverField.append(serverSetting);
  serverForm.append(serverField);
  document.body.append(serverForm);
  await settle(serverField, serverSetting);
  serverForm.errors = { 'server-setting': 'Server rejected the setting' };
  await serverForm.updateComplete;
  await settle(serverField, serverSetting);
  check(
    'form-server-errors-projected',
    serverField.validityState.errors.includes('Server rejected the setting'),
  );
  serverSetting.addEventListener('tp-value-change', (event) => event.preventDefault(), {
    once: true,
  });
  serverSetting.setChecked(true);
  await settle(serverField, serverSetting);
  check(
    'form-server-error-veto-retained',
    serverField.validityState.errors.includes('Server rejected the setting'),
  );
  serverSetting.setChecked(true);
  await settle(serverField, serverSetting);
  check(
    'form-authoritative-server-error-accepted-edit-retained',
    serverField.validityState.errors.includes('Server rejected the setting') &&
      serverForm.errors['server-setting'] === 'Server rejected the setting',
  );
  serverForm.errors = {};
  await serverForm.updateComplete;
  await settle(serverField, serverSetting);
  check('form-explicit-owner-errors-clear', serverField.validityState.errors.length === 0);
  serverForm.remove();
  const disabledSet = document.createElement('fieldset');
  const fieldsetSetting = new TpSwitch();
  fieldsetSetting.name = 'fieldset-setting';
  fieldsetSetting.defaultChecked = true;
  disabledSet.append(fieldsetSetting);
  form.append(disabledSet);
  disabledSet.disabled = true;
  await settle(fieldsetSetting);
  check(
    'native-fieldset-disabled-no-entry',
    fieldsetSetting.effectiveDisabled &&
      fieldsetSetting.controlElement?.tabIndex === -1 &&
      !data().some(([key]) => key === 'fieldset-setting'),
  );
  fieldsetSetting.disabled = true;
  disabledSet.disabled = false;
  await settle(fieldsetSetting);
  check(
    'native-fieldset-clearing-preserves-authored-disabled',
    fieldsetSetting.effectiveDisabled && fieldsetSetting.disabled,
  );
  fieldsetSetting.disabled = false;
  await settle(fieldsetSetting);
  check(
    'native-fieldset-clear-restores-participation',
    !fieldsetSetting.effectiveDisabled &&
      data().some(([key, value]) => key === 'fieldset-setting' && value === 'on'),
  );
  disabledSet.remove();
  const nativeLabel = document.createElement('label');
  nativeLabel.htmlFor = 'native-labeled-setting';
  nativeLabel.textContent = 'Native explicit setting';
  const nativeLabeled = new TpSwitch();
  nativeLabeled.id = 'native-labeled-setting';
  form.append(nativeLabel, nativeLabeled);
  await settle(nativeLabeled);
  nativeLabel.click();
  await settle(nativeLabeled);
  check(
    'native-explicit-label-default-activation',
    nativeLabeled.checked &&
      nativeLabeled.controlElement?.getAttribute('aria-label') === 'Native explicit setting',
  );
  nativeLabeled.readOnly = true;
  await settle(nativeLabeled);
  nativeLabel.click();
  await settle(nativeLabeled);
  check('native-explicit-readonly-label-retains-state', nativeLabeled.checked);
  nativeLabel.textContent = 'Updated native setting';
  await settle(nativeLabeled);
  check(
    'native-label-dynamic-text',
    nativeLabeled.controlElement?.getAttribute('aria-label') === 'Updated native setting',
  );
  nativeLabeled.setAttribute('aria-label', 'Authored priority');
  await settle(nativeLabeled);
  check(
    'native-label-authored-name-priority',
    nativeLabeled.controlElement?.getAttribute('aria-label') === 'Authored priority',
  );
  nativeLabeled.removeAttribute('aria-label');
  nativeLabel.htmlFor = 'different-control';
  await settle(nativeLabeled);
  check(
    'native-label-retarget-clears-owned-name',
    !nativeLabeled.controlElement?.hasAttribute('aria-label'),
  );
  nativeLabeled.remove();
  nativeLabel.remove();
  const wrapping = document.createElement('label');
  wrapping.append('Native wrapping setting');
  const wrapped = new TpSwitch();
  wrapping.append(wrapped);
  form.append(wrapping);
  await settle(wrapped);
  wrapping.click();
  await settle(wrapped);
  check('native-wrapping-label-default-activation', wrapped.checked);
  wrapping.remove();
  const independent = byId<Switch>('independent');
  await settle(independent);
  check(
    'switch-isolated-from-checkbox-group',
    independent.checkboxGroup === null && independent.checked,
  );
  independent.checkboxGroup = group;
  await settle(independent);
  check(
    'switch-rejects-manual-checkbox-group',
    independent.checkboxGroup === null && independent.checked,
  );
  const peer = new TpCheckbox();
  peer.name = 'peer';
  peer.indeterminate = true;
  peer.defaultChecked = false;
  form.append(peer);
  await settle(peer);
  check(
    'checkbox-mixed-policy-preserved',
    peer.indeterminate && peer.controlElement?.getAttribute('aria-checked') === 'mixed',
  );
  peer.activateFromLabel();
  await settle(peer);
  check('checkbox-mixed-press-proposes-true', peer.checked && peer.indeterminate);
  peer.indeterminate = false;
  peer.setChecked(false);
  await settle(peer);
  check(
    'checkbox-indicator-presence-unchecked',
    !peer.shadowRoot!.querySelector('[part~="checkbox-indicator"]'),
  );
  peer.setChecked(true);
  await settle(peer);
  check(
    'checkbox-indicator-presence-checked',
    !!peer.shadowRoot!.querySelector('[part~="checkbox-indicator"]'),
  );
  peer.remove();
  const motion: { role: string; reduced: boolean; cancelled: boolean }[] = [];
  setting.addEventListener('tp-motion-request', (event: TpMotionRequestEvent) => {
    const item = {
      role: event.request.role,
      reduced: event.request.reducedMotion,
      cancelled: false,
    };
    motion.push(item);
    event.respondWith({
      play: () => ({
        finished: new Promise<void>(() => {}),
        cancel: () => {
          item.cancelled = true;
        },
      }),
    });
  });
  setting.motionPolicy = 'normal';
  setting.setChecked(false);
  await settle(setting);
  check(
    'motion-two-replaceable-state-roles',
    motion.some((m) => m.role === 'track') &&
      motion.some((m) => m.role === 'thumb') &&
      motion.every((m) => !m.reduced),
    {
      motion: motion.map((m) => ({ ...m })),
      policy: setting.motionPolicy,
      reflected: setting.getAttribute('motion-policy'),
    },
  );
  setting.setChecked(true);
  await settle(setting);
  check(
    'motion-rapid-owner-replacement-cancels',
    motion.slice(0, 2).every((m) => m.cancelled),
    motion.map((m) => ({ ...m })),
  );
  setting.motionPolicy = 'reduce';
  setting.setChecked(false);
  await settle(setting);
  check(
    'motion-explicit-reduce-final-rest',
    !setting.checked && motion.slice(-2).every((m) => m.reduced),
    {
      motion: motion.map((m) => ({ ...m })),
      checked: setting.checked,
      policy: setting.motionPolicy,
      reflected: setting.getAttribute('motion-policy'),
    },
  );
  setting.remove();
  await settle(setting);
  check('disconnect-input-ref-null', inputRef === null);
  check(
    'motion-disconnect-cancels-driver',
    motion.filter((m) => !m.reduced).every((m) => m.cancelled),
    motion.map((m) => ({ ...m })),
  );
  form.append(setting);
  await settle(setting);
  check(
    'reconnect-input-ref-and-control',
    inputRef === setting.inputElement && setting.controlElement?.getAttribute('role') === 'switch',
  );
  const rootRef = { current: null as HTMLElement | null };
  const thumbRef = { current: null as HTMLElement | null };
  setting.partContracts = {
    switch: { elementReference: rootRef },
    'switch-thumb': { elementReference: thumbRef },
  };
  await settle(setting);
  check(
    'both-object-refs-published',
    rootRef.current === control() && thumbRef.current === thumb(),
  );
  setting.remove();
  await settle(setting);
  check(
    'both-object-refs-disconnect-cleared',
    rootRef.current === null && thumbRef.current === null,
  );
  form.append(setting);
  await settle(setting);
  check(
    'both-object-refs-reconnect-published',
    rootRef.current === control() && thumbRef.current === thumb(),
  );
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  await new Promise<void>((resolve) => {
    if (iframe.contentDocument?.readyState === 'complete') resolve();
    else iframe.onload = () => resolve();
  });
  const foreign = iframe.contentDocument!;
  const style = foreign.createElement('link');
  style.rel = 'stylesheet';
  style.href = location.pathname.endsWith('package.html') ? '/dist/styles.css' : '/src/styles.css';
  foreign.head.append(style);
  const ff = foreign.createElement('form');
  ff.dir = 'rtl';
  foreign.body.append(ff);
  foreign.adoptNode(setting);
  ff.append(setting);
  setting.motionPolicy = 'reduce';
  setting.setChecked(true);
  await settle(setting);
  check(
    'foreign-adoption-form-ref-role',
    setting.ownerDocument === foreign &&
      inputRef === setting.inputElement &&
      [...new (iframe.contentWindow as unknown as { FormData: typeof FormData }).FormData(ff)].some(
        ([key]) => key === 'setting',
      ) &&
      control().getAttribute('role') === 'switch',
  );
  check(
    'foreign-inherited-direction-thumb-rest',
    setting.direction === 'rtl' &&
      Math.abs(
        thumb().getBoundingClientRect().left -
          control().getBoundingClientRect().left -
          parseFloat(iframe.contentWindow!.getComputedStyle(control()).borderLeftWidth),
      ) < 0.1,
  );
  setting.motionPolicy = 'inherit';
  setting.setChecked(false);
  await settle(setting);
  const ownerReduce = iframe.contentWindow!.matchMedia('(prefers-reduced-motion: reduce)').matches;
  check(
    'foreign-inherit-motion-owner-media',
    motion.slice(-2).every((item) => item.reduced === ownerReduce),
    { ownerReduce, requests: motion.slice(-2) },
  );
  document.adoptNode(setting);
  form.append(setting);
  await settle(setting);
  check(
    'foreign-motion-adoption-cancels-owner-driver',
    motion.slice(-2).every((item) => item.reduced || item.cancelled),
  );
  iframe.remove();
  setting.remove();
  controlled.remove();
  form.remove();
  return rows;
}
Object.assign(window, {
  switchAPI: {
    byId,
    events,
    submissions,
    group,
    settle,
    runAssertions,
    ready: Promise.all(
      [...document.querySelectorAll<Switch>('tp-switch')].map((el) => el.updateComplete),
    ),
  },
});
