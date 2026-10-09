import type { TpAvatar } from '../../../../src/components/avatar/avatar.js';
import type { TpNavigationPanel } from '../../../../src/components/navigation-panel/index.js';
import type { TpMenu } from '../../../../src/components/menu/menu.js';

/** Observable geometry assertions; driven through Chrome DevTools MCP only. */
export async function visualGeometry(panel: TpNavigationPanel, settle: () => Promise<void>) {
  const checks: { name: string; actual: unknown }[] = [];
  const check = (name: string, pass: boolean, actual: unknown) => {
    if (!pass) throw new Error(name + ': ' + JSON.stringify(actual));
    checks.push({ name, actual });
  };
  const centered = (outer: DOMRect, inner: DOMRect) =>
    Math.abs(outer.x + outer.width / 2 - inner.x - inner.width / 2) < 1 &&
    Math.abs(outer.y + outer.height / 2 - inner.y - inner.height / 2) < 1;
  const avatar = document.createElement('tp-avatar') as TpAvatar;
  avatar.alt = 'Geometry test';
  avatar.fallback = 'AC';
  document.querySelector('#example')!.append(avatar);
  try {
    for (const size of ['sm', 'default', 'lg'] as const) {
      avatar.size = size;
      for (const slotted of [false, true]) {
        avatar.innerHTML = slotted ? '<span>AM</span>' : '';
        avatar.requestUpdate();
        await avatar.updateComplete;
        await settle();
        const fallback = avatar.shadowRoot!.querySelector<HTMLElement>('[part~=fallback]')!;
        const content = slotted ? avatar.querySelector('span')! : fallback.querySelector('slot')!;
        const range = document.createRange();
        range.selectNodeContents(content);
        const outer = avatar.getBoundingClientRect(),
          inner = slotted ? content.getBoundingClientRect() : range.getBoundingClientRect();
        check('Avatar content centered ' + size + slotted, centered(outer, inner), {
          outer: outer.toJSON(),
          inner: inner.toJSON(),
        });
        check(
          'Fallback fills viewport ' + size + slotted,
          Math.abs(outer.width - fallback.getBoundingClientRect().width) < 1 &&
            Math.abs(outer.height - fallback.getBoundingClientRect().height) < 1,
          fallback.getBoundingClientRect().toJSON(),
        );
        avatar.remove();
        document.querySelector('#example')!.append(avatar);
        await settle();
        check(
          'Avatar reconnect restores host viewport ' + size + slotted,
          Math.abs(avatar.getBoundingClientRect().width - outer.width) < 1 &&
            getComputedStyle(avatar).backgroundColor !== 'rgba(0, 0, 0, 0)',
          avatar.getBoundingClientRect().toJSON(),
        );
        avatar.partPresentation = {
          'avatar-fallback': { styleHook: { color: 'rgb(12, 34, 56)' } },
        };
        await avatar.updateComplete;
        check(
          'Fallback public hook survives binding ' + size + slotted,
          getComputedStyle(fallback).color === 'rgb(12, 34, 56)' &&
            fallback.part.contains('avatar-fallback'),
          getComputedStyle(fallback).color,
        );
        avatar.partPresentation = {};
      }
      avatar.src =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="blue"/></svg>',
        );
      await avatar.updateComplete;
      await settle();
      const image = avatar.shadowRoot!.querySelector('img')!;
      const outer = avatar.getBoundingClientRect(),
        inner = image.getBoundingClientRect();
      check(
        'Image fills viewport ' + size,
        image.complete &&
          image.naturalWidth === 20 &&
          centered(outer, inner) &&
          Math.abs(outer.width - inner.width) < 1 &&
          Math.abs(outer.height - inner.height) < 1,
        { outer: outer.toJSON(), inner: inner.toJSON() },
      );
      avatar.src = '';
      await avatar.updateComplete;
    }
  } finally {
    avatar.remove();
  }

  panel.compact = false;
  panel.expanded = true;
  const teams = panel.querySelector<TpMenu>('[data-example-menu=teams]')!;
  const project = panel.querySelector<TpMenu>('[data-example-menu=design]')!;
  for (const dir of ['ltr', 'rtl']) {
    panel.dir = dir;
    for (const variant of ['integrated', 'floating', 'inset'] as const) {
      panel.variant = variant;
      await settle();
      const action = project.querySelector('tp-navigation-panel-action')!;
      const button = action.shadowRoot!.querySelector<HTMLElement>('button')!;
      const icon = button.querySelector('tp-icon')!;
      const outer = action.getBoundingClientRect(),
        inner = button.getBoundingClientRect();
      check(
        'Square native action inside host ' + dir + variant,
        Math.abs(inner.width - inner.height) < 1 &&
          inner.width >= 43.9 &&
          Math.abs(outer.width - inner.width) < 1 &&
          centered(inner, icon.getBoundingClientRect()),
        {
          host: outer.toJSON(),
          button: inner.toJSON(),
          icon: icon.getBoundingClientRect().toJSON(),
        },
      );
      const link = panel.querySelector('tp-navigation-panel-link')!;
      const nativeLink = link.shadowRoot!.querySelector('a')!;
      const label = nativeLink.querySelector('[part~=button-label]')!.getBoundingClientRect();
      check(
        'Primary label reserves accessory ' + dir + variant,
        dir === 'ltr' ? label.right <= inner.left + 1 : label.left >= inner.right - 1,
        { label: label.toJSON(), action: inner.toJSON() },
      );
      teams.setOpen(true);
      await settle();
      const hints = [...teams.portalElement!.querySelectorAll('[data-menu-shortcut]')];
      const edges = hints.map((e) =>
        dir === 'ltr' ? e.getBoundingClientRect().right : e.getBoundingClientRect().left,
      );
      check(
        'Shortcut common logical end ' + dir + variant,
        edges.length === 3 && Math.max(...edges) - Math.min(...edges) < 1,
        edges,
      );
      check(
        'Menu label block ' + dir + variant,
        getComputedStyle(teams.portalElement!.querySelector('[data-menu-label]')!).display ===
          'block',
        dir,
      );
      teams.close();
      await settle();
    }
  }
  panel.dir = 'ltr';
  panel.variant = 'integrated';
  panel.compact = true;
  panel.provider.toggle('programmatic');
  await settle();
  for (const dir of ['ltr', 'rtl']) {
    panel.dir = dir;
    await settle();
    const drawer = panel.shadowRoot!.querySelector('tp-navigation-panel-drawer')!;
    const close = drawer.shadowRoot!.querySelector('.corner-close')!;
    const closeTarget = close.shadowRoot!.querySelector('button')!;
    const cr = closeTarget.getBoundingClientRect();
    const teamTarget = teams
      .querySelector('tp-navigation-panel-action')!
      .shadowRoot!.querySelector('button')!;
    check(
      'Compact close has separate minimum target ' + dir,
      cr.width >= 43.9 && cr.height >= 43.9 && cr.bottom < teamTarget.getBoundingClientRect().top,
      { close: cr.toJSON(), team: teamTarget.getBoundingClientRect().toJSON() },
    );
  }
  panel.provider.toggle('programmatic');
  panel.compact = false;
  panel.dir = 'ltr';
  await settle();
  for (const avatar of panel.querySelectorAll<TpAvatar>('tp-avatar')) {
    const fallback = avatar.shadowRoot!.querySelector('[part~=fallback]')!;
    check(
      'Composed Avatar keeps viewport after responsive projection ' + avatar.alt,
      avatar.getBoundingClientRect().width >= 35.9 &&
        getComputedStyle(avatar).backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        getComputedStyle(fallback).display === 'grid',
      avatar.getBoundingClientRect().toJSON(),
    );
  }
  return { passed: checks.length, checks };
}
