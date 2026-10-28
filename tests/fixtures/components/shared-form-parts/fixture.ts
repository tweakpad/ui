import { html } from 'lit';
const built = new URLSearchParams(location.search).has('built');
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const { TpElement } = api;
if (built) document.querySelector('link[rel=stylesheet]')!.setAttribute('href', '/dist/styles.css');
(window as unknown as { delegateHtml: unknown }).delegateHtml = (bind: unknown, content: unknown) =>
  html`<button ${bind}>${content}</button>`;
// Deliberate native semantic-host probe for Foundation behavior-bundle binding.
class PartProbe extends TpElement {
  calls: string[] = [];
  count = 0;
  alternate = false;
  protected override render() {
    return this.renderPart(
      'probe',
      { count: this.count },
      {
        tag: 'button',
        properties: {
          type: 'button',
          role: 'button',
          '@click': () => {
            this.calls.push('component');
            this.count++;
            this.requestUpdate();
          },
        },
        content: html`Shared part ${this.count}`,
      },
    );
  }
}
customElements.define('tp-part-probe', PartProbe);
const fixture = document.querySelector('#fixture')!;
fixture.innerHTML =
  '<tp-part-probe></tp-part-probe><form id="outside"><tp-button type="submit">Submit</tp-button></form><tp-field label="Full name" description="Shared association"><tp-input name="name" default-value="Ada"></tp-input></tp-field><form id="local"><fieldset id="disabled-set" disabled><tp-input name="disabled-field" default-value="kept"></tp-input></fieldset><tp-checkbox name="terms">Terms</tp-checkbox><tp-switch name="news">News</tp-switch><tp-native-select name="option"><option value="one">One</option></tp-native-select><tp-select searchable name="combo" aria-label="Combo"></tp-select></form>';
(window as unknown as { partFixture: unknown }).partFixture = {
  fixture,
  probe: fixture.querySelector('tp-part-probe'),
  input: fixture.querySelector('tp-input'),
  field: fixture.querySelector('tp-field'),
};
Object.assign(window, {
  runSharedRegressions: async () => {
    const form = document.createElement('form');
    form.innerHTML =
      '<fieldset disabled><tp-native-select name="native" value="one"><option value="one">One</option></tp-native-select><tp-select searchable name="combo" value="one"></tp-select><tp-select name="select" value="one"></tp-select><tp-slider name="range" value="25"></tp-slider><tp-calendar name="date" value="2026-10-02"></tp-calendar><tp-one-time-code-field name="otp" value="123" length="3"></tp-one-time-code-field><tp-switch name="news" default-checked value="yes">News</tp-switch><tp-toggle name="action" default-pressed>Action</tp-toggle></fieldset>';
    fixture.append(form);
    const controls = [
      ...form.querySelectorAll<HTMLElement>(
        'tp-native-select,tp-select,tp-slider,tp-calendar,tp-one-time-code-field,tp-switch,tp-toggle',
      ),
    ] as (HTMLElement & {
      updateComplete: Promise<unknown>;
      effectiveDisabled: boolean;
      disabled: boolean;
    })[];
    // Native select takes its options from the authored option elements; Select takes `items`.
    type Select = import('../../../../src/index.js').TpSelect;
    for (const select of form.querySelectorAll<Select>('tp-select'))
      select.items = [{ value: 'one', label: 'One' }];
    const settle = async () => {
      for (let i = 0; i < 4; i++) await Promise.all(controls.map((el) => el.updateComplete));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    };
    await settle();
    const disabled = {
      states: controls.map((el) => ({
        tag: el.localName,
        effective: el.effectiveDisabled,
        authored: el.disabled,
      })),
      data: [...new FormData(form)],
    };
    form.querySelector('fieldset')!.disabled = false;
    await settle();
    const enabled = {
      states: controls.map((el) => ({
        tag: el.localName,
        effective: el.effectiveDisabled,
        authored: el.disabled,
      })),
      data: [...new FormData(form)],
    };
    controls[0]!.disabled = true;
    form.querySelector('fieldset')!.disabled = true;
    await settle();
    form.querySelector('fieldset')!.disabled = false;
    await settle();
    const preserved = controls[0]!.effectiveDisabled && controls[0]!.disabled;
    const results = {
      disabled,
      enabled,
      preserved,
      passed:
        disabled.states.every((el) => el.effective && !el.authored) &&
        disabled.data.length === 0 &&
        enabled.states.every((el) => !el.effective && !el.authored) &&
        preserved,
    };
    form.remove();
    return results;
  },
});

