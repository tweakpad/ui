import type { TpSlider, TpSliderThumb } from '../../../../src/components/slider/index.js';
import type { TpValueChangeEvent } from '../../../../src/foundation/events.js';
import type { TpField } from '../../../../src/components/field/index.js';
import { html } from 'lit';

const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const dynamic = document.querySelector<HTMLElement>('#dynamic')!;
const sliders = [...document.querySelectorAll<TpSlider>('tp-slider')];
const scalar = document.querySelector<TpSlider>('#scalar')!;
const range = document.querySelector<TpSlider>('#range')!;
const events: {
  kind: string;
  value: unknown;
  previous: unknown;
  reason: string;
  index: unknown;
  sourceType?: string;
}[] = [];
document.addEventListener('tp-value-change', (event) => {
  const detail = (event as TpValueChangeEvent<unknown>).detail;
  events.push({
    kind: 'change',
    value: detail.value,
    previous: detail.previousValue,
    reason: detail.reason,
    index: detail.metadata?.activeThumbIndex,
    ...(detail.sourceEvent ? { sourceType: detail.sourceEvent.type } : {}),
  });
});
document.addEventListener('tp-value-commit', (event) => {
  const detail = (event as TpValueChangeEvent<unknown>).detail;
  events.push({
    kind: 'commit',
    value: detail.value,
    previous: detail.previousValue,
    reason: detail.reason,
    index: detail.metadata?.activeThumbIndex,
  });
});
range.partContracts = { 'slider-output': {} };
for (const [index, thumb] of [
  ...range.querySelectorAll<TpSliderThumb>('tp-slider-thumb'),
].entries())
  thumb.getAccessibleLabel = () => (index ? 'Maximum budget' : 'Minimum budget');
