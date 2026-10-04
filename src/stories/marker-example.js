import { html } from 'lit';
import { checkIcon } from '../icons/check.js';
import { clockIcon } from '../icons/clock.js';
import { fileTextIcon } from '../icons/file-text.js';
import { gitBranchIcon } from '../icons/git-branch.js';
import { chevronRightIcon } from '../icons/chevron-right.js';
import { navigationIcons } from '../icons/navigation.js';

export function setupMarkerExample(root) {
  const icons = {
    ...navigationIcons,
    check: checkIcon,
    clock: clockIcon,
    file: fileTextIcon,
    branch: gitBranchIcon,
    chevron: chevronRightIcon,
  };
  for (const icon of root.querySelectorAll('tp-icon[data-icon]')) {
    icon.icon = icons[icon.dataset.icon];
  }
  for (const marker of root.querySelectorAll('[data-body]')) {
    marker.partContracts = {
      marker: {
        renderDelegate: ({ bind, content }) =>
          marker.dataset.body === 'link'
            ? html`<a href="#marker-details" ${bind}>${content}</a>`
            : html`<button type="button" ${bind}>${content}</button>`,
      },
    };
    if (marker.dataset.body === 'button') {
      marker.partPresentation = {
        'marker-content': {
          styleHook: {
            display: 'flex',
            flex: '1',
            'align-items': 'center',
            'justify-content': 'space-between',
            gap: 'var(--tp-space-2)',
          },
        },
      };
    }
  }
  for (const marker of root.querySelectorAll('[data-layout]')) {
    marker.partPresentation = {
      marker: {
        styleHook:
          marker.dataset.layout === 'vertical'
            ? { 'flex-direction': 'column' }
            : { 'justify-content': 'center' },
      },
    };
  }
  const action = root.querySelector('[data-feedback]');
  const toast = root.querySelector('tp-toast');
  const activate = () => toast.add({ title: 'Marker action activated.' });
  action?.addEventListener('click', activate);
  return () => {
    action?.removeEventListener('click', activate);
    toast?.close();
  };
}
