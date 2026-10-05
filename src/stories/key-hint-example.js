import { chevronDownIcon } from '../icons/chevron-down.js';
import { chevronRightIcon } from '../icons/chevron-right.js';
import { navigationIcons } from '../icons/navigation.js';
export function setupKeyHintExample(root) {
  for (const icon of root.querySelectorAll('tp-icon[data-key-icon]'))
    icon.icon = { ...navigationIcons, down: chevronDownIcon, right: chevronRightIcon }[
      icon.dataset.keyIcon
    ];
  return () => {};
}
