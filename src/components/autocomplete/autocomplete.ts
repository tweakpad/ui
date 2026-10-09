import { TpSelect } from '../select/select.js';
import type { PartState } from '../../foundation/part.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { SearchMatching } from '../../foundation/search/types.js';
import { createId } from '../../foundation/id.js';
import { autocompletePresentation } from '../../presentation/families/autocomplete.js';
import { autocompleteParts } from '../../presentation/recipes/autocomplete.js';
import { selectPresentation } from '../../presentation/families/select.js';

/** Searchable Select part → Autocomplete part. */
const parts: Record<string, string> = Object.fromEntries(
  Object.entries(autocompleteParts).map(([part, select]) => [select, part]),
);

/**
 * Free text with suggestions. Autocomplete is the shared editable choice owner (the searchable
 * Select, as upstream builds Autocomplete on Combobox) in selection-free mode: its value is the
 * text, accepting a suggestion replaces the text, and the form receives the text. Suggestions
 * come from its items through ranked, typo-tolerant search by default, from the exact matching
 * modes, or from a search source such as a server endpoint or another search engine.
 */
export class TpAutocomplete extends TpSelect {
  static override tagName = 'tp-autocomplete';
  static override presentation = autocompletePresentation;
  static override presentationFamilies = [selectPresentation];
  override searchable = true;
  override openOnInputClick = false;
  override matching: SearchMatching = 'fuzzy';
  override highlightMatches = true;
  override showTrigger = false;
  override label = 'Suggestions';
  override identifier = createId('tp-autocomplete');

  /** The text. Numbers are converted; lists are joined with spaces. */
  override get value(): string {
    return this.inputValue;
  }
  override set value(value: unknown) {
    this.inputValue =
      value == null ? undefined : Array.isArray(value) ? value.join(' ') : String(value);
  }
  /** Initial uncontrolled text. */
  override get defaultValue(): string | undefined {
    return this.defaultInputValue;
  }
  override set defaultValue(value: unknown) {
    this.defaultInputValue =
      value == null ? undefined : Array.isArray(value) ? value.join(' ') : String(value);
  }

  protected override get selectionFree(): boolean {
    return true;
  }
  protected override get inputValueEventName(): string {
    return 'tp-value-change';
  }
  protected override inputValueChanged(event: TpValueChangeEvent<string>): void {
    this.onValueChange?.(event as TpValueChangeEvent<unknown>);
    this.onInputValueChange?.(event);
  }
  protected override choicePart(name: string): string {
    return parts[name] ?? name;
  }
  protected override choiceState(state: PartState): PartState {
    return { ...state, selected: false };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-autocomplete': TpAutocomplete;
  }
}
