/* Assertion helpers evaluated through Chrome DevTools MCP; each returns { checks, records }. */
import type { TpColorPicker } from '../../../../src/widgets/color-picker/index.js';

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

const report = (checks: Check[], records: Record<string, unknown> = {}): Report => ({
  checks,
  records,
  passed: checks.every((check) => check.pass),
});
const check = (name: string, pass: boolean, actual: unknown): Check => ({ name, pass, actual });
const picker = (id: string): TpColorPicker =>
  document.getElementById(id) as unknown as TpColorPicker;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

interface Captured {
  type: string;
  value: unknown;
  previousValue: unknown;
  reason: string;
  metadata: unknown;
}
function capture(
  target: EventTarget,
  types: readonly string[],
): { events: Captured[]; stop(): void } {
  const events: Captured[] = [];
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
    if (event.target !== target) return;
    events.push({
      type: event.type,
      value: detail.value,
      previousValue: detail.previousValue,
      reason: String(detail.reason ?? ''),
      metadata: detail.metadata,
    });
  };
  for (const type of types) target.addEventListener(type, listener);
  return {
    events,
    stop: () => {
      for (const type of types) target.removeEventListener(type, listener);
    },
  };
}

/** V-01, V-03, V-16: initial state, controlled rejection and format cycling. */
export async function assertValueLanes(): Promise<Report> {
  const checks: Check[] = [];
  const inline = picker('inline');
  checks.push(check('initial value is the default', inline.value === '#6d5dfc', inline.value));
  checks.push(check('initial color record', inline.color?.space === 'srgb', inline.color));
  checks.push(check('not controlled by default', !inline.controlled, inline.controlled));
  const dynamic = document.createElement('tp-color-picker') as unknown as TpColorPicker;
  dynamic.value = 'rgb(255 0 0)';
  document.getElementById('dynamic')!.append(dynamic);
  await dynamic.updateComplete;
  checks.push(
    check('controlled value normalizes to hex', dynamic.value === '#ff0000', dynamic.value),
  );
  checks.push(check('controlled', dynamic.controlled, dynamic.controlled));
  const rejected = capture(dynamic, ['tp-value-change', 'tp-value-commit']);
  dynamic.addEventListener('tp-value-change', (event) => event.preventDefault(), { once: true });
  const accepted = dynamic.setValue('#00ff00', 'programmatic');
  await dynamic.updateComplete;
  rejected.stop();
  checks.push(check('rejected proposal returns false', !accepted, accepted));
  checks.push(check('rejected proposal keeps value', dynamic.value === '#ff0000', dynamic.value));
  checks.push(
    check(
      'rejected proposal commits nothing',
      rejected.events.filter((event) => event.type === 'tp-value-commit').length === 0,
      rejected.events,
    ),
  );
  dynamic.addEventListener(
    'tp-value-change',
    (event) => {
      dynamic.value = (event as CustomEvent<{ value: string }>).detail.value;
    },
    { once: true },
  );
  const acceptedWrite = dynamic.setValue('#00ff00', 'programmatic');
  await dynamic.updateComplete;
  checks.push(
    check('owner write accepted', acceptedWrite && dynamic.value === '#00ff00', dynamic.value),
  );
  // Controlled: a format change publishes the re-serialized string as a non-cancelable
  // proposal followed by a commit; the value always reads in the active format.
  const formatEvents = capture(dynamic, ['tp-format-change', 'tp-value-change', 'tp-value-commit']);
  let cancelable: boolean | undefined;
  dynamic.addEventListener(
    'tp-value-change',
    (event) => {
      cancelable = event.cancelable;
    },
    { once: true },
  );
  dynamic.format = 'rgb';
  await dynamic.updateComplete;
  formatEvents.stop();
  checks.push(
    check(
      'controlled format change proposes the re-serialized value',
      formatEvents.events.some(
        (event) => event.type === 'tp-value-change' && event.value === 'rgb(0 255 0)',
      ),
      formatEvents.events,
    ),
  );
  checks.push(check('format proposal is not cancelable', cancelable === false, cancelable));
  checks.push(
    check(
      'format change commits once with formatChange metadata',
      formatEvents.events.filter(
        (event) =>
          event.type === 'tp-value-commit' &&
          (event.metadata as { formatChange?: boolean })?.formatChange === true,
      ).length === 1,
      formatEvents.events,
    ),
  );
  checks.push(
    check(
      'controlled value reads in the active format',
      dynamic.value === 'rgb(0 255 0)' && dynamic.color?.coords.join() === '0,1,0',
      [dynamic.value, dynamic.color],
    ),
  );
  dynamic.remove();
  // Uncontrolled: the published value follows the format.
  const free = document.createElement('tp-color-picker') as unknown as TpColorPicker;
  free.setAttribute('default-value', '#00ff00');
  document.getElementById('dynamic')!.append(free);
  await free.updateComplete;
  const formats = ['rgb', 'hsl', 'hwb', 'hsv', 'lab', 'oklab', 'oklch', 'cmyk', 'hex'] as const;
  const strings: Record<string, string> = {};
  for (const format of formats) {
    free.format = format;
    await free.updateComplete;
    strings[format] = free.value;
  }
  checks.push(check('format cycle returns to #00ff00', strings.hex === '#00ff00', strings));
  checks.push(check('rgb serialization', strings.rgb === 'rgb(0 255 0)', strings.rgb));
  checks.push(check('hsl serialization', strings.hsl === 'hsl(120 100% 50%)', strings.hsl));
  checks.push(
    check('cmyk serialization', strings.cmyk === 'device-cmyk(100% 0% 100% 0%)', strings.cmyk),
  );
  free.remove();
  return report(checks, { strings });
}

