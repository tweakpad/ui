import { copyIcon } from '../icons/copy.js';
import { refreshIcon } from '../icons/refresh.js';
import { thumbsUpIcon } from '../icons/thumbs-up.js';
import { thumbsDownIcon } from '../icons/thumbs-down.js';
import { downloadIcon } from '../icons/download.js';
import { fileTextIcon } from '../icons/file-text.js';

/** Message remains presentational; these callbacks belong to the example application. */
export function setupMessageExample(root) {
  const view = root.ownerDocument.defaultView;
  const controller = new view.AbortController();
  const icons = {
    copy: copyIcon,
    retry: refreshIcon,
    like: thumbsUpIcon,
    dislike: thumbsDownIcon,
    download: downloadIcon,
    file: fileTextIcon,
  };
  for (const icon of root.querySelectorAll('tp-icon[data-icon]')) {
    icon.icon = icons[icon.dataset.icon];
    if (icon.parentElement.localName === 'tp-button') icon.slot = 'icon-start';
  }
  const status = root.querySelector('[data-action-status]');
  const announce = (text) => {
    if (status && !controller.signal.aborted) {
      status.hidden = false;
      status.textContent = text;
    }
  };
  root.addEventListener(
    'click',
    async (event) => {
      if (event.defaultPrevented) return;
      const action = event
        .composedPath()
        .find((node) => node instanceof view.HTMLElement && node.hasAttribute('data-action'));
      if (!action) return;
      if (action.dataset.action === 'copy') {
        const text = action.closest('tp-message').querySelector('tp-bubble').textContent.trim();
        try {
          await view.navigator.clipboard.writeText(text);
          announce('Message copied.');
        } catch {
          announce('Copy was unavailable. Select the message text to copy it.');
        }
      }
      if (action.dataset.action === 'retry') {
        const message = action.closest('tp-message');
        message.querySelector('[data-delivery]').textContent = 'Delivered';
        message.querySelector('[data-delivery]').style.removeProperty('color');
        action.hidden = true;
        message.querySelector('[data-delivery]').focus();
        announce('Retry completed in this local example.');
      }
    },
    { signal: controller.signal },
  );
  root.addEventListener(
    'tp-value-change',
    (event) => {
      const toggle = event.target.closest('tp-toggle[data-feedback]');
      if (!toggle) return;
      view.queueMicrotask(() => {
        if (!controller.signal.aborted && !event.defaultPrevented)
          announce(
            toggle.pressed ? `${toggle.dataset.feedback} feedback selected.` : 'Feedback cleared.',
          );
      });
    },
    { signal: controller.signal },
  );
  const links = root.querySelectorAll('[data-download]');
  const url = links.length
    ? view.URL.createObjectURL(
        new view.Blob(
          [
            '# Pilot launch notes\n\n- Review the first-run experience.\n- Verify keyboard navigation.\n- Confirm an owner for every release criterion.\n',
          ],
          { type: 'text/markdown' },
        ),
      )
    : undefined;
  for (const link of links) link.href = url;
  return () => {
    controller.abort();
    if (url) view.URL.revokeObjectURL(url);
  };
}
