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
      '<fieldset disabled><tp-native-select name="native" value="one"><option value="one">One</option></tp-native-select><tp-select searchable name="combo" value="one"></tp-select><tp-select name="select" value="one"></tp-select><tp-command-palette name="command" value="one"></tp-command-palette><tp-slider name="range" value="25"></tp-slider><tp-calendar name="date" value="2026-10-02"></tp-calendar><tp-one-time-code-field name="otp" value="123" length="3"></tp-one-time-code-field><tp-switch name="news" default-checked value="yes">News</tp-switch><tp-toggle name="action" default-pressed>Action</tp-toggle></fieldset>';
    fixture.append(form);
    const controls = [
      ...form.querySelectorAll<HTMLElement>(
        'tp-native-select,tp-select,tp-command-palette,tp-slider,tp-calendar,tp-one-time-code-field,tp-switch,tp-toggle',
      ),
    ] as (HTMLElement & {
      updateComplete: Promise<unknown>;
      effectiveDisabled: boolean;
      disabled: boolean;
      options?: unknown;
    })[];
    for (const control of controls)
      if ('options' in control) control.options = [{ value: 'one', label: 'One' }];
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
