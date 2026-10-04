import { html } from 'lit';
import { navigationIcons } from '../icons/navigation.js';
import { plusIcon } from '../icons/plus.js';
import { checkIcon } from '../icons/check.js';
import { chevronRightIcon } from '../icons/chevron-right.js';
import { chevronDownIcon } from '../icons/chevron-down.js';
import { externalLinkIcon } from '../icons/external-link.js';
import { shieldAlertIcon } from '../icons/shield-alert.js';

const icons = {
  ...navigationIcons,
  plus: plusIcon,
  check: checkIcon,
  chevronRight: chevronRightIcon,
  chevronDown: chevronDownIcon,
  external: externalLinkIcon,
  shield: shieldAlertIcon,
};

export function setupListItemExample(root) {
  for (const icon of root.querySelectorAll('tp-icon[data-icon]'))
    icon.icon = icons[icon.dataset.icon];
  for (const item of root.querySelectorAll('tp-list-item[data-link]')) {
    item.partContracts = {
      'list-item-root': {
        renderDelegate: ({ bind, content }) =>
          html`<a
            href=${item.dataset.link || '#list-item-destination'}
            target=${item.hasAttribute('data-external') ? '_blank' : '_self'}
            rel=${item.hasAttribute('data-external') ? 'noopener noreferrer' : ''}
            ${bind}
            >${content}</a
          >`,
      },
    };
  }
  for (const item of root.querySelectorAll('tp-list-item[data-duration]'))
    item.partContracts = {
      ...item.partContracts,
      'list-item-content': {
        renderDelegate: ({ bind, content }) =>
          html`<span
            ${bind}
            style="display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:var(--tp-space-3);align-items:center"
            ><span style="display:flex;flex-direction:column;gap:inherit;min-inline-size:0"
              >${content}</span
            >
            <span style="color:var(--tp-muted-foreground);font-weight:var(--tp-font-normal)"
              >${item.dataset.duration}</span
            >
          </span>`,
      },
    };
  for (const group of root.querySelectorAll('tp-list-item-group[data-grid]'))
    group.partPresentation = {
      'list-item': {
        styleHook: {
          display: 'grid',
          'grid-template-columns':
            'repeat(auto-fit, minmax(min(100%, calc(var(--tp-spacing) * 40)), 1fr))',
          gap: 'var(--tp-space-4)',
        },
      },
    };
  for (const action of root.querySelectorAll('tp-button[data-round]'))
    action.partPresentation = {
      button: { styleHook: { 'border-radius': 'var(--tp-radius-full)' } },
    };
  const toast = root.querySelector('tp-toast');
  const activate = (event) => {
    const action = event
      .composedPath()
      .find((node) => node?.localName === 'tp-button' && node.hasAttribute('data-feedback'));
    if (action)
      toast?.add({
        title: `${action.getAttribute('aria-label') || action.textContent.trim()} activated.`,
      });
  };
  const selectPerson = (event) => {
    if (!event.defaultPrevented) toast?.add({ title: `Selected ${event.detail.value}.` });
  };
  const menus = [...root.querySelectorAll('tp-menu[data-people]')];
  menus.forEach((menu) => menu.addEventListener('tp-action', selectPerson));
  const secondaryAvatars = [...root.querySelectorAll('tp-avatar[data-secondary-avatar]')];
  const wide = root.ownerDocument.defaultView.matchMedia('(min-width: 40rem)');
  const resize = () =>
    secondaryAvatars.forEach((avatar) => {
      avatar.hidden = !wide.matches;
    });
  if (secondaryAvatars.length) {
    wide.addEventListener('change', resize);
    resize();
  }
  root.addEventListener('click', activate);
  return () => {
    root.removeEventListener('click', activate);
    menus.forEach((menu) => menu.removeEventListener('tp-action', selectPerson));
    wide.removeEventListener('change', resize);
    toast?.close();
  };
}