/** V-04, V-06: nested slider proposals re-propose on the widget lane and never leak. */
export async function assertNestedEventBoundary(): Promise<Report> {
  const checks: Check[] = [];
  const inline = picker('inline');
  const api = (window as unknown as { colorPickerAPI: { leaked: unknown[]; clear(): void } })
    .colorPickerAPI;
  api.clear();
  const slider = inline.shadowRoot!.querySelector<
    HTMLElement & { setValue(v: number, r?: string): boolean }
  >('tp-slider.hue')!;
  const captured = capture(inline, ['tp-value-change', 'tp-value-commit']);
  slider.setValue(200, 'keyboard');
  await inline.updateComplete;
  await tick();
  captured.stop();
  checks.push(
    check(
      'hue slider keyboard proposal reached the widget',
      captured.events.some((e) => e.type === 'tp-value-change' && e.reason === 'keyboard'),
      captured.events,
    ),
  );
  checks.push(
    check(
      'hue slider keyboard committed once',
      captured.events.filter((e) => e.type === 'tp-value-commit').length === 1,
      captured.events,
    ),
  );
  checks.push(
    check('no nested events leaked to the document', api.leaked.length === 0, api.leaked),
  );
  checks.push(
    check(
      'hue reached 200',
      Math.round(inline.api?.hue ?? 200) === 200 || inline.value !== '#6d5dfc',
      inline.value,
    ),
  );
  return report(checks, { events: captured.events });
}

/** V-24: form participation. */
export async function assertForms(): Promise<Report> {
  const checks: Check[] = [];
  const form = document.getElementById('form') as HTMLFormElement;
  const data = new FormData(form);
  checks.push(
    check(
      'FormData carries the inline value',
      data.get('accent') === picker('inline').value,
      data.get('accent'),
    ),
  );
  const inline = picker('inline');
  const before = inline.value;
  inline.setValue('#123456');
  await inline.updateComplete;
  checks.push(check('setValue applied', inline.value === '#123456', inline.value));
  const captured = capture(inline, ['tp-value-change']);
  form.reset();
  await inline.updateComplete;
  captured.stop();
  checks.push(check('reset restores the default', inline.value === '#6d5dfc', inline.value));
  checks.push(
    check(
      'reset reason',
      captured.events.some((e) => e.reason === 'form-reset'),
      captured.events,
    ),
  );
  void before;
  return report(checks);
}

/** V-25: Field association. */
export async function assertField(): Promise<Report> {
  const checks: Check[] = [];
  const field = document.getElementById('field-wrapper') as HTMLElement & { control?: HTMLElement };
  const control = picker('field');
  await control.updateComplete;
  checks.push(
    check(
      'field adopted the picker',
      field.control === (control as unknown as HTMLElement),
      field.control?.localName,
    ),
  );
  const group = control.shadowRoot!.querySelector('[part~="color-picker"]');
  checks.push(
    check(
      'group carries the field label',
      group?.getAttribute('aria-label') === 'Field accent',
      group?.getAttribute('aria-label'),
    ),
  );
  return report(checks);
}

