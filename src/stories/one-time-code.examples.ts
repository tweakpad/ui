import { interactiveMarkupExample, markupExample } from './documentation-examples.js';
import { setupOneTimeCodeExample } from './one-time-code-example.js';
import setupSource from './one-time-code-example.js?raw';

function interactiveExample(title: string, id: string, markup: string, description?: string) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}" style="display:grid;gap:var(--tp-space-4)">${markup}<output aria-live="polite"></output></div>`,
    setupOneTimeCodeExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nsetupOneTimeCodeExample(document.getElementById('${id}'));`,
    description,
  );
}
export const codeExamples = [
  markupExample(
    'Simple',
    `<tp-field label="Verification code"><tp-otp-field length="6" name="code"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Digits only',
    `<tp-field label="SMS code" description="Enter the six digits from the text message."><tp-otp-field length="6" name="sms-code" validation-type="numeric"></tp-otp-field></tp-field>`,
  ),
  interactiveExample(
    'Grouped code',
    'code-grouped',
    `<tp-field label="Grouped verification code"><tp-otp-field length="6" name="grouped-code" group-lengths="[2,2,2]" data-controlled="123456"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Alphanumeric',
    `<tp-field label="Recovery code" description="Letters and numbers are accepted."><tp-otp-field length="6" name="recovery-code" validation-type="alphanumeric" group-lengths="[3,3]"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Disabled',
    `<tp-field label="Verification unavailable"><tp-otp-field length="6" disabled default-value="123456" group-lengths="[3,3]"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Four digits',
    `<tp-field label="PIN"><tp-otp-field length="4" name="pin" validation-type="numeric"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Invalid code',
    `<tp-field label="Expired verification code" error="Invalid code. Please try again." invalid><tp-otp-field length="6" default-value="000000" group-lengths="[2,2,2]" validation-type="numeric" invalid></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Masked code',
    `<tp-field label="Private verification code"><tp-otp-field length="6" validation-type="numeric" mask></tp-otp-field></tp-field>`,
    'Masking changes presentation only. The value remains one normalized string.',
  ),
  interactiveExample(
    'Controlled code',
    'code-controlled',
    `<tp-field label="Application-owned verification code"><tp-otp-field length="6" data-controlled=""></tp-otp-field></tp-field>`,
    'The application publishes accepted values synchronously and reports the committed code.',
  ),
  interactiveExample(
    'Verify your login',
    'code-login',
    `<tp-form>
  <tp-card style="inline-size:100%;max-inline-size:calc(var(--tp-spacing) * 112)">
    <h3 slot="header">Verify your login</h3>
    <p slot="description">Enter the verification code sent to m@example.com.</p>
    <tp-button slot="action" variant="outline" size="sm" data-resend>Resend code</tp-button>
    <tp-field label="Login verification code">
      <tp-otp-field length="6" name="code" group-lengths="[3,3]" required></tp-otp-field>
      <a slot="description" href="#recover-account">I no longer have access to this email address.</a>
    </tp-field>
    <div slot="footer" style="display:grid;gap:var(--tp-space-2);inline-size:100%">
      <tp-button type="submit">Verify</tp-button>
      <span>Having trouble signing in? <tp-button variant="link" href="#support">Contact support</tp-button></span>
    </div>
  </tp-card>
</tp-form>`,
    'Card supplies the sections; Form owns required-code validation and submission. Resend is an application action.',
  ),
  interactiveExample(
    'Verification form',
    'code-auto-submit',
    `<tp-form>
  <tp-field label="Email verification code" description="Use the code from your email.">
    <tp-otp-field length="6" name="code" group-lengths="[3,3]" required auto-submit></tp-otp-field>
  </tp-field>
  <div slot="actions">
    <tp-button type="reset" variant="outline">Reset</tp-button>
    <tp-button type="submit">Verify</tp-button>
  </div>
</tp-form>`,
    'Accepted completion submits automatically. Reset restores the uncontrolled empty code.',
  ),
];
