import type { ColorFormat } from '../../foundation/color/types.js';

/** `inline`: one compact row with the label at the start and the chip and value at the end. */
export type ColorInputVariant = 'default' | 'inline';
/** `none`: the swatch is a button that never opens the browser's picker, for another picker. */
export type ColorInputPicker = 'native' | 'none';
export type ColorInputSize = 'sm' | 'default';

export interface ColorInputState extends Readonly<Record<string, unknown>> {
  readonly value: string;
  readonly format: ColorFormat;
  readonly alpha: boolean;
  readonly picker: ColorInputPicker;
  readonly variant: ColorInputVariant;
  readonly size: ColorInputSize;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly filled: boolean;
}
