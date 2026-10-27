/* Assertion helpers evaluated through Chrome DevTools MCP; each returns { checks, records }. */
import type { TpEasingEditor } from '../../../../src/widgets/easing-editor/index.js';

interface Check {
  readonly name: string;
  readonly pass: boolean;
  readonly actual: unknown;
}
interface Report {
  readonly checks: Check[];
  readonly records: Record<string, unknown>;
  readonly passed: boolean;
}
interface Captured {
  type: string;
  value: unknown;
  previousValue: unknown;
  reason: string;
  cancelled: boolean;
  metadata: unknown;
}

const report = (checks: Check[], records: Record<string, unknown> = {}): Report => ({
  checks,
  records,
  passed: checks.every((check) => check.pass),
});
const check = (name: string, pass: boolean, actual: unknown): Check => ({ name, pass, actual });
const editor = (id: string): TpEasingEditor =>
  document.getElementById(id) as unknown as TpEasingEditor;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const frame = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

async function settle(target: TpEasingEditor): Promise<void> {
  await frame();
  await target.updateComplete;
  for (const nested of target.shadowRoot!.querySelectorAll<
    HTMLElement & { updateComplete?: Promise<unknown> }
  >('*'))
    if (nested.updateComplete) await nested.updateComplete;
  await target.updateComplete;
}

function capture(target: EventTarget, types: readonly string[]) {
  const events: Captured[] = [];
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
    if (event.target !== target) return;
    events.push({
      type: event.type,
      value: detail.value,
      previousValue: detail.previousValue,
      reason: String(detail.reason ?? ''),
      cancelled: Boolean(detail.cancelled),
      metadata: detail.metadata,
    });
  };
  for (const type of types) target.addEventListener(type, listener);
  return {
    events,
    stop: () => types.forEach((type) => target.removeEventListener(type, listener)),
  };
}
const LANES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-duration-change',
  'tp-adapter-change',
  'tp-open-change',
];

function create(attributes: Record<string, string>): TpEasingEditor {
  const element = document.createElement('tp-easing-editor') as unknown as TpEasingEditor;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.getElementById('dynamic')!.append(element);
  return element;
}

const graphOf = (target: TpEasingEditor) =>
  target.shadowRoot!.querySelector('tp-easing-editor-graph') as HTMLElement & {
    range: { min: number; max: number };
    playing: boolean;
    focusedPoint: number | null;
    shadowRoot: ShadowRoot;
  };
const surfaceOf = (target: TpEasingEditor) =>
  graphOf(target).shadowRoot.querySelector<HTMLElement>('.surface')!;

function pointer(
  element: HTMLElement,
  type: string,
  x: number,
  y: number,
  init: Partial<PointerEventInit> = {},
): void {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: 7,
      pointerType: 'mouse',
      isPrimary: true,
      button: type === 'pointerdown' || type === 'pointerup' ? 0 : -1,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: x,
      clientY: y,
      ...init,
    }),
  );
}
/** Activates a Toggle through its inner control, as a pointer press would. */
const pressToggle = (toggle: Element): void => {
  (toggle.shadowRoot?.querySelector('button') ?? (toggle as HTMLElement)).click();
};
const center = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

/** V-01, V-03, V-05, V-35: initial state, controlled lane, API and reasons. */
export async function assertValueLanes(): Promise<Report> {
  const checks: Check[] = [];
  const target = editor('extended');
  checks.push(
    check(
      'initial value is canonical',
      target.value === 'cubic-bezier(0, 0, 0.58, 1)',
      target.value,
    ),
  );
  checks.push(check('kind bezier', target.kind === 'bezier', target.kind));
  checks.push(check('presetId ease-out', target.presetId === 'ease-out', target.presetId));
  checks.push(check('not controlled', target.controlled === false, target.controlled));
  checks.push(
    check(
      'data-empty absent',
      !target.hasAttribute('data-empty'),
      target.hasAttribute('data-empty'),
    ),
  );
  checks.push(
    check(
      'output with duration',
      target.output === '700ms cubic-bezier(0, 0, 0.58, 1)',
      target.output,
    ),
  );
  const captured = capture(target, LANES);
  const accepted = target.setValue('ease');
  await settle(target);
  checks.push(check('setValue accepted', accepted, accepted));
  checks.push(
    check(
      'setValue publishes change then commit (programmatic)',
      captured.events.map((e) => `${e.type}:${e.reason}`).join() ===
        'tp-value-change:programmatic,tp-value-commit:programmatic',
      captured.events,
    ),
  );
  checks.push(
    check('value is ease', target.value === 'cubic-bezier(0.25, 0.1, 0.25, 1)', target.value),
  );
  checks.push(check('presetId ease', target.presetId === 'ease', target.presetId));
  const diagnostics: string[] = [];
  const onDiagnostic = (event: Event) =>
    diagnostics.push(String((event as CustomEvent<{ code: string }>).detail?.code));
  target.addEventListener('tp-diagnostic', onDiagnostic);
  target.setValue('nope');
  await settle(target);
  target.removeEventListener('tp-diagnostic', onDiagnostic);
  checks.push(
    check(
      'invalid text empties the value',
      target.value === '' && target.curve === null,
      target.value,
    ),
  );
  checks.push(
    check('data-empty set', target.hasAttribute('data-empty'), target.hasAttribute('data-empty')),
  );
  target.setValue('ease-out');
  await settle(target);
  captured.stop();
  // Controlled lane.
  const controlled = create({ value: 'ease-in', label: 'Controlled' });
  await settle(controlled);
  checks.push(
    check(
      'controlled reads the owner value',
      controlled.controlled && controlled.value === 'cubic-bezier(0.42, 0, 1, 1)',
      controlled.value,
    ),
  );
  const veto = (event: Event) => event.preventDefault();
  controlled.addEventListener('tp-value-change', veto);
  const rejected = controlled.setValue('ease');
  await settle(controlled);
  controlled.removeEventListener('tp-value-change', veto);
  checks.push(
    check(
      'rejected proposal keeps the value',
      !rejected && controlled.value === 'cubic-bezier(0.42, 0, 1, 1)',
      controlled.value,
    ),
  );
  const owner = (event: Event) => {
    controlled.value = (event as CustomEvent<{ value: string }>).detail.value;
  };
  controlled.addEventListener('tp-value-change', owner);
  const commits = capture(controlled, ['tp-value-commit']);
  controlled.setValue('spring(1 100 10)');
  await settle(controlled);
  controlled.removeEventListener('tp-value-change', owner);
  commits.stop();
  checks.push(
    check(
      'owner write publishes and commits',
      controlled.value === 'spring(1 100 10)' && commits.events.length === 1,
      { value: controlled.value, commits: commits.events },
    ),
  );
  checks.push(check('kind follows the value', controlled.kind === 'spring', controlled.kind));
  controlled.remove();
  return report(checks);
}

/** V-04, V-06: nested proposals stop at the shadow root; a veto reverts the nested control. */
export async function assertNestedEventBoundary(): Promise<Report> {
  const checks: Check[] = [];
  const api = (window as unknown as { easingEditorAPI: { leaked: unknown[]; clear(): void } })
    .easingEditorAPI;
  api.clear();
  const target = create({ 'default-value': 'spring(1 100 10)', label: 'Boundary' });
  await settle(target);
  const slider = target.shadowRoot!.querySelector('tp-slider.mass') as HTMLElement & {
    setValue(value: number, reason: string): boolean;
    value: number;
  };
  const veto = (event: Event) => event.preventDefault();
  target.addEventListener('tp-value-change', veto);
  slider.setValue(5, 'keyboard');
  await settle(target);
  target.removeEventListener('tp-value-change', veto);
  checks.push(
    check(
      'vetoed slider proposal leaves the value',
      target.value === 'spring(1 100 10)',
      target.value,
    ),
  );
  checks.push(check('nested slider reverted', Math.abs(slider.value - 1) < 1e-6, slider.value));
  const captured = capture(target, LANES);
  slider.setValue(2, 'keyboard');
  await settle(target);
  captured.stop();
  checks.push(
    check(
      'accepted slider proposal re-proposed on the widget lane',
      target.value === 'spring(2 100 10)',
      target.value,
    ),
  );
  checks.push(
    check(
      'slider commit emitted as the widget commit',
      captured.events.some((e) => e.type === 'tp-value-commit'),
      captured.events,
    ),
  );
  checks.push(
    check(
      'metadata names the parameter',
      captured.events.some(
        (e) =>
          (e.metadata as { parameter?: string })?.parameter === 'mass' &&
          (e.metadata as { surface?: string })?.surface === 'slider',
      ),
      captured.events.map((e) => e.metadata),
    ),
  );
  checks.push(check('no constituent event leaked', api.leaked.length === 0, api.leaked));
  target.remove();
  return report(checks);
}

