import { html } from 'lit';
import {
  boldIcon,
  bookmarkIcon,
  filledBookmarkIcon,
} from '../../../../src/icons/text-formatting.js';
import type {
  TpCheckbox,
  TpRadioGroup,
  TpRadioGroupItem,
  TpToggleGroup,
  TpToggle,
} from '../../../../src/index.js';
type API = typeof import('../../../../src/index.js');
type Result = { scenario: string; passed: boolean; details: string };
const assert = (value: unknown, message: string): void => {
  if (!value) throw new Error(message);
};
const equal = (actual: unknown, expected: unknown, message: string): void =>
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    message + ': ' + JSON.stringify(actual),
  );
const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await new Promise((resolve) => setTimeout(resolve, 0));
};
/** API assertions; real input, AX/axe, Docs and visual checks are separate Chrome MCP evidence. */
export async function runSelectionAPIChecks(api: API): Promise<Result[]> {
  const results: Result[] = [],
    dynamic = document.getElementById('dynamic')!;
  async function test(scenario: string, run: (sandbox: HTMLElement) => Promise<void>) {
    const sandbox = document.createElement('div');
    dynamic.append(sandbox);
    try {
      await run(sandbox);
      results.push({
        scenario,
        passed: true,
        details: 'Public state, form, anatomy and lifecycle assertions passed.',
      });
    } catch (error) {
      results.push({ scenario, passed: false, details: String(error) });
    } finally {
      sandbox.remove();
    }
  }
  const checkbox = (properties: Partial<TpCheckbox> = {}): TpCheckbox =>
    Object.assign(new api.TpCheckbox(), { textContent: 'Checkbox option' }, properties);
  const radio = (values: unknown[], properties: Partial<TpRadioGroup> = {}): TpRadioGroup => {
    const group = Object.assign(new api.TpRadioGroup(), { label: 'Radio options' }, properties);
    for (const value of values)
      group.append(
        Object.assign(new api.TpRadioGroupItem(), { value, textContent: String(value) }),
      );
    return group;
  };
  const toggle = (values: string[], properties: Partial<TpToggleGroup> = {}): TpToggleGroup => {
    const group = Object.assign(new api.TpToggleGroup(), { label: 'Toggle options' }, properties);
    for (const value of values)
      group.append(Object.assign(new api.TpToggle(), { value, textContent: value }));
    return group;
  };
  await test('Checkbox V-01/V-02: defaults, owner rejection/acceptance/rewrite, cancellation', async (box) => {
    const uncontrolled = checkbox({ defaultChecked: true }),
      controlled = checkbox({ checked: false });
    box.append(uncontrolled, controlled);
    await settle();
    assert(uncontrolled.checked, 'Default did not initialize');
    uncontrolled.defaultChecked = false;
    await settle();
    assert(uncontrolled.checked, 'Default changed committed state');
    controlled.controlElement!.click();
    await settle();
    assert(!controlled.checked, 'Rejected proposal committed');
    controlled.onCheckedChange = (event) => {
      controlled.checked = event.detail.value;
    };
    controlled.controlElement!.click();
    await settle();
    assert(controlled.checked, 'Owner return missing');
    controlled.onCheckedChange = (event) => {
      controlled.checked = event.detail.value;
      event.preventDefault();
    };
    controlled.controlElement!.click();
    await settle();
    assert(controlled.checked, 'Canceled owner leaked');
    uncontrolled.addEventListener('tp-value-change', (event) => event.preventDefault(), {
      once: true,
    });
    uncontrolled.setChecked(false);
    assert(uncontrolled.checked, 'DOM cancellation lost');
  });
  await test('Checkbox V-03/V-06: mixed state independent, indicator retention and presence', async (box) => {
    const c = checkbox({ indeterminate: true });
    box.append(c);
    await settle();
    c.controlElement!.click();
    await settle();
    assert(c.checked && c.indeterminate, 'Mixed press must propose true without clearing mixed');
    c.indeterminate = false;
    c.setChecked(false);
    await settle();
    assert(
      !c.shadowRoot!.querySelector('[part~="checkbox-indicator"]'),
      'Unchecked indicator remains',
    );
    c.keepMounted = true;
    await settle();
    equal(
      c.shadowRoot!.querySelector('[part~="checkbox-indicator"]')?.getAttribute('data-presence'),
      'retained',
      'Retained presence',
    );
    c.setChecked(true);
    await settle();
    assert(
      c.shadowRoot!.querySelector('[part~="checkbox-indicator"]'),
      'Checked indicator missing',
    );
  });
  await test('Checkbox V-04/V-05: serialization, empty values, readonly, disabled and reset', async (box) => {
    const form = document.createElement('form');
    box.append(form);
    const c = checkbox({ name: 'check', value: '', uncheckedValue: 'off', required: true });
    form.append(c);
    await settle();
    equal([...new FormData(form)], [['check', 'off']], 'Unchecked value');
    assert(!c.checkValidity(), 'Required unchecked is valid');
    c.setChecked(true);
    await settle();
    equal([...new FormData(form)], [['check', '']], 'Empty supplied checked value');
    assert(c.checkValidity(), 'Checked invalid');
    c.readOnly = true;
    c.controlElement!.click();
    await settle();
    assert(c.checked, 'Readonly toggled');
    equal(new FormData(form).get('check'), '', 'Readonly omitted');
    c.disabled = true;
    await settle();
    equal([...new FormData(form)], [], 'Disabled serialized');
    c.disabled = false;
    c.readOnly = false;
    c.defaultChecked = false;
    form.reset();
    await settle();
    assert(!c.checked, 'Reset ignored default');
  });
  await test('Checkbox V-05/V-08: external form owner, references and reconnect', async (box) => {
    const form = document.createElement('form');
    box.append(form);
    const seen: Array<HTMLElement | null> = [];
    const c = checkbox({
      name: 'external',
      defaultChecked: true,
      formOwner: form,
      inputElementReference: (value) => seen.push(value),
    });
    box.append(c);
    await settle();
    equal(new FormData(form).get('external'), 'on', 'External form association');
    assert(seen.at(-1) instanceof HTMLInputElement, 'Input reference missing');
    c.remove();
    assert(seen.at(-1) === null, 'Reference not cleared');
    box.append(c);
    await settle();
    assert(c.checked && seen.at(-1) instanceof HTMLInputElement, 'Reconnect lost value/reference');
  });
  await test('Checkbox V-07: aggregate group, disabled preservation, cancel and reset', async (box) => {
    const form = document.createElement('form'),
      host = document.createElement('fieldset');
    form.append(host);
    box.append(form);
    const parent = checkbox({ parent: true }),
      a = checkbox({ name: 'set', value: 'a' }),
      b = checkbox({ name: 'set', value: 'b' }),
      held = checkbox({ name: 'set', value: 'held', disabled: true });
    host.append(parent, a, b, held);
    const owner = new api.CheckboxGroupController(host, {
      defaultValue: ['a', 'held'],
      allValues: ['a', 'b', 'held'],
    });
    try {
      await settle();
      assert(parent.indeterminate && a.checked && held.checked, 'Aggregate initial state');
      parent.controlElement!.click();
      await settle();
      equal(owner.value, ['a', 'held', 'b'], 'Parent select enabled preserving held');
      parent.controlElement!.click();
      await settle();
      equal(owner.value, ['held'], 'Parent clear preserves disabled');
      owner.onValueChange = (event) => event.preventDefault();
      a.controlElement!.click();
      await settle();
      equal(owner.value, ['held'], 'Group cancel lost');
      owner.onValueChange = undefined;
      form.reset();
      await settle();
      equal(owner.value, ['a', 'held'], 'Group reset');
      a.remove();
      await settle();
      equal(owner.value, ['a', 'held'], 'Unmount rewrote selection');
      equal([...new FormData(form)], [], 'Unmount/disabled values serialized');
      host.append(a);
      await settle();
      assert(a.checked, 'Remount state lost');
      assert(parent.controlElement!.ariaControlsElements?.includes(a), 'Parent controls missing');
    } finally {
      owner.disconnect();
    }
  });
  await test('Checkbox V-07/V-08: nested native groups, duplicate exclusion and opt-in aggregation', async (box) => {
    const outer = document.createElement('fieldset'),
      inner = document.createElement('fieldset');
    outer.append(inner);
    box.append(outer);
    const outerChild = checkbox({ value: 'a' }),
      nested = checkbox({ value: 'a' }),
      duplicate = checkbox({ value: 'a' }),
      parent = checkbox({ parent: true });
    outer.append(outerChild, duplicate, parent);
    inner.append(nested);
    const a = new api.CheckboxGroupController(outer, { defaultValue: ['a'] }),
      b = new api.CheckboxGroupController(inner);
    try {
      await settle();
      assert(
        outerChild.checked && !nested.checked && !duplicate.checked,
        'Nested/duplicate registry leaked',
      );
      assert(!parent.checked && !parent.indeterminate, 'Aggregate opted in without allValues');
      equal(a.allValues, ['a'], 'Effective registered allValues');
    } finally {
      a.disconnect();
      b.disconnect();
    }
  });
  await test('Checkbox V-10: delegates, committed resolvers, event channels and references', async (box) => {
    const c = checkbox();
    const seen: Array<HTMLElement | null> = [];
    c.partContracts = {
      checkbox: {
        renderDelegate: ({ bind, content }) => html`<div ${bind}>${content}</div>`,
        elementReference: (element) => seen.push(element),
        classHook: (state) => (state.checked ? 'committed' : 'idle'),
        hostProperties: { '@click': (event: Event) => event.preventDefault(), role: 'button' },
      },
      'checkbox-indicator': { content: (state) => (state.checked ? 'selected' : 'unselected') },
    };
    box.append(c);
    await settle();
    assert(
      c.controlElement!.localName === 'div' &&
        c.controlElement!.getAttribute('role') === 'checkbox',
      'Delegate semantics replaced',
    );
    c.controlElement!.click();
    await settle();
    assert(
      c.checked && c.controlElement!.classList.contains('committed'),
      'Native preventDefault suppressed component or resolver stale',
    );
    c.partContracts = {
      checkbox: {
        hostProperties: { '@click': (event: Event) => api.preventComponentHandling(event) },
      },
    };
    await settle();
    c.controlElement!.click();
    await settle();
    assert(c.checked, 'Component suppression ignored');
    assert(seen.includes(null), 'Old delegate ref not cleared');
  });
  await test('Checkbox V-13: Switch protected native owner regression', async (box) => {
    const form = document.createElement('form'),
      s = new api.TpSwitch();
    s.name = 'switch';
    s.textContent = 'Switch';
    form.append(s);
    box.append(form);
    await settle();
    (s.inputElement as HTMLInputElement).click();
    await settle();
    assert(s.checked, 'Switch native activation broken');
    equal(new FormData(form).get('switch'), 'on', 'Switch form broken');
    s.readOnly = true;
    (s.inputElement as HTMLInputElement).click();
    await settle();
    assert(s.checked, 'Switch readonly broken');
    form.reset();
    await settle();
    assert(!s.checked, 'Switch reset broken');
    const groupHost = document.createElement('fieldset');
    form.append(groupHost);
    const group = new api.CheckboxGroupController(groupHost, { defaultValue: ['a'] });
    try {
      groupHost.append(checkbox({ value: 'a' }), s);
      s.readOnly = false;
      await settle();
      assert(s.checkboxGroup === null, 'Switch was captured by Checkbox-only group');
      (s.inputElement as HTMLInputElement).click();
      await settle();
      assert(s.checked, 'Grouped-layout Switch lost its standalone owner');
      group.request(s, true);
      equal(group.value, ['a'], 'An unregistered Switch changed Checkbox membership');
    } finally {
      group.disconnect();
    }
  });
  await test('Radio V-01/V-02/V-05: controlled lane, event reasons, single form owner/reset', async (box) => {
    const form = document.createElement('form'),
      g = radio(['a', 'b'], { name: 'radio', defaultValue: 'a' });
    box.append(form);
    form.append(g);
    await settle();
    const members = [...g.querySelectorAll<TpRadioGroupItem>('tp-radio-group-item')];
    const reasons: string[] = [];
    g.onValueChange = (event) => reasons.push(event.detail.reason);
    members[1]!.controlElement!.click();
    await settle();
    equal(g.value, 'b', 'Selection missing');
    equal(reasons, ['item-press'], 'Reason lane');
    equal([...new FormData(form)], [['radio', 'b']], 'Radio duplicate/absent serialization');
    form.reset();
    await settle();
    equal(g.value, 'a', 'Reset default');
    const c = radio(['a', 'b'], { value: 'a' });
    box.append(c);
    await settle();
    const b = c.querySelectorAll<TpRadioGroupItem>('tp-radio-group-item')[1]!;
    b.controlElement!.click();
    await settle();
    equal(c.value, 'a', 'Controlled rejection');
    c.onValueChange = (event) => {
      c.value = event.detail.value;
    };
    b.controlElement!.click();
    await settle();
    equal(c.value, 'b', 'Controlled acceptance');
    c.onValueChange = (event) => {
      c.value = event.detail.value;
      event.preventDefault();
    };
    c.setValue('a');
    await settle();
    equal(c.value, 'b', 'Canceled owner return leaked');
  });
  await test('Radio V-04/V-07/V-08: required unmatched, eligible disabled, removal and nested isolation', async (box) => {
    const form = document.createElement('form'),
      g = radio(['a', 'b'], { name: 'radio', defaultValue: 'unknown', required: true });
    box.append(form);
    form.append(g);
    await settle();
    assert(!g.checkValidity(), 'Unmatched required valid');
    equal([...new FormData(form)], [], 'Unmatched serialized');
    g.setValue('b');
    await settle();
    const b = g.querySelectorAll<TpRadioGroupItem>('tp-radio-group-item')[1]!;
    b.disabled = true;
    await settle();
    equal([...new FormData(form)], [], 'Disabled radio serialized');
    assert(!g.checkValidity(), 'Disabled selected satisfies required');
    b.disabled = false;
    b.remove();
    await settle();
    equal(g.value, 'b', 'Removal rewrote value');
    equal([...new FormData(form)], [], 'Removed serialized');
    g.append(b);
    await settle();
    assert(b.checked, 'Matching remount not checked');
    const nested = radio(['b'], { defaultValue: 'b' });
    g.append(nested);
    await settle();
    assert(
      nested.querySelector<TpRadioGroupItem>('tp-radio-group-item')!.checked,
      'Nested registration captured',
    );
  });
  await test('Radio V-06/V-10/V-11: presence and group-to-item presentation/terminal override/delegate replacement', async (box) => {
    const g = radio(['a', 'b'], { defaultValue: 'a' });
    g.partPresentation = { 'radio-group-indicator': { styleHook: { background: 'rgb(1, 2, 3)' } } };
    box.append(g);
    await settle();
    const a = g.querySelector<TpRadioGroupItem>('tp-radio-group-item')!;
    let indicator = a.shadowRoot!.querySelector<HTMLElement>('[part~="radio-group-indicator"]')!;
    equal(
      getComputedStyle(indicator).backgroundColor,
      'rgb(1, 2, 3)',
      'Parent indicator hook did not cross shadow',
    );
    a.partPresentation = { 'radio-group-indicator': { styleHook: { background: 'rgb(4, 5, 6)' } } };
    await settle();
    equal(getComputedStyle(indicator).backgroundColor, 'rgb(4, 5, 6)', 'Terminal item hook lost');
    a.partContracts = {
      'radio-group-item': {
        renderDelegate: ({ bind, content }) => html`<div ${bind}>${content}</div>`,
      },
    };
    await settle();
    assert(
      a.controlElement!.localName === 'div' && a.controlElement!.getAttribute('role') === 'radio',
      'Radio delegate broken',
    );
    a.keepMounted = true;
    g.setValue('b');
    await settle();
    indicator = a.shadowRoot!.querySelector('[part~="radio-group-indicator"]')!;
    equal(indicator.dataset.presence, 'retained', 'Radio indicator retained state');
  });
  await test('Radio V-07/V-08: native compatibility and cleanup', async (box) => {
    const g = new api.TpRadioGroup();
    g.label = 'Native compatibility';
    const a = document.createElement('button'),
      b = document.createElement('button');
    a.value = 'a';
    b.value = 'b';
    a.textContent = 'A';
    b.textContent = 'B';
    a.setAttribute('tabindex', '3');
    g.append(a, b);
    box.append(g);
    await settle();
    a.click();
    await settle();
    equal(g.value, 'a', 'Native member activation');
    equal(a.getAttribute('role'), 'radio', 'Native role');
    a.remove();
    await settle();
    equal(a.getAttribute('tabindex'), '3', 'Authored tabindex not restored');
    assert(!a.hasAttribute('role'), 'Role leaked on release');
  });
  await test('Toggle V-01/V-02/V-07: lists, spaces, single clear, multiple order and cancel', async (box) => {
    const g = toggle(['a b', 'c']);
    box.append(g);
    await settle();
    const a = g.querySelector<TpToggle>('tp-toggle')!;
    a.controlElement!.click();
    await settle();
    equal(g.value, ['a b'], 'Single value must remain list with spaces');
    a.controlElement!.click();
    await settle();
    equal(g.value, [], 'Single did not clear');
    g.multiple = true;
    g.setValue(['c']);
    await settle();
    a.controlElement!.click();
    await settle();
    equal(g.value, ['a b', 'c'], 'Multiple registration order');
    g.onValueChange = (event) => event.preventDefault();
    a.controlElement!.click();
    await settle();
    equal(g.value, ['a b', 'c'], 'Canceled group request leaked');
    g.onValueChange = undefined;
    a.onPressedChange = (event) => event.preventDefault();
    a.controlElement!.click();
    await settle();
    equal(g.value, ['a b', 'c'], 'Child veto ignored');
  });
  await test('Toggle V-02/V-04/V-07: controlled return, disabled ownership and authored preservation', async (box) => {
    const g = toggle(['a', 'b'], { value: ['a'], variant: 'outline', size: 'lg' });
    box.append(g);
    await settle();
    const [a, b] = [...g.querySelectorAll<TpToggle>('tp-toggle')];
    b!.controlElement!.click();
    await settle();
    equal(g.value, ['a'], 'Controlled group rejected proposal committed');
    g.onValueChange = (event) => {
      g.value = event.detail.value;
    };
    b!.controlElement!.click();
    await settle();
    equal(g.value, ['b'], 'Controlled acceptance');
    a!.disabled = true;
    g.disabled = true;
    await settle();
    g.disabled = false;
    await settle();
    assert(
      a!.disabled && a!.toggleDisabled && !b!.toggleDisabled,
      'Group clobbered authored disabled',
    );
    equal(b!.variant, 'outline', 'Variant precedence');
    equal(b!.size, 'lg', 'Size precedence');
    b!.remove();
    await settle();
    equal(g.value, ['b'], 'Unmount rewrote group');
    assert(b!.selectionOwner === null, 'Removed owner retained');
  });
  await test('Toggle V-05/V-06/V-10/V-13: action form exclusion, zero seams and standalone reuse', async (box) => {
    const form = document.createElement('form'),
      g = toggle(['a', 'b'], { name: 'toggle', spacing: 0, variant: 'outline' }),
      alone = new api.TpToggle();
    alone.name = 'action';
    alone.textContent = 'Action';
    form.append(g, alone);
    box.append(form);
    await settle();
    const [a, b] = [...g.querySelectorAll<TpToggle>('tp-toggle')];
    a!.controlElement!.click();
    alone.controlElement!.click();
    await settle();
    equal([...new FormData(form)], [], 'Action serialized without explicit form contract');
    assert(alone.pressed, 'Standalone owner broken');
    form.reset();
    await settle();
    assert(alone.pressed, 'Form reset changed standalone action state');
    equal(g.value, ['a'], 'Form reset changed Toggle Group action state');
    equal(
      getComputedStyle(b!.controlElement!).borderInlineStartWidth,
      '0px',
      'Joined seam duplicate',
    );
    g.spacing = 2;
    await settle();
    assert(
      getComputedStyle(b!.controlElement!).borderInlineStartWidth !== '0px',
      'Seam hook not released',
    );
    g.partContracts = {
      'toggle-group': {
        renderDelegate: ({ bind, content }) => html`<section ${bind}>${content}</section>`,
      },
    };
    await settle();
    equal(
      g.shadowRoot!.querySelector('[part~="toggle-group"]')?.getAttribute('role'),
      'group',
      'Group delegate semantic role',
    );
  });
  await test('All V-09/V-11: Field context, explicit flags, dictionary and scoped tokens', async (box) => {
    const field = new api.TpField(),
      c = checkbox();
    field.label = 'Associated name';
    field.description = 'Associated description';
    field.append(c);
    box.append(field);
    await settle();
    equal(c.controlElement!.getAttribute('aria-label'), 'Associated name', 'Checkbox Field name');
    assert(c.controlElement!.hasAttribute('aria-describedby'), 'Description missing');
    field.disabled = true;
    await settle();
    assert(c.checkboxDisabled, 'Field disabled not inherited');
    c.disabled = true;
    field.disabled = false;
    await settle();
    assert(c.disabled && c.checkboxDisabled, 'Authored disabled clobbered');
    const g = radio(['a'], { defaultValue: 'a' });
    box.append(g);
    await settle();
    const node = g.querySelector<TpRadioGroupItem>('tp-radio-group-item')!.controlElement!;
    const identity = node;
    api.setPresentationDictionary({
      ...api.defaultPresentationDictionary,
      'radio-group-item': [{ declarations: { color: 'rgb(7, 8, 9)' } }],
    });
    try {
      await settle();
      assert(node === identity && g.value === 'a', 'Dictionary replaced state/host');
      equal(getComputedStyle(node).color, 'rgb(7, 8, 9)', 'Alternate dictionary ignored');
    } finally {
      api.setPresentationDictionary(api.defaultPresentationDictionary);
    }
    box.style.setProperty('--tp-primary', 'rgb(10, 11, 12)');
    const scoped = checkbox({ defaultChecked: true });
    box.append(scoped);
    await settle();
    const scopedHost = scoped.controlElement!;
    scoped.focus();
    equal(
      getComputedStyle(scopedHost.querySelector('.box')!).backgroundColor,
      'rgb(10, 11, 12)',
      'Scoped primary token ignored',
    );
    box.style.setProperty('--tp-primary', 'rgb(30, 31, 32)');
    await settle();
    equal(
      getComputedStyle(scopedHost.querySelector('.box')!).backgroundColor,
      'rgb(30, 31, 32)',
      'Live scoped token update ignored',
    );
    assert(
      scoped.checked &&
        scoped.controlElement === scopedHost &&
        scoped.shadowRoot!.activeElement === scopedHost,
      'Scoped theme update reset state, identity or focus',
    );
  });
  await test('Checkbox V-04/V-05/V-09: nativeAction, restore and Boolean Field state', async (box) => {
    const field = new api.TpField(),
      c = checkbox({ nativeAction: true, name: 'state' });
    field.label = 'Boolean state';
    field.append(c);
    box.append(field);
    await settle();
    equal(c.controlElement!.localName, 'button', 'nativeAction host');
    equal(field.value, false, 'Field logical initial value must be checked');
    c.setChecked(true);
    await settle();
    equal(field.value, true, 'Field logical commit');
    assert(field.validityState.dirty, 'Field dirty ignored Boolean commit');
    c.formStateRestoreCallback('false');
    await settle();
    assert(!c.checked, 'Boolean restore failed');
    const controlled = checkbox({ checked: true });
    box.append(controlled);
    await settle();
    controlled.formStateRestoreCallback('false');
    assert(controlled.checked, 'Controlled state restored internally');
  });
  await test('Radio V-04/V-05/V-08: readonly, input reference, comparable identity and restore', async (box) => {
    const refs: Array<HTMLElement | null> = [],
      objectValue = { id: 'object' };
    const g = radio([0, objectValue], {
      defaultValue: 0,
      name: 'comparable',
      readOnly: true,
      inputElementReference: (element) => refs.push(element),
    });
    box.append(g);
    await settle();
    const items = [...g.querySelectorAll<TpRadioGroupItem>('tp-radio-group-item')];
    items[1]!.controlElement!.click();
    await settle();
    equal(g.value, 0, 'Readonly selection changed');
    assert(g.inputElement === items[0]!.inputElement, 'Selected native input getter');
    g.readOnly = false;
    g.setValue(objectValue);
    await settle();
    assert(
      items[1]!.checked && refs.at(-1) === items[1]!.inputElement,
      'Comparable/ref selection mismatch',
    );
    g.formStateRestoreCallback('0');
    await settle();
    equal(g.value, 0, 'Comparable registered restore');
    g.remove();
    assert(refs.at(-1) === null, 'Group input ref not cleared');
  });
  await test('Toggle V-06/V-07/V-08: nested/duplicate identity, unknown selection and non-native host', async (box) => {
    const g = toggle(['a', 'a', 'b'], { defaultValue: ['unmounted'], multiple: true }),
      nested = toggle(['a'], { defaultValue: ['a'] });
    g.append(nested);
    box.append(g);
    await settle();
    const children = [...g.children].filter((n): n is TpToggle => n.localName === 'tp-toggle');
    assert(
      children[1]!.toggleDisabled && nested.querySelector<TpToggle>('tp-toggle')!.pressed,
      'Duplicate/nested registration leaked',
    );
    children[0]!.controlElement!.click();
    await settle();
    equal(g.value, ['unmounted', 'a'], 'Unknown membership lost');
    const unmounted = Object.assign(new api.TpToggle(), {
      value: 'unmounted',
      textContent: 'Returned',
      nativeAction: false,
    });
    g.append(unmounted);
    await settle();
    assert(
      unmounted.pressed && unmounted.controlElement!.localName === 'span',
      'Remount/non-native composition failed',
    );
    unmounted.controlElement!.click();
    await settle();
    equal(g.value, ['a'], 'Non-native pointer activation failed');
  });
  await test('Checkbox/Radio V-06/V-08/V-11: interrupted exit, retained lifecycle and reduced motion', async (box) => {
    const c = checkbox({ defaultChecked: true });
    c.partContracts = {
      'checkbox-indicator': {
        styleHook: (state) => ({
          opacity: state.checked ? 1 : 0,
          transition: 'opacity calc(160ms * var(--tp-motion-scale)) linear',
        }),
      },
    };
    box.append(c);
    await settle();
    c.setChecked(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert(c.shadowRoot!.querySelector('[data-ending-style]'), 'Indicator removed before exit');
    c.setChecked(true);
    await settle();
    assert(
      c.shadowRoot!.querySelector('[part~="checkbox-indicator"]'),
      'Interrupted exit removed reopened indicator',
    );
    c.motionPolicy = 'reduce';
    c.setChecked(false);
    await settle();
    assert(
      !c.shadowRoot!.querySelector('[part~="checkbox-indicator"]'),
      'Reduced-motion absence did not settle',
    );
  });

  await test('Checkbox/Radio/Toggle V-03/V-10: native default and component keyboard cancellation channels', async (box) => {
    const c = checkbox(),
      t = Object.assign(new api.TpToggle(), {
        nativeAction: false,
        textContent: 'Synthetic action',
      }),
      r = radio(['a']),
      item = r.children[0] as TpRadioGroupItem;
    box.append(c, t, r);
    await settle();
    for (const member of [c, t, item]) {
      const part = member === c ? 'checkbox' : member === t ? 'toggle' : 'radio-group-item';
      const current = () => (member === c ? c.checked : member === t ? t.pressed : item.checked);
      const reset = () => {
        if (member === c) c.setChecked(false);
        else if (member === t) t.setPressed(false);
        else r.setValue(undefined);
      };
      const key = (type: string, value = ' ') =>
        member.controlElement!.dispatchEvent(
          new KeyboardEvent(type, { key: value, bubbles: true, composed: true, cancelable: true }),
        );
      member.partContracts = {
        [part]: {
          hostProperties: {
            '@keydown': (event: Event) => event.preventDefault(),
            '@keyup': (event: Event) => event.preventDefault(),
          },
        },
      };
      await settle();
      key('keydown');
      key('keyup');
      await settle();
      assert(current(), `${part}: native preventDefault suppressed component activation`);
      reset();
      member.partContracts = {
        [part]: {
          hostProperties: { '@keyup': (event: Event) => api.preventComponentHandling(event) },
        },
      };
      await settle();
      key('keydown');
      key('keyup');
      await settle();
      assert(!current(), `${part}: explicitly canceled release activated`);
      member.partContracts = {};
      await settle();
      key('keyup');
      await settle();
      assert(!current(), `${part}: canceled release left an armed gesture`);
      key('keydown');
      member.partContracts = {
        [part]: {
          hostProperties: { '@keydown': (event: Event) => api.preventComponentHandling(event) },
        },
      };
      await settle();
      key('keydown');
      key('keyup');
      await settle();
      assert(!current(), `${part}: canceled keydown left an armed gesture`);
    }
  });

  await test('All V-08: owner-document move and deterministic reconnect', async (box) => {
    const c = checkbox({ defaultChecked: true }),
      r = radio(['a', 'b'], { defaultValue: 'a' }),
      t = toggle(['a', 'b'], { defaultValue: ['a'] }),
      frame = document.createElement('iframe');
    frame.title = 'Selection owner document fixture';
    box.append(c, r, t, frame);
    await settle();
    const target = frame.contentDocument!;
    target.documentElement.style.cssText =
      '--tp-primary:rgb(31,41,59);--tp-border-width:2px;--tp-border-style:solid;--tp-input:rgb(50,60,70);--tp-icon-size-md:16px;--tp-space-2:8px';
    const updates = async () => {
      const pending: Array<Promise<unknown>> = [];
      const visit = (element: Element) => {
        if ('updateComplete' in element)
          pending.push((element as Element & { updateComplete: Promise<unknown> }).updateComplete);
        for (const child of element.children) visit(child);
        for (const child of element.shadowRoot?.children ?? []) visit(child);
      };
      for (const control of [c, r, t]) visit(control);
      await Promise.all(pending);
    };
    target.body.append(c, r, t);
    await updates();
    await settle();
    await updates();
    assert(
      [c, r, t].every((member) => member.ownerDocument === target),
      'Document adoption failed',
    );
    equal(
      getComputedStyle(c.controlElement!).position,
      'relative',
      'Adopted Checkbox structural style lost',
    );
    equal(
      getComputedStyle(c.controlElement!.querySelector('.box')!).backgroundColor,
      'rgb(31, 41, 59)',
      'Adopted Checkbox recipe lost',
    );
    const item = r.children[0] as TpRadioGroupItem;
    equal(
      getComputedStyle(item.controlElement!).position,
      'relative',
      'Adopted Radio structural style lost',
    );
    equal(
      getComputedStyle(item.controlElement!.querySelector('.box')!).borderTopColor,
      'rgb(31, 41, 59)',
      'Adopted Radio recipe lost',
    );
    equal(
      getComputedStyle((t.children[0] as TpToggle).controlElement!).display,
      'inline-flex',
      'Adopted Toggle structural style lost',
    );
    const native = target.createElement('button');
    native.value = 'native';
    native.textContent = 'Native interoperability';
    r.append(native);
    await updates();
    await settle();
    assert(
      target.head.textContent?.includes('data-tp-presentation-part'),
      'Foreign document registered-part style missing',
    );
    c.controlElement!.click();
    (r.children[1] as TpRadioGroupItem).controlElement!.click();
    (t.children[1] as TpToggle).controlElement!.click();
    await settle();
    assert(!c.checked, 'Adopted Checkbox lost activation');
    equal(r.value, 'b', 'Adopted Radio lost owner');
    equal(t.value, ['b'], 'Adopted Toggle lost owner');
    box.append(c, r, t);
    frame.remove();
    await updates();
    await settle();
    await updates();
    assert(
      [c, r, t].every((member) => member.ownerDocument === document),
      'Reconnect document failed',
    );
    equal(
      getComputedStyle(c.controlElement!).position,
      'relative',
      'Returned Checkbox structural style lost',
    );
    equal(
      getComputedStyle(item.controlElement!).position,
      'relative',
      'Returned Radio structural style lost',
    );
    c.controlElement!.click();
    (r.children[0] as TpRadioGroupItem).controlElement!.click();
    (t.children[0] as TpToggle).controlElement!.click();
    await settle();
    assert(c.checked, 'Reconnected Checkbox lost activation');
    equal(r.value, 'a', 'Reconnected Radio lost owner');
    equal(t.value, ['a'], 'Reconnected Toggle lost owner');
  });

  await test('Toggle icons V-01/V-03: named Icon content, all sizes, explicit sizing and group ownership', async (box) => {
    const baseline = Object.assign(new api.TpIcon(), {
      icon: boldIcon,
      size: 'var(--tp-icon-size-sm)',
    });
    box.append(baseline);
    await settle();
    const iconExtent = baseline.getBoundingClientRect().width;
    for (const size of ['sm', 'default', 'lg'] as const) {
      const toggle = Object.assign(new api.TpToggle(), {
        size,
        ariaLabel: 'Bold',
        variant: 'outline' as const,
      });
      const icon = Object.assign(new api.TpIcon(), { icon: boldIcon });
      toggle.append(icon, document.createTextNode(' Bold'));
      box.append(toggle);
      await settle();
      const content = toggle.shadowRoot!.querySelector('[part~="toggle-content"]')!;
      equal(toggle.controlElement!.getAttribute('aria-label'), 'Bold', 'Icon-only accessible name');
      equal(icon.getAttribute('aria-hidden'), 'true', 'Decorative Icon contributes duplicate name');
      assert(
        getComputedStyle(content).display.endsWith('flex') &&
          parseFloat(getComputedStyle(content).gap) > 0,
        'Content lacks flex/gap layout',
      );
      assert(
        Math.abs(icon.getBoundingClientRect().width - iconExtent * (size === 'sm' ? 0.875 : 1)) <
          0.1,
        'Icon size context mismatch',
      );
      const plainPadding = parseFloat(getComputedStyle(toggle.controlElement!).paddingInlineStart);
      icon.setAttribute('data-icon', 'inline-start');
      await settle();
      const expectedPadding = (plainPadding * (size === 'sm' ? 1.5 : 2)) / 2.5;
      assert(
        Math.abs(
          parseFloat(getComputedStyle(toggle.controlElement!).paddingInlineStart) - expectedPadding,
        ) < 0.1,
        'Leading Icon logical padding mismatch',
      );
      toggle.dir = 'rtl';
      await settle();
      assert(
        Math.abs(
          parseFloat(getComputedStyle(toggle.controlElement!).paddingRight) - expectedPadding,
        ) < 0.1,
        'RTL leading Icon physical edge mismatch',
      );
      icon.setAttribute('data-icon', 'inline-end');
      await settle();
      assert(
        Math.abs(
          parseFloat(getComputedStyle(toggle.controlElement!).paddingInlineEnd) - expectedPadding,
        ) < 0.1,
        'Trailing Icon logical padding mismatch',
      );
      icon.size = '27px';
      await settle();
      equal(icon.getBoundingClientRect().width, 27, 'Explicit Icon.size overridden');
      toggle.ariaLabel = 'Updated bold';
      await settle();
      equal(
        toggle.controlElement!.getAttribute('aria-label'),
        'Updated bold',
        'Dynamic property name stale',
      );
      toggle.setAttribute('aria-label', 'Attribute bold');
      await settle();
      equal(
        toggle.controlElement!.getAttribute('aria-label'),
        'Attribute bold',
        'Dynamic attribute name stale',
      );
    }
    const group = Object.assign(new api.TpToggleGroup(), {
      size: 'sm' as const,
      variant: 'outline' as const,
      label: 'Icon group',
      multiple: true,
    });
    const member = Object.assign(new api.TpToggle(), {
      size: 'lg' as const,
      value: 'bold',
      ariaLabel: 'Bold',
    });
    const icon = Object.assign(new api.TpIcon(), { icon: boldIcon });
    member.append(icon);
    group.append(member);
    box.append(group);
    await settle();
    assert(
      member.selectionOwner === group && member.size === 'sm',
      'Icon group forked Toggle ownership',
    );
    assert(
      Math.abs(icon.getBoundingClientRect().width - iconExtent * 0.875) < 0.1,
      'Group size did not reach Icon',
    );
    const standalonePadding = parseFloat(
      getComputedStyle(member.controlElement!).paddingInlineStart,
    );
    group.spacing = 0;
    await settle();
    assert(
      Math.abs(
        parseFloat(getComputedStyle(member.controlElement!).paddingInlineStart) -
          (standalonePadding * 2) / 2.5,
      ) < 0.1,
      'Joined Toggle padding is not source2 units',
    );
    icon.setAttribute('data-icon', 'inline-start');
    await settle();
    assert(
      Math.abs(
        parseFloat(getComputedStyle(member.controlElement!).paddingInlineStart) -
          (standalonePadding * 1.5) / 2.5,
      ) < 0.1,
      'Joined Toggle leading edge is not source1.5 units',
    );
    group.dir = 'rtl';
    await settle();
    assert(
      Math.abs(
        parseFloat(getComputedStyle(member.controlElement!).paddingRight) -
          (standalonePadding * 1.5) / 2.5,
      ) < 0.1,
      'Joined RTL Icon edge mismatch',
    );
    icon.removeAttribute('data-icon');
    member.controlElement!.click();
    await settle();
    equal(group.value, ['bold'], 'Icon Toggle did not select');
    member.remove();
    box.append(member);
    await settle();
    equal(member.size, 'lg', 'Author size did not return on release');
    const nested = Object.assign(new api.TpToggle(), {
      ariaLabel: 'Nested boundary',
      nativeAction: false,
    });
    const nestedIcon = Object.assign(new api.TpIcon(), { icon: boldIcon });
    nestedIcon.setAttribute('data-icon', 'inline-start');
    nested.append(nestedIcon);
    member.append(nested);
    await settle();
    assert(
      !member.hasAttribute('data-icon-inline-start') &&
        nested.hasAttribute('data-icon-inline-start'),
      'Nested Toggle leaked content edge ownership',
    );
    nested.remove();
    member.partContracts = {
      'toggle-content': {
        content: html`<tp-icon data-icon="inline-start" .icon=${boldIcon}></tp-icon> Bold`,
      },
    };
    await settle();
    assert(
      member.hasAttribute('data-icon-inline-start'),
      'Composed Content Icon edge not observed',
    );
    member.partContracts = { 'toggle-content': { content: 'Plain' } };
    await settle();
    assert(!member.hasAttribute('data-icon-inline-start'), 'Removed Content retained Icon edge');
  });
  await test('Toggle icons V-02/V-05: committed artwork, focus markers and lifecycle', async (box) => {
    const toggle = Object.assign(new api.TpToggle(), { pressed: false, ariaLabel: 'Bookmark' });
    toggle.partContracts = {
      'toggle-content': {
        content: (state) =>
          html`<tp-icon .icon=${state.pressed ? filledBookmarkIcon : bookmarkIcon}></tp-icon>`,
      },
    };
    box.append(toggle);
    await settle();
    const artwork = () =>
      (toggle.shadowRoot!.querySelector('tp-icon') as InstanceType<API['TpIcon']>).icon;
    toggle.controlElement!.click();
    await settle();
    assert(!toggle.pressed && artwork() === bookmarkIcon, 'Rejected owner changed artwork');
    toggle.onPressedChange = (event) => {
      toggle.pressed = event.detail.value;
    };
    toggle.controlElement!.click();
    await settle();
    assert(toggle.pressed && artwork() === filledBookmarkIcon, 'Committed artwork resolver stale');
    toggle.focus();
    await settle();
    equal(
      toggle.controlElement!.hasAttribute('data-focus-visible'),
      toggle.controlElement!.matches(':focus-visible'),
      'Control focus marker stale',
    );
    equal(
      toggle.hasAttribute('data-focus-visible'),
      toggle.controlElement!.matches(':focus-visible'),
      'Host focus marker stale',
    );
    toggle.remove();
    await settle();
    assert(!toggle.hasAttribute('data-focus-visible'), 'Disconnect retained focus marker');
    box.append(toggle);
    await settle();
    assert(
      !toggle.controlElement!.hasAttribute('data-focus-visible'),
      'Reconnect retained focus marker',
    );
  });
  return results;
}
