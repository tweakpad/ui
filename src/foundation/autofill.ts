import { nothing } from 'lit';

/**
 * Per-autofiller opt-outs for a native editable element. Browsers apply `autocomplete="off"`
 * inconsistently and password managers deliberately ignore it, so each widely used autofiller's
 * own hint is set too: Bitwarden, 1Password, LastPass and Dashlane.
 */
const optOutHints = {
  'data-bwignore': 'true',
  'data-1p-ignore': '',
  'data-lpignore': 'true',
  'data-form-type': 'other',
} as const;

type OptOutHint = keyof typeof optOutHints;

/**
 * Native element properties for a text-entry control. Hints are emitted only while opted out, so
 * an autofill hint a consumer supplies through host properties is never overridden.
 */
export function autofillProperties(
  noAutofill: boolean,
  autocomplete: string,
  autocompleteKey: 'autocomplete' | '.autocomplete' = 'autocomplete',
): Record<string, string> {
  return noAutofill
    ? { [autocompleteKey]: 'off', ...optOutHints }
    : { [autocompleteKey]: autocomplete };
}

/** One opt-out hint for a template attribute binding; absent unless the control opts out. */
export function autofillHint(noAutofill: boolean, name: OptOutHint): string | typeof nothing {
  return noAutofill ? optOutHints[name] : nothing;
}

/** Whether an enclosing Form opts its text-entry controls out of autofill. */
export function formOptsOutOfAutofill(element: Element): boolean {
  return element.closest('tp-form[no-autofill]') !== null;
}