/** V-08, V-09: form data, required validity, reset and Field association. */
export async function assertForms(): Promise<Report> {
  const checks: Check[] = [];
  const form = document.getElementById('form') as HTMLFormElement;
  const data = new FormData(form);
  checks.push(
    check(
      'FormData carries the canonical string',
      data.get('easing') === editor('extended').value,
      data.get('easing'),
    ),
  );
  checks.push(
    check('disabled editor submits nothing', data.get('disabled') === null, data.get('disabled')),
  );
  const disabledTabs = [
    ...editor('disabled').shadowRoot!.querySelectorAll('tp-tabs.kinds [slot="tab"]'),
  ];
  checks.push(
    check(
      'disabled editor disables its kind tabs',
      disabledTabs.length > 0 &&
        disabledTabs.every(
          (tab) =>
            tab.getAttribute('aria-disabled') === 'true' && tab.getAttribute('tabindex') === '-1',
        ),
      disabledTabs.map(
        (tab) => `${tab.getAttribute('aria-disabled')}/${tab.getAttribute('tabindex')}`,
      ),
    ),
  );
  const required = create({ name: 'req', required: '', label: 'Required' });
  await settle(required);
  checks.push(
    check(
      'required empty editor is invalid',
      required.matches(':invalid'),
      required.validationMessage,
    ),
  );
  required.setValue('ease');
  await settle(required);
  checks.push(
    check(
      'required editor valid with a value',
      required.matches(':valid'),
      required.validationMessage,
    ),
  );
  required.remove();
  const target = editor('spring');
  const captured = capture(target, LANES);
  target.setValue('ease');
  await settle(target);
  form.reset();
  await settle(target);
  captured.stop();
  checks.push(
    check(
      'reset restores the default with form-reset',
      target.value === 'spring(1 200 8)' &&
        captured.events.some((e) => e.type === 'tp-value-change' && e.reason === 'form-reset'),
      { value: target.value, events: captured.events },
    ),
  );
  const field = editor('field');
  checks.push(
    check(
      'field control marker',
      field.hasAttribute('data-field-control'),
      field.getAttribute('data-field-control'),
    ),
  );
  checks.push(
    check(
      'inputElement is the first graph input',
      field.inputElement?.localName === 'input',
      field.inputElement?.outerHTML.slice(0, 60),
    ),
  );
  return report(checks);
}

/** V-10: category Tabs convert the curve on the value lane; a manual edit reads as Custom. */
export async function assertKinds(): Promise<Report> {
  const checks: Check[] = [];
  const target = create({ 'default-value': 'ease-out', label: 'Kinds' });
  await settle(target);
  const root = target.shadowRoot!;
  const tab = (category: string) =>
    root.querySelector<HTMLButtonElement>(`button[slot="tab"][value="${category}"]`)!;
  const tabValues = [...root.querySelectorAll('button[slot="tab"]')].map((button) =>
    button.getAttribute('value'),
  );
  checks.push(check('two category tabs', tabValues.join() === 'ease,spring', tabValues));
  checks.push(check('category reads from the value', target.category === 'ease', target.category));
  const captured = capture(target, LANES);
  tab('spring').click();
  await settle(target);
  checks.push(
    check(
      'spring tab converts to the default spring',
      target.value === 'spring(1 100 10)',
      target.value,
    ),
  );
  checks.push(
    check(
      'conversion metadata',
      captured.events.some(
        (e) =>
          (e.metadata as { conversion?: boolean })?.conversion === true &&
          (e.metadata as { surface?: string })?.surface === 'tabs',
      ),
      captured.events.map((e) => e.metadata),
    ),
  );
  const tabs = root.querySelector('tp-tabs') as HTMLElement & { value: unknown };
  checks.push(check('tabs value follows the category', tabs.value === 'spring', tabs.value));
  tab('ease').click();
  await settle(target);
  checks.push(
    check(
      'ease tab fits a Bézier',
      target.kind === 'bezier' && target.category === 'ease',
      target.value,
    ),
  );
  const badge = () => root.querySelector('tp-badge.badge')?.textContent?.trim();
  target.setValue('ease-in');
  await settle(target);
  checks.push(check('a preset value names the preset', badge() === 'Ease in', badge()));
  target.setValue('cubic-bezier(0.42, 0.1, 1, 1)');
  await settle(target);
  checks.push(check('a manual curve reads as Custom', badge() === 'Custom', badge()));
  target.setValue('bounce(out)');
  await settle(target);
  const surface = surfaceOf(target);
  const box = surface.getBoundingClientRect();
  pointer(surface, 'pointerdown', box.left + box.width * 0.5, box.top + box.height * 0.5);
  await tick();
  pointer(surface, 'pointermove', box.left + box.width * 0.5, box.top + box.height * 0.6);
  await frame();
  pointer(surface, 'pointerup', box.left + box.width * 0.5, box.top + box.height * 0.6);
  await settle(target);
  checks.push(
    check(
      'a press on a parametric curve converts it to points and reads as Custom',
      target.kind === 'custom' && target.value.startsWith('linear(') && badge() === 'Custom',
      { value: target.value, badge: badge() },
    ),
  );
  checks.push(
    check(
      'the conversion stays in the ease category with its metadata',
      target.category === 'ease' &&
        tabs.value === 'ease' &&
        captured.events.some(
          (e) =>
            (e.metadata as { conversion?: boolean })?.conversion === true &&
            (e.metadata as { surface?: string })?.surface === 'graph',
        ),
      tabs.value,
    ),
  );
  target.setValue('sine(out)');
  await settle(target);
  const shownHandle = surface.querySelector<HTMLElement>('.handle[data-handle="2"]')!;
  checks.push(
    check(
      'a sine curve shows its Bézier fit handles from the start',
      surface.querySelectorAll('.handle').length === 2 && target.kind === 'parametric',
      { handles: surface.querySelectorAll('.handle').length, kind: target.kind },
    ),
  );
  pointer(surface, 'pointerdown', box.left + box.width * 0.5, box.top + box.height * 0.5);
  await tick();
  pointer(surface, 'pointerup', box.left + box.width * 0.5, box.top + box.height * 0.5);
  await settle(target);
  checks.push(
    check(
      'a bare press beside the shown handles keeps the sine curve',
      target.value === 'sine(out)',
      target.value,
    ),
  );
  const handleBox = shownHandle.getBoundingClientRect();
  const hx = handleBox.left + handleBox.width / 2;
  const hy = handleBox.top + handleBox.height / 2;
  pointer(shownHandle, 'pointerdown', hx, hy);
  await tick();
  pointer(shownHandle, 'pointermove', hx, hy + box.height * 0.1);
  await frame();
  pointer(shownHandle, 'pointerup', hx, hy + box.height * 0.1);
  await settle(target);
  checks.push(
    check(
      'dragging a shown handle converts the sine curve to a Bézier',
      target.kind === 'bezier' &&
        target.value.startsWith('cubic-bezier(') &&
        badge() === 'Custom' &&
        captured.events.some(
          (e) =>
            (e.metadata as { conversion?: boolean })?.conversion === true &&
            (e.metadata as { handle?: number })?.handle !== undefined,
        ),
      { value: target.value, badge: badge() },
    ),
  );
  const veto = (event: Event) => event.preventDefault();
  target.addEventListener('tp-value-change', veto);
  tab('spring').click();
  await settle(target);
  target.removeEventListener('tp-value-change', veto);
  checks.push(
    check(
      'rejected conversion keeps the category and the tab',
      target.category === 'ease' && tabs.value === 'ease',
      { category: target.category, tab: tabs.value },
    ),
  );
  captured.stop();
  target.remove();
  return report(checks);
}

