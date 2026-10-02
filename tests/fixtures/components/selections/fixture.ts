import { html, render } from 'lit';
import {
  boldIcon,
  italicIcon,
  underlineIcon,
  bookmarkIcon,
  filledBookmarkIcon,
} from '../../../../src/icons/text-formatting.js';
import type {
  TpCheckbox,
  TpRadioGroup,
  TpToggleGroup,
  TpValueChangeEvent,
} from '../../../../src/index.js';
import { runSelectionAPIChecks } from './api-checks.js';
const built = location.pathname.endsWith('/package.html');
const api = (await import(
  /* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts'
)) as typeof import('../../../../src/index.js');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
render(
  html`
    ${(['sm', 'default', 'lg'] as const).map(
    (size) =>
      html`<p>
        <tp-toggle id=${`icon-only-${size}`} .size=${size} aria-label=${`Bold ${size}`}
          ><tp-icon .icon=${boldIcon}></tp-icon
        ></tp-toggle>
        <tp-toggle id=${`icon-label-${size}`} .size=${size} variant="outline"
          ><tp-icon .icon=${italicIcon} data-icon="inline-start"></tp-icon> Italic
          ${size}</tp-toggle
        >
        <tp-button .size=${size} variant="outline" .icon=${boldIcon}>Apply ${size}</tp-button>
      </p>`,
  )}
    <tp-toggle id="icon-pressed" default-pressed aria-label="Bold selected"
      ><tp-icon .icon=${boldIcon}></tp-icon
    ></tp-toggle>
    <tp-toggle id="icon-disabled" disabled aria-label="Unavailable bold"
      ><tp-icon .icon=${boldIcon}></tp-icon
    ></tp-toggle>
    <tp-toggle
      id="icon-stateful"
      variant="outline"
      .partContracts=${{ 'toggle-content': { content: (state: Readonly<Record<string, unknown>>) => html`<tp-icon .icon=${state.pressed ? filledBookmarkIcon : bookmarkIcon}></tp-icon> Bookmark` } }}
    ></tp-toggle>
    <tp-toggle-group
      id="icon-group"
      label="Icon formatting"
      multiple
      variant="outline"
      size="sm"
      spacing="0"
    >
      <tp-toggle value="bold" aria-label="Bold"><tp-icon .icon=${boldIcon}></tp-icon></tp-toggle>
      <tp-toggle value="italic" aria-label="Italic"
        ><tp-icon .icon=${italicIcon}></tp-icon
      ></tp-toggle>
      <tp-toggle value="underline" aria-label="Underline" disabled
        ><tp-icon .icon=${underlineIcon}></tp-icon
      ></tp-toggle>
    </tp-toggle-group>
    <div dir="rtl">
      <tp-toggle-group
        id="icon-group-vertical"
        label="Vertical formatting"
        orientation="vertical"
        variant="outline"
        spacing="0"
      >
        <tp-toggle value="bold"><tp-icon .icon=${boldIcon}></tp-icon> Bold</tp-toggle>
        <tp-toggle value="italic"><tp-icon .icon=${italicIcon}></tp-icon> Italic</tp-toggle>
      </tp-toggle-group>
    </div>
  `,
  byId('toggle-icon-cases'),
);
const controlled = new api.TpCheckbox();
controlled.id = 'controlled-check';
controlled.checked = false;
controlled.textContent = 'Controlled checkbox';
byId('checkbox-controlled').append(controlled);
const checkboxGroup = new api.CheckboxGroupController(byId('checkbox-parent'), {
  defaultValue: ['read', 'locked'],
  allValues: ['read', 'write', 'locked'],
});
byId<TpCheckbox>('custom-check').partContracts = {
  checkbox: {
    classHook: (state) => (state.checked ? 'consumer-checked' : 'consumer-unchecked'),
    hostProperties: { title: 'Custom root' },
    renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>`,
  },
  'checkbox-indicator': { styleHook: { transform: 'scale(.9)' } },
};
byId<TpRadioGroup>('custom-radio').partPresentation = {
  'radio-group-indicator': { styleHook: { background: 'var(--tp-primary)' } },
};
const log: unknown[] = [];
document.addEventListener('tp-value-change', (event) => {
  const e = event as TpValueChangeEvent<unknown>;
  log.push({
    target: (e.target as HTMLElement).id,
    value: e.detail.value,
    previousValue: e.detail.previousValue,
    reason: e.detail.reason,
  });
});
let submissions = 0,
  submitted: unknown[] = [];
document.querySelectorAll('form').forEach((form) =>
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submissions++;
    submitted = [...new FormData(form, event.submitter as HTMLButtonElement | undefined)];
  }),
);
Object.assign(window, {
  selectionAPI: {
    api,
    byId,
    log,
    checkboxGroup,
    controlled,
    run: () => runSelectionAPIChecks(api),
    get submissions() {
      return submissions;
    },
    get submitted() {
      return submitted;
    },
    acceptControlled(accept: boolean) {
      controlled.onCheckedChange = accept
        ? (event) => {
            controlled.checked = event.detail.value;
          }
        : undefined;
    },
    theme(dark: boolean) {
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    },
    rtl(rtl: boolean) {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    },
    snapshot() {
      return {
        checked: byId<TpCheckbox>('check').checked,
        mixed: byId<TpCheckbox>('mixed').checked,
        parent: checkboxGroup.value,
        radio: byId<TpRadioGroup>('radio').value,
        single: byId<TpToggleGroup>('toggle-single').value,
        multiple: byId<TpToggleGroup>('toggle-multiple').value,
      };
    },
  },
});
await Promise.all(
  [...document.querySelectorAll('*')].map(
    (element) => (element as unknown as { updateComplete?: Promise<unknown> }).updateComplete,
  ),
);
document.body.dataset.ready = 'true';