// Deliberate fixture-only control whose labelled element the default association cannot write.
// `data-probe-mode` picks its shape: `root` has no association target and applies the record to
// its root, `target` applies it to its root instead of its association target, and `default`
// only records it, so the element writes its association target as every library control does.
const associationKeys = [
  'aria-label',
  'aria-describedby',
  'aria-errormessage',
  'aria-invalid',
] as const;
type AssociationRecord = Record<(typeof associationKeys)[number], string | null>;
const probeName = 'Route sketch';
const associationOf = (element: Element | null | undefined) =>
  Object.fromEntries(
    associationKeys.map((key) => [key, element?.getAttribute(key) ?? null]),
  ) as AssociationRecord;
const { TpFormElement } = api as typeof import('../../../../src/index.js');
class AssociationProbe extends TpFormElement {
  associationRecords: AssociationRecord[] = [];
  appliedAssociation: AssociationRecord = associationOf(null);
  get probeMode(): string {
    return this.getAttribute('data-probe-mode') ?? 'default';
  }
  get probeRoot(): HTMLElement | null {
    return this.renderRoot?.querySelector('.probe-root') ?? null;
  }
  get probeTarget(): HTMLElement | null {
    return this.renderRoot?.querySelector('.probe-target') ?? null;
  }
  protected override render() {
    return html`<div class="probe-root" role="textbox" tabindex="0">Ridge line, second day</div>
      <div class="probe-target" role="group" tabindex="-1"></div>`;
  }
  protected override focusTarget(): HTMLElement | null {
    return this.probeRoot;
  }
  protected override associationTarget(): HTMLElement | null {
    return this.probeMode === 'root' ? null : this.probeTarget;
  }
  protected override applyFieldAssociation(attributes: AssociationRecord): boolean {
    this.associationRecords.push({ ...attributes });
    const applies = this.probeMode !== 'default';
    const root = this.probeRoot;
    if (root) {
      for (const key of associationKeys) {
        const value = applies ? attributes[key] : null;
        if (value === null) root.removeAttribute(key);
        else root.setAttribute(key, value);
      }
      if (!root.hasAttribute('aria-label')) root.setAttribute('aria-label', probeName);
    }
    this.appliedAssociation = associationOf(root);
    return applies;
  }
  protected resetFormValue(): void {}
}
customElements.define('tp-association-probe', AssociationProbe);
fixture.insertAdjacentHTML(
  'beforeend',
  '<section id="association" aria-label="Association probes"><tp-field label="Expedition log" description="Shared with the whole rope team"><tp-association-probe data-field-control data-probe-mode="root"></tp-association-probe></tp-field><tp-field label="Summit notes" description="Written at the top"><tp-association-probe data-field-control data-probe-mode="target"></tp-association-probe></tp-field><tp-field label="Base camp memo" description="Pinned by the stove"><tp-association-probe data-field-control data-probe-mode="default"></tp-association-probe></tp-field></section>',
);
const associationSection = fixture.querySelector<HTMLElement>('#association')!;
const associationProbes = [
  ...associationSection.querySelectorAll<AssociationProbe>('tp-association-probe'),
];
type ProbeField = HTMLElement & {
  label: string;
  description: string;
  errors: string[];
  updateComplete: Promise<unknown>;
};
const probeField = (probe: AssociationProbe) => probe.closest('tp-field') as ProbeField | null;
probeField(associationProbes[0]!)!.errors = ['Add the elevation gain of each day'];
const settleAssociation = async () => {
  const elements = [
    ...associationSection.querySelectorAll<HTMLElement>('tp-field'),
  ] as ProbeField[];
  for (let i = 0; i < 4; i++)
    await Promise.all([...elements, ...associationProbes].map((element) => element.updateComplete));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
};
/** The probe's description and error nodes, where they sit and whether the record's ids resolve. */
const associationState = (probe: AssociationProbe) => {
  const shadow = probe.shadowRoot!;
  const record = probe.associationRecords.at(-1) ?? null;
  const nodes = [...shadow.children, ...probe.children]
    .filter((node) => node.matches('span.visually-hidden[id]'))
    .map((node) => ({
      id: node.id,
      text: node.textContent,
      where: node.getRootNode() === shadow ? 'shadow' : 'light',
    }));
  const references = [record?.['aria-describedby'], record?.['aria-errormessage']]
    .flatMap((value) => value?.split(' ') ?? [])
    .map((id) => ({ id, resolves: !!shadow.getElementById(id) }));
  return {
    mode: probe.probeMode,
    record,
    records: probe.associationRecords.length,
    root: associationOf(probe.probeRoot),
    target: associationOf(probe.probeTarget),
    nodes,
    references,
  };
};
type AssociationState = ReturnType<typeof associationState>;
const textOf = (state: AssociationState, id: string | null | undefined) =>
  state.nodes.find((node) => node.id === id)?.text ?? null;
