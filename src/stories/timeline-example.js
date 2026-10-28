import { checkIcon } from '../icons/check.js';
import { clockIcon } from '../icons/clock.js';
import { gitBranchIcon } from '../icons/git-branch.js';

/** Assigns icon definitions by name; Icon takes its artwork as a property. */
export function setupTimelineExample(root) {
  const icons = { check: checkIcon, clock: clockIcon, branch: gitBranchIcon };
  for (const icon of root.querySelectorAll('tp-icon[data-icon]'))
    icon.icon = icons[icon.dataset.icon];
  return () => {};
}