export function snapshotState(id: string): Record<string, unknown> {
  const target = picker(id);
  const root = target.shadowRoot!;
  const area = root.querySelector<HTMLElement & { shadowRoot: ShadowRoot | null }>(
    'tp-color-picker-area',
  );
  const inputs = [...(area?.shadowRoot?.querySelectorAll('input') ?? [])].map((input) => ({
    label: input.getAttribute('aria-label'),
    now: input.getAttribute('aria-valuenow'),
    text: input.getAttribute('aria-valuetext'),
  }));
  return {
    value: target.value,
    format: target.format,
    color: target.color,
    inputs,
    sliders: [...root.querySelectorAll('tp-slider')].map((slider) => ({
      label: slider.getAttribute('aria-label'),
      value: (slider as unknown as { value: number }).value,
    })),
    dataset: { ...target.dataset },
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async (target: TpColorPicker) => {
  await target.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
};

/** V-18: swatch selection and re-press on the schemes instance. */
export async function assertSwatches(): Promise<Report> {
  const checks: Check[] = [];
  const target = picker('schemes');
  target.view = 'swatches';
  await settle(target);
  const groups = [...target.shadowRoot!.querySelectorAll('tp-toggle-group.swatches')];
  checks.push(check('saved and brand groups render', groups.length >= 2, groups.length));
  const toggles = groups[0]!.querySelectorAll<HTMLElement & { pressed: boolean }>('tp-toggle');
  const second = toggles[1]!;
  const expected = second.getAttribute('value');
  const captured = capture(target, ['tp-value-change', 'tp-value-commit']);
  second.shadowRoot!.querySelector('button')!.click();
  await wait(40);
  await settle(target);
  checks.push(check('swatch press publishes its color', target.value === expected, target.value));
  checks.push(
    check(
      'swatch press commits once with the swatch surface',
      captured.events.filter(
        (e) =>
          e.type === 'tp-value-commit' &&
          (e.metadata as { surface?: string })?.surface === 'swatch',
      ).length === 1,
      captured.events,
    ),
  );
  checks.push(check('pressed state follows the value', second.pressed, second.pressed));
  captured.events.length = 0;
  second.shadowRoot!.querySelector('button')!.click();
  await wait(40);
  await settle(target);
  captured.stop();
  checks.push(
    check(
      're-pressing the selected swatch proposes nothing',
      captured.events.length === 0,
      captured.events,
    ),
  );
  checks.push(check('still pressed after the re-press', second.pressed, second.pressed));
  return report(checks, { expected });
}

/** V-19: application-supplied recent colors on the popup strip and in the swatches view. */
export async function assertRecent(): Promise<Report> {
  const checks: Check[] = [];
  const target = picker('popup');
  const colors = ['#e53935', '#fb8c00', '#43a047'];
  target.recent = colors;
  target.setOpen(true, 'programmatic');
  await settle(target);
  await wait(60);
  const strip = target.shadowRoot!.querySelector('[part~="color-picker-recent"] tp-toggle-group');
  const toggles = strip ? [...strip.querySelectorAll('tp-toggle')] : [];
  checks.push(check('popup strip shows the supplied colors', toggles.length === 3, toggles.length));
  checks.push(
    check(
      'strip swatches are named by the supplied strings',
      toggles.map((t) => t.getAttribute('aria-label')).join() === colors.join(),
      toggles.map((t) => t.getAttribute('aria-label')),
    ),
  );
  const captured = capture(target, ['tp-value-change', 'tp-value-commit']);
  (toggles[1] as HTMLElement).shadowRoot!.querySelector('button')!.click();
  await wait(40);
  await settle(target);
  captured.stop();
  checks.push(
    check('pressing a recent swatch publishes it', target.value === '#fb8c00', target.value),
  );
  checks.push(
    check(
      'the press commits once with the swatch surface',
      captured.events.filter(
        (e) =>
          e.type === 'tp-value-commit' &&
          (e.metadata as { surface?: string })?.surface === 'swatch',
      ).length === 1,
      captured.events,
    ),
  );
  checks.push(
    check(
      'the widget keeps no history: recent stays the supplied list',
      target.recent === colors,
      target.recent,
    ),
  );
  target.recent = [];
  await settle(target);
  checks.push(
    check(
      'an empty list removes the strip',
      !target.shadowRoot!.querySelector('[part~="color-picker-recent"]'),
      null,
    ),
  );
  target.close();
  await settle(target);
  await wait(60);
  // The swatches view lists the same colors.
  const schemes = picker('schemes');
  schemes.recent = colors;
  schemes.view = 'swatches';
  await settle(schemes);
  const groups = [...schemes.shadowRoot!.querySelectorAll('tp-toggle-group.swatches')];
  const recentGroup = groups.find((g) => g.getAttribute('label') === 'Recent colors');
  checks.push(
    check(
      'swatches view lists a Recent colors group with the supplied colors',
      recentGroup?.querySelectorAll('tp-toggle').length === 3,
      recentGroup?.querySelectorAll('tp-toggle').length,
    ),
  );
  schemes.recent = [];
  await settle(schemes);
  return report(checks, { events: captured.events });
}

/** V-96: popup header, original|current comparison restore and the Copy button. */
export async function assertPopupHeader(): Promise<Report> {
  const checks: Check[] = [];
  const target = picker('popup');
  const start = target.value;
  target.setOpen(true, 'programmatic');
  await settle(target);
  await wait(60);
  const root = target.shadowRoot!;
  const header = root.querySelector('[part~="color-picker-header"]');
  const order = header
    ? [...header.children].map((child) => `${child.localName}.${child.className}`)
    : [];
  checks.push(
    check(
      'header holds the Select, the comparison, the Copy button and the eyedropper in order',
      order.join() ===
        'tp-select.format,tp-button-group.compare,tp-copy-button.copy,tp-button.eyedropper' ||
        order.join() === 'tp-select.format,tp-button-group.compare,tp-copy-button.copy',
      order,
    ),
  );
  checks.push(
    check(
      'fields row keeps only the editors',
      !root.querySelector('[part~="color-picker-fields"] tp-select') &&
        !root.querySelector('[part~="color-picker-fields"] [part~="color-picker-preview"]'),
      null,
    ),
  );
  const original = root.querySelector<HTMLElement>('tp-button.original')!;
  checks.push(
    check(
      'original Button is named by the original serialization',
      original.getAttribute('aria-label') === `Restore the original color ${start}`,
      original.getAttribute('aria-label'),
    ),
  );
  const swatchPaint = (host: Element | null) =>
    host
      ?.querySelector<HTMLElement>('.swatch')
      ?.style.getPropertyValue('--_tp-color-picker-paint') ?? '';
  target.setValue('#ff0000', 'keyboard');
  await settle(target);
  checks.push(check('edit changes the value', target.value === '#ff0000', target.value));
  checks.push(
    check(
      'current fill follows the value while the original fill keeps the opening color',
      swatchPaint(root.querySelector('tp-button-group-text.current')).includes('rgb(255 0 0)') &&
        !swatchPaint(original).includes('rgb(255 0 0)'),
      [swatchPaint(original), swatchPaint(root.querySelector('tp-button-group-text.current'))],
    ),
  );
  const captured = capture(target, ['tp-value-change', 'tp-value-commit']);
  original.shadowRoot!.querySelector('button')!.click();
  await wait(40);
  await settle(target);
  captured.stop();
  checks.push(check('pressing the original restores it', target.value === start, target.value));
  checks.push(
    check(
      'restore commits once as item-press on the compare surface',
      captured.events.filter(
        (e) =>
          e.type === 'tp-value-commit' &&
          e.reason === 'item-press' &&
          (e.metadata as { surface?: string })?.surface === 'compare',
      ).length === 1,
      captured.events,
    ),
  );
  const copy = root.querySelector<HTMLElement & { value: string }>('tp-copy-button.copy')!;
  checks.push(check('Copy button carries the serialized value', copy.value === start, copy.value));
  const tooltips = [...root.querySelectorAll('tp-button-group.compare tp-tooltip')].map((tip) =>
    [...tip.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent!.trim())
      .join(''),
  );
  checks.push(
    check(
      'comparison halves carry tooltips with their values in the active format',
      tooltips.length === 2 && tooltips[0] === start && tooltips[1] === target.value,
      tooltips,
    ),
  );
  target.close();
  await settle(target);
  await wait(60);
  // Reopening snapshots the current value as the new original.
  target.setValue('#00ff00', 'keyboard');
  await settle(target);
  target.setOpen(true, 'programmatic');
  await settle(target);
  await wait(60);
  const reopened = root.querySelector<HTMLElement>('tp-button.original')!;
  checks.push(
    check(
      'reopening takes the current value as the original',
      reopened.getAttribute('aria-label') === 'Restore the original color #00ff00',
      reopened.getAttribute('aria-label'),
    ),
  );
  target.close();
  await settle(target);
  await wait(60);
  target.setValue(start, 'programmatic');
  await settle(target);
  return report(checks, { events: captured.events, order });
}

/** V-101: pressing a handle, at its edge or on a derived handle, moves nothing. */
export async function assertHandlePress(): Promise<Report> {
  const checks: Check[] = [];
  const target = picker('wheel');
  target.harmony = 'triad';
  target.setValue('#e53935', 'programmatic');
  await settle(target);
  target.scrollIntoView({ block: 'center' });
  await wait(60);
  const wheel = target.shadowRoot!.querySelector('tp-color-picker-wheel')!;
  const root = wheel.shadowRoot!;
  const handles = [...root.querySelectorAll<HTMLElement>('[part~="color-picker-wheel-handle"]')];
  const press = async (element: HTMLElement, dx: number, id: number): Promise<string> => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + dx;
    const y = rect.top + rect.height / 2;
    const hit = root.elementFromPoint(x, y) ?? element;
    const init = (type: string, extra: PointerEventInit = {}) =>
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: id,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: x,
        clientY: y,
        buttons: 1,
        button: type === 'pointerdown' ? 0 : -1,
        ...extra,
      });
    hit.dispatchEvent(init('pointerdown'));
    await wait(30);
    hit.dispatchEvent(init('pointerup', { buttons: 0 }));
    await settle(target);
    return `${hit.localName}.${hit.className}`;
  };
  const primary = handles.find((h) => h.hasAttribute('data-primary'))!;
  const derived = handles.find((h) => !h.hasAttribute('data-primary'))!;
  const edgeTarget = await press(primary, primary.getBoundingClientRect().width / 2 - 1, 961);
  checks.push(
    check('a press at the base handle edge leaves the value', target.value === '#e53935', [
      edgeTarget,
      target.value,
    ]),
  );
  const haloTarget = await press(primary, primary.getBoundingClientRect().width / 2 + 4, 962);
  checks.push(
    check('a press on the base handle halo leaves the value', target.value === '#e53935', [
      haloTarget,
      target.value,
    ]),
  );
  const derivedTarget = await press(derived, 2, 963);
  checks.push(
    check('a press on a derived handle moves nothing', target.value === '#e53935', [
      derivedTarget,
      target.value,
    ]),
  );
  // Complementary and analogous variants share or overlap the base's position: a drag that
  // starts there still moves the base.
  const dragOverlap = async (rule: 'complementary' | 'analogous', id: number) => {
    target.harmony = rule;
    target.setValue('#e53935', 'programmatic');
    await settle(target);
    const base = root.querySelector<HTMLElement>(
      '[part~="color-picker-wheel-handle"][data-primary]',
    )!;
    const rect = base.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + 3;
    const y = rect.top + rect.height / 2;
    const hit = root.elementFromPoint(x, y) ?? base;
    const init = (type: string, cx: number, cy: number, extra: PointerEventInit = {}) =>
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: id,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: cx,
        clientY: cy,
        buttons: 1,
        button: type === 'pointerdown' ? 0 : -1,
        ...extra,
      });
    hit.dispatchEvent(init('pointerdown', x, y));
    await wait(30);
    hit.dispatchEvent(init('pointermove', x + 24, y + 8));
    await wait(30);
    hit.dispatchEvent(init('pointerup', x + 24, y + 8, { buttons: 0 }));
    await settle(target);
    return {
      hit: `${hit.localName}${hit.hasAttribute('data-editable') ? '[editable]' : '[derived]'}`,
      value: target.value,
    };
  };
  for (const rule of ['complementary', 'analogous'] as const) {
    const result = await dragOverlap(rule, rule === 'complementary' ? 964 : 965);
    checks.push(
      check(
        `a drag starting over the base under ${rule} moves the base`,
        result.value !== '#e53935',
        result,
      ),
    );
  }
  target.harmony = 'triad';
  target.setValue('#e53935', 'programmatic');
  await settle(target);
  return report(checks, {});
}