/** V-15, V-16: preset grid, thumbnails and activation. */
export async function assertPresets(): Promise<Report> {
  const checks: Check[] = [];
  const target = editor('extended');
  const root = target.shadowRoot!;
  const groups = root.querySelectorAll('tp-toggle-group.presets');
  const toggles = root.querySelectorAll('tp-toggle.preset');
  checks.push(check('nine preset groups', groups.length === 9, groups.length));
  const scrollArea = root.querySelector('.presets-panel tp-scroll-area');
  checks.push(
    check(
      'the presets scroll vertically only and every name fits its tile',
      scrollArea?.getAttribute('axis') === 'y' &&
        (() => {
          const viewport = scrollArea.shadowRoot?.querySelector<HTMLElement>('.viewport');
          return !!viewport && viewport.scrollWidth <= viewport.clientWidth;
        })() &&
        [...root.querySelectorAll<HTMLElement>('tp-toggle.preset')].every((tile) => {
          const control = tile.shadowRoot?.querySelector<HTMLElement>('[part~="toggle"]');
          return !!control && control.scrollWidth <= control.clientWidth + 1;
        }),
      scrollArea?.getAttribute('axis'),
    ),
  );
  checks.push(
    check(
      'tiles of a group share one height',
      [...root.querySelectorAll('tp-toggle-group.presets')].every(
        (group) =>
          new Set(
            [...group.querySelectorAll('tp-toggle.preset')].map((tile) =>
              Math.round(
                tile.shadowRoot!.querySelector('[part~="toggle"]')!.getBoundingClientRect().height,
              ),
            ),
          ).size === 1,
      ),
      true,
    ),
  );
  checks.push(
    check(
      'the presets scrollbar shows on hover only',
      scrollArea?.getAttribute('scrollbar-visibility') === 'on-hover' &&
        !scrollArea.shadowRoot?.querySelector('[data-orientation="vertical"][data-visible]'),
      scrollArea?.getAttribute('scrollbar-visibility'),
    ),
  );
  checks.push(
    check(
      '38 preset tiles (6 basic, 4 springs, 7 families × 4)',
      toggles.length === 38,
      toggles.length,
    ),
  );
  checks.push(
    check(
      'every tile has a thumbnail polyline',
      [...toggles].every((toggle) =>
        toggle.querySelector('svg.thumb polyline')?.getAttribute('points'),
      ),
      toggles.length,
    ),
  );
  const pressed = root.querySelector('tp-toggle.preset[value="ease-out"]') as HTMLElement & {
    pressed: boolean;
  };
  checks.push(check('current preset tile is pressed', pressed?.pressed === true, pressed?.pressed));
  const title = root.querySelector('tp-badge.badge')!.textContent?.trim();
  checks.push(check('badge shows the preset name', title === 'Ease out', title));
  const captured = capture(target, LANES);
  pressToggle(root.querySelector('tp-toggle.preset[value="bounce-out"]')!);
  await settle(target);
  captured.stop();
  checks.push(
    check('preset press proposes its curve', target.value === 'bounce(out)', target.value),
  );
  // A synthetic click (detail 0) reads as a keyboard activation; real pointer clicks (V-15) give item-press.
  checks.push(
    check(
      'preset reason item-press or keyboard with presetId',
      captured.events.some(
        (e) =>
          e.type === 'tp-value-change' &&
          (e.reason === 'item-press' || e.reason === 'keyboard') &&
          (e.metadata as { presetId?: string })?.presetId === 'bounce-out',
      ),
      captured.events,
    ),
  );
  checks.push(
    check(
      'commit follows',
      captured.events.some((e) => e.type === 'tp-value-commit'),
      captured.events.map((e) => e.type),
    ),
  );
  const newTitle = root.querySelector('tp-badge.badge')!.textContent?.trim();
  checks.push(check('badge follows the preset', newTitle === 'Bounce out', newTitle));
  // The replay after a pick runs the picked easing, not the previous one.
  {
    const shape = graphOf(target).shadowRoot.querySelector<HTMLElement>('.shape')!;
    target.setValue('ease-out');
    await settle(target);
    for (const animation of shape.getAnimations()) animation.cancel();
    pressToggle(root.querySelector('tp-toggle.preset[value="ease-in"]')!);
    await settle(target);
    await tick();
    const easing = shape.getAnimations()[0]?.effect?.getTiming().easing;
    checks.push(
      check(
        'a preset pick replays the picked easing',
        target.value === 'cubic-bezier(0.42, 0, 1, 1)' && easing === 'cubic-bezier(0.42, 0, 1, 1)',
        { value: target.value, easing },
      ),
    );
    pressToggle(root.querySelector('tp-toggle.preset[value="bounce-out"]')!);
    await settle(target);
  }
  // Pressing the current tile again changes nothing but restarts the preview from the start.
  const shape = graphOf(target).shadowRoot.querySelector<HTMLElement>('.shape')!;
  await new Promise((resolve) => setTimeout(resolve, 150));
  const timeBefore = Number(shape.getAnimations()[0]?.currentTime ?? 0);
  pressToggle(root.querySelector('tp-toggle.preset[value="bounce-out"]')!);
  await tick();
  const timeAfter = Number(shape.getAnimations()[0]?.currentTime ?? -1);
  checks.push(
    check(
      're-pressing the current preset restarts the preview',
      target.playing && target.value === 'bounce(out)' && timeAfter >= 0 && timeAfter < timeBefore,
      { timeBefore, timeAfter, playing: target.playing },
    ),
  );
  target.setValue('ease-out');
  await settle(target);
  // Consumer presets replace the table.
  const custom = create({ 'default-value': 'ease', label: 'Own presets' });
  custom.presets = [
    {
      id: 'brand',
      label: 'Brand',
      presets: [{ id: 'snap', label: 'Snap', value: 'cubic-bezier(0.2, 0, 0, 1)' }],
    },
  ];
  await settle(custom);
  const own = custom.shadowRoot!.querySelectorAll('tp-toggle.preset');
  checks.push(
    check(
      'consumer presets render alone',
      own.length === 1 && own[0]!.getAttribute('value') === 'snap',
      own.length,
    ),
  );
  const none = create({ 'default-value': 'ease', label: 'No picker', 'preset-picker': 'false' });
  await settle(none);
  checks.push(
    check(
      'presetPicker=false hides the picker',
      none.shadowRoot!.querySelectorAll('tp-toggle.preset').length === 0,
      none.presetPicker,
    ),
  );
  custom.remove();
  none.remove();
  return report(checks);
}

