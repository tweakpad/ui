import { navigationIcons } from '../icons/navigation.js';
import { plusIcon } from '../icons/plus.js';
import { chevronDownIcon } from '../icons/chevron-down.js';
import { chevronRightIcon } from '../icons/chevron-right.js';

export function setupButtonGroupExample(root) {
  const cleanup = [];
  const listen = (element, name, handler) => {
    element.addEventListener(name, handler);
    cleanup.push(() => element.removeEventListener(name, handler));
  };
  for (const icon of root.querySelectorAll('[data-group-icon]')) {
    icon.icon = {
      ...navigationIcons,
      plus: plusIcon,
      down: chevronDownIcon,
      next: chevronRightIcon,
    }[icon.dataset.groupIcon];
  }
  for (const group of root.querySelectorAll('[data-unjoined]')) group.joined = false;
  const paginations = [...root.querySelectorAll('tp-pagination')];
  for (const pagination of paginations) {
    if (pagination.hasAttribute('data-pages-only')) {
      pagination.showPrevious = false;
      pagination.showNext = false;
    }
    if (pagination.hasAttribute('data-directions-only')) {
      pagination.showPageLinks = false;
      pagination.showLabels = false;
    }
    pagination.hrefForPage = (page) => `?page=${page}`;
    pagination.partContracts = Object.fromEntries(
      ['pagination-page-link', 'pagination-previous', 'pagination-next'].map((part) => [
        part,
        { hostProperties: { '.variant': 'outline' } },
      ]),
    );
    listen(pagination, 'tp-value-change', (event) => {
      if (event.defaultPrevented) return;
      event.detail.sourceEvent.preventDefault();
      for (const sibling of paginations) sibling.page = event.detail.value;
      root.querySelector('output').textContent =
        `Page ${event.detail.value} of ${pagination.pages}`;
    });
  }
  for (const alignment of root.querySelectorAll('tp-toggle-group')) {
    listen(alignment, 'tp-value-change', (event) => {
      if (event.defaultPrevented) return;
      const value = event.detail.value[0] ?? 'start';
      root.querySelector('[data-aligned-text]').style.textAlign = value;
      root.querySelector('output').textContent = `Alignment: ${value}`;
    });
  }
  for (const control of root.querySelectorAll('[data-echo]')) {
    listen(control, 'click', () => {
      root.querySelector('output').textContent =
        control.textContent.trim() || control.getAttribute('aria-label');
    });
  }
  for (const menu of root.querySelectorAll('tp-menu')) {
    listen(menu, 'tp-action', (event) => {
      if (!event.defaultPrevented) root.querySelector('output').textContent = event.detail.value;
    });
  }
  for (const form of root.querySelectorAll('tp-form')) {
    listen(form, 'tp-submit', (event) => {
      event.preventDefault();
      root.querySelector('output').textContent = JSON.stringify(
        Object.fromEntries(event.detail.data),
      );
    });
  }
  for (const button of root.querySelectorAll('[data-like]')) {
    listen(button, 'tp-value-change', (event) => {
      const liked = event.detail.value;
      root.querySelector('[data-like-count]').textContent = liked ? '1,201' : '1,200';
    });
  }
  for (const button of root.querySelectorAll('[data-voice]')) {
    listen(button, 'tp-value-change', (event) => {
      const enabled = event.detail.value;
      const input = button.closest('tp-input-group').querySelector('tp-input');
      input.disabled = enabled;
      input.placeholder = enabled ? 'Voice mode enabled' : 'Send a message…';
      root.querySelector('output').textContent = enabled
        ? 'Voice mode enabled for this example.'
        : 'Text mode enabled.';
    });
  }
  return () => cleanup.forEach((release) => release());
}