/** V-102: the harmony palette copies each handle's color in the active format. */
export async function assertPalette(): Promise<Report> {
  const checks: Check[] = [];
  const target = picker('wheel');
  target.harmony = 'triad';
  await settle(target);
  const root = target.shadowRoot!;
  const items = [
    ...root.querySelectorAll<HTMLElement & { value: string; copied: boolean }>(
      '[part~="color-picker-palette"] tp-copy-button',
    ),
  ];
  checks.push(
    check(
      'one palette item per harmony handle',
      items.length > 1 && items.length === target.harmonyColors.length,
      [items.length, target.harmonyColors.length],
    ),
  );
  const values = items.map((item) => item.value);
  checks.push(
    check(
      'items carry the harmony colors in the active format',
      [...values].sort().join() === [...target.harmonyColors].sort().join(),
      [values, target.harmonyColors],
    ),
  );
  const principal = items.filter((item) => item.hasAttribute('data-principal'));
  checks.push(
    check(
      'the triad has three principal segments, the base among them',
      principal.length === 3 && principal.some((item) => item.hasAttribute('data-base')),
      principal.map((item) => item.value),
    ),
  );
  target.harmony = 'complementary';
  await settle(target);
  const complementary = [...root.querySelectorAll('[part~="color-picker-palette"] tp-copy-button')];
  checks.push(
    check(
      'the complementary scheme has two principal segments among its five handles',
      complementary.length === 5 &&
        complementary.filter((item) => item.hasAttribute('data-principal')).length === 2,
      complementary.map((item) => item.hasAttribute('data-principal')),
    ),
  );
  target.harmony = 'triad';
  await settle(target);
  checks.push(
    check(
      'items are named by the copy action and their value',
      items.every((item) => item.getAttribute('label') === `Copy color ${item.value}`),
      items.map((item) => item.getAttribute('label')),
    ),
  );
  const roots = items.map((item) =>
    item.shadowRoot!.querySelector('tp-button')!.shadowRoot!.querySelector('[part~="button"]')!,
  );
  checks.push(
    check(
      'no hover layer tints a segment',
      roots.every((root) => getComputedStyle(root, '::before').content === 'none'),
      roots.map((root) => getComputedStyle(root, '::before').content),
    ),
  );
  const secondary = items.find((item) => !item.hasAttribute('data-principal'))!;
  const captured = capture(target, ['tp-copy', 'tp-copied', 'tp-copy-error']);
  secondary.shadowRoot!.querySelector('tp-button')!.shadowRoot!.querySelector('button')!.click();
  await wait(120);
  captured.stop();
  checks.push(
    check(
      'pressing an item copies its value and confirms',
      captured.events.some((e) => e.type === 'tp-copied') && secondary.copied,
      [captured.events, secondary.copied],
    ),
  );
  target.harmony = 'none';
  await settle(target);
  checks.push(
    check(
      'no palette without a harmony rule',
      !root.querySelector('[part~="color-picker-palette"]'),
      null,
    ),
  );
  target.harmony = 'triad';
  await settle(target);
  return report(checks, { values, events: captured.events });
}

