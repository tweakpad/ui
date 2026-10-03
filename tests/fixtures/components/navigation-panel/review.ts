import type { TpNavigationPanel } from '../../../../src/components/navigation-panel/index.js';
import type { TpElement } from '../../../../src/foundation/element.js';
import { plusIcon } from '../../../../src/icons/plus.js';
const api = (
  window as unknown as {
    navigationPanelAPI: {
      panel: TpNavigationPanel;
      settle(target?: TpNavigationPanel): Promise<void>;
      view(target?: TpNavigationPanel): HTMLElement;
    };
  }
).navigationPanelAPI;
const { panel, settle, view } = api;
const records: { name: string; pass: boolean; actual: unknown }[] = [];
function check(name: string, pass: boolean, actual: unknown) {
  records.push({ name, pass, actual });
  if (!pass) throw new Error(`${name}: ${JSON.stringify(actual)}`);
}
const wait = () => new Promise((resolve) => setTimeout(resolve, 250));
async function wide(variant: 'integrated' | 'floating' | 'inset') {
  records.length = 0;
  panel.compact = false;
  panel.variant = variant;
  for (const dir of ['ltr', 'rtl']) {
    panel.dir = dir;
    for (const side of ['inline-start', 'inline-end'] as const) {
      panel.side = side;
      for (const mode of ['off-canvas', 'compact', 'none'] as const) {
        panel.collapseMode = mode;
        // Use controlled publication to inspect the retained wide preference
        // even when collapseMode=none makes toggle proposals inert.
        panel.expanded = undefined;
        panel.collapseMode = 'off-canvas';
        panel.setExpanded(false);
        panel.collapseMode = mode;
        await settle();
        await wait();
        const box = view().getBoundingClientRect();
        const nav = view().shadowRoot!.querySelector<HTMLElement>('nav')!;
        const footer = panel.querySelector('tp-navigation-panel-footer')!.getBoundingClientRect();
        check(
          `${variant} ${dir} ${side} ${mode}`,
          mode === 'off-canvas'
            ? view().inert && nav.hidden
            : !view().inert &&
                box.width >= 36 &&
                (mode !== 'compact' || box.width <= 80) &&
                Math.abs(footer.bottom - box.bottom) <= 2,
          {
            width: box.width,
            inert: view().inert,
            hidden: nav.hidden,
            footerBottom: footer.bottom,
            bottom: box.bottom,
          },
        );
        const link = panel.querySelector('#overview') as TpElement;
        const label = link.shadowRoot!.querySelector<HTMLElement>('[part~="button-label"]')!;
        check(
          'compact rail keeps destination name',
          link.textContent!.trim() === 'Overview' &&
            (mode !== 'compact' || label.classList.contains('visually-hidden')),
          { name: link.textContent, class: label.className },
        );
        panel.collapseMode = 'off-canvas';
        panel.setExpanded(true);
        panel.collapseMode = mode;
        await settle();
        await wait();
        const content = panel.querySelector('tp-navigation-panel-content')!.getBoundingClientRect();
        const row = panel.querySelector('#overview')!.getBoundingClientRect();
        const action = panel.querySelector('#group-action')!.getBoundingClientRect();
        check(
          'expanded rows fill group and content flexes',
          row.width > 150 && content.height > 100 && row.top >= action.bottom - 1,
          {
            width: row.width,
            height: content.height,
            rowTop: row.top,
            actionBottom: action.bottom,
          },
        );
      }
    }
  }
  return [...records];
}
async function compact() {
  records.length = 0;
  const input = panel.querySelector('#filter') as TpElement;
  const original = input.shadowRoot!.querySelector('input');
  for (const variant of ['integrated', 'floating', 'inset'] as const) {
    panel.variant = variant;
    for (const dir of ['ltr', 'rtl']) {
      panel.dir = dir;
      for (const side of ['inline-start', 'inline-end'] as const) {
        panel.side = side;
        panel.compact = true;
        await settle();
        panel.setCompactOpen(true);
        await settle();
        await wait();
        const box = view().getBoundingClientRect();
        const footer = panel.querySelector('tp-navigation-panel-footer')!.getBoundingClientRect();
        const drawer = panel.shadowRoot!.querySelector('tp-navigation-panel-drawer')!;
        const dialog = drawer.shadowRoot!.querySelector('dialog')!;
        check(
          `compact ${variant} ${dir} ${side}`,
          dialog.matches(':modal') &&
            box.height >= innerHeight - 4 &&
            Math.abs(footer.bottom - box.bottom) <= 2 &&
            box.width <= innerWidth &&
            input.shadowRoot!.querySelector('input') === original,
          {
            modal: dialog.matches(':modal'),
            width: box.width,
            height: box.height,
            footer: footer.bottom,
            bottom: box.bottom,
          },
        );
        panel.compact = false;
        await settle();
        await wait();
        check(
          'boundary releases modal and preserves identity',
          !dialog.matches(':modal') &&
            !panel.compactOpen &&
            input.shadowRoot!.querySelector('input') === original,
          panel.provider.state,
        );
      }
    }
  }
  return [...records];
}
async function allParts() {
  records.length = 0;
  panel.compact = false;
  panel.collapseMode = 'compact';
  panel.setExpanded(true);
  const parts = [
    'navigation-panel',
    'trigger',
    'resize-rail',
    'inset',
    'header',
    'content',
    'footer',
    'group',
    'group-label',
    'group-action',
    'group-content',
    'menu',
    'item',
    'link',
    'action',
    'badge',
    'loading-placeholder',
    'submenu',
    'subitem',
    'sublink',
    'input',
    'separator',
  ].map((n) => (n === 'navigation-panel' ? n : `navigation-panel-${n}`));
  const refs = Object.fromEntries(parts.map((n) => [n, { current: null as HTMLElement | null }]));
  panel.partContracts = Object.fromEntries(
    parts.map((n) => [
      n,
      {
        elementReference: refs[n],
        classHook: 'review-hook',
        styleHook: { '--review-marker': 'bound' },
      },
    ]),
  );
  await settle();
  for (const part of parts) {
    const target = refs[part].current;
    check(
      `public ${part} reaches target`,
      !!target?.isConnected &&
        target.classList.contains('review-hook') &&
        target.style.getPropertyValue('--review-marker') === 'bound',
      target?.outerHTML.slice(0, 150),
    );
  }
  panel.partContracts = {};
  await settle();
  for (const part of parts)
    check(
      `public ${part} releases ref`,
      refs[part].current === null,
      refs[part].current?.localName,
    );
  return [...records];
}
async function alignment() {
  records.length = 0;
  const menu = panel.querySelector('tp-navigation-panel-menu')!;
  const probe = document.createElement('tp-navigation-panel-item');
  probe.innerHTML = `<tp-navigation-panel-link href="#alignment">A deliberately long destination that must truncate</tp-navigation-panel-link><tp-navigation-panel-badge>12</tp-navigation-panel-badge><tp-navigation-panel-action size="icon-sm" show-on-hover aria-label="More project actions"></tp-navigation-panel-action><tp-navigation-panel-submenu><tp-navigation-panel-subitem><tp-navigation-panel-sublink href="#nested-alignment">Nested destination</tp-navigation-panel-sublink></tp-navigation-panel-subitem></tp-navigation-panel-submenu>`;
  (probe.querySelector('tp-navigation-panel-action') as TpElement & { icon: unknown }).icon =
    plusIcon;
  menu.append(probe);
  const primary = probe.querySelector('tp-navigation-panel-link') as TpElement;
  const badge = probe.querySelector('tp-navigation-panel-badge')!;
  const action = probe.querySelector('tp-navigation-panel-action') as TpElement;
  const center = (box: DOMRect) => box.top + box.height / 2;
  const hit = (x: number, y: number): Element | null => {
    let target = document.elementFromPoint(x, y);
    while (target?.shadowRoot) {
      const next = target.shadowRoot.elementFromPoint(x, y);
      if (!next || next === target) break;
      target = next;
    }
    return target;
  };
  try {
    panel.compact = false;
    panel.collapseMode = 'compact';
    for (const variant of ['integrated', 'floating', 'inset'] as const) {
      panel.variant = variant;
      for (const dir of ['ltr', 'rtl']) {
        panel.dir = dir;
        for (const side of ['inline-start', 'inline-end'] as const) {
          panel.side = side;
          panel.setExpanded(true);
          await settle();
          await wait();
          const row = primary.getBoundingClientRect();
          const badgeBox = badge.getBoundingClientRect();
          const actionBox = action.getBoundingClientRect();
          const label = primary.shadowRoot!.querySelector<HTMLElement>('[part~="button-label"]')!;
          const labelBox = label.getBoundingClientRect();
          check(
            'badge stays at primary row centre above submenu',
            Math.abs(center(row) - center(badgeBox)) <= 1,
            { variant, dir, side, row: row.toJSON(), badge: badgeBox.toJSON() },
          );
          check(
            'trailing action stays at primary row centre',
            Math.abs(center(row) - center(actionBox)) <= 1 &&
              actionBox.width >= 44 &&
              actionBox.width < row.width / 2,
            actionBox.toJSON(),
          );
          check(
            'long label reserves accessories and truncates',
            label.scrollWidth > label.clientWidth &&
              (dir === 'rtl'
                ? labelBox.left >= Math.max(badgeBox.right, actionBox.right)
                : labelBox.right <= Math.min(badgeBox.left, actionBox.left)),
            {
              label: labelBox.toJSON(),
              scrollWidth: label.scrollWidth,
              clientWidth: label.clientWidth,
            },
          );
          const command = panel.querySelector('#command') as TpElement;
          check(
            'command and destination typography match',
            getComputedStyle(command.shadowRoot!.querySelector('button')!).fontSize ===
              getComputedStyle(primary.shadowRoot!.querySelector('a')!).fontSize,
            getComputedStyle(primary.shadowRoot!.querySelector('a')!).fontSize,
          );
          const native = primary.shadowRoot!.querySelector('a')!;
          const labelHit = hit(labelBox.left + labelBox.width / 2, center(row));
          check(
            'destination text is a destination hit',
            !!labelHit && (labelHit === primary || native.contains(labelHit)),
            labelHit?.localName,
          );
          const rail = panel.querySelector('#rail')!.getBoundingClientRect();
          const navigation = view().getBoundingClientRect();
          const inset = panel.querySelector('tp-navigation-panel-inset')!.getBoundingClientRect();
          check(
            'minimum-size rail does not cover navigation or primary',
            rail.width >= 44 &&
              (rail.left >= navigation.right - 1 || rail.right <= navigation.left + 1) &&
              (rail.left >= inset.right - 1 || rail.right <= inset.left + 1),
            { rail: rail.toJSON(), navigation: navigation.toJSON(), inset: inset.toJSON() },
          );
          panel.setExpanded(false);
          await settle();
          await wait();
          check(
            'collapsed rail suppresses accessories without changing row target',
            badge.getBoundingClientRect().width === 0 &&
              action.getBoundingClientRect().width === 0 &&
              primary.getBoundingClientRect().width >= 44,
            {
              badge: badge.getBoundingClientRect().width,
              action: action.getBoundingClientRect().width,
              primary: primary.getBoundingClientRect().width,
            },
          );
        }
      }
    }
  } finally {
    probe.remove();
    panel.compact = false;
    panel.variant = 'integrated';
    panel.dir = 'ltr';
    panel.side = 'inline-start';
    panel.setExpanded(true);
    await settle();
  }
  return [...records];
}
Object.assign(window, { navigationPanelReview: { wide, compact, allParts, alignment, records } });
