import { html } from 'lit';
import { plusIcon } from '../icons/plus.js';
import { checkIcon } from '../icons/check.js';

export function setupAvatarExample(root) {
  for (const icon of root.querySelectorAll('tp-icon[data-icon]'))
    icon.icon = icon.dataset.icon === 'check' ? checkIcon : plusIcon;
  for (const avatar of root.querySelectorAll('tp-avatar[data-status]'))
    avatar.partContracts = {
      'avatar-badge': {
        hostProperties: { role: 'img', 'aria-label': avatar.dataset.status },
      },
    };
  for (const group of root.querySelectorAll('tp-avatar-group[data-icon-count]'))
    group.partContracts = {
      'avatar-overflow-count': { content: html`<tp-icon .icon=${plusIcon}></tp-icon>` },
    };
  for (const avatar of root.querySelectorAll('[data-grayscale]'))
    avatar.partPresentation = { 'avatar-image': { styleHook: { filter: 'grayscale(1)' } } };
  for (const empty of root.querySelectorAll('tp-empty-state[data-bordered]'))
    empty.partPresentation = {
      'empty-state': { styleHook: { border: 'var(--tp-border-width) solid var(--tp-border)' } },
    };
  return () => {};
}