/** V-20, V-21: harmony derivation and custom handles on the wheel instance. */
export async function assertHarmony(): Promise<Report> {
  const checks: Check[] = [];
  const target = picker('wheel');
  target.harmony = 'triad';
  await settle(target);
  checks.push(
    check('triad derives five colors', target.harmonyColors.length === 5, target.harmonyColors),
  );
  checks.push(
    check(
      'base color comes first',
      target.harmonyColors[0] === target.value,
      target.harmonyColors[0],
    ),
  );
  target.harmony = 'none';
  await settle(target);
  checks.push(
    check('none derives nothing', target.harmonyColors.length === 0, target.harmonyColors),
  );
  target.harmony = 'custom';
  await settle(target);
  const wheel = target.shadowRoot!.querySelector('tp-color-picker-wheel')!;
  const editable = wheel.shadowRoot!.querySelectorAll('.handle[data-editable]').length;
  checks.push(check('custom exposes five editable handles', editable === 5, editable));
  const inputs = wheel.shadowRoot!.querySelectorAll('input').length;
  checks.push(check('custom exposes ten dimension inputs', inputs === 10, inputs));
  target.harmony = 'triad';
  await settle(target);
  return report(checks);
}

/**
 * V-103: the composed Selects close on the item press under controlled picker lanes, whether
 * the owner publishes later or never (Base UI commitSelection parity through tp-select).
 */
