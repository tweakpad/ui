import type { TpSlider, TpSliderThumb } from '../../../../src/components/slider/index.js';
import type { TpField } from '../../../../src/components/field/index.js';

const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
$<TpSlider>('#price').format = { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 };
$<TpSlider>('#distance').format = { style: 'unit', unit: 'kilometer' };

interface Record {
  id: string;
  passed: boolean;
  detail: unknown;
}
const records: Record[] = [];
const check = (id: string, passed: boolean, detail: unknown) => {
  records.push({ id, passed, detail });
  if (!passed) throw new Error(`${id}: ${JSON.stringify(detail)}`);
};
const frame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
async function settle(slider: TpSlider) {
  await slider.updateComplete;
  await Promise.all(
    [...slider.shadowRoot!.querySelectorAll<TpSliderThumb>('tp-slider-thumb')].map(
      (thumb) => thumb.updateComplete,
    ),
  );
  await frame();
}
/** A press (and optional drag) on the element hit at the point, as the pointer would reach it. */
async function press(slider: TpSlider, x: number, y: number, dragTo?: number) {
  const target = slider.shadowRoot!.elementFromPoint(x, y)!;
  const init = (clientX: number, buttons: number): PointerEventInit => ({
    bubbles: true,
    composed: true,
    button: 0,
    buttons,
    pointerId: 41,
    pointerType: 'mouse',
    isPrimary: true,
    clientX,
    clientY: y,
  });
  target.dispatchEvent(new PointerEvent('pointerdown', init(x, 1)));
  if (dragTo !== undefined) target.dispatchEvent(new PointerEvent('pointermove', init(dragTo, 1)));
  target.dispatchEvent(new PointerEvent('pointerup', init(dragTo ?? x, 0)));
  await settle(slider);
  return slider.value;
}
const controlRect = (slider: TpSlider) =>
  slider.shadowRoot!.querySelector('.control')!.getBoundingClientRect();
const ticksOf = (slider: TpSlider) => [
  ...slider.shadowRoot!.querySelectorAll<HTMLElement>('[part~="slider-tick"]'),
];

/** T01–T06: tick geometry, markers, snapping and the center detent. */
async function assertTicks() {
  records.length = 0;
  const balance = $<TpSlider>('#ticks');
  await settle(balance);
  const ticks = ticksOf(balance);
  check(
    'T01 a tick every interval with one center tick',
    ticks.length === 11 &&
      ticks.filter((tick) => tick.hasAttribute('data-center')).length === 1 &&
      ticks[5]!.hasAttribute('data-center') &&
      ticks.every((tick) => tick.getAttribute('aria-hidden') === null),
    ticks.map((tick) => tick.style.left),
  );
  check(
    'T02 ticks sit inside the aria-hidden track and mark the filled part',
    ticks[0]!.closest('[part~="slider-track"]')!.getAttribute('aria-hidden') === 'true' &&
      ticks.filter((tick) => tick.hasAttribute('data-filled')).length === 9,
    ticks.map((tick) => tick.hasAttribute('data-filled')),
  );
  const rect = controlRect(balance);
  const center = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const detent: unknown[] = [];
  for (const offset of [-6, -3, 5, 7, 12]) {
    balance.setValue(-40);
    await settle(balance);
    detent.push([offset, await press(balance, center + offset, y)]);
  }
  check(
    'T03 a free press within 6px of the center lands on it, farther presses do not',
    JSON.stringify(detent) === '[[-6,0],[-3,0],[5,0],[7,1],[12,2]]',
    detent,
  );
  balance.setValue(-40);
  await settle(balance);
  const dragged = await press(balance, center - 150, y, center + 4);
  check('T04 a drag ending near the center lands on it', dragged === 0, dragged);
  balance.setValue(1);
  await settle(balance);
  check('T05 programmatic values ignore the detent', balance.value === 1, balance.value);
  balance.setValue(30);
  const speed = $<TpSlider>('#snap');
  await settle(speed);
  const speedRect = controlRect(speed);
  const snapped = await press(
    speed,
    speedRect.left + speedRect.width * 0.6,
    speedRect.top + speedRect.height / 2,
  );
  const input = speed.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!.inputElement!;
  check(
    'T06 snap-to-ticks makes the interval the step for pointer and native input',
    snapped === 1.25 && (input as HTMLInputElement).step === '0.25',
    { snapped, step: (input as HTMLInputElement).step },
  );
  speed.setValue(1);
  return { checks: records.length, records: [...records] };
}

