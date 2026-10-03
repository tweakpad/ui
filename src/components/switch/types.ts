import type { BooleanControlState } from '../checkbox/checkbox.js';

export interface SwitchState extends BooleanControlState {
  size: 'sm' | 'default';
  direction: 'ltr' | 'rtl';
}
