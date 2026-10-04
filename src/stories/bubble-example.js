import { html } from 'lit';
import { thumbsUpIcon } from '../icons/thumbs-up.js';
import { thumbsDownIcon } from '../icons/thumbs-down.js';
import { chevronDownIcon } from '../icons/chevron-down.js';

export function setupBubbleExample(root) {
  const toast = root.querySelector('tp-toast');
  const cleanup = [];
  const disclosure = root.querySelector('tp-collapsible');
  if (disclosure) {
    const text = disclosure.textContent.trim();
    const preview = `${text.slice(0, 180)}…`;
    disclosure.partContracts = {
      collapsible: {
        renderDelegate: ({ state, bind, content }) =>
          html`<tp-bubble variant="subdued" align="end"
            ><div ${bind}>
              <div ?hidden=${state.open} style="white-space:pre-line">${preview}</div>
              ${content}
            </div></tp-bubble
          >`,
      },
      'collapsible-trigger': {
        renderDelegate: ({ bind, content }) =>
          html`<tp-button variant="link" ${bind}>${content}</tp-button>`,
      },
      'collapsible-label': { content: ({ open }) => (open ? 'Show less' : 'Show more') },
      'collapsible-trailing': {
        content: ({ open }) =>
          html`<tp-icon
            .icon=${chevronDownIcon}
            style=${`rotate:${open ? '180deg' : '0deg'}`}
          ></tp-icon>`,
      },
    };
    disclosure.partPresentation = {
      collapsible: { styleHook: { display: 'flex', 'flex-direction': 'column' } },
      'collapsible-heading': { styleHook: { order: '2', display: 'block' } },
      'collapsible-trigger': {
        styleHook: { padding: '0', width: 'fit-content', display: 'inline-flex' },
      },
      'collapsible-label': { styleHook: { 'font-weight': 'inherit' } },
      'collapsible-trailing': { styleHook: { 'margin-inline-start': 'var(--tp-space-1)' } },
      'collapsible-content': { styleHook: { order: '1', display: 'block' } },
      'collapsible-content-body': { styleHook: { padding: '0', 'white-space': 'pre-line' } },
    };
  }
  for (const icon of root.querySelectorAll('tp-icon[data-reaction]')) {
    icon.icon = icon.dataset.reaction === 'agree' ? thumbsUpIcon : thumbsDownIcon;
  }
  for (const bubble of root.querySelectorAll('[data-body]')) {
    const link = bubble.dataset.body === 'link';
    bubble.partContracts = {
      'bubble-content': {
        renderDelegate: ({ bind, content }) =>
          link
            ? html`<a href="#bubble-details" ${bind}>${content}</a>`
            : html`<button type="button" ${bind}>${content}</button>`,
      },
    };
    if (bubble.hasAttribute('data-reply')) {
      bubble.partPresentation = {
        'bubble-content': {
          styleHook: { 'border-style': 'dashed', 'border-color': 'var(--tp-primary)' },
        },
      };
    }
  }
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
