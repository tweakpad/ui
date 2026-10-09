import type { ComponentPartContract } from '../foundation/part.js';
import type { TpButton } from '../components/button/button.js';

export function datePickerTriggerContracts(empty: boolean): Record<string, ComponentPartContract>;
export function applyDatePickerTrigger(button: TpButton, empty: boolean): void;
