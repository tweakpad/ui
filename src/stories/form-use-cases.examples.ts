import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { TpForm } from '../components/form/index.js';
import type { TpField } from '../components/field/index.js';
import type { TpButton } from '../components/button/button.js';

const actions = `<div slot="actions"><tp-button type="reset" variant="outline">Reset</tp-button><tp-button type="submit">Save</tp-button></div><output aria-live="polite"></output>`;
function example(title: string, markup: string, setup?: (form: TpForm) => void, script = '') {
  return {
    title,
    code: `<tp-form aria-label="${title}">\n${markup}\n${actions}\n</tp-form>
<script type="module">
  const form = document.querySelector('tp-form');
  form.onFormSubmit = (values) => {
    form.querySelector('output').textContent = JSON.stringify(values);
  };
  form.addEventListener('tp-reset', () => { form.querySelector('output').textContent = ''; });
  ${script}
</script>`,
    render: () =>
      html`<tp-form
        aria-label=${title}
        style="max-inline-size:calc(var(--tp-spacing) * 140)"
        ${ref((node) => {
          if (!node) return;
          const form = node as TpForm;
          form.onFormSubmit = (values) => {
            form.querySelector('output')!.textContent = JSON.stringify(values);
          };
          form.addEventListener('tp-reset', () => {
            form.querySelector('output')!.textContent = '';
          });
          setup?.(form);
        })}
        >${unsafeHTML(markup + actions)}</tp-form
      >`,
  };
}
export const formExamples = [
  example(
    'Bug report',
    `<tp-field label="Bug title" description="Use 5–32 characters."><tp-input name="title" required minlength="5" maxlength="32" placeholder="Login button not working"></tp-input></tp-field>
<tp-field label="Description" description="Include steps to reproduce and expected behavior."><tp-input-group><tp-text-area name="description" required minlength="20" maxlength="100" rows="4"></tp-text-area><span slot="block-end">Maximum 100 characters</span></tp-input-group></tp-field>`,
  ),
  example(
    'Text input',
    `<tp-field label="Username" description="This is your public display name."><tp-input name="username" required minlength="2" placeholder="alex"></tp-input></tp-field>`,
  ),
  example(
    'Multiline input',
    `<tp-field label="Bio" description="Tell us about yourself."><tp-text-area name="bio" required maxlength="160" rows="4"></tp-text-area></tp-field>`,
  ),
  example(
    'Select',
    `<tp-field label="Email address"><tp-select name="email" required><option value="alex@example.com">alex@example.com</option><option value="team@example.com">team@example.com</option></tp-select></tp-field>`,
  ),
  example(
    'Checkbox',
    `<tp-field label="Terms" description="Accept the terms before saving."><tp-checkbox name="terms" required>Accept terms and conditions</tp-checkbox></tp-field>`,
  ),
  example(
    'Radio group',
    `<tp-field label="Notifications"><tp-radio-group name="notifications" required><tp-radio-group-item value="all">All new messages</tp-radio-group-item><tp-radio-group-item value="direct">Direct messages only</tp-radio-group-item><tp-radio-group-item value="none">Nothing</tp-radio-group-item></tp-radio-group></tp-field>`,
  ),
  example(
    'Switch',
    `<tp-field label="Security emails" description="Receive email about account security." orientation="horizontal"><tp-switch name="security" default-checked></tp-switch></tp-field>`,
  ),
  example(
    'Profile settings',
    `<tp-field label="Display name"><tp-input name="name" required></tp-input></tp-field>
<tp-field label="Bio"><tp-text-area name="bio" maxlength="160"></tp-text-area></tp-field>
<tp-field label="Language"><tp-native-select name="language"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option></tp-native-select></tp-field>
<tp-field label="Email updates" orientation="horizontal"><tp-switch name="updates"></tp-switch></tp-field>`,
  ),
  example(
    'Repeated email fields',
    `<div data-emails><tp-field label="Email 1"><tp-input-group><tp-input name="email" type="email" required></tp-input><tp-button slot="action" type="button" variant="ghost" aria-label="Remove email 1" disabled>Remove</tp-button></tp-input-group></tp-field></div>
<tp-button type="button" variant="outline" data-add-email>Add email address</tp-button>`,
    (form) => {
      // Application-owned collection. The same public Field/Input Group components register dynamically.
      let next = 2;
      const sync = () => {
        const fields = form.querySelectorAll('[data-emails] tp-field');
        (form.querySelector('[data-add-email]') as TpButton).disabled = fields.length >= 5;
        fields.forEach((field) => {
          (field.querySelector('tp-button') as TpButton).disabled = fields.length === 1;
        });
      };
      form.addEventListener('click', (event) => {
        const button = event
          .composedPath()
          .find((node) => node instanceof HTMLElement && node.localName === 'tp-button') as
          HTMLElement | undefined;
        if (!button) return;
        if (button.hasAttribute('data-add-email')) {
          const field = document.createElement('tp-field');
          field.label = `Email ${next++}`;
          const group = document.createElement('tp-input-group');
          const input = document.createElement('tp-input');
          input.name = 'email';
          input.type = 'email';
          input.required = true;
          const remove = document.createElement('tp-button');
          remove.slot = 'action';
          remove.variant = 'ghost';
          remove.type = 'button';
          remove.ariaLabel = `Remove ${field.label.toLowerCase()}`;
          remove.textContent = 'Remove';
          group.append(input, remove);
          field.append(group);
          form.querySelector('[data-emails]')!.append(field);
        } else if (button.slot === 'action') button.closest('tp-field')?.remove();
        sync();
      });
    },
    `// Repeated field names serialize in registration order.
  // Add/remove actual tp-field elements to update the registered collection.
  const add = form.querySelector('[data-add-email]');
  add.addEventListener('click', () => {
    const fields = form.querySelector('[data-emails]');
    if (fields.children.length >= 5) return;
    const field = document.createElement('tp-field');
    field.label = 'Additional email';
    const input = document.createElement('tp-input');
    input.name = 'email'; input.type = 'email'; input.required = true;
    const remove = document.createElement('tp-button');
    remove.type = 'button'; remove.variant = 'ghost'; remove.textContent = 'Remove email';
    remove.addEventListener('click', () => field.remove());
    field.append(input, remove); fields.append(field);
  });`,
  ),
  example(
    'External validation errors',
    `<tp-field label="Username"><tp-input name="username" default-value="alex" required></tp-input></tp-field>`,
    (form) => {
      form.errors = { username: 'This username is already taken.' };
      form.addEventListener('tp-value-change', () => {
        form.errors = {};
      });
    },
    `form.errors = { username: 'This username is already taken.' };
  form.addEventListener('tp-value-change', () => { form.errors = {}; });`,
  ),
  example(
    'Cross-field validation',
    `<tp-field label="Password"><tp-input name="password" type="password" required></tp-input></tp-field>
<tp-field label="Confirm password"><tp-input name="confirm" type="password" required></tp-input></tp-field>`,
    (form) => {
      queueMicrotask(() => {
        const fields = form.querySelectorAll<TpField>('tp-field');
        fields[1]!.validator = (value, values) =>
          value === values.password ? null : 'Passwords must match.';
      });
    },
    `form.querySelectorAll('tp-field')[1].validator = (value, values) => value === values.password ? null : 'Passwords must match.';`,
  ),
];
