import { html } from 'lit';
import { checkIcon } from '../icons/check.js';
import { externalLinkIcon } from '../icons/external-link.js';

export function setupBadgeExample(root) {
  for (const icon of root.querySelectorAll('tp-icon[data-icon]'))
    icon.icon = icon.dataset.icon === 'check' ? checkIcon : externalLinkIcon;
  const cleanup = [];
  for (const badge of root.querySelectorAll('tp-badge[data-action]')) {
    const link = badge.dataset.action === 'link';
    badge.partContracts = {
      badge: {
        renderDelegate: ({ state, bind, content }) =>
          link
            ? html`<a href="#badge-destination" ${bind}>${content}</a>`
            : html`<button type="button" ?disabled=${state.disabled} ${bind}>${content}</button>`,
      },
    };
    if (!link) {
      const activate = () => {
        const output = root.querySelector('output');
        output.textContent = `Badge action activated ${Number(output.dataset.count ?? 0) + 1} times.`;
        output.dataset.count = String(Number(output.dataset.count ?? 0) + 1);
      };
      badge.addEventListener('click', activate);
      cleanup.push(() => badge.removeEventListener('click', activate));
    }
  }
  return () => cleanup.forEach((release) => release());
}