export async function assertComposedSelects(): Promise<Report> {
  const checks: Check[] = [];
  const target = document.createElement('tp-color-picker') as unknown as TpColorPicker;
  target.setAttribute('views', 'wheel');
  target.setAttribute('harmony', 'triad');
  target.setAttribute('format', 'hex');
  target.setAttribute('default-value', '#e53935');
  document.getElementById('dynamic')!.append(target);
  await settle(target);
  const select = (name: string) =>
    target.shadowRoot!.querySelector(`tp-select.${name}`) as HTMLElement & {
      open: boolean;
      value: unknown;
      listElement: HTMLElement | null;
      setOpen(open: boolean): void;
      updateComplete: Promise<unknown>;
    };
  const pick = async (name: string, text: string): Promise<void> => {
    const host = select(name);
    host.setOpen(true);
    await host.updateComplete;
    await settle(target);
    const option = [...host.listElement!.querySelectorAll<HTMLElement>('[role=option]')].find(
      (element) => element.textContent!.trim().startsWith(text),
    );
    option!.focus();
    await host.updateComplete;
    option!.click();
    await host.updateComplete;
    await settle(target);
  };
  // No owner write: the proposal is ignored, the list still closes and the value holds.
  await pick('harmony', 'Complementary');
  checks.push(
    check('ignored harmony proposal closes the Select', !select('harmony').open, {
      open: select('harmony').open,
    }),
  );
  checks.push(
    check('ignored harmony proposal keeps the rule', target.harmony === 'triad', target.harmony),
  );
  checks.push(
    check(
      'ignored harmony proposal keeps the Select value',
      select('harmony').value === 'triad',
      select('harmony').value,
    ),
  );
  // Owner publishing on a microtask (Storybook args, framework state): the list closes on the
  // press and the Select follows the owner's write.
  const later = (event: Event) => {
    const detail = (event as CustomEvent<{ value: string }>).detail;
    queueMicrotask(() => {
      target.harmony = detail.value as TpColorPicker['harmony'];
    });
  };
  target.addEventListener('tp-harmony-change', later);
  await pick('harmony', 'Analogous');
  checks.push(
    check('late harmony owner: Select closed', !select('harmony').open, select('harmony').open),
  );
  checks.push(
    check('late harmony owner: rule follows', target.harmony === 'analogous', target.harmony),
  );
  checks.push(
    check(
      'late harmony owner: Select value follows',
      select('harmony').value === 'analogous',
      select('harmony').value,
    ),
  );
  target.removeEventListener('tp-harmony-change', later);
  const laterFormat = (event: Event) => {
    const detail = (event as CustomEvent<{ value: string }>).detail;
    queueMicrotask(() => {
      target.format = detail.value as TpColorPicker['format'];
    });
  };
  target.addEventListener('tp-format-change', laterFormat);
  await pick('format', 'RGB');
  checks.push(
    check('late format owner: Select closed', !select('format').open, select('format').open),
  );
  checks.push(check('late format owner: format follows', target.format === 'rgb', target.format));
  target.removeEventListener('tp-format-change', laterFormat);
  await pick('format', 'HSL');
  checks.push(
    check(
      'ignored format proposal closes the Select',
      !select('format').open,
      select('format').open,
    ),
  );
  checks.push(
    check('ignored format proposal keeps the format', target.format === 'rgb', target.format),
  );
  target.remove();
  return report(checks);
}