async function settle(slider: TpSlider) {
  for (let index = 0; index < 4; index++) {
    await slider.updateComplete;
    const thumbs = [
      ...slider.querySelectorAll<TpSliderThumb>('tp-slider-thumb'),
      ...slider.shadowRoot!.querySelectorAll<TpSliderThumb>('tp-slider-thumb'),
    ];
    await Promise.all(thumbs.map((thumb) => thumb.updateComplete));
    await new Promise<void>((resolve) => {
      const fallback = window.setTimeout(resolve, 32);
      requestAnimationFrame(() => {
        window.clearTimeout(fallback);
        resolve();
      });
    });
  }
}
await Promise.all(sliders.map((slider) => settle(slider)));
const records: { name: string; pass: boolean; actual: unknown }[] = [];
const check = (name: string, pass: boolean, actual: unknown) => {
  records.push({ name, pass, actual });
  if (!pass) throw new Error(`${name}: ${JSON.stringify(actual)}`);
};
async function create(
  properties: Record<string, unknown> = {},
  thumbs?: { index: number; disabled?: boolean }[],
): Promise<TpSlider> {
  const slider = document.createElement('tp-slider') as TpSlider;
  Object.assign(slider, { defaultValue: 40, label: 'API slider', ...properties });
  if (thumbs)
    for (const properties of thumbs) {
      const thumb = document.createElement('tp-slider-thumb') as TpSliderThumb;
      Object.assign(thumb, properties);
      slider.append(thumb);
    }
  dynamic.append(slider);
  await settle(slider);
  return slider;
}
async function assertCore() {
  records.length = 0;
  const slider = await create({ defaultValue: [20, 40, 60], minStepsBetweenValues: 10 }, [
    { index: 0 },
    { index: 1 },
    { index: 2 },
  ]);
  check(
    'C01 committed ordered values and metadata',
    JSON.stringify(slider.values) === '[20,40,60]' && slider.thumbMetadata.length === 3,
    slider.thumbMetadata,
  );
  check(
    'C03 canonical default push',
    slider.thumbCollisionBehavior === 'push',
    slider.thumbCollisionBehavior,
  );
  const thumbs = [...slider.querySelectorAll<TpSliderThumb>('tp-slider-thumb')];
  slider.requestThumbValue(thumbs[0]!, 70, 'input', new Event('input'));
  await settle(slider);
  check(
    'C03 push updates adjacent values',
    JSON.stringify(slider.values) === '[70,80,90]',
    slider.values,
  );
  slider.requestThumbValue(thumbs[0]!, 30, 'input', new Event('input'));
  await settle(slider);
  check(
    'C03 reversal retains pushed neighbors',
    JSON.stringify(slider.values) === '[30,80,90]',
    slider.values,
  );
  slider.setValue([20, 40, 60]);
  await settle(slider);
  thumbs[1]!.disabled = true;
  await settle(slider);
  slider.requestThumbValue(thumbs[0]!, 70, 'input', new Event('input'));
  await settle(slider);
  check(
    'C04 disabled neighbor stops push',
    JSON.stringify(slider.values) === '[30,40,60]',
    slider.values,
  );
  const input = thumbs[0]!.inputElement as HTMLInputElement;
  check(
    'C10 actual input metadata and native semantic state',
    input.id === slider.thumbMetadata[0]?.inputId && input.type === 'range' && input.value === '30',
    { id: input.id, value: input.value },
  );
  check(
    'C11 native input separate from visual public part',
    input.getAttribute('part') === 'focusable' &&
      thumbs[0]!.visualElement?.getAttribute('part')?.includes('slider-thumb') === true,
    {
      inputPart: input.getAttribute('part'),
      visualPart: thumbs[0]!.visualElement?.getAttribute('part'),
    },
  );
  const before = slider.value;
  slider.onValueChange = (event) => event.preventDefault();
  slider.setValue([0, 10, 20]);
  await settle(slider);
  check(
    'C05 canceled value stays committed',
    JSON.stringify(before) === JSON.stringify(slider.value),
    slider.value,
  );
  slider.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims: 'API calls only; not real input evidence',
  };
}
async function assertControlled() {
  records.length = 0;
  const slider = await create({ value: 40, defaultValue: undefined });
  const commits: unknown[] = [];
  slider.onValueCommitted = (event) => commits.push(event.detail.value);
  slider.onValueChange = (event) => {
    slider.value = Math.min(60, event.detail.value as number);
  };
  slider.setValue(80);
  await settle(slider);
  check(
    'C05 owner normalization commits actual value',
    slider.value === 60 && JSON.stringify(commits) === '[60]',
    { value: slider.value, commits },
  );
  slider.onValueChange = () => {};
  slider.setValue(70);
  await settle(slider);
  check('C05 rejected owner proposal preserves geometry/value', slider.value === 60, slider.value);
  slider.value = 70;
  await settle(slider);
  check(
    'C05 late owner acceptance commits once',
    slider.value === 70 && JSON.stringify(commits) === '[60,70]',
    { value: slider.value, commits },
  );
  slider.onValueChange = (event) => {
    event.preventDefault();
    slider.value = 90;
  };
  slider.setValue(90);
  await settle(slider);
  check('C05 canceled owner write not replayed', slider.value === 70, slider.value);
  slider.onValueChange = () => {};
  slider.value = 50;
  await settle(slider);
  slider.value = 90;
  await settle(slider);
  check(
    'C05 unrelated later publication has no stale commit',
    JSON.stringify(commits) === '[60,70]',
    commits,
  );
  slider.remove();
  const queued = await create({ value: 40, defaultValue: undefined });
  const queuedCommits: unknown[] = [];
  queued.onValueCommitted = (event) => queuedCommits.push(event.detail.value);
  queued.onValueChange = (event) => {
    queued.value = event.detail.value;
    if (event.detail.value === 50) queued.setValue(70);
  };
  queued.setValue(50);
  await settle(queued);
  check(
    'C05 reentrant proposal keeps its own commit metadata',
    queued.value === 70 && JSON.stringify(queuedCommits) === '[50,70]',
    { value: queued.value, commits: queuedCommits },
  );
  queued.onValueChange = () => {};
  queued.setValue(80);
  await settle(queued);
  queued.onValueChange = (event) => {
    queued.value = event.detail.value;
  };
  queued.setValue(90);
  await settle(queued);
  queued.value = 80;
  await settle(queued);
  check(
    'C05 accepted newer publication supersedes stale pending metadata',
    JSON.stringify(queuedCommits) === '[50,70,90]',
    queuedCommits,
  );
  queued.remove();
  return { checks: records.length, records: [...records], inputClaims: 'API calls only' };
}
async function assertConstraints() {
  records.length = 0;
  const slider = await create({ defaultValue: 4.4, minimum: 1, maximum: 10, step: 2 });
  check('C02 non-zero lattice origin', slider.value === 5, slider.value);
  slider.setValue(100);
  await settle(slider);
  check('C02 non-divisible maximum uses last valid step', slider.value === 9, slider.value);
  slider.min = -10;
  slider.max = 10;
  slider.step = 0.5;
  await settle(slider);
  slider.setValue(1.26);
  await settle(slider);
  check(
    'C02 aliases share canonical bounds',
    slider.minimum === -10 && slider.maximum === 10 && slider.value === 1.5,
    { min: slider.min, minimum: slider.minimum, value: slider.value },
  );
  slider.largeStep = 0;
  await settle(slider);
  check(
    'C02 invalid configuration disables native adjustment',
    (slider.inputElement as HTMLInputElement).disabled,
    slider.inputElement?.getAttribute('disabled'),
  );
  slider.largeStep = 10;
  slider.step = 0;
  await settle(slider);
  check(
    'C02 zero step disables adjustment',
    (slider.inputElement as HTMLInputElement).disabled,
    slider.step,
  );
  slider.step = 1;
  slider.minimum = 10;
  slider.maximum = 10;
  await settle(slider);
  check('C02 equal bounds disable adjustment', (slider.inputElement as HTMLInputElement).disabled, [
    slider.minimum,
    slider.maximum,
  ]);
  slider.remove();
  const range = await create({ defaultValue: [80, 21, 20], step: 5, minStepsBetweenValues: 2 });
  check(
    'C02 ordered separation normalization',
    JSON.stringify(range.values) === '[20,30,80]',
    range.values,
  );
  range.maximum = 10;
  range.minStepsBetweenValues = 6;
  await settle(range);
  check(
    'C02 infeasible separation disables every Thumb',
    range.thumbMetadata.every((item) => item.disabled),
    range.thumbMetadata,
  );
  range.remove();
  const legacy = await create({ defaultValue: [20, 60], thumbCrossing: 'prevent' });
  const thumb = legacy.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!;
  legacy.requestThumbValue(thumb, 80, 'keyboard', new Event('api-source'));
  await settle(legacy);
  check(
    'C03 explicitly authored legacy prevent remains none',
    JSON.stringify(legacy.values) === '[60,60]',
    legacy.values,
  );
  legacy.remove();
  const canonical = await create({
    defaultValue: [20, 60],
    thumbCrossing: 'prevent',
    thumbCollisionBehavior: 'push',
  });
  const canonicalThumb = canonical.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!;
  canonical.requestThumbValue(canonicalThumb, 80, 'keyboard', new Event('api-source'));
  await settle(canonical);
  check(
    'C03 explicitly authored canonical push takes precedence over legacy prevent',
    JSON.stringify(canonical.values) === '[80,80]',
    canonical.values,
  );
  canonical.remove();
  return { checks: records.length, records: [...records], inputClaims: 'API calls only' };
}
async function assertParts() {
  records.length = 0;
  const references = new Map<string, HTMLElement | null>();
  const observed: { name: string; state: Readonly<Record<string, unknown>> }[] = [];
  const names = [
    'slider',
    'slider-track',
    'slider-range',
    'slider-label',
    'slider-output',
    'slider-thumb',
  ];
  const contracts = Object.fromEntries(
    names.map((name) => [
      name,
      {
        renderDelegate: ({
          bind,
          content,
          state,
        }: {
          bind: unknown;
          content: unknown;
          state: Readonly<Record<string, unknown>>;
        }) => {
          observed.push({ name, state });
          return name === 'slider-output'
            ? html`<output ${bind}>${content}</output>`
            : html`<span ${bind}>${content}</span>`;
        },
        elementReference: (element: HTMLElement | null) => references.set(name, element),
        classHook: `custom-${name}`,
        styleHook: { '--fixture-hook': 'ready' },
        hostProperties: { title: `${name} title`, 'data-neutral': name },
      },
    ]),
  );
  const slider = await create({ defaultValue: [20, 60], partContracts: contracts });
  for (const name of names) {
    const element = references.get(name);
    check(
      `C21 ${name} delegated host/ref/title/hooks`,
      !!element &&
        element.getAttribute('title') === `${name} title` &&
        element.classList.contains(`custom-${name}`) &&
        element.style.getPropertyValue('--fixture-hook') === 'ready',
      element?.outerHTML.slice(0, 300),
    );
  }
  const rootState = observed.filter((item) => item.name === 'slider').at(-1)?.state;
  check(
    'C20 contract state has canonical published bounds',
    rootState?.min === 0 &&
      rootState?.max === 100 &&
      JSON.stringify(rootState.values) === '[20,60]',
    rootState,
  );
  const input = slider.inputElement as HTMLInputElement;
  const thumb = slider.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!;
  check(
    'C21 Thumb neutral attributes stay visual',
    thumb.visualElement?.title === 'slider-thumb title' && input.title === '',
    { visualTitle: thumb.visualElement?.title, inputTitle: input.title },
  );
  const nativeCalls: { type: string; target: string }[] = [];
  thumb.inputElementReference = (node) => references.set('native-input', node);
  slider.partContracts = {
    ...contracts,
    'slider-thumb': {
      ...contracts['slider-thumb'],
      hostProperties: {
        title: 'native split',
        tabindex: -1,
        '@focus': (event: Event) =>
          nativeCalls.push({
            type: event.type,
            target: (event.currentTarget as HTMLElement).tagName,
          }),
        '@blur': (event: Event) =>
          nativeCalls.push({
            type: event.type,
            target: (event.currentTarget as HTMLElement).tagName,
          }),
        '@keydown': (event: Event & { preventComponentHandling(): void }) => {
          nativeCalls.push({
            type: event.type,
            target: (event.currentTarget as HTMLElement).tagName,
          });
          event.preventComponentHandling();
        },
      },
    },
  };
  await settle(slider);
  check(
    'C11 native tabIndex forwarded and visual host not focusable',
    input.tabIndex === -1 &&
      !thumb.visualElement?.hasAttribute('tabindex') &&
      !thumb.hasAttribute('tabindex'),
    {
      native: input.tabIndex,
      visual: thumb.visualElement?.getAttribute('tabindex'),
      host: thumb.getAttribute('tabindex'),
    },
  );
  check(
    'C10 native reference distinct from visual reference',
    references.get('native-input') === input && references.get('slider-thumb') !== input,
    {
      native: references.get('native-input')?.tagName,
      visual: references.get('slider-thumb')?.tagName,
    },
  );
  input.focus();
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
  );
  input.blur();
  await settle(slider);
  check(
    'C11 forwarded handlers use actual native currentTarget',
    nativeCalls.length === 3 && nativeCalls.every((item) => item.target === 'INPUT'),
    nativeCalls,
  );
  check(
    'C11 component-handler cancellation retains committed value',
    JSON.stringify(slider.values) === '[20,60]',
    slider.values,
  );
  slider.partContracts = {
    'slider-output': {
      content: (state: Readonly<Record<string, unknown>>) =>
        html`<tp-key-hint>⇧</tp-key-hint>
          ${String((state.formattedValues as string[]).join(' – '))}`,
    },
    'slider-thumb': { content: html`<tp-key-hint>⇧</tp-key-hint>` },
  };
  await settle(slider);
  check(
    'C16 rich Output uses actual component',
    !!slider.shadowRoot!.querySelector('tp-key-hint'),
    slider.shadowRoot!.querySelector('[part~="slider-output"]')?.textContent,
  );
  const currentThumb = slider.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!;
  check(
    'C21 Thumb custom content retains its native input',
    !!currentThumb.shadowRoot!.querySelector('tp-key-hint') &&
      (currentThumb.inputElement as HTMLInputElement)?.type === 'range' &&
      (currentThumb.inputElement as HTMLInputElement)?.value === '20',
    currentThumb.shadowRoot!.innerHTML.slice(0, 200),
  );
  slider.remove();
  await Promise.resolve();
  check(
    'C21 delegate refs release on removal',
    names.every((name) => references.get(name) === null),
    [...references].map(([name, node]) => [name, node?.tagName ?? null]),
  );
  check(
    'C10 native ref releases on removal',
    references.get('native-input') === null,
    references.get('native-input'),
  );
  return {
    checks: records.length,
    records: [...records],
    inputClaims: 'Synthetic events and focus API only; real input is verified separately',
  };
}
async function assertForms() {
  records.length = 0;
  const form = document.createElement('form');
  form.id = `form-${Date.now()}`;
  dynamic.append(form);
  const slider = await create({ defaultValue: [20, 50, 80], name: 'range', formOwner: form }, [
    { index: 0 },
    { index: 1, disabled: true },
    { index: 2 },
  ]);
  check(
    'C18 ordered enabled-only FormData',
    JSON.stringify(new FormData(form).getAll('range')) === '["20","80"]',
    new FormData(form).getAll('range'),
  );
  slider.readOnly = true;
  await settle(slider);
  check(
    'C18 read-only native inputs stay enabled/focusable and serialize',
    !(slider.inputElement as HTMLInputElement).disabled &&
      JSON.stringify(new FormData(form).getAll('range')) === '["20","80"]',
    {
      disabled: (slider.inputElement as HTMLInputElement).disabled,
      values: new FormData(form).getAll('range'),
    },
  );
  slider.setValue([10, 50, 90]);
  await settle(slider);
  form.reset();
  await settle(slider);
  check(
    'C18 uncontrolled reset restores declared default',
    JSON.stringify(slider.value) === '[20,50,80]',
    slider.value,
  );
  slider.formStateRestoreCallback('[15,50,85]');
  await settle(slider);
  check(
    'C18 uncontrolled restoration updates single owner',
    JSON.stringify(slider.value) === '[15,50,85]',
    slider.value,
  );
  slider.disabled = true;
  await settle(slider);
  check(
    'C18 disabled Root contributes no successful controls',
    new FormData(form).getAll('range').length === 0,
    new FormData(form).getAll('range'),
  );
  slider.remove();
  const controlled = await create({
    value: 40,
    defaultValue: undefined,
    name: 'controlled',
    formOwner: form,
  });
  controlled.value = 60;
  await settle(controlled);
  form.reset();
  await settle(controlled);
  check(
    'C18 controlled reset preserves owner publication',
    controlled.value === 60,
    controlled.value,
  );
  controlled.formStateRestoreCallback('20');
  await settle(controlled);
  check('C18 controlled restoration preserves owner', controlled.value === 60, controlled.value);
  controlled.remove();
  form.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims: 'Native FormData/reset protocol with API updates; not real submit input',
  };
}
async function assertComposition() {
  records.length = 0;
  const slider = await create({ defaultValue: [20, 40, 60] }, [
    { index: 0 },
    { index: 1 },
    { index: 2 },
  ]);
  const middle = slider.querySelectorAll<TpSliderThumb>('tp-slider-thumb')[1]!;
  middle.remove();
  await settle(slider);
  check(
    'C12 removal normalizes uncontrolled list',
    JSON.stringify(slider.value) === '[20,60]',
    slider.value,
  );
  slider.querySelectorAll('tp-slider-thumb').forEach((thumb) => thumb.remove());
  await settle(slider);
  check(
    'C12 last authored Thumb removal does not generate defaults',
    slider.shadowRoot!.querySelectorAll('tp-slider-thumb').length === 0 &&
      slider.querySelectorAll('tp-slider-thumb').length === 0,
    slider.thumbMetadata,
  );
  slider.remove();
  const controlled = await create({ value: [20, 60], defaultValue: undefined }, [{ index: 0 }]);
  check(
    'C12 controlled mismatch retains unmatched owner values',
    JSON.stringify(controlled.value) === '[20,60]',
    controlled.value,
  );
  check(
    'C12 controlled mismatch disables ambiguous interaction',
    (controlled.inputElement as HTMLInputElement).disabled,
    controlled.thumbMetadata,
  );
  controlled.remove();
  const duplicate = await create({ defaultValue: [20, 60] }, [{ index: 0 }, { index: 0 }]);
  check(
    'C12 duplicate indices disable ambiguity',
    duplicate.thumbMetadata.every((item) => item.disabled),
    duplicate.thumbMetadata,
  );
  duplicate.remove();
  return { checks: records.length, records: [...records], inputClaims: 'DOM membership/API only' };
}
async function assertSnippet() {
  records.length = 0;
  const container = document.createElement('div');
  // Exact copyable HTML after the already executed public registration/styles imports.
  container.innerHTML =
    '<tp-slider label="Volume" name="volume" default-value="40" minimum="0" maximum="100" step="1" thumb-alignment="edge"></tp-slider>';
  dynamic.append(container);
  const slider = container.querySelector<TpSlider>('tp-slider')!;
  await settle(slider);
  check(
    'C23 copied composition creates actual working native Thumb',
    slider.value === 40 && slider.inputElement?.getAttribute('type') === 'range',
    { value: slider.value, input: slider.inputElement?.outerHTML },
  );
  slider.setValue(60);
  await settle(slider);
  check(
    'C23 copied composition accepts public value proposal',
    slider.value === 60 && (slider.inputElement as HTMLInputElement).value === '60',
    slider.value,
  );
  container.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims: 'Copyable public composition/API only',
  };
}
async function assertField() {
  records.length = 0;
  const field = document.createElement('tp-field') as TpField;
  Object.assign(field, {
    name: 'field-budget',
    label: 'Budget bounds',
    description: 'Choose the lower and upper budget.',
    validationMode: 'on-blur',
  });
  const slider = await create({ defaultValue: [20, 60], label: '' });
  field.append(slider);
  dynamic.append(field);
  await field.updateComplete;
  await settle(slider);
  await field.updateComplete;
  check(
    'C19 Field discovers Root as sole abstract control',
    field.control === slider && JSON.stringify(field.value) === '[20,60]',
    { control: field.control?.localName, value: field.value },
  );
  check(
    'C19 Field name propagates through shared owner',
    slider.effectiveName === 'field-budget',
    slider.effectiveName,
  );
  const thumbs = [...slider.shadowRoot!.querySelectorAll<TpSliderThumb>('tp-slider-thumb')];
  const inputs = thumbs.map((thumb) => thumb.inputElement as HTMLInputElement);
  check(
    'C15 range labels are distinct within Field',
    inputs[0]!.getAttribute('aria-label') !== inputs[1]!.getAttribute('aria-label') &&
      inputs.every((input) => input.getAttribute('aria-label')?.includes('Budget bounds')),
    inputs.map((input) => input.getAttribute('aria-label')),
  );
  const descriptions = inputs.map((input) =>
    (input.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => (input.getRootNode() as ShadowRoot).getElementById(id)?.textContent),
  );
  check(
    'C19 every native input resolves its own description mirror',
    descriptions.every((items) => items.includes('Choose the lower and upper budget.')),
    descriptions,
  );
  inputs[0]!.focus();
  await settle(slider);
  await field.updateComplete;
  inputs[1]!.focus();
  await settle(slider);
  await field.updateComplete;
  check(
    'C19 inter-Thumb focus stays focused without touching',
    field.validityState.focused && !field.validityState.touched,
    field.validityState,
  );
  inputs[1]!.blur();
  await settle(slider);
  await field.updateComplete;
  check(
    'C19 leaving entire control touches Field',
    field.validityState.touched && !field.validityState.focused,
    field.validityState,
  );
  slider.setValue([30, 70]);
  await settle(slider);
  await field.updateComplete;
  check(
    'C19 committed normalized list marks Field dirty',
    field.validityState.dirty && JSON.stringify(field.value) === '[30,70]',
    field.validityState,
  );
  field.error = 'Budget is unavailable.';
  await field.updateComplete;
  await settle(slider);
  check(
    'C19 error propagates native invalid semantics',
    inputs.every((input) => input.getAttribute('aria-invalid') === 'true'),
    inputs.map((input) => input.getAttribute('aria-invalid')),
  );
  const errors = inputs.map((input) =>
    (input.getAttribute('aria-errormessage') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => (input.getRootNode() as ShadowRoot).getElementById(id)?.textContent),
  );
  check(
    'C19 every native input resolves its own error mirror',
    errors.every((items) => items.includes('Budget is unavailable.')),
    errors,
  );
  field.error = '';
  field.validator = (value) =>
    (value as number[])[0]! < 40 ? 'Minimum budget must be forty.' : null;
  await field.validate().completion;
  await field.updateComplete;
  await settle(slider);
  check(
    'C19 actual Field validator receives ordered numeric values',
    field.validityState.errors.includes('Minimum budget must be forty.'),
    field.validityState,
  );
  slider.setValue([40, 80]);
  await settle(slider);
  await field.validate().completion;
  await field.updateComplete;
  await settle(slider);
  check(
    'C19 corrected values clear validation semantics',
    field.validityState.errors.length === 0 &&
      inputs.every((input) => input.getAttribute('aria-invalid') !== 'true'),
    field.validityState,
  );
  field.disabled = true;
  await field.updateComplete;
  await settle(slider);
  check(
    'C19 Field disable reaches every native input',
    inputs.every((input) => input.disabled),
    inputs.map((input) => input.disabled),
  );
  field.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims: 'Field API/focus protocol only; real Tab/label interactions are separate',
  };
}
async function assertGeometry() {
  records.length = 0;
  const slider = await create({ defaultValue: [0, 100], thumbAlignment: 'edge' });
  const thumbs = [...slider.shadowRoot!.querySelectorAll<TpSliderThumb>('tp-slider-thumb')];
  const geometry = () => {
    const control = slider
      .shadowRoot!.querySelector<HTMLElement>('.control')!
      .getBoundingClientRect();
    const first = thumbs[0]!.visualElement!.getBoundingClientRect();
    const last = thumbs[1]!.visualElement!.getBoundingClientRect();
    const range = slider
      .shadowRoot!.querySelector<HTMLElement>('[part~="slider-range"]')!
      .getBoundingClientRect();
    return { control, first, last, range };
  };
  const near = (left: number, right: number) => Math.abs(left - right) < 1;
  let rects = geometry();
  const hitTarget = () => {
    const style = getComputedStyle(thumbs[0]!.visualElement!, '::after');
    return { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height) };
  };
  let target = hitTarget();
  check(
    'C22 structural Thumb target preserves default 44px minimum',
    target.width >= 43.9 && target.height >= 43.9,
    target,
  );
  slider.style.setProperty('--tp-target-size-min', '60px');
  await settle(slider);
  target = hitTarget();
  check(
    'C22 structural Thumb target follows the shared replacement token',
    target.width >= 59.9 && target.height >= 59.9,
    target,
  );
  slider.style.removeProperty('--tp-target-size-min');
  await settle(slider);
  check(
    'C13 measured edge alignment contains first/last visual Thumb',
    near(rects.first.left, rects.control.left) && near(rects.last.right, rects.control.right),
    { first: rects.first.toJSON(), last: rects.last.toJSON(), control: rects.control.toJSON() },
  );
  check(
    'C14 edge range endpoints meet Thumb centers',
    near(rects.range.left, rects.first.left + rects.first.width / 2) &&
      near(rects.range.right, rects.last.left + rects.last.width / 2),
    { range: rects.range.toJSON(), first: rects.first.toJSON(), last: rects.last.toJSON() },
  );
  slider.thumbAlignment = 'center';
  await settle(slider);
  rects = geometry();
  check(
    'C13 center alignment reaches actual bounds',
    near(rects.first.left + rects.first.width / 2, rects.control.left) &&
      near(rects.last.left + rects.last.width / 2, rects.control.right),
    { first: rects.first.toJSON(), last: rects.last.toJSON(), control: rects.control.toJSON() },
  );
  slider.thumbAlignment = 'edge';
  slider.setValue([25, 75]);
  await settle(slider);
  rects = geometry();
  check(
    'C14 inset inner range is still coherent',
    near(rects.range.left, rects.first.left + rects.first.width / 2) &&
      near(rects.range.right, rects.last.left + rects.last.width / 2),
    rects.range.toJSON(),
  );
  slider.setAttribute('dir', 'rtl');
  await settle(slider);
  rects = geometry();
  check(
    'C13 RTL swaps physical direction without rewriting values',
    rects.first.left > rects.last.left && JSON.stringify(slider.values) === '[25,75]',
    { first: rects.first.left, last: rects.last.left, values: slider.values },
  );
  check(
    'C14 RTL indicator meets reversed centers',
    near(rects.range.right, rects.first.left + rects.first.width / 2) &&
      near(rects.range.left, rects.last.left + rects.last.width / 2),
    rects.range.toJSON(),
  );
  slider.removeAttribute('dir');
  slider.orientation = 'vertical';
  slider.style.height = '240px';
  await settle(slider);
  rects = geometry();
  check(
    'C13 vertical authored extent contains measured Control',
    near(slider.getBoundingClientRect().height, 240) && rects.control.height > 160,
    { host: slider.getBoundingClientRect().toJSON(), control: rects.control.toJSON() },
  );
  check(
    'C14 vertical indicator meets Thumb centers',
    near(rects.range.bottom, rects.first.top + rects.first.height / 2) &&
      near(rects.range.top, rects.last.top + rects.last.height / 2),
    rects.range.toJSON(),
  );
  slider.style.height = '';
  await settle(slider);
  rects = geometry();
  const track = slider
    .shadowRoot!.querySelector<HTMLElement>('[part~="slider-track"]')!
    .getBoundingClientRect();
  check(
    'Vertical auto extent keeps Track and Range visible without consumer sizing',
    rects.control.height > 0 &&
      near(track.height, rects.control.height) &&
      near(rects.range.bottom, rects.first.top + rects.first.height / 2) &&
      near(rects.range.top, rects.last.top + rects.last.height / 2),
    { track: track.toJSON(), control: rects.control.toJSON(), range: rects.range.toJSON() },
  );
  slider.orientation = 'horizontal';
  slider.style.height = '';
  slider.setValue([0, 100]);
  slider.partContracts = { 'slider-thumb': { styleHook: { width: '32px', height: '32px' } } };
  await settle(slider);
  rects = geometry();
  check(
    'C13 custom measured Thumb size changes travel inset',
    near(rects.first.width, 32) &&
      near(rects.first.left, rects.control.left) &&
      near(rects.last.right, rects.control.right),
    { first: rects.first.toJSON(), last: rects.last.toJSON(), control: rects.control.toJSON() },
  );
  slider.style.width = '260px';
  await settle(slider);
  rects = geometry();
  check(
    'C13 resize retains measured endpoints',
    near(rects.control.width, 260) &&
      near(rects.first.left, rects.control.left) &&
      near(rects.last.right, rects.control.right),
    rects.control.toJSON(),
  );
  slider.style.transform = 'scale(1.5)';
  slider.style.transformOrigin = 'left top';
  await settle(slider);
  rects = geometry();
  check(
    'C13 scaled geometry remains inset',
    near(rects.first.left, rects.control.left) && near(rects.last.right, rects.control.right),
    { first: rects.first.toJSON(), last: rects.last.toJSON(), control: rects.control.toJSON() },
  );
  slider.remove();
  const delayed = await create({ defaultValue: 0, thumbAlignment: 'delayed-edge' });
  const thumb = delayed.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!;
  const before = thumb.visualElement!.getBoundingClientRect(),
    control = delayed.shadowRoot!.querySelector<HTMLElement>('.control')!.getBoundingClientRect();
  check(
    'C13 delayed-edge starts centered',
    near(before.left + before.width / 2, control.left),
    before.toJSON(),
  );
  thumb.focus();
  await settle(delayed);
  check(
    'C13 activation adopts measured edge alignment',
    near(thumb.visualElement!.getBoundingClientRect().left, control.left),
    thumb.visualElement!.getBoundingClientRect().toJSON(),
  );
  delayed.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims: 'DOM geometry and focus API only; real drag is separate',
  };
}
async function assertEnvironment() {
  records.length = 0;
  const parent = document.createElement('div');
  parent.lang = 'en-US';
  parent.dir = 'ltr';
  dynamic.append(parent);
  const slider = await create({
    defaultValue: 1234,
    minimum: 0,
    maximum: 2000,
    partContracts: { 'slider-output': {} },
  });
  parent.append(slider);
  await settle(slider);
  const text = () =>
    slider.shadowRoot!.querySelector('[part~="slider-output"]')!.textContent?.trim();
  check('C16 owner locale initial formatting', text() === '1,234', text());
  parent.lang = 'de-DE';
  await settle(slider);
  check(
    'C16 inherited locale updates without explicit Root requestUpdate',
    text() === '1.234',
    text(),
  );
  const thumb = slider.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!;
  const before = thumb.visualElement!.getBoundingClientRect().left;
  parent.dir = 'rtl';
  await settle(slider);
  check(
    'C13 inherited direction repaints committed geometry',
    thumb.visualElement!.getBoundingClientRect().left < before && slider.value === 1234,
    { before, after: thumb.visualElement!.getBoundingClientRect().left, value: slider.value },
  );
  slider.locale = 'en-US';
  await settle(slider);
  parent.lang = 'fr-FR';
  await settle(slider);
  check('C16 explicit locale wins inherited updates', text() === '1,234', text());
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  const scope = document.createElement('div');
  scope.lang = 'de-DE';
  scope.dir = 'rtl';
  const slot = document.createElement('slot');
  scope.append(slot);
  shadow.append(scope);
  dynamic.append(host);
  host.append(slider);
  await settle(slider);
  slider.locale = '';
  await settle(slider);
  check('C16 composed slot language ownership', text() === '1.234', text());
  const position = thumb.visualElement!.getBoundingClientRect().left;
  scope.lang = 'en-US';
  scope.dir = 'ltr';
  await settle(slider);
  check(
    'C13/C16 shadow ancestor language/direction change coherently',
    text() === '1,234' && thumb.visualElement!.getBoundingClientRect().left > position,
    { text: text(), before: position, after: thumb.visualElement!.getBoundingClientRect().left },
  );
  slider.remove();
  host.remove();
  parent.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims: 'Owner environment mutation/DOM geometry only',
  };
}
async function assertKeyboardDefaultProtocol() {
  records.length = 0;
  const slider = await create({
    defaultValue: 40,
    partContracts: {
      'slider-thumb': {
        hostProperties: {
          '@keydown': (event: KeyboardEvent & { preventComponentHandling(): void }) =>
            event.preventComponentHandling(),
        },
      },
    },
  });
  const input = slider.inputElement as HTMLInputElement;
  const key = new KeyboardEvent('keydown', {
    key: 'ArrowRight',
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  input.dispatchEvent(key);
  check(
    'C11 component key cancellation remains distinct from native default prevention',
    !key.defaultPrevented,
    key.defaultPrevented,
  );
  input.value = '41';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  check(
    'C05 canceled key default input cannot create a second value proposal',
    slider.value === 40 && input.value === '40',
    { value: slider.value, input: input.value },
  );
  input.dispatchEvent(
    new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true, composed: true }),
  );
  input.value = '50';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  check(
    'C11 keyup releases suppression for an independent input',
    slider.value === 50,
    slider.value,
  );
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  input.value = '60';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  check(
    'C08 missing keyup cannot leave native input suppression beyond its task',
    slider.value === 60,
    slider.value,
  );
  slider.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims:
      'Synthetic KeyboardEvent/native input protocol only; actual browser key default retry required',
  };
}
async function assertConstituents() {
  records.length = 0;
  const slider = await create(
    {
      defaultValue: [20, 60],
      getAccessibleLabel: (index: number) => `Root purpose ${index}`,
      getAccessibleValueText: (formatted: string) => `${formatted} root units`,
    },
    [{ index: 0 }, { index: 1 }],
  );
  const thumbs = [...slider.querySelectorAll<TpSliderThumb>('tp-slider-thumb')];
  const inputs = thumbs.map((thumb) => thumb.inputElement as HTMLInputElement);
  check(
    'C10 Root resolvers describe each actual native Thumb',
    inputs[0]!.getAttribute('aria-label') === 'Root purpose 0' &&
      inputs[1]!.getAttribute('aria-valuetext') === '60 root units',
    inputs.map((input) => ({
      label: input.getAttribute('aria-label'),
      valueText: input.getAttribute('aria-valuetext'),
    })),
  );
  thumbs[0]!.getAccessibleLabel = (index) => `Constituent purpose ${index}`;
  thumbs[0]!.getAccessibleValueText = (formatted) => `${formatted} constituent units`;
  await settle(slider);
  check(
    'C10 constituent resolvers override only their Thumb',
    inputs[0]!.getAttribute('aria-label') === 'Constituent purpose 0' &&
      inputs[0]!.getAttribute('aria-valuetext') === '20 constituent units' &&
      inputs[1]!.getAttribute('aria-label') === 'Root purpose 1',
    inputs.map((input) => ({
      label: input.getAttribute('aria-label'),
      valueText: input.getAttribute('aria-valuetext'),
    })),
  );
  thumbs[0]!.valueText = 'Direct accessible text';
  await settle(slider);
  check(
    'C10 direct valueText takes precedence over resolvers',
    inputs[0]!.getAttribute('aria-valuetext') === 'Direct accessible text',
    inputs[0]!.outerHTML,
  );
  thumbs[0]!.setAttribute('tabindex', '-1');
  await settle(slider);
  check(
    'C11 authored tabIndex targets native input without a host tab stop',
    inputs[0]!.tabIndex === -1 && !thumbs[0]!.hasAttribute('tabindex'),
    { input: inputs[0]!.tabIndex, hostAttribute: thumbs[0]!.getAttribute('tabindex') },
  );
  slider.remove();
  const currency = await create({
    defaultValue: 12,
    locale: 'en-US',
    format: { style: 'currency', currency: 'USD' },
    partContracts: { 'slider-output': {} },
  });
  const output = () =>
    currency.shadowRoot!.querySelector('[part~="slider-output"]')!.textContent?.trim();
  check(
    'C16 currency formatting uses shared locale service',
    output() === '$12.00' && currency.inputElement!.getAttribute('aria-valuetext') === '$12.00',
    { output: output(), valueText: currency.inputElement!.getAttribute('aria-valuetext') },
  );
  currency.locale = 'de-DE';
  await settle(currency);
  check(
    'C16 dynamic locale preserves number formatting options and committed value',
    output()?.replace(/\s/g, ' ') === '12,00 $' && currency.value === 12,
    { output: output(), value: currency.value },
  );
  currency.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims: 'Public resolver/attribute/format API only; real Tab input is separate',
  };
}
async function assertInteractionProtocol() {
  records.length = 0;
  const dispatch = (
    slider: TpSlider,
    type: string,
    ratio: number,
    pointerId: number,
    target?: HTMLElement,
  ) => {
    const control = slider.shadowRoot!.querySelector<HTMLElement>('.control')!;
    const rect = control.getBoundingClientRect();
    const event = new PointerEvent(type, {
      bubbles: true,
      composed: true,
      button: 0,
      pointerId,
      pointerType: 'mouse',
      clientX: rect.left + rect.width * ratio,
      clientY: rect.top + rect.height / 2,
    });
    (target ?? control).dispatchEvent(event);
    return event;
  };
  const outer = await create({ defaultValue: 40 });
  const label = outer.shadowRoot!.querySelector<HTMLElement>('[part~="slider-label"]')!;
  dispatch(outer, 'pointerdown', 0, 91, label);
  dispatch(outer, 'pointerup', 0, 91, label);
  await settle(outer);
  check(
    'C15 label pointer path cannot propose a track value',
    outer.value === 40 && outer.activeThumbIndex === -1,
    { value: outer.value, active: outer.activeThumbIndex },
  );
  const inner = await create({ defaultValue: 30, label: 'Nested slider' });
  outer.append(inner);
  await settle(outer);
  await settle(inner);
  dispatch(inner, 'pointerdown', 0.5, 92);
  dispatch(inner, 'pointerup', 0.5, 92);
  await settle(inner);
  await settle(outer);
  check(
    'C07/C12 nested pointer belongs to the nearest Slider only',
    outer.value === 40 && inner.value === 50 && outer.activeThumbIndex === -1,
    { outer: outer.value, inner: inner.value, active: outer.activeThumbIndex },
  );
  check(
    'C12 nested Thumb is excluded from the outer registry',
    outer.thumbMetadata.length === 1 && inner.thumbMetadata.length === 1,
    { outer: outer.thumbMetadata, inner: inner.thumbMetadata },
  );
  inner.remove();
  outer.remove();
  const stacked = await create({ defaultValue: [100, 100, 100] }, [
    { index: 0 },
    { index: 1 },
    { index: 2 },
  ]);
  const stackedThumbs = [...stacked.querySelectorAll<TpSliderThumb>('tp-slider-thumb')];
  dispatch(stacked, 'pointerdown', 1, 98, stackedThumbs[2]!.inputElement!);
  dispatch(stacked, 'pointermove', 0.5, 98);
  await settle(stacked);
  check(
    'C07 maximum stack selects its first eligible Thumb despite topmost pressed host',
    JSON.stringify(stacked.values) === '[50,100,100]' && stacked.activeThumbIndex === 0,
    { values: stacked.values, active: stacked.activeThumbIndex },
  );
  dispatch(stacked, 'pointerup', 0.5, 98);
  await settle(stacked);
  check('C08 stacked drag releases to idle', stacked.activeThumbIndex === -1 && !stacked.dragging, {
    active: stacked.activeThumbIndex,
    dragging: stacked.dragging,
  });
  stacked.remove();
  const canceled = await create({ value: 40, defaultValue: undefined });
  const canceledCommits: unknown[] = [];
  canceled.onValueChange = () => {};
  canceled.onValueCommitted = (event) => canceledCommits.push(event.detail.value);
  dispatch(canceled, 'pointerdown', 0.8, 93);
  dispatch(canceled, 'pointercancel', 0.8, 93);
  await settle(canceled);
  const canceledInput = canceled.inputElement!;
  dispatch(canceled, 'pointerdown', 0.4, 94, canceledInput);
  dispatch(canceled, 'pointerup', 0.4, 94);
  canceled.value = 80;
  await settle(canceled);
  check(
    'C05/C08 canceled proposal cannot be upgraded by a later release',
    canceled.value === 80 && canceledCommits.length === 0 && canceled.activeThumbIndex === -1,
    { value: canceled.value, commits: canceledCommits, active: canceled.activeThumbIndex },
  );
  canceled.remove();
  const deferred = await create({ value: 40, defaultValue: undefined });
  const commits: { value: unknown; source: Event | undefined }[] = [];
  deferred.onValueChange = () => {};
  deferred.onValueCommitted = (event) =>
    commits.push({ value: event.detail.value, source: event.detail.sourceEvent });
  dispatch(deferred, 'pointerdown', 0.8, 95);
  const firstRelease = dispatch(deferred, 'pointerup', 0.8, 95);
  dispatch(deferred, 'pointerdown', 0.6, 96);
  const secondRelease = dispatch(deferred, 'pointerup', 0.6, 96);
  deferred.value = 80;
  await settle(deferred);
  check(
    'C05 normal deferred publication retains its own release source',
    commits.length === 1 && commits[0]!.value === 80 && commits[0]!.source === firstRelease,
    commits.map((commit) => ({
      value: commit.value,
      pointerId: (commit.source as PointerEvent)?.pointerId,
    })),
  );
  check(
    'C20 settled publication cannot reactivate a released Thumb',
    deferred.activeThumbIndex === -1,
    deferred.activeThumbIndex,
  );
  deferred.value = 60;
  await settle(deferred);
  check(
    'C05 newer deferred publication retains its separate source',
    commits.length === 2 && commits[1]!.value === 60 && commits[1]!.source === secondRelease,
    commits.map((commit) => ({
      value: commit.value,
      pointerId: (commit.source as PointerEvent)?.pointerId,
    })),
  );
  deferred.remove();
  const programmatic = await create({ defaultValue: 40 });
  const programmaticCommits: { value: unknown; reason: string }[] = [];
  programmatic.onValueCommitted = (event) =>
    programmaticCommits.push({ value: event.detail.value, reason: event.detail.reason });
  dispatch(programmatic, 'pointerdown', 0.4, 97, programmatic.inputElement!);
  programmatic.setValue(50);
  await settle(programmatic);
  check(
    'C06 programmatic proposal commits immediately during an unrelated drag',
    programmaticCommits.length === 1 && programmaticCommits[0]!.reason === 'programmatic',
    programmaticCommits,
  );
  check(
    'C20 programmatic publication preserves the active gesture Thumb',
    programmatic.activeThumbIndex === 0,
    programmatic.activeThumbIndex,
  );
  dispatch(programmatic, 'pointerup', 0.4, 97);
  await settle(programmatic);
  check(
    'C06 pointer release cannot duplicate an unrelated programmatic commit',
    programmaticCommits.length === 1,
    programmaticCommits,
  );
  programmatic.remove();
  return {
    checks: records.length,
    records: [...records],
    inputClaims:
      'Synthetic PointerEvent/API protocol regression only; no real pointer/capture claim',
  };
}
Object.assign(window, {
  sliderAPI: {
    ...api,
    scalar,
    range,
    events,
    create,
    settle,
    assertCore,
    assertControlled,
    assertConstraints,
    assertParts,
    assertForms,
    assertComposition,
    assertSnippet,
    assertField,
    assertGeometry,
    assertEnvironment,
    assertKeyboardDefaultProtocol,
    assertConstituents,
    assertInteractionProtocol,
    html,
    snapshot(slider = scalar) {
      return {
        value: slider.value,
        values: slider.values,
        activeThumbIndex: slider.activeThumbIndex,
        dragging: slider.dragging,
        metadata: slider.thumbMetadata,
        parts: [...slider.shadowRoot!.querySelectorAll('[part]')].map((node) =>
          node.getAttribute('part'),
        ),
      };
    },
    configure(properties: Partial<TpSlider>) {
      Object.assign(scalar, properties);
      return settle(scalar);
    },
    clear() {
      dynamic.replaceChildren();
      records.length = 0;
      events.length = 0;
    },
  },
});
document.documentElement.dataset.fixtureReady = 'true';
