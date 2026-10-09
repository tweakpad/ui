import {
  navigationPanelExampleMarkup,
  setupNavigationPanelExample,
} from '../../../../src/stories/navigation-panel-example.js';
import type { TpNavigationPanel } from '../../../../src/components/navigation-panel/index.js';
import type { TpCollapsible } from '../../../../src/components/collapsible/collapsible.js';
import type { TpMenu } from '../../../../src/components/menu/menu.js';
import { visualGeometry } from './visual.js';
import { alignmentGeometry } from './alignment.js';
const built = new URLSearchParams(location.search).has('built');
if (built) document.querySelector<HTMLLinkElement>('link')!.href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
document.querySelector('#example')!.innerHTML = navigationPanelExampleMarkup;
const panel = document.querySelector<TpNavigationPanel>('tp-navigation-panel')!;
panel.compact = false;
await panel.updateComplete;
const cleanup = setupNavigationPanelExample(panel);
panel.addEventListener('tp-value-change', (event) => {
  if (event.target === panel && !event.defaultPrevented)
    panel.expanded = (event as CustomEvent).detail.value;
});
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const checks: { name: string; pass: boolean; actual: unknown }[] = [];
function check(name: string, pass: boolean, actual: unknown) {
  checks.push({ name, pass, actual });
  if (!pass) throw new Error(name + ': ' + JSON.stringify(actual));
}
const disclosures = [...panel.querySelectorAll<TpCollapsible>('tp-collapsible')];
const menus = [...panel.querySelectorAll<TpMenu>('tp-menu')];
async function settle() {
  await panel.updateComplete;
  await Promise.all(
    [...panel.querySelectorAll('*')].map(
      (e) => (e as unknown as { updateComplete?: Promise<unknown> }).updateComplete,
    ),
  );
  await wait();
}
async function organization() {
  checks.length = 0;
  await settle();
  check(
    'Four actual independent Collapsible owners',
    disclosures.length === 4 && disclosures[0]!.open,
    disclosures.map((d) => ({ open: d.open, label: d.triggerElement?.textContent })),
  );
  for (const disclosure of disclosures) {
    disclosure.open = true;
    await settle();
    check(
      'Native trigger controls labelled disclosure',
      disclosure.triggerElement?.getAttribute('aria-expanded') === 'true' &&
        !!disclosure.triggerElement.ariaControlsElements?.includes(disclosure.panelElement!),
      disclosure.triggerElement?.outerHTML,
    );
    check(
      'Open submenu keeps actual native links',
      !!disclosure
        .querySelector('tp-navigation-panel-sublink')
        ?.shadowRoot?.querySelector('a[href]'),
      disclosure.panelElement?.getBoundingClientRect().toJSON(),
    );
  }
  disclosures[1]!.open = false;
  await settle();
  check(
    'Closing Models does not close Playground',
    disclosures[0]!.open && !disclosures[1]!.open,
    disclosures.map((d) => d.open),
  );
  for (const variant of ['integrated', 'floating', 'inset'] as const) {
    for (const dir of ['ltr', 'rtl']) {
      panel.variant = variant;
      panel.dir = dir;
      panel.expanded = true;
      await settle();
      const primary = panel.querySelector('tp-navigation-panel-link')!;
      const item = primary.closest('tp-navigation-panel-item')!;
      const menu = item.querySelector<TpMenu>('tp-menu')!;
      const trigger = menu
        .querySelector('tp-navigation-panel-action')!
        .shadowRoot!.querySelector<HTMLElement>('button')!;
      const link = primary.shadowRoot!.querySelector('a')!;
      const lr = link.getBoundingClientRect(),
        tr = trigger.getBoundingClientRect();
      check(
        'Project menu action centred without blocking text ' + variant + dir,
        Math.abs(tr.top + tr.height / 2 - (lr.top + lr.height / 2)) < 1 && tr.width >= 43.9,
        { link: lr.toJSON(), action: tr.toJSON() },
      );
      const header = panel.querySelector('tp-navigation-panel-header')!,
        footer = panel.querySelector('tp-navigation-panel-footer')!;
      check(
        'Header/Footer real Menu fill their rows ' + variant + dir,
        menus[0]!.getBoundingClientRect().width > header.getBoundingClientRect().width - 20 &&
          menus.at(-1)!.getBoundingClientRect().width > footer.getBoundingClientRect().width - 20,
        {
          header: header.getBoundingClientRect().toJSON(),
          footer: footer.getBoundingClientRect().toJSON(),
        },
      );
      panel.expanded = false;
      await settle();
      const d = disclosures[0]!,
        r = d.triggerElement!.getBoundingClientRect();
      check(
        'Collapsed disclosure keeps name and target ' + variant + dir,
        r.width >= 43.9 &&
          r.height >= 43.9 &&
          d.querySelector('[slot=label]')!.textContent!.includes('Playground'),
        r.toJSON(),
      );
      check(
        'Collapsed nested content inaccessible while state retained ' + variant + dir,
        d.open && getComputedStyle(d.panelElement!).display === 'none',
        getComputedStyle(d.panelElement!).display,
      );
      check(
        'Collapsed accessories removed and team trigger remains ' + variant + dir,
        getComputedStyle(menu).display === 'none' &&
          menus[0]!
            .querySelector('tp-navigation-panel-action')!
            .shadowRoot!.querySelector('button')!
            .getBoundingClientRect().width >= 43.9,
        menus[0]!
          .querySelector('tp-navigation-panel-action')!
          .shadowRoot!.querySelector('button')!
          .getBoundingClientRect()
          .toJSON(),
      );
    }
  }
  panel.dir = 'ltr';
  panel.variant = 'integrated';
  panel.expanded = true;
  await settle();
  const identity = disclosures[0]!,
    button = identity.triggerElement;
  panel.compact = true;
  await settle();
  panel.provider.toggle('programmatic');
  await settle();
  check(
    'Compact uses actual modal and preserves disclosure identity',
    !!panel
      .shadowRoot!.querySelector('tp-navigation-panel-drawer')
      ?.shadowRoot?.querySelector('dialog:modal') &&
      disclosures[0] === identity &&
      identity.triggerElement === button,
    { compact: panel.provider.compact, open: panel.provider.compactOpen },
  );
  for (const menu of menus)
    check(
      'Compact dropdown explicitly adapts logical placement',
      menu.placement === 'bottom-end',
      menu.placement,
    );
  const modal = panel
    .shadowRoot!.querySelector('tp-navigation-panel-drawer')!
    .shadowRoot!.querySelector('dialog:modal')!;
  for (const menu of menus) {
    menu.menuTrigger!.focus();
    menu.setOpen(true);
    await settle();
    check(
      'Nested menu portal remains inside native modal ' + menu.dataset.exampleMenu,
      modal.contains(menu.portalElement),
      menu.portalElement?.parentElement?.localName,
    );
    const item = menu
      .portalElement!.querySelector('tp-menu-item')!
      .shadowRoot!.querySelector<HTMLElement>('[role=menuitem]')!;
    item.focus();
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    check(
      'Nested command is focusable ' + menu.dataset.exampleMenu,
      active === item,
      active?.localName,
    );
    menu.close();
    await settle();
    active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    check(
      'Closing nested menu restores its trigger ' + menu.dataset.exampleMenu,
      active === menu.menuTrigger,
      active?.localName,
    );
    check(
      'Closing nested menu preserves drawer ' + menu.dataset.exampleMenu,
      panel.compactOpen,
      panel.compactOpen,
    );
  }
  panel.provider.toggle('programmatic');
  await settle();
  panel.compact = false;
  await settle();
  check(
    'Wide restoration keeps disclosure and team identity',
    identity.open && identity.triggerElement === button && panel.provider.state.expanded,
    panel.provider.state,
  );
  const standalone = document.createElement('tp-collapsible') as TpCollapsible;
  standalone.innerHTML = '<span slot="label">Standalone</span><p>Body</p>';
  document.querySelector('#example')!.append(standalone);
  await standalone.updateComplete;
  check(
    'Contextual recipe leaves standalone unchanged',
    getComputedStyle(standalone.triggerElement!).paddingInlineStart !==
      getComputedStyle(identity.triggerElement!).paddingInlineStart,
    {
      standalone: getComputedStyle(standalone.triggerElement!).padding,
      sidebar: getComputedStyle(identity.triggerElement!).padding,
    },
  );
  standalone.remove();
  const parent = panel.parentElement!;
  const states = disclosures.map((disclosure) => disclosure.open);
  const commands = menus.map((menu) => menu.portalElement!.querySelector('tp-menu-item'));
  panel.remove();
  await wait(350);
  check(
    'Disconnect releases every owned menu portal',
    menus.every((menu) => !menu.portalElement?.isConnected),
    menus.map((menu) => menu.portalElement?.isConnected),
  );
  parent.append(panel);
  await settle();
  check(
    'Reconnect preserves disclosure identity and state',
    button === identity.triggerElement &&
      states.every((open, index) => open === disclosures[index]!.open),
    disclosures.map((disclosure) => disclosure.open),
  );
  check(
    'Reconnect preserves actual command and Icon identities',
    commands.every(
      (command, index) => command === menus[index]!.portalElement!.querySelector('tp-menu-item'),
    ) &&
      menus.every((menu) =>
        [...menu.portalElement!.querySelectorAll('tp-icon')].every(
          (icon) => !!(icon as unknown as { icon: unknown }).icon,
        ),
      ),
    menus.map((menu) => menu.dataset.exampleMenu),
  );
  return { built, passed: checks.length, checks };
}
Object.assign(window, {
  navigationOrganization: {
    panel,
    disclosures,
    menus,
    organization,
    cleanup,
    settle,
    visualGeometry: () => visualGeometry(panel, settle),
    alignmentGeometry: () => alignmentGeometry(panel, settle),
  },
});