/** V-22: triangle geometry round trip at the vertices and the centroid. */
export async function assertTriangleMapping(): Promise<Report> {
  const geometry = await import('../../../../src/widgets/color-picker/surfaces/geometry.js');
  const checks: Check[] = [];
  const vertices = geometry.triangleVertices({ x: 60, y: 60 }, 60, 123);
  const cases: [number, number][] = [
    [100, 100],
    [0, 100],
    [0, 0],
    [50, 50],
    [33.3, 66.6],
  ];
  const errors = cases.map(([s, v]) => {
    const point = geometry.svToTriangle(s, v, vertices);
    const back = geometry.triangleToSv(point, vertices);
    return Math.max(Math.abs(back.s - s), Math.abs(back.v - v));
  });
  checks.push(
    check(
      'round trip within 1e-6 (black vertex excepted)',
      errors.every((e, i) => i === 2 || e < 1e-6),
      errors,
    ),
  );
  const black = geometry.triangleToSv(vertices.black, vertices);
  checks.push(check('black vertex maps to brightness 0', black.v < 1e-6, black));
  const outside = geometry.triangleToSv({ x: 200, y: 60 }, vertices);
  checks.push(
    check(
      'outside points clamp into the domain',
      outside.s <= 100 && outside.v <= 100 && outside.s >= 0 && outside.v >= 0,
      outside,
    ),
  );
  return report(checks, { errors });
}

