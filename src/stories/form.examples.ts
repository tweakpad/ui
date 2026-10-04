import { html } from 'lit';
export interface FormArgs {
  validationTiming: 'on-submit' | 'on-blur' | 'on-change';
  nativeValidation: 'enabled' | 'suppressed';
  submissionPolicy: 'always-enabled' | 'disable-while-invalid' | 'disable-while-pending';
}
export const formDefaults: FormArgs = {
  validationTiming: 'on-submit',
  nativeValidation: 'enabled',
  submissionPolicy: 'always-enabled',
};
export function renderFormExample(args: FormArgs = formDefaults) {
  return html`<tp-form
    .validationTiming=${args.validationTiming}
    .nativeValidation=${args.nativeValidation}
    .submissionPolicy=${args.submissionPolicy}
    .onFormSubmit=${(values: Record<string, unknown>, details: { form: HTMLFormElement }) => {
      const output = details.form.querySelector('output');
      if (output) output.textContent = `Saved preferences for ${String(values.name)}.`;
    }}
    @tp-reset=${(event: CustomEvent<{ form: HTMLFormElement }>) => {
      const output = event.detail.form.querySelector('output');
      if (output) output.textContent = '';
    }}
  >
    <tp-field label="Name" description="The name displayed on your profile."
      ><tp-input name="name" required></tp-input
    ></tp-field>
    <div slot="actions">
      <tp-button type="submit" name="intent" value="save">Save</tp-button>
      <tp-button type="reset" variant="outline">Reset</tp-button>
    </div>
    <output aria-live="polite"></output>
  </tp-form>`;
}
