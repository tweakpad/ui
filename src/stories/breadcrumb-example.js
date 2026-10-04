import { navigationIcons } from '../icons/navigation.js';
import { chevronDownIcon } from '../icons/chevron-down.js';

export function setupBreadcrumbExample(root) {
  const cleanup = [];
  for (const icon of root.querySelectorAll('[data-ellipsis]')) icon.icon = navigationIcons.more;
  for (const icon of root.querySelectorAll('[data-ancestor-chevron]')) icon.icon = chevronDownIcon;
  for (const trigger of root.querySelectorAll('[data-ancestor-trigger]'))
    trigger.icon = navigationIcons.more;
  for (const link of root.querySelectorAll('[data-route]')) {
    const report = () => {
      root.querySelector('output').textContent = `Destination: ${link.hash}`;
    };
    link.addEventListener('click', report);
    cleanup.push(() => link.removeEventListener('click', report));
  }
  const host = root.querySelector('[data-responsive-ancestors]');
  if (host) {
    const menu = host.querySelector('tp-menu');
    const drawer = host.querySelector('tp-drawer');
    const media = root.ownerDocument.defaultView.matchMedia('(min-width: 48rem)');
    const update = async () => {
      const active = media.matches ? menu : drawer;
      const inactive = media.matches ? drawer : menu;
      const restoreFocus = inactive.open;
      inactive.setOpen(false);
      active.hidden = false;
      host.replaceChildren(active);
      await active.updateComplete;
      if (restoreFocus && active.isConnected) active.querySelector('[slot="trigger"]').focus();
    };
    media.addEventListener('change', update);
    void update();
    cleanup.push(() => media.removeEventListener('change', update));
    for (const link of drawer.querySelectorAll('a[href]')) {
      const close = (event) => {
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        )
          drawer.setOpen(false);
      };
      link.addEventListener('click', close);
      cleanup.push(() => link.removeEventListener('click', close));
    }
  }
  return () => cleanup.forEach((release) => release());
}
