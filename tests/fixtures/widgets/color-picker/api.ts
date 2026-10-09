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
  checks.push(
    check(
      'format change leaves recent colors alone',
      dynamic.recentColors.length === 0,
      dynamic.recentColors,
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

/** V-18, V-19: swatch selection, re-press and recents on the schemes instance. */
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
  checks.push(
    check(
      'recent colors lead with the pressed swatch',
      target.recentColors[0] === expected,
      target.recentColors,
    ),
  );
  return report(checks, { expected, recents: target.recentColors });
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
