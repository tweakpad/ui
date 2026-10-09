import type { TpNavigationPanel } from '../../../../src/components/navigation-panel/index.js';
import type { TpCollapsible } from '../../../../src/components/collapsible/collapsible.js';
import type { TpNavigationPanelHeader } from '../../../../src/components/navigation-panel/parts.js';

/** Actual composed geometry; run through Chrome DevTools MCP. */
export async function alignmentGeometry(panel: TpNavigationPanel, settle: () => Promise<void>) {
  const checks: { name: string; actual: unknown }[] = [];
  const check = (name: string, pass: boolean, actual: unknown) => {
    if (!pass) throw new Error(name + ': ' + JSON.stringify(actual));
    checks.push({ name, actual });
  };
  const center = (box: DOMRect) => box.x + box.width / 2;
  const disclosures = [...panel.querySelectorAll<TpCollapsible>('tp-collapsible')];
  const header = panel.querySelector<TpNavigationPanelHeader>('tp-navigation-panel-header')!;
  const toggle = panel.querySelector('tp-navigation-panel-trigger')!;
  const alignedToggle = (name: string) => {
    const h = header.getBoundingClientRect(),
      t = toggle.getBoundingClientRect();
    check(name, Math.abs(h.y + h.height / 2 - t.y - t.height / 2) < 1, {
      header: h.toJSON(),
      toggle: t.toJSON(),
    });
  };
  panel.compact = false;
  for (const variant of ['integrated', 'floating', 'inset'] as const) {
    panel.variant = variant;
    for (const dir of ['ltr', 'rtl']) {
      panel.dir = dir;
      panel.expanded = true;
      disclosures.forEach((d) => (d.open = true));
      await settle();
      for (const row of panel.querySelectorAll(
        'tp-navigation-panel-header tp-navigation-panel-action,tp-navigation-panel-footer tp-navigation-panel-action',
      )) {
        const target = row.shadowRoot!.querySelector('button')!.getBoundingClientRect();
        const label = row
          .shadowRoot!.querySelector('[part~=button-label]')!
          .getBoundingClientRect();
        const avatar = row.querySelector('tp-avatar')!.getBoundingClientRect();
        check(
          'Two-line row has balanced internal padding ' + variant + dir,
          label.top - target.top >= 9 &&
            Math.abs(label.top - target.top - (target.bottom - label.bottom)) < 1 &&
            Math.abs(avatar.y + avatar.height / 2 - target.y - target.height / 2) < 1,
          { target: target.toJSON(), label: label.toJSON(), avatar: avatar.toJSON() },
        );
      }
      alignedToggle('Toggle follows Header center ' + variant + dir);
      for (const disclosure of disclosures) {
        const icon = disclosure.leadingElement!.getBoundingClientRect();
        const submenu = disclosure.querySelector('tp-navigation-panel-submenu')!;
        const target = submenu.shadowRoot!.querySelector<HTMLElement>('[part]')!;
        const box = target.getBoundingClientRect();
        const width = parseFloat(getComputedStyle(target).borderInlineStartWidth);
        const axis = dir === 'rtl' ? box.right - width / 2 : box.left + width / 2;
        check(
          'Disclosure border follows parent Icon ' + variant + dir,
          Math.abs(axis - center(icon)) < 1,
          { axis, icon: icon.toJSON() },
        );
      }
      panel.expanded = false;
      await settle();
      const axis = center(panel.querySelector('tp-avatar')!.getBoundingClientRect());
      for (const disclosure of disclosures) {
        const icon = disclosure.leadingElement!.getBoundingClientRect();
        check(
          'Collapsed disclosure shares Avatar axis ' + variant + dir,
          Math.abs(center(icon) - axis) < 1 &&
            disclosure.triggerElement!.getBoundingClientRect().height >= 44,
          { axis, icon: icon.toJSON() },
        );
      }
      for (const row of panel.querySelectorAll(
        'tp-navigation-panel-action,tp-navigation-panel-link',
      )) {
        const target = row.shadowRoot!.querySelector('button,a')!;
        const box = target.getBoundingClientRect();
        if (!box.width) continue;
        const mark = row
          .shadowRoot!.querySelector('[part~=button-leading-mark]')!
          .getBoundingClientRect();
        check(
          'Collapsed Button mark shares Avatar axis ' + variant + dir,
          Math.abs(center(mark) - axis) < 1 && box.height >= 44 && box.width >= 44,
          { axis, box: box.toJSON(), mark: mark.toJSON() },
        );
      }
      alignedToggle('Collapsed Toggle follows Header center ' + variant + dir);
    }
  }
  panel.variant = 'integrated';
  panel.dir = 'ltr';
  panel.expanded = true;
  panel.style.setProperty('--tp-icon-size-md', '24px');
  await settle();
  const icon = disclosures[0]!.leadingElement!.getBoundingClientRect();
  const line = disclosures[0]!
    .querySelector('tp-navigation-panel-submenu')!
    .shadowRoot!.querySelector<HTMLElement>('[part]')!;
  const border = line.getBoundingClientRect();
  check(
    'Disclosure border follows Icon token override',
    Math.abs(
      border.left + parseFloat(getComputedStyle(line).borderInlineStartWidth) / 2 - center(icon),
    ) < 1,
    { icon: icon.toJSON(), border: border.toJSON() },
  );
  panel.style.removeProperty('--tp-icon-size-md');
  header.partPresentation = {
    'navigation-panel-header': { styleHook: { 'padding-block': '24px' } },
  };
  await settle();
  alignedToggle('ResizeObserver follows Header styling hook');
  header.partPresentation = {};
  await settle();
  const parent = header.parentNode!;
  const replacement = document.createElement(
    'tp-navigation-panel-header',
  ) as TpNavigationPanelHeader;
  replacement.innerHTML = '<tp-button>Replacement workspace</tp-button>';
  header.replaceWith(replacement);
  await settle();
  const r = replacement.getBoundingClientRect(),
    t = toggle.getBoundingClientRect();
  check(
    'Toolbar follows replacement Header',
    Math.abs(r.y + r.height / 2 - t.y - t.height / 2) < 1,
    { header: r.toJSON(), toggle: t.toJSON() },
  );
  replacement.remove();
  await settle();
  check(
    'Absent Header releases toolbar sizing',
    panel.shadowRoot!.querySelector<HTMLElement>('.toolbar')!.style.minBlockSize === '',
    panel.shadowRoot!.querySelector<HTMLElement>('.toolbar')!.style.minBlockSize,
  );
  parent.appendChild(header);
  await settle();
  alignedToggle('Reconnected Header restores alignment');
  const owner = panel.parentNode!;
  panel.remove();
  owner.appendChild(panel);
  await settle();
  alignedToggle('Reconnected Panel restores resize observation');
  panel.compact = true;
  await settle();
  panel.setCompactOpen(true);
  await settle();
  for (const row of panel.querySelectorAll(
    'tp-navigation-panel-header tp-navigation-panel-action,tp-navigation-panel-footer tp-navigation-panel-action',
  )) {
    const target = row.shadowRoot!.querySelector('button')!.getBoundingClientRect();
    const label = row.shadowRoot!.querySelector('[part~=button-label]')!.getBoundingClientRect();
    check(
      'Compact identity row retains balanced padding',
      label.top - target.top >= 9 &&
        Math.abs(label.top - target.top - (target.bottom - label.bottom)) < 1,
      { target: target.toJSON(), label: label.toJSON() },
    );
  }
  check(
    'Compact toolbar independent of Drawer Header',
    panel.shadowRoot!.querySelector<HTMLElement>('.toolbar')!.style.minBlockSize === '',
    panel.shadowRoot!.querySelector<HTMLElement>('.toolbar')!.style.minBlockSize,
  );
  panel.setCompactOpen(false);
  panel.compact = false;
  await settle();
  disclosures.forEach((d, i) => (d.open = i === 0));
  return { passed: checks.length, checks };
}
