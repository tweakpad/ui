export type NativeSelectValue = string | readonly string[];
export interface NativeSelectState extends Readonly<Record<string, unknown>> {
  readonly value: NativeSelectValue;
  readonly multiple: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly filled: boolean;
  readonly size: string;
}
export interface NativeSelectOptionState extends NativeSelectState {
  readonly source: HTMLOptionElement | HTMLOptGroupElement;
  readonly optionValue: string;
  readonly label: string;
  readonly optionDisabled: boolean;
  readonly selected: boolean;
}