/** Whether the state carries the expected Field texts (each `null` when absent) as the mode says. */
const associationPassed = (
  state: AssociationState,
  expected: { label: string | null; description: string | null; error: string | null },
) => {
  const record = state.record;
  if (!record) return false;
  const [descriptionId, errorId] = [
    expected.description === null ? null : (record['aria-describedby']?.split(' ')[0] ?? null),
    record['aria-errormessage'],
  ];
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || null;
  const written = state.mode === 'default' ? state.target : state.root;
  const untouched = state.mode === 'default' ? state.root : state.target;
  const named =
    state.mode === 'default' ? record['aria-label'] : (record['aria-label'] ?? probeName);
  const defaultName = state.mode === 'default' ? probeName : null;
  return (
    record['aria-label'] === expected.label &&
    record['aria-describedby'] === describedBy &&
    (expected.error === null
      ? record['aria-errormessage'] === null && record['aria-invalid'] === null
      : textOf(state, errorId) === expected.error && record['aria-invalid'] === 'true') &&
    (expected.description === null || textOf(state, descriptionId) === expected.description) &&
    JSON.stringify(written) === JSON.stringify({ ...record, 'aria-label': named }) &&
    JSON.stringify(untouched) ===
      JSON.stringify({ ...associationOf(null), 'aria-label': defaultName }) &&
    state.nodes.length === [descriptionId, errorId].filter(Boolean).length &&
    state.nodes.every((node) => node.where === 'shadow') &&
    state.references.every((reference) => reference.resolves)
  );
};
const fieldExpectation = (probe: AssociationProbe) => {
  const field = probeField(probe);
  return {
    label: field?.label || null,
    description: field?.description || null,
    error: field?.errors.join('. ') || null,
  };
};
(window as unknown as { associationFixture: unknown }).associationFixture = {
  section: associationSection,
  probes: associationProbes,
  /** Every probe's last record, root and target attributes, nodes and resolved ids. */
  async check() {
    await settleAssociation();
    const probes = associationProbes.map((probe) => {
      const state = associationState(probe);
      return { ...state, passed: associationPassed(state, fieldExpectation(probe)) };
    });
    return { probes, passed: probes.every((probe) => probe.passed) };
  },
  /** Changes the root probe's description and error, moves it out of its Field and back. */
  async cycle() {
    const probe = associationProbes[0]!;
    const field = probeField(probe)!;
    const original = { description: field.description, errors: field.errors };
    const steps: { step: string; state: AssociationState; passed: boolean }[] = [];
    const record = async (step: string, expected: Parameters<typeof associationPassed>[1]) => {
      await settleAssociation();
      const state = associationState(probe);
      steps.push({ step, state, passed: associationPassed(state, expected) });
    };
    field.description = 'Shared with the rescue team';
    await record('description', fieldExpectation(probe));
    field.errors = ['Log the descent time'];
    await record('error set', fieldExpectation(probe));
    field.errors = [];
    await record('error cleared', fieldExpectation(probe));
    associationSection.append(probe);
    await record('moved out', { label: null, description: null, error: null });
    field.append(probe);
    await record('moved back', fieldExpectation(probe));
    field.description = original.description;
    field.errors = original.errors;
    await settleAssociation();
    return { steps, passed: steps.every((step) => step.passed) };
  },
};