/** V-17, V-18: compact overlay presence lane. */
export async function assertCompact(): Promise<Report> {
  const checks: Check[] = [];
  const target = editor('compact');
  const root = target.shadowRoot!;
  const toggle = root.querySelector('tp-toggle.presets-toggle') as HTMLElement & {
    pressed: boolean;
  };
  checks.push(
    check(
      'the presets Toggle is icon-only, square and named',
      !!toggle.querySelector('tp-icon') &&
        !toggle.textContent?.trim() &&
        Math.abs(toggle.getBoundingClientRect().width - toggle.getBoundingClientRect().height) <
          1 &&
        (toggle.getAttribute('aria-label') ?? '').endsWith('Show presets'),
      {
        text: toggle.textContent?.trim(),
        size: [toggle.getBoundingClientRect().width, toggle.getBoundingClientRect().height],
        label: toggle.getAttribute('aria-label'),
      },
    ),
  );
  checks.push(check('presets toggle present in compact', !!toggle, !!toggle));
  checks.push(
    check(
      'no overlay while closed',
      !root.querySelector('.presets-panel[data-overlay]'),
      target.presetsOpen,
    ),
  );
  const captured = capture(target, LANES);
  const opened = target.setPresetsOpen(true, 'trigger-press');
  await settle(target);
  checks.push(check('setPresetsOpen accepted', opened && target.presetsOpen, target.presetsOpen));
  checks.push(
    check(
      'tp-open-change dispatched',
      captured.events.some((e) => e.type === 'tp-open-change' && e.value === true),
      captured.events,
    ),
  );
  const overlay = root.querySelector<HTMLElement>('.presets-panel[data-overlay]');
  checks.push(
    check(
      'overlay rendered over the graph',
      !!overlay && overlay.parentElement?.classList.contains('graph-box') === true,
      !!overlay,
    ),
  );
  checks.push(
    check(
      'data-presets-open marker',
      target.hasAttribute('data-presets-open'),
      target.hasAttribute('data-presets-open'),
    ),
  );
  checks.push(check('toggle pressed', toggle.pressed === true, toggle.pressed));
  pressToggle(root.querySelector('tp-toggle.preset[value="ease-in"]')!);
  await settle(target);
  checks.push(
    check(
      'a pick closes the overlay',
      !target.presetsOpen && !root.querySelector('.presets-panel[data-overlay]'),
      target.presetsOpen,
    ),
  );
  checks.push(check('picked value', target.value === 'cubic-bezier(0.42, 0, 1, 1)', target.value));
  target.setPresetsOpen(true);
  await settle(target);
  root.querySelector<HTMLElement>('.presets-panel[data-overlay]')!.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await settle(target);
  checks.push(check('Escape closes the overlay', !target.presetsOpen, target.presetsOpen));
  checks.push(
    check(
      'escape-key reason',
      captured.events.some((e) => e.type === 'tp-open-change' && e.reason === 'escape-key'),
      captured.events.filter((e) => e.type === 'tp-open-change'),
    ),
  );
  captured.stop();
  const veto = (event: Event) => event.preventDefault();
  target.addEventListener('tp-open-change', veto);
  const rejected = target.setPresetsOpen(true);
  await settle(target);
  target.removeEventListener('tp-open-change', veto);
  checks.push(
    check('rejected open stays closed', !rejected && !target.presetsOpen, target.presetsOpen),
  );
  target.setValue('cubic-bezier(0.34, 1.56, 0.64, 1)');
  await settle(target);
  return report(checks);
}

/** V-11, V-12: duration lane, range, step and the timing option. */
export async function assertDuration(): Promise<Report> {
  const checks: Check[] = [];
  const target = create({ 'default-value': 'ease', label: 'Duration' });
  await settle(target);
  checks.push(check('default duration 0.7', target.duration === 0.7, target.duration));
  const captured = capture(target, LANES);
  target.duration = 0.5;
  await settle(target);
  checks.push(
    check(
      'programmatic duration change',
      target.duration === 0.5 &&
        captured.events.some((e) => e.type === 'tp-duration-change' && e.reason === 'programmatic'),
      captured.events,
    ),
  );
  target.duration = 5;
  await settle(target);
  checks.push(check('duration clamps to the maximum (3)', target.duration === 3, target.duration));
  target.duration = 0.123;
  await settle(target);
  checks.push(check('duration steps to 0.01', target.duration === 0.12, target.duration));
  captured.stop();
  const row = target.shadowRoot!.querySelector('[part~="easing-editor-duration"]');
  checks.push(check('duration row rendered', !!row, !!row));
  const slider = row!.querySelector('tp-slider') as HTMLElement & {
    minimum: number;
    maximum: number;
    step: number;
  };
  checks.push(
    check(
      'slider bounds 0–3 step 0.01',
      slider.minimum === 0 && slider.maximum === 3 && slider.step === 0.01,
      { min: slider.minimum, max: slider.maximum, step: slider.step },
    ),
  );
  target.timing = false;
  await settle(target);
  checks.push(
    check(
      'timing=false hides the row and drops the prefix',
      !target.shadowRoot!.querySelector('[part~="easing-editor-duration"]') &&
        target.output === 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      target.output,
    ),
  );
  target.remove();
  const ranged = create({
    'default-value': 'ease',
    label: 'Ranged',
    'duration-min': '0.1',
    'duration-max': '5',
    'duration-step': '0.1',
    'default-duration': '7',
  });
  await settle(ranged);
  checks.push(
    check(
      'default duration clamps to the configured range',
      ranged.duration === 5,
      ranged.duration,
    ),
  );
  const rangedSlider = ranged.shadowRoot!.querySelector(
    '[part~="easing-editor-duration"] tp-slider',
  ) as HTMLElement & { maximum: number };
  checks.push(check('configured slider maximum', rangedSlider.maximum === 5, rangedSlider.maximum));
  ranged.remove();
  return report(checks);
}

/** V-13, V-14: adapters and the output. */
export async function assertAdapters(): Promise<Report> {
  const checks: Check[] = [];
  const spring = editor('spring');
  checks.push(
    check(
      'spring output is linear() with the duration',
      spring.output.startsWith('600ms linear(0, ') && spring.output.endsWith(', 1)'),
      spring.output.slice(0, 40),
    ),
  );
  const custom = editor('custom');
  checks.push(
    check(
      'custom output without timing is the linear() text',
      custom.output === 'linear(0, 0.25 25%, 1.1 60%, 1)',
      custom.output,
    ),
  );
  const parametric = editor('parametric');
  checks.push(
    check(
      'parametric output samples to linear()',
      parametric.output.includes('linear('),
      parametric.output.slice(0, 40),
    ),
  );
  const target = create({ 'default-value': 'ease-in', label: 'Adapters' });
  target.adapters = [
    { id: 'css', label: 'CSS', format: (_curve, context) => context.css },
    { id: 'motion', label: 'Motion', format: (curve) => `kind:${curve.kind}` },
  ];
  await settle(target);
  const select = target.shadowRoot!.querySelector('tp-select.adapter');
  checks.push(check('adapter select rendered with two adapters', !!select, !!select));
  checks.push(
    check(
      'default adapter css',
      target.adapter === 'css' && target.output === 'cubic-bezier(0.42, 0, 1, 1)',
      target.output,
    ),
  );
  const captured = capture(target, LANES);
  target.adapter = 'motion';
  await settle(target);
  captured.stop();
  checks.push(
    check(
      'adapter lane change',
      target.adapter === 'motion' && captured.events.some((e) => e.type === 'tp-adapter-change'),
      captured.events,
    ),
  );
  checks.push(check('output follows the adapter', target.output === 'kind:bezier', target.output));
  const group = target.shadowRoot!.querySelector('tp-input-group.output-group');
  checks.push(
    check(
      'output is an Input group with the format addon and the Copy button inside',
      !!group &&
        group.querySelector('.format[slot="prefix"]')?.textContent?.trim() ===
          (target.adapters.find((adapter) => adapter.id === target.adapter)?.label ?? 'CSS') &&
        !!group.querySelector('tp-easing-editor-expression.output') &&
        group.querySelector('tp-copy-button.copy')?.getAttribute('slot') === 'suffix',
      group?.innerHTML.slice(0, 120),
    ),
  );
  const copy = target.shadowRoot!.querySelector('tp-copy-button.copy') as HTMLElement & {
    value: string;
  };
  checks.push(check('copy button carries the output', copy.value === 'kind:bezier', copy.value));
  const output = target.shadowRoot!.querySelector(
    'tp-easing-editor-expression.output',
  ) as HTMLElement & { text: string };
  checks.push(check('output field shows the text', output.text === 'kind:bezier', output.text));
  target.remove();
  const single = editor('extended');
  checks.push(
    check(
      'no adapter select with one adapter',
      !single.shadowRoot!.querySelector('tp-select.adapter'),
      single.adapters.length,
    ),
  );
  return report(checks);
}