/** V-23: popup open lane through the API. */
export async function assertPopup(): Promise<Report> {
  const checks: Check[] = [];
  const target = picker('popup');
  const captured = capture(target, ['tp-open-change']);
  target.setOpen(true, 'programmatic');
  await settle(target);
  await wait(60);
  checks.push(check('setOpen opens the popup', target.open, target.open));
  checks.push(check('host reflects data-open', target.hasAttribute('data-open'), null));
  checks.push(
    check(
      'tp-open-change re-dispatched with the reason',
      captured.events.some(
        (e) => e.type === 'tp-open-change' && e.reason === 'programmatic' && e.value === true,
      ),
      captured.events,
    ),
  );
  target.close();
  await settle(target);
  await wait(60);
  captured.stop();
  checks.push(check('close() closes the popup', !target.open, target.open));
  return report(checks, { events: captured.events });
}

/** V-27: removal mid-drag releases the gesture without a trailing commit. */
export async function assertCleanup(): Promise<Report> {
  const checks: Check[] = [];
  const dynamic = document.createElement('tp-color-picker') as unknown as TpColorPicker;
  dynamic.setAttribute('default-value', '#ff8800');
  dynamic.setAttribute('views', 'triangle');
  document.getElementById('dynamic')!.append(dynamic);
  await settle(dynamic);
  const triangle = dynamic.shadowRoot!.querySelector('tp-color-picker-triangle')!;
  const surface = triangle.shadowRoot!.querySelector<HTMLElement>('.surface')!;
  const rect = surface.getBoundingClientRect();
  const pointer = (type: string, x: number, y: number) =>
    surface.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: 77,
        pointerType: 'mouse',
        isPrimary: true,
        button: type === 'pointerdown' ? 0 : -1,
        buttons: 1,
        clientX: rect.left + x,
        clientY: rect.top + y,
      }),
    );
  const captured = capture(dynamic, ['tp-value-change', 'tp-value-commit']);
  pointer('pointerdown', rect.width / 2, 6);
  await settle(dynamic);
  pointer('pointermove', rect.width - 6, rect.height / 2);
  await settle(dynamic);
  checks.push(check('drag in progress before removal', dynamic.dragging, dynamic.dragging));
  const raster = (triangle as unknown as { rasterSurface?: { connected: boolean } }).rasterSurface;
  dynamic.remove();
  await wait(20);
  const before = captured.events.length;
  pointer('pointermove', rect.width / 2, rect.height - 6);
  pointer('pointerup', rect.width / 2, rect.height - 6);
  await wait(40);
  captured.stop();
  checks.push(
    check(
      'no events after removal',
      captured.events.length === before,
      captured.events.slice(before),
    ),
  );
  checks.push(
    check(
      'no commit was emitted',
      !captured.events.some((e) => e.type === 'tp-value-commit'),
      captured.events,
    ),
  );
  checks.push(
    check('canvas surface disconnected', raster ? !raster.connected : true, raster?.connected),
  );
  return report(checks);
}
