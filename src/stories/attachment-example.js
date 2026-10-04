import { fileTextIcon } from '../icons/file-text.js';
import { refreshIcon } from '../icons/refresh.js';
import { navigationIcons } from '../icons/navigation.js';

/** Application-owned actions; Attachment itself never uploads or removes a file. */
export function setupAttachmentExample(root) {
  const view = root.ownerDocument.defaultView;
  const controller = new view.AbortController();
  const releases = [];
  const icons = { file: fileTextIcon, retry: refreshIcon, ...navigationIcons };
  for (const icon of root.querySelectorAll('tp-icon[data-icon]'))
    icon.icon = icons[icon.dataset.icon];
  for (const button of root.querySelectorAll('tp-button[data-icon]'))
    button.icon = icons[button.dataset.icon];
  if (root.querySelector('[data-file-link]')) {
    const url = view.URL.createObjectURL(
      new view.Blob(['Contract review\n\nReview the terms before signing.'], {
        type: 'text/plain',
      }),
    );
    for (const link of root.querySelectorAll('[data-file-link]')) link.href = url;
    releases.push(() => view.URL.revokeObjectURL(url));
  }

  root.addEventListener(
    'click',
    async (event) => {
      if (event.defaultPrevented) return;
      const path = event.composedPath();
      const retry = path.find(
        (node) => node instanceof view.HTMLElement && node.hasAttribute('data-retry'),
      );
      if (retry) {
        const attachment = retry.closest('tp-attachment');
        attachment.status = 'idle';
        attachment.description = 'Ready to retry';
      }
      const restore = path.find(
        (node) => node instanceof view.HTMLElement && node.hasAttribute('data-restore'),
      );
      if (restore) {
        const attachment = root.querySelector(
          `[data-removable-example="${restore.dataset.restore}"]`,
        );
        attachment.hidden = false;
        restore.hidden = true;
        attachment.querySelector('[slot="trigger"]')?.focus();
      }
      const copy = path.find(
        (node) => node instanceof view.HTMLElement && node.hasAttribute('data-copy-link'),
      );
      if (copy) {
        const status = root.querySelector('[data-copy-status]');
        const url = new view.URL(view.location.href);
        url.hash = 'attachment-triggers';
        try {
          await view.navigator.clipboard.writeText(url.href);
          status.textContent = 'Link copied';
        } catch {
          status.textContent = 'Could not copy the link';
        }
        if (!controller.signal.aborted) status.hidden = false;
      }
    },
    { signal: controller.signal },
  );
  root.addEventListener(
    'tp-remove',
    (event) => {
      view.queueMicrotask(() => {
        if (controller.signal.aborted || event.defaultPrevented) return;
        const attachment = event.target;
        if (!attachment.hasAttribute('data-removable-example')) return;
        const restore = root.querySelector(
          `[data-restore="${attachment.dataset.removableExample}"]`,
        );
        attachment.hidden = true;
        restore.hidden = false;
        restore.focus();
      });
    },
    { signal: controller.signal },
  );

  for (const dialog of root.querySelectorAll('tp-dialog[data-preview]')) {
    const trigger = root.querySelector(`[data-open-preview="${dialog.dataset.preview}"]`);
    releases.push(dialog.registerTrigger(trigger));
  }
  return () => {
    controller.abort();
    for (const release of releases) release();
  };
}