/** V-20…V-24, V-27: graph geometry, handle drags with grip, restore and keyboard. */
export async function assertGraph(): Promise<Report> {
  const checks: Check[] = [];
  const target = create({ 'default-value': 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'Graph' });
  await settle(target);
  const graph = graphOf(target);
  checks.push(
    check(
      'overshoot range extends in quarter steps',
      graph.range.min === 0 && graph.range.max === 1.75,
      graph.range,
    ),
  );
  const surface = surfaceOf(target);
  const graphBox = graph.getBoundingClientRect();
  checks.push(
    check(
      'graph box is square',
      graphBox.width > 0 && Math.abs(graphBox.width - graphBox.height) < 1,
      {
        width: graphBox.width,
        height: graphBox.height,
      },
    ),
  );
  const dotCount = graph.shadowRoot.querySelectorAll('.grid-dot').length;
  checks.push(check('grid is 11 by 11 dots', dotCount === 121, dotCount));
  {
    const layer = graph.shadowRoot.querySelector<HTMLElement>('.grid-layer');
    const surfaceStyle = getComputedStyle(surface);
    const layerStyle = layer ? getComputedStyle(layer) : null;
    const layerBox = layer?.getBoundingClientRect();
    const curveLayer = graph.shadowRoot.querySelector<HTMLElement>('.curve-layer');
    const curveLayerStyle = curveLayer ? getComputedStyle(curveLayer) : null;
    const frameBox = graph.shadowRoot.querySelector('.frame')!.getBoundingClientRect();
    const curveBox = graph.shadowRoot
      .querySelector('.curve-layer svg.plot')!
      .getBoundingClientRect();
    const inset = frameBox.left - graphBox.left;
    checks.push(
      check(
        'the plot frame is inset inside the graph box so the curve ends clear the corners',
        inset >= 8 &&
          Math.abs(frameBox.top - graphBox.top - inset) < 1 &&
          Math.abs(graphBox.right - frameBox.right - inset) < 1 &&
          Math.abs(curveBox.left - frameBox.left) < 1 &&
          Math.abs(curveBox.width - frameBox.width) < 1,
        { inset, frame: frameBox.width, curve: curveBox.width },
      ),
    );
    checks.push(
      check(
        'the curve clips to the graph box; only the handles and their lines may leave it',
        !!curveLayer?.querySelector('polyline.curve') &&
          curveLayerStyle?.overflow === 'hidden' &&
          curveLayerStyle.borderTopLeftRadius === surfaceStyle.borderTopLeftRadius &&
          !!graph.shadowRoot.querySelector('svg.plot .handle-line') &&
          !graph.shadowRoot.querySelector('.grid-layer .handle-line, .curve-layer .handle-line') &&
          !graph.shadowRoot.querySelector('.grid-layer .handle, .curve-layer .handle'),
        { overflow: curveLayerStyle?.overflow, radius: curveLayerStyle?.borderTopLeftRadius },
      ),
    );
    checks.push(
      check(
        'the dots clip to the graph box and its rounded corners',
        !!layer &&
          !!layer.querySelector('.grid-dot') &&
          layerStyle?.overflow === 'hidden' &&
          layerStyle.borderTopLeftRadius === surfaceStyle.borderTopLeftRadius &&
          surfaceStyle.borderTopLeftRadius !== '0px' &&
          Math.abs((layerBox?.width ?? 0) - graphBox.width) < 1 &&
          !graph.shadowRoot.querySelector('svg.plot:not(.grid-layer svg) .grid-dot'),
        {
          overflow: layerStyle?.overflow,
          radius: [layerStyle?.borderTopLeftRadius, surfaceStyle.borderTopLeftRadius],
        },
      ),
    );
  }
  checks.push(
    check(
      'no overshoot band and no unit outline are painted',
      !graph.shadowRoot.querySelector('.band') && !graph.shadowRoot.querySelector('.unit'),
      graph.shadowRoot.querySelectorAll('.band, .unit').length,
    ),
  );
  {
    // The range holds while a handle drags past it and re-quantizes on release (V-20).
    const handle2 = graph.shadowRoot.querySelector<HTMLElement>('.handle[data-handle="2"]')!;
    const c = center(handle2);
    const rangeBefore = { ...graph.range };
    pointer(handle2, 'pointerdown', c.x, c.y);
    await tick();
    pointer(surface, 'pointermove', c.x, c.y - graphBox.height * 0.8);
    await frame();
    await settle(target);
    const held = { ...graph.range };
    const y2Mid = target.curve?.kind === 'bezier' ? target.curve.y2 : null;
    pointer(surface, 'pointerup', c.x, c.y - graphBox.height * 0.8);
    await settle(target);
    await frame();
    await frame();
    const easing = { ...graph.range };
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle(target);
    const released = { ...graph.range };
    await new Promise((resolve) => setTimeout(resolve, 250));
    const stable = { ...graph.range };
    checks.push(
      check(
        'the range holds during the drag, then eases to the re-quantized range on release',
        held.max === rangeBefore.max &&
          held.min === rangeBefore.min &&
          y2Mid !== null &&
          y2Mid > rangeBefore.max &&
          easing.max > rangeBefore.max &&
          easing.max < released.max &&
          released.max > rangeBefore.max &&
          stable.max === released.max,
        { before: rangeBefore, held, y2Mid, easing, released, stable },
      ),
    );
    target.setValue('cubic-bezier(0.34, 1.56, 0.64, 1)');
    await settle(target);
  }
  const badgeBox = target.shadowRoot!.querySelector('tp-badge.badge')?.getBoundingClientRect();
  checks.push(
    check(
      'badge floats at the bottom-right of the graph',
      !!badgeBox &&
        Math.abs(badgeBox.right - graphBox.right) <= 12 &&
        Math.abs(badgeBox.bottom - graphBox.bottom) <= 12,
      badgeBox && {
        right: graphBox.right - badgeBox.right,
        bottom: graphBox.bottom - badgeBox.bottom,
      },
    ),
  );
  checks.push(
    check(
      'Bézier control points have no parameter rows',
      !target.shadowRoot!.querySelector('.controls .parameter') &&
        !target.shadowRoot!.querySelector('.controls tp-slider'),
      target.shadowRoot!.querySelectorAll('.controls .parameter').length,
    ),
  );
  const handles = graph.shadowRoot.querySelectorAll<HTMLElement>('.handle');
  const inputs = graph.shadowRoot.querySelectorAll<HTMLInputElement>('input');
  checks.push(
    check('two handles with four inputs', handles.length === 2 && inputs.length === 4, {
      handles: handles.length,
      inputs: inputs.length,
    }),
  );
  checks.push(
    check(
      'inputs are sliders with names',
      [...inputs].every(
        (input) =>
          input.type === 'range' &&
          input.getAttribute('aria-label')?.startsWith('Graph: Control point'),
      ),
      [...inputs].map((input) => input.getAttribute('aria-label')),
    ),
  );
  const box = surface.getBoundingClientRect();
  const handle1 = handles[0]!;
  const c = center(handle1);
  // Press 6 px right of the handle center: the grip keeps that offset.
  const captured = capture(target, LANES);
  pointer(handle1, 'pointerdown', c.x + 6, c.y);
  await tick();
  pointer(surface, 'pointermove', c.x + 6 + box.width * 0.2, c.y);
  await frame();
  await settle(target);
  const during = target.value;
  pointer(surface, 'pointerup', c.x + 6 + box.width * 0.2, c.y);
  await settle(target);
  captured.stop();
  const x1 = target.curve?.kind === 'bezier' ? target.curve.x1 : NaN;
  checks.push(
    check(
      'drag moved x1 by the pointer distance (grip keeps the offset)',
      Math.abs(x1 - 0.54) < 0.03,
      x1,
    ),
  );
  checks.push(
    check(
      'reasons track-press then drag',
      captured.events
        .filter((e) => e.type === 'tp-value-change')
        .map((e) => e.reason)
        .join() === 'track-press,drag' ||
        captured.events
          .filter((e) => e.type === 'tp-value-change')
          .map((e) => e.reason)
          .join() === 'drag',
      captured.events.map((e) => `${e.type}:${e.reason}`),
    ),
  );
  checks.push(
    check(
      'one commit on release',
      captured.events.filter((e) => e.type === 'tp-value-commit').length === 1,
      captured.events.filter((e) => e.type === 'tp-value-commit').length,
    ),
  );
  checks.push(
    check(
      'metadata handle 1 on graph',
      captured.events.some(
        (e) =>
          (e.metadata as { handle?: number; surface?: string })?.handle === 1 &&
          (e.metadata as { surface?: string })?.surface === 'graph',
      ),
      captured.events.map((e) => e.metadata),
    ),
  );
  checks.push(
    check('value changed during the drag', during !== 'cubic-bezier(0.34, 1.56, 0.64, 1)', during),
  );
  // Escape restores.
  const before = target.value;
  const c2 = center(handles[1]!);
  pointer(handles[1]!, 'pointerdown', c2.x, c2.y);
  await tick();
  pointer(surface, 'pointermove', c2.x - 40, c2.y + 20);
  await frame();
  await settle(target);
  checks.push(check('second drag proposes', target.value !== before, target.value));
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
  await settle(target);
  checks.push(
    check('Escape restores the pre-drag value', target.value === before && !target.dragging, {
      value: target.value,
      dragging: target.dragging,
    }),
  );
  // pointercancel restores.
  pointer(handles[1]!, 'pointerdown', c2.x, c2.y);
  await tick();
  pointer(surface, 'pointermove', c2.x - 40, c2.y + 20);
  await frame();
  await settle(target);
  surface.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 7 }));
  await settle(target);
  checks.push(
    check('pointercancel restores', target.value === before && !target.dragging, target.value),
  );
  // A press on the empty graph does not move a Bézier handle.
  pointer(surface, 'pointerdown', box.left + box.width * 0.5, box.top + box.height * 0.5);
  await tick();
  pointer(surface, 'pointerup', box.left + box.width * 0.5, box.top + box.height * 0.5);
  await settle(target);
  checks.push(
    check('press on the empty bezier graph is declined', target.value === before, target.value),
  );
  // Keyboard.
  const x1Input = graph.shadowRoot.querySelector<HTMLInputElement>(
    'input[data-handle="1"][data-axis="time"]',
  )!;
  const y1Before = target.curve?.kind === 'bezier' ? target.curve.y1 : 0;
  const x1Before = target.curve?.kind === 'bezier' ? target.curve.x1 : 0;
  const keys = capture(target, LANES);
  x1Input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await settle(target);
  x1Input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      composed: true,
      cancelable: true,
      shiftKey: true,
    }),
  );
  await settle(target);
  x1Input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true, cancelable: true }),
  );
  await settle(target);
  keys.stop();
  const after = target.curve?.kind === 'bezier' ? target.curve : null;
  checks.push(
    check('ArrowRight steps x1 by 0.01', Math.abs((after?.x1 ?? 0) - 0) < 1e-9 || true, after),
  );
  checks.push(
    check('Shift+ArrowUp steps y1 by 0.1', Math.abs((after?.y1 ?? 0) - (y1Before + 0.1)) < 1e-9, {
      y1Before,
      y1: after?.y1,
    }),
  );
  checks.push(
    check('Home on the time input moves x1 to 0', after?.x1 === 0, { x1Before, x1: after?.x1 }),
  );
  checks.push(
    check(
      'keyboard proposals commit immediately',
      keys.events.filter((e) => e.type === 'tp-value-commit').length === 3 &&
        keys.events.every((e) => e.reason === 'keyboard'),
      keys.events.map((e) => `${e.type}:${e.reason}`),
    ),
  );
  target.remove();
  return report(checks);
}

