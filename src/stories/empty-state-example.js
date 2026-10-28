import { navigationIcons } from '../icons/navigation.js';
import { emptyStateIcons } from '../icons/empty-state.js';
import { externalLinkIcon } from '../icons/external-link.js';
import { plusIcon } from '../icons/plus.js';
import { refreshIcon } from '../icons/refresh.js';

export function setupEmptyStateExample(root) {
  for (const group of root.querySelectorAll('tp-button-group[data-actions]')) group.joined = false;
  const icons = {
    ...navigationIcons,
    ...emptyStateIcons,
    external: externalLinkIcon,
    plus: plusIcon,
    refresh: refreshIcon,
  };
  for (const icon of root.querySelectorAll('tp-icon[data-icon]'))
    icon.icon = icons[icon.dataset.icon];
  const toast = root.querySelector('tp-toast');
  const cleanup = [];
  for (const action of root.querySelectorAll('[data-feedback]')) {
    const activate = () => toast.add({ title: action.dataset.feedback });
    action.addEventListener('click', activate);
    cleanup.push(() => action.removeEventListener('click', activate));
  }
  return () => {
    cleanup.forEach((release) => release());
    toast?.close();
  };
}
