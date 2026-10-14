import type { TpTextTransform } from '../../../../src/components/text-transform/index.js';
import { defineTextPreset } from '../../../../src/foundation/text-transform/presets.js';

/** Contract checks for Foundation §18.23 and CL Text transform; run through Chrome DevTools MCP. */
export async function verifyTextTransform() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const frame = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const settle = async () => {
    for (let n = 0; n < 3; n++) {
      await frame();
      for (const el of document.querySelectorAll<TpTextTransform>('tp-text-transform'))
        await el.updateComplete;
    }
  };
  const diagnostics: string[] = [];
  const collect = (event: Event) =>
    diagnostics.push((event as CustomEvent<{ code: string }>).detail.code);
  document.addEventListener('tp-diagnostic', collect);
  const root = document.createElement('section');
  root.id = 'api-checks';
  document.querySelector('main')!.append(root);
  root.innerHTML = `
    <p id="t-content"><tp-text-transform id="t-text" preset="uppercase">gate b</tp-text-transform></p>
    <tp-text-transform id="t-number" preset="currency" currency="EUR" value="1234.5" locale="en-US"></tp-text-transform>
    <tp-text-transform id="t-exact" preset="decimal" value="12345678901234567890.25" locale="en-US"></tp-text-transform>
    <tp-text-transform id="t-invalid" preset="number">to be announced</tp-text-transform>
    <tp-text-transform id="t-empty" preset="currency" currency="EUR"></tp-text-transform>
    <tp-text-transform id="t-compact" preset="compact" value="15300" locale="en-US"></tp-text-transform>
    <tp-text-transform id="t-preset" preset="api-fare" value="42" locale="en-US"></tp-text-transform>
    <p lang="de-DE"><tp-text-transform id="t-locale" preset="currency" currency="EUR" value="1234.5"></tp-text-transform></p>
    <div id="t-box" style="inline-size:160px"><tp-text-transform id="t-fit" truncate="middle">harbor-webcam-2026-10-14-dawn-panorama.jpg</tp-text-transform></div>
    <div style="inline-size:150px"><tp-text-transform id="t-words" truncate="end" truncate-by="words">Overnight crossing to Lighthouse Isle</tp-text-transform></div>
    <div style="inline-size:40px"><tp-text-transform id="t-long-word" truncate="end" truncate-by="words">Lighthousekeeper residence</tp-text-transform></div>
    <tp-text-transform id="t-count" max-length="3" truncate-by="words">alpha beta gamma delta</tp-text-transform>
    <p id="t-after">after</p>`;
  await settle();
  const byId = (id: string) => root.querySelector<TpTextTransform>('#' + id)!;
  const value = (el: TpTextTransform) =>
    el.shadowRoot!.querySelector<HTMLElement>('[part~="text-transform-value"]')!;
  // The presented text: the fitted line, else the visible half of a cut, else the whole value.
  const shown = (el: TpTextTransform) =>
    el.shadowRoot!.querySelector('.shown')?.textContent ??
    value(el).querySelector('[aria-hidden="true"]')?.textContent ??
    value(el).textContent;

  // Input and content observation (ttf-input).
  const text = byId('t-text');
  assert(text.text === 'GATE B', 'ttf-input reads trimmed text content');
  text.textContent = 'gate c';
  await settle();
  assert(text.text === 'GATE C', 'ttf-input re-presents edited content');
  text.value = 'dock four';
  text.textContent = 'ignored';
  await settle();
  assert(text.text === 'DOCK FOUR', 'ttf-input value takes precedence over content');

  // Numeric presets, machine value and exact decimals (ttf-numeric, ttf-machine-value).
  const number = byId('t-number');
  assert(number.text === '€1,234.50', 'ttf-numeric formats currency');
  assert(value(number).tagName === 'DATA', 'ttf-machine-value numeric Value is a data element');
  assert(value(number).getAttribute('value') === '1234.5', 'ttf-machine-value carries the input');
  assert(value(text).tagName === 'SPAN', 'ttf-machine-value text input is not duplicated');
  assert(
    byId('t-exact').text === '12,345,678,901,234,567,890.25',
    'ttf-input decimal text keeps every digit',
  );

  // Failures (ttf-invalid) and empty input.
  const invalid = byId('t-invalid');
  assert(invalid.invalid && invalid.hasAttribute('data-invalid'), 'ttf-invalid exposes invalid');
  assert(
    invalid.shadowRoot!.querySelector('slot') !== null,
    'ttf-invalid presents the fallback content',
  );
  assert(diagnostics.includes('invalid-number'), 'ttf-invalid reports a diagnostic');
  const empty = byId('t-empty');
  assert(empty.text === '' && !empty.invalid, 'ttf-input empty input presents nothing');

  // Accessible long form (ttf-accessible).
  const compact = byId('t-compact');
  assert(
    compact.text === '15K' && compact.accessibleText === '15 thousand',
    'ttf-accessible spells out compact numbers',
  );
  assert(
    compact.shadowRoot!.querySelector('.visually-hidden')?.textContent === '15 thousand',
    'ttf-accessible exposes the long form',
  );

  // Consumer presets adopted later (ttf-consumer-presets).
  const preset = byId('t-preset');
  assert(preset.text === '42', 'ttf-consumer-presets undefined preset presents the input');
  assert(diagnostics.includes('unknown-preset'), 'ttf-consumer-presets undefined preset reported');
  const release = defineTextPreset('api-fare', { preset: 'currency', format: { currency: 'JPY' } });
  await settle();
  assert(preset.text === '¥42', 'ttf-consumer-presets adopts a later definition');
  release();
  await settle();
  assert(preset.text === '42', 'ttf-consumer-presets released preset re-presents');

  // Formatter (ttf-formatter, ttf-formatter-failure).
  preset.formatter = (context) => ({
    text: `${context.apply('percent', 0.25)} off`,
    accessibleText: 'quarter off',
  });
  await settle();
  assert(preset.text === '25% off', 'ttf-formatter composes presets');
  assert(preset.accessibleText === 'quarter off', 'ttf-formatter supplies accessible text');
  preset.formatter = () => {
    throw new Error('broken');
  };
  preset.preset = 'number';
  await settle();
  assert(preset.text === '42', 'ttf-formatter-failure yields to the preset');
  assert(diagnostics.includes('formatter-failed'), 'ttf-formatter-failure reported');

  // Locale (ttf-environment).
  const locale = byId('t-locale');
  assert(locale.text === '1.234,50 €', 'ttf-environment uses the owner locale');
  locale.parentElement!.lang = 'fr-FR';
  await settle();
  assert(locale.text === '1 234,50 €', 'ttf-environment follows lang changes');

  // Fit (ttf-fit, ttf-refit) and layout neutrality.
  const fit = byId('t-fit');
  const after = root.querySelector('#t-after')!;
  const top = after.getBoundingClientRect().top;
  assert(fit.truncated && fit.hasAttribute('data-truncated'), 'ttf-fit truncates to the width');
  assert(/^.+….+$/u.test(shown(fit)!), 'ttf-truncation middle keeps both ends');
  const range = document.createRange();
  range.selectNodeContents(fit.shadowRoot!.querySelector('.shown')!);
  assert(range.getBoundingClientRect().width <= 160.5, 'ttf-fit cut fits the box');
  root.querySelector<HTMLElement>('#t-box')!.style.inlineSize = '600px';
  await settle();
  assert(!fit.truncated && shown(fit) === fit.text, 'ttf-refit restores the whole text');
  assert(after.getBoundingClientRect().top === top, 'ttf-refit moves no following content');
  root.querySelector<HTMLElement>('#t-box')!.style.inlineSize = '160px';
  await settle();
  assert(fit.truncated, 'ttf-refit truncates again when narrowed');
  assert(
    shown(byId('t-words')) === 'Overnight crossing…' ||
      shown(byId('t-words')) === 'Overnight crossing to…',
    'ttf-truncation words removes whole words',
  );
  const longWord = shown(byId('t-long-word'))!;
  assert(
    longWord.length > 1 && longWord.endsWith('…'),
    'ttf-fit cuts a lone word by characters',
  );
  assert(shown(byId('t-count')) === 'alpha beta gamma…', 'ttf-truncation max-length counts words');

  // Description (ttf-description, ttf-a11y).
  assert(value(fit).getAttribute('tabindex') === '0', 'ttf-description truncated Value focusable');
  assert(fit.shadowRoot!.querySelector('tp-tooltip'), 'ttf-description renders the Tooltip');
  assert(
    value(fit).querySelector('.shown')!.getAttribute('aria-hidden') === 'true',
    'ttf-a11y hides the shortened text',
  );
  assert(
    fit.shadowRoot!.querySelector('.visually-hidden')?.textContent === fit.text,
    'ttf-a11y exposes the complete text once',
  );
  fit.tooltip = false;
  await settle();
  assert(
    !fit.shadowRoot!.querySelector('tp-tooltip') && !value(fit).hasAttribute('tabindex'),
    'ttf-description disabled tooltip leaves the focus order',
  );

  // Lifecycle (ttf-lifecycle).
  const parent = fit.parentElement!;
  fit.remove();
  parent.style.inlineSize = '90px';
  parent.append(fit);
  await settle();
  range.selectNodeContents(fit.shadowRoot!.querySelector('.shown')!);
  assert(
    fit.truncated && range.getBoundingClientRect().width <= 90.5,
    'ttf-lifecycle refits after reconnection',
  );

  document.removeEventListener('tp-diagnostic', collect);
  root.remove();
  return results;
}