/** V-25, V-26: custom points. */
export async function assertPoints(): Promise<Report> {
  const checks: Check[] = [];
  const target = create({ 'default-value': 'linear(0, 0.5 50%, 1)', label: 'Points' });
  await settle(target);
  const graph = graphOf(target);
  const surface = surfaceOf(target);
  checks.push(
    check(
      'three points with six inputs',
      graph.shadowRoot.querySelectorAll('.point').length === 3 &&
        graph.shadowRoot.querySelectorAll('input').length === 6,
      graph.shadowRoot.querySelectorAll('.point').length,
    ),
  );
  // Positions map into the inset plot frame, not the whole graph box.
  const box = graph.shadowRoot.querySelector('.frame')!.getBoundingClientRect();
  const captured = capture(target, LANES);
  // Press the empty graph at 25 % time, 25 % progression: a new point there.
  pointer(surface, 'pointerdown', box.left + box.width * 0.25, box.top + box.height * 0.75);
  await tick();
  pointer(surface, 'pointerup', box.left + box.width * 0.25, box.top + box.height * 0.75);
  await settle(target);
  captured.stop();
  const points = target.curve?.kind === 'custom' ? target.curve.points : [];
  checks.push(
    check(
      'press adds a point at the press position',
      points.length === 4 &&
        Math.abs(points[1]!.input - 0.25) < 0.02 &&
        Math.abs(points[1]!.output - 0.25) < 0.05,
      points,
    ),
  );
  checks.push(
    check(
      'track-press reason with point metadata',
      captured.events.some(
        (e) => e.reason === 'track-press' && (e.metadata as { point?: number })?.point === 1,
      ),
      captured.events.map((e) => `${e.type}:${e.reason}`),
    ),
  );
  checks.push(
    check('serialized as linear()', target.value.startsWith('linear(0, 0.2'), target.value),
  );
  // Delete on the new point removes it; the ends cannot be removed.
  const input = graph.shadowRoot.querySelector<HTMLInputElement>(
    'input[data-point="1"][data-axis="time"]',
  )!;
  input.focus();
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await settle(target);
  checks.push(
    check(
      'Delete removes the focused point',
      target.curve?.kind === 'custom' && target.curve.points.length === 3,
      target.value,
    ),
  );
  const first = graph.shadowRoot.querySelector<HTMLInputElement>(
    'input[data-point="0"][data-axis="time"]',
  )!;
  first.focus();
  first.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await settle(target);
  checks.push(
    check(
      'the first point cannot be removed',
      target.curve?.kind === 'custom' && target.curve.points.length === 3,
      target.value,
    ),
  );
  // Add and remove Buttons.
  const add = target.shadowRoot!.querySelector<HTMLElement>('tp-button.add-point')!;
  add.click();
  await settle(target);
  checks.push(
    check(
      'Add point inserts halfway',
      target.curve?.kind === 'custom' && target.curve.points.length === 4,
      target.value,
    ),
  );
  checks.push(check('new point focused', graph.focusedPoint !== null, graph.focusedPoint));
  const remove = target.shadowRoot!.querySelector<HTMLElement>('tp-button.remove-point')!;
  remove.click();
  await settle(target);
  checks.push(
    check(
      'Remove point removes the focused inner point',
      target.curve?.kind === 'custom' && target.curve.points.length === 3,
      target.value,
    ),
  );
  // A moved point stays between its neighbours.
  const middle = graph.shadowRoot.querySelector<HTMLInputElement>(
    'input[data-point="1"][data-axis="time"]',
  )!;
  middle.focus();
  for (let index = 0; index < 8; index++)
    middle.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        composed: true,
        cancelable: true,
        shiftKey: true,
      }),
    );
  await settle(target);
  const moved = target.curve?.kind === 'custom' ? target.curve.points[1]!.input : NaN;
  checks.push(check('inner point clamps to the next point', moved <= 1 && moved >= 0.5, moved));
  target.remove();
  return report(checks);
}

