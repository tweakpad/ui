import type { PresentationRule } from '../../resolver.js';

// Nova registry/styles/style-nova.css `.cn-button-group`: nested groups and unjoined members
// keep the theme gap; separators paint with the input boundary role.
export const joinedGroupGap: PresentationRule = {
  selector: ':host(:not([joined])) &, &[data-nested]',
  declarations: { gap: 'var(--tp-space-2)' },
};
export const joinedGroupSeparator: PresentationRule = {
  declarations: { background: 'var(--tp-input)' },
};
