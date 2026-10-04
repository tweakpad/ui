import { markupExample } from './documentation-examples.js';
export const codeExamples = [
  markupExample(
    'Simple',
    `<tp-field label="Verification code"><tp-otp-field length="6" name="code"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Digits only',
    `<tp-field label="SMS code" description="Enter the six digits from the text message."><tp-otp-field length="6" name="sms-code" validation-type="numeric"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Grouped code',
    `<tp-field label="Verification code"><tp-otp-field length="6" name="grouped-code" group-lengths="[3,3]"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Alphanumeric',
    `<tp-field label="Recovery code" description="Letters and numbers are accepted."><tp-otp-field length="6" name="recovery-code" validation-type="alphanumeric"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Disabled',
    `<tp-field label="Verification unavailable"><tp-otp-field length="6" disabled default-value="12"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Four digits',
    `<tp-field label="PIN"><tp-otp-field length="4" name="pin" validation-type="numeric"></tp-otp-field></tp-field>`,
  ),
  markupExample(
    'Invalid code',
    `<tp-field label="Verification code" description="This code has expired. Request a new one." invalid><tp-otp-field length="6" default-value="123456" validation-type="numeric" invalid></tp-otp-field>`,
  ),
  markupExample(
    'Masked code',
    `<tp-field label="Private verification code"><tp-otp-field length="6" validation-type="numeric" mask></tp-otp-field></tp-field>`,
    'Masking changes presentation only. The value remains one normalized string.',
  ),
];