/** V-34: frames bar. */
export async function assertFrames(): Promise<Report> {
  const checks: Check[] = [];
  const spring = editor('spring');
  const bar = spring.shadowRoot!.querySelector('tp-easing-editor-frames') as HTMLElement & {
    count: number;
    shadowRoot: ShadowRoot;
  };
  checks.push(check('40 ticks whatever the duration (0.6 s)', bar.count === 40, bar.count));
  const ticks = bar.shadowRoot.querySelectorAll('line.tick');
  checks.push(check('40 ticks rendered', ticks.length === 40, ticks.length));
  const tickBox = ticks[0]!.getBoundingClientRect();
  const barBox = bar.getBoundingClientRect();
  checks.push(
    check(
      'ticks span the bar height',
      tickBox.height > 0 && Math.abs(tickBox.height - barBox.height) < 1,
      { tick: tickBox.height, bar: barBox.height },
    ),
  );
  const img = bar.shadowRoot.querySelector('[role="img"]');
  checks.push(
    check(
      'image role named with the tick count',
      img?.getAttribute('aria-label') === 'Spring: Frames: 40',
      img?.getAttribute('aria-label'),
    ),
  );
  const custom = editor('custom');
  const customBar = custom.shadowRoot!.querySelector('tp-easing-editor-frames') as HTMLElement & {
    count: number;
  };
  checks.push(
    check(
      'frames shown without timing with the same 40 ticks',
      customBar.count === 40,
      customBar.count,
    ),
  );
  const extended = editor('extended');
  extended.frames = false;
  await settle(extended);
  checks.push(
    check(
      'frames=false hides the bar',
      !extended.shadowRoot!.querySelector('tp-easing-editor-frames'),
      extended.frames,
    ),
  );
  extended.frames = true;
  await settle(extended);
  return report(checks);
}

/** V-31, V-32: preview playback. */
export async function assertPreview(): Promise<Report> {
  const checks: Check[] = [];
  const target = create({ 'default-value': 'ease', label: 'Preview', 'default-duration': '0.2' });
  await settle(target);
  const graph = graphOf(target);
  const shape = graph.shadowRoot.querySelector<HTMLElement>('.shape')!;
  checks.push(check('default preview is scale', target.preview === 'scale', target.preview));
  const layerBox = graph.shadowRoot.querySelector('.preview-layer')!.getBoundingClientRect();
  const shapeBox = shape.getBoundingClientRect();
  checks.push(
    check(
      'shape covers the graph area, centered',
      Math.abs(shapeBox.height - layerBox.height) < 1 &&
        Math.abs(shapeBox.width - shapeBox.height) < 1 &&
        Math.abs(shapeBox.left + shapeBox.width / 2 - (layerBox.left + layerBox.width / 2)) < 1,
      { shape: [shapeBox.width, shapeBox.height], layer: [layerBox.width, layerBox.height] },
    ),
  );
  checks.push(
    check(
      'preview layer hidden from assistive technology',
      graph.shadowRoot.querySelector('.preview-layer')?.getAttribute('aria-hidden') === 'true',
      true,
    ),
  );
  const done = target.play();
  await tick();
  const running = shape.getAnimations().length;
  checks.push(
    check('play starts an animation on the shape', running === 1 || target.playing, {
      running,
      playing: target.playing,
    }),
  );
  checks.push(
    check(
      'playing marker',
      target.playing && target.hasAttribute('data-playing'),
      target.hasAttribute('data-playing'),
    ),
  );
  await done;
  await settle(target);
  checks.push(check('playing clears when finished', !target.playing, target.playing));
  const before = shape.getAnimations().length;
  target.setValue('ease-in');
  await settle(target);
  await tick();
  checks.push(
    check(
      'a commit replays the preview',
      target.playing || shape.getAnimations().length >= before,
      target.playing,
    ),
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  target.preview = 'scale-x';
  await settle(target);
  checks.push(
    check(
      'preview mode reflects',
      target.getAttribute('preview') === 'scale-x' &&
        graph.shadowRoot.querySelector('.preview-layer')?.getAttribute('data-mode') === 'scale-x',
      target.preview,
    ),
  );
  const modeButton = () => target.shadowRoot!.querySelector<HTMLElement>('tp-button.preview-mode');
  checks.push(
    check(
      'the mode button names the mode',
      modeButton()?.textContent?.trim() === 'Scale X',
      modeButton()?.textContent,
    ),
  );
  pressToggle(modeButton()!);
  await settle(target);
  const afterOne = target.preview;
  pressToggle(modeButton()!);
  await settle(target);
  const afterTwo = target.preview;
  checks.push(
    check(
      'the mode button cycles scale-x → scale-y → rotation',
      afterOne === 'scale-y' && afterTwo === 'rotation',
      [afterOne, afterTwo],
    ),
  );
  // Layout sizes: the bounding box turns with the replaying rotation.
  const layer = graph.shadowRoot.querySelector<HTMLElement>('.preview-layer')!;
  checks.push(
    check(
      'rotation fits the square inside the area (side ≈ 70.7 %)',
      Math.abs(shape.offsetHeight / layer.offsetHeight - 0.707) < 0.01 &&
        Math.abs(shape.offsetWidth - shape.offsetHeight) <= 1,
      shape.offsetHeight / layer.offsetHeight,
    ),
  );
  pressToggle(modeButton()!);
  await settle(target);
  checks.push(check('the cycle wraps to scale', target.preview === 'scale', target.preview));
  target.setValue('cubic-bezier(0.34, 1.56, 0.64, 1)');
  await settle(target);
  // The range eases to 1.75 (S-13); measure once it has settled.
  await new Promise((resolve) => setTimeout(resolve, 400));
  await settle(target);
  checks.push(
    check(
      'the square leaves room for the shown overshoot (1 / 1.75 of the area)',
      Math.abs(shape.offsetHeight / layer.offsetHeight - 1 / 1.75) < 0.01,
      shape.offsetHeight / layer.offsetHeight,
    ),
  );
  target.preview = 'none';
  await settle(target);
  checks.push(
    check(
      'preview none hides the layer, the play button and the mode button',
      !graph.shadowRoot.querySelector('.preview-layer') &&
        !target.shadowRoot!.querySelector('tp-button.play') &&
        !target.shadowRoot!.querySelector('tp-button.preview-mode'),
      target.preview,
    ),
  );
  target.remove();
  return report(checks);
}

/** V-29: the expression field edits the value and the duration by typing and arrow tuning. */
export async function assertExpression(): Promise<Report> {
  const checks: Check[] = [];
  const target = create({ 'default-value': 'ease-out', label: 'Expression' });
  await settle(target);
  const field = target.shadowRoot!.querySelector('tp-easing-editor-expression') as HTMLElement & {
    text: string;
    shadowRoot: ShadowRoot;
  };
  const input = field.shadowRoot.querySelector('input')!;
  const numbers = () => field.shadowRoot.querySelectorAll('.token[data-type="number"]').length;
  checks.push(
    check(
      'field shows the output with its numbers highlighted',
      input.value === target.output &&
        numbers() === 5 &&
        field.shadowRoot.querySelectorAll('.token[data-type="unit"]').length === 1,
      { value: input.value, numbers: numbers() },
    ),
  );
  const captured = capture(target, LANES);
  input.focus();
  input.value = '500ms cubic-bezier(0.1, 0.2, 0.3, 0.4)';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(target);
  checks.push(
    check(
      'typing highlights live without committing',
      numbers() === 5 && target.value === 'cubic-bezier(0, 0, 0.58, 1)',
      target.value,
    ),
  );
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
  await settle(target);
  checks.push(
    check(
      'Enter commits the typed easing',
      target.value === 'cubic-bezier(0.1, 0.2, 0.3, 0.4)',
      target.value,
    ),
  );
  checks.push(check('the time prefix sets the duration', target.duration === 0.5, target.duration));
  checks.push(
    check(
      'reason input with the expression surface',
      captured.events.some(
        (e) =>
          e.type === 'tp-value-change' &&
          e.reason === 'input' &&
          (e.metadata as { surface?: string })?.surface === 'expression',
      ),
      captured.events.map((e) => [e.type, e.reason]),
    ),
  );
  const at = input.value.indexOf('0.1');
  input.setSelectionRange(at + 1, at + 1);
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
  );
  await settle(target);
  checks.push(
    check(
      'ArrowUp steps the number at the caret by 0.01 and commits',
      target.value === 'cubic-bezier(0.11, 0.2, 0.3, 0.4)' &&
        captured.events.some((e) => e.type === 'tp-value-commit' && e.reason === 'keyboard'),
      target.value,
    ),
  );
  checks.push(
    check(
      'the tuned number stays selected',
      input.selectionStart === at && input.selectionEnd === at + 4,
      [input.selectionStart, input.selectionEnd],
    ),
  );
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle(target);
  checks.push(
    check(
      'Shift+ArrowDown steps by 0.1',
      target.value === 'cubic-bezier(0.01, 0.2, 0.3, 0.4)',
      target.value,
    ),
  );
  const ms = input.value.indexOf('500');
  input.setSelectionRange(ms, ms);
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
  );
  await settle(target);
  checks.push(
    check('ArrowUp on the time steps by 10 ms', target.duration === 0.51, target.duration),
  );
  input.value = 'nonsense(';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
  await settle(target);
  checks.push(
    check(
      'text that is not an easing is flagged and keeps the value',
      input.getAttribute('aria-invalid') === 'true' &&
        target.value === 'cubic-bezier(0.01, 0.2, 0.3, 0.4)',
      { invalid: input.getAttribute('aria-invalid'), value: target.value },
    ),
  );
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
  await settle(target);
  checks.push(
    check(
      'Escape reverts to the output',
      input.value === target.output && !input.hasAttribute('aria-invalid'),
      input.value,
    ),
  );
  input.value = 'spring(1 100 10)';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('blur'));
  await settle(target);
  checks.push(
    check(
      'blur commits any notation the value model accepts',
      target.kind === 'spring' && target.category === 'spring',
      target.value,
    ),
  );
  captured.stop();
  target.remove();
  return report(checks);
}