/** I01–I07: inline layout, output, label source, edge ticks and geometry. */
async function assertInline() {
  records.length = 0;
  const distance = $<TpSlider>('#distance');
  await settle(distance);
  const root = distance.shadowRoot!;
  const control = root.querySelector('.control')!.getBoundingClientRect();
  const track = root.querySelector('[part~="slider-track"]')!.getBoundingClientRect();
  check(
    'I01 the track fills the control-height row',
    Math.abs(track.height - control.height) < 1 && control.height >= 32,
    { track: track.height, control: control.height },
  );
  check(
    'I02 the output shows without a contract',
    root.querySelector('[part~="slider-output"]')?.textContent?.trim() === '7 km',
    root.querySelector('[part~="slider-output"]')?.textContent,
  );
  const range = root.querySelector<HTMLElement>('[part~="slider-range"]')!.getBoundingClientRect();
  check(
    'I03 the range ends exactly at the value',
    Math.abs(range.right - (track.left + 1 + (track.width - 2) * 0.35)) < 1.5,
    { range: range.right, track: [track.left, track.width] },
  );
  const label = root.querySelector('[part~="slider-label"]')!.getBoundingClientRect();
  const fromLabel = await press(distance, label.left + 4, label.top + label.height / 2);
  check('I04 a press on the label moves the value', fromLabel !== 7 && fromLabel! < 2, fromLabel);
  distance.setValue(7);
  const rating = $<TpSlider>('#rating');
  await settle(rating);
  const edges = ticksOf(rating).filter((tick) => tick.hasAttribute('data-edge'));
  check(
    'I05 ticks on the bounds are not drawn in the row',
    edges.length === 2 && edges.every((tick) => getComputedStyle(tick).display === 'none'),
    edges.map((tick) => getComputedStyle(tick).display),
  );
  const field = $<TpField>('#inline-field');
  const fieldSlider = field.querySelector<TpSlider>('tp-slider')!;
  await settle(fieldSlider);
  await field.updateComplete;
  const fieldLabel = field.shadowRoot!.querySelector<HTMLElement>('[part~="field-label"]')!;
  const barLabel = fieldSlider.shadowRoot!.querySelector<HTMLElement>('[part~="slider-label"]')!;
  const thumbInput =
    fieldSlider.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!.inputElement!;
  check(
    'I06 the Field label moves into the row and still names the control',
    fieldLabel.hasAttribute('data-control-label') &&
      fieldLabel.getBoundingClientRect().width <= 1 &&
      barLabel.textContent?.trim() === 'Check-in flexibility' &&
      barLabel.getAttribute('aria-hidden') === 'true' &&
      thumbInput.getAttribute('aria-label') === 'Check-in flexibility',
    {
      marked: fieldLabel.hasAttribute('data-control-label'),
      bar: barLabel.textContent,
      name: thumbInput.getAttribute('aria-label'),
    },
  );
  fieldSlider.variant = 'default';
  await settle(fieldSlider);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await field.updateComplete;
  const restored = field.shadowRoot!.querySelector<HTMLElement>('[part~="field-label"]')!;
  check(
    'I07 a default slider gives the Field its visible label back',
    !restored.hasAttribute('data-control-label') &&
      restored.getBoundingClientRect().width > 1 &&
      !fieldSlider.shadowRoot!.querySelector('[part~="slider-label"]'),
    { marked: restored.hasAttribute('data-control-label') },
  );
  fieldSlider.variant = 'inline';
  const vertical = $<TpSlider>('#inline-vertical');
  await settle(vertical);
  check(
    'I08 a vertical inline slider keeps the default look',
    !vertical.shadowRoot!.querySelector('[part~="slider-output"]') &&
      getComputedStyle(
        vertical.shadowRoot!.querySelector<TpSliderThumb>('tp-slider-thumb')!.visualElement!,
      ).backgroundColor !== 'rgba(0, 0, 0, 0)',
    null,
  );
  return { checks: records.length, records: [...records] };
}

Object.assign(window, { sliderTicksInlineAPI: { assertTicks, assertInline, settle, press } });
document.documentElement.dataset.fixtureReady = 'true';
