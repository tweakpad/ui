import { fileTextIcon } from '../icons/file-text.js';

/** Gives slotted source-mark Icons their artwork. */
export function setupCitationExample(root) {
  for (const icon of root.querySelectorAll('tp-icon[data-icon="file"]')) icon.icon = fileTextIcon;
  return () => {};
}