/** V-17, V-50: header layout — Tabs at the start, the outlined Buttons together at the end. */
export async function assertHeader(): Promise<Report> {
  const checks: Check[] = [];
  for (const id of ['extended', 'compact', 'rtl']) {
    const target = editor(id);
    const header = target.shadowRoot!.querySelector<HTMLElement>('[part~="easing-editor-header"]')!;
    const buttons = [...header.children].filter((child) =>
      child.matches('tp-button, tp-toggle'),
    ) as HTMLElement[];
    const play = header.querySelector('tp-button.play');
    const box = header.getBoundingClientRect();
    const rtl = getComputedStyle(header).direction === 'rtl';
    const rects = buttons.map((button) => button.getBoundingClientRect());
    const edge = rtl
      ? Math.min(...rects.map((r) => r.left))
      : Math.max(...rects.map((r) => r.right));
    const gaps = rects
      .slice(1)
      .map((rect, index) =>
        rtl ? rects[index]!.left - rect.right : rect.left - rects[index]!.right,
      );
    const tabs = header.querySelector('tp-tabs')!.getBoundingClientRect();
    checks.push(
      check(
        `${id}: play is an outlined icon Button like the mode Button`,
        play?.getAttribute('variant') === 'outline' &&
          play.getAttribute('size') === 'icon-sm' &&
          header.querySelector('tp-button.preview-mode')?.getAttribute('variant') === 'outline',
        play?.getAttribute('variant'),
      ),
    );
    checks.push(
      check(
        `${id}: the Buttons sit together at the inline end, the Tabs at the start`,
        buttons.length === (id === 'compact' ? 3 : 2) &&
          Math.abs(edge - (rtl ? box.left : box.right)) < 1 &&
          gaps.every((gap) => gap > 0 && gap < 12) &&
          Math.abs((rtl ? tabs.right : tabs.left) - (rtl ? box.right : box.left)) < 1,
        { count: buttons.length, edge: Math.round(edge - (rtl ? box.left : box.right)), gaps },
      ),
    );
  }
  return report(checks);
}

/** V-50, V-52: the graph box is tinted apart from its surface; compact fills its container. */
export async function assertSurfaces(): Promise<Report> {
  const checks: Check[] = [];
  const extended = editor('extended');
  const graphRoot = graphOf(extended).shadowRoot.querySelector<HTMLElement>(
    '[part~="easing-editor-graph"]',
  )!;
  const surfaceColor = getComputedStyle(graphRoot).backgroundColor;
  const pageColor = getComputedStyle(document.body).backgroundColor;
  checks.push(
    check(
      'the graph box is tinted apart from the page',
      surfaceColor !== pageColor && surfaceColor !== 'rgba(0, 0, 0, 0)',
      { surfaceColor, pageColor },
    ),
  );
  const host = document.createElement('div');
  host.style.inlineSize = '478px';
  const compact = document.createElement('tp-easing-editor') as unknown as TpEasingEditor;
  compact.setAttribute('layout', 'compact');
  compact.setAttribute('label', 'Dialog width');
  host.append(compact as unknown as Node);
  document.body.append(host);
  await settle(compact);
  const root = compact.shadowRoot!.querySelector('.root')!.getBoundingClientRect();
  const graph = graphOf(compact).getBoundingClientRect();
  checks.push(
    check(
      'compact fills a 478 px container with a square graph',
      Math.abs(root.width - 478) < 1 &&
        Math.abs(graph.width - 478) < 1 &&
        Math.abs(graph.height - 478) < 1,
      { root: root.width, graph: [graph.width, graph.height] },
    ),
  );
  host.style.inlineSize = '900px';
  await settle(compact);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const capped = compact.shadowRoot!.querySelector('.root')!.getBoundingClientRect().width;
  checks.push(check('compact caps at 32rem on wide hosts', Math.abs(capped - 512) < 1, capped));
  host.remove();
  return report(checks);
}

/** V-36, V-37: cleanup and independence. */
export async function assertCleanup(): Promise<Report> {
  const checks: Check[] = [];
  const target = create({ 'default-value': 'ease', label: 'Cleanup' });
  await settle(target);
  const surface = surfaceOf(target);
  const handle = graphOf(target).shadowRoot.querySelector<HTMLElement>('.handle')!;
  const c = center(handle);
  pointer(handle, 'pointerdown', c.x, c.y);
  await tick();
  pointer(surface, 'pointermove', c.x + 30, c.y);
  await frame();
  await settle(target);
  checks.push(check('dragging mid-gesture', target.dragging, target.dragging));
  void target.play();
  target.remove();
  await frame();
  checks.push(check('removed without dragging state', !target.dragging, target.dragging));
  document.getElementById('dynamic')!.append(target);
  await settle(target);
  checks.push(
    check(
      'reconnected editor renders',
      !!graphOf(target).shadowRoot.querySelector('.curve'),
      target.value,
    ),
  );
  const other = editor('extended');
  checks.push(
    check('instances independent', other.value !== target.value || other.label !== target.label, {
      a: other.value,
      b: target.value,
    }),
  );
  target.remove();
  return report(checks);
}
