import type { PresentationRule } from '../../resolver.js';

// Nested groups and unjoined members keep the theme gap; separators paint with the input boundary role.
export const joinedGroupGap: PresentationRule = {
  selector: ':host(:not([joined])) &, &[data-nested]',
  declarations: { gap: 'var(--tp-space-2)' },
};
export const joinedGroupSeparator: PresentationRule = {
  declarations: { background: 'var(--tp-input)' },
};
