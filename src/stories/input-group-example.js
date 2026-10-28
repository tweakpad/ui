import { navigationIcons } from '../icons/navigation.js';
import { checkIcon } from '../icons/check.js';
import { chevronDownIcon } from '../icons/chevron-down.js';

// Application behavior only. Editors, actions and floating surfaces retain their owners.
export function setupInputGroupExample(root) {
  const cleanups = [];
  const listen = (node, name, callback) => {
    node.addEventListener(name, callback);
    cleanups.push(() => node.removeEventListener(name, callback));
  };
  for (const icon of root.querySelectorAll('[data-input-icon]')) {
    icon.icon = { ...navigationIcons, check: checkIcon, down: chevronDownIcon }[
      icon.dataset.inputIcon
    ];
  }
  const announce = (message) => {
    const output = root.querySelector('output');
    if (output) output.textContent = message;
  };
  for (const menu of root.querySelectorAll('tp-menu[data-choice]')) {
    listen(menu, 'tp-action', (event) => {
      if (event.defaultPrevented) return;
      menu.querySelector('[data-choice-label]').textContent = event.detail.value;
      announce('Selected ' + event.detail.value);
    });
  }
  for (const form of root.querySelectorAll('tp-form')) {
    listen(form, 'tp-submit', (event) => {
      event.preventDefault();
      announce('Submitted: ' + JSON.stringify(event.detail.values));
    });
    listen(form, 'tp-reset', () => announce(''));
  }
  for (const button of root.querySelectorAll('[data-copy]')) {
    listen(button, 'click', async () => {
      const input = button.closest('tp-input-group').querySelector('tp-input,tp-text-area');
      try {
        await root.ownerDocument.defaultView.navigator.clipboard.writeText(input.value);
        announce('Copied to clipboard.');
      } catch {
        announce('Clipboard access is unavailable. Select and copy the value.');
      }
    });
  }
  for (const button of root.querySelectorAll('[data-clear]')) {
    listen(button, 'click', (event) => {
      const input = button.closest('tp-input-group').querySelector('tp-input,tp-text-area');
      input.clear(event);
      input.focus();
      if (!input.value) announce('Cleared.');
    });
  }
  for (const group of root.querySelectorAll('[data-count]')) {
    const input = group.querySelector('tp-input,tp-text-area');
    const update = () => {
      group.querySelector('[data-character-count]').textContent =
        input.value.length + '/' + group.dataset.count + ' characters';
    };
    listen(input, 'input', update);
    const form = group.closest('tp-form');
    if (form) listen(form, 'tp-reset', () => root.ownerDocument.defaultView.queueMicrotask(update));
    update();
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}
