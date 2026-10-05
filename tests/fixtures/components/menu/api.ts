import { shadowReferenceTarget } from '../../../../src/foundation/focus.js';
import { html } from 'lit';
import type * as PublicLibrary from '../../../../src/index.js';
import type { TpMenu } from '../../../../src/components/menu/index.js';
import type { TpPopover } from '../../../../src/components/popover/index.js';

type Library = typeof PublicLibrary;
type Case = { id: string; scenarios: string; run(): Promise<void> };
const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const pause = (duration = 20) => new Promise<void>((resolve) => setTimeout(resolve, duration));
async function until(test: () => boolean, label: string, duration = 2200): Promise<void> {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > duration) throw new Error(`Timeout: ${label}`);
    await pause();
  }
}
async function updated(
  ...elements: Array<HTMLElement & { updateComplete?: Promise<unknown> }>
): Promise<void> {
  await Promise.race([
    Promise.all(elements.map((element) => element.updateComplete)),
    pause(2200).then(() => {
      throw new Error('Bounded updateComplete timeout');
    }),
  ]);
  await pause();
}
const action = () => new Event('tp-api-activation', { cancelable: true });
function allElements(root: ParentNode): Element[] {
  return [...root.querySelectorAll('*')].flatMap((element) => [
    element,
    ...(element.shadowRoot ? allElements(element.shadowRoot) : []),
  ]);
}
async function mounted<T extends HTMLElement>(
  host: T,
  run: (host: T) => Promise<void>,
): Promise<void> {
  document.body.append(host);
  try {
    await updated(host);
    await run(host);
  } finally {
    host.remove();
    await pause();
  }
}

/** API calls are separate from the real keyboard/pointer/AX scenarios in browser-steps.md. */
export function installFamilyAPI(library: Library, built: boolean): void {
  const button = (label: string) => {
    const element = new library.TpButton();
    element.textContent = label;
    element.slot = 'trigger';
    return element;
  };
  const menu = (value = '') => {
    const root = new library.TpMenu();
    root.label = 'API commands';
    root.value = value;
    root.motionPolicy = 'reduce';
    root.append(button(value || 'Commands'));
    const first = new library.TpMenuItem();
    first.value = 'first';
    first.textContent = 'First';
    const second = new library.TpMenuItem();
    second.value = 'second';
    second.textContent = 'Second';
    root.append(first, second);
    return { root, first, second };
  };
  const popover = () => {
    const root = new library.TpPopover();
    root.label = 'API settings';
    root.motionPolicy = 'reduce';
    root.append(button('Settings'));
    const content = document.createElement('p');
    content.textContent = 'Actual projected content';
    root.append(content);
    return { root, content };
  };
  const navigation = () => {
    const root = new library.TpNavigationMenu();
    root.motionPolicy = 'reduce';
    const items = ['first', 'second'].map((value) => {
      const item = new library.TpNavigationMenuItem();
      item.value = value;
      item.append(button(value));
      const content = document.createElement('div');
      content.slot = 'content';
      const link = document.createElement('a');
      link.href = `#api-${value}`;
      link.textContent = `${value} page`;
      content.append(link);
      item.append(content);
      root.append(item);
      return { item, content, link };
    });
    return { root, items };
  };
  const open = async (root: TpMenu | TpPopover) => {
    assert(root.setOpen(true), 'Opening proposal was not accepted');
    await until(() => root.open && !!root.popupElement && root.positioned, 'open/positioned popup');
  };
  const cases: Case[] = [
    {
      id: 'A01-exports',
      scenarios: 'V-01,V-15',
      async run() {
        for (const name of [
          'TpMenu',
          'TpMenubar',
          'TpNavigationMenu',
          'TpPopover',
          'TpMenuItem',
          'TpMenuCheckboxItem',
          'TpMenuRadioGroup',
          'TpMenuRadioItem',
          'TpNavigationMenuItem',
        ] as const) {
          const Constructor = library[name];
          assert(typeof Constructor === 'function', `Missing ${name}`);
          assert(
            customElements.get(Constructor.tagName) === Constructor,
            `Wrong registration ${name}`,
          );
        }
      },
    },
    {
      id: 'A02-uncontrolled-default-and-command',
      scenarios: 'V-02,V-03',
      async run() {
        const { root, first } = menu();
        root.defaultOpen = true;
        await mounted(root, async () => {
          await until(() => !!root.popupElement && root.positioned, 'defaultOpen');
          assert(root.open, 'defaultOpen was not committed');
          first.activate(action());
          await updated(root, first);
          assert(
            !root.open && root.value === 'first',
            'Command did not close/publish legacy value',
          );
        });
      },
    },
    {
      id: 'A03-controlled-veto-and-later-publication',
      scenarios: 'V-02',
      async run() {
        const { root } = menu();
        root.open = false;
        root.onOpenChange = (event) => {
          root.open = event.detail.value;
          assert(!root.open, 'Controlled proposal published before dispatch finished');
        };
        const veto = (event: Event) => event.preventDefault();
        root.addEventListener('tp-open-change', veto);
        await mounted(root, async () => {
          assert(!root.setOpen(true) && !root.open, 'Vetoed open committed');
          await updated(root);
          assert(!root.open, 'Render resurrected vetoed publication');
          root.removeEventListener('tp-open-change', veto);
          root.open = true;
          await until(() => root.open && !!root.popupElement, 'later explicit publication');
        });
      },
    },
    {
      id: 'A04-explicit-default-conflict',
      scenarios: 'V-02',
      async run() {
        const { root } = popover();
        root.open = false;
        root.defaultOpen = false;
        const diagnostics: string[] = [];
        root.addEventListener('tp-diagnostic', (event) =>
          diagnostics.push((event as CustomEvent<{ message: string }>).detail.message),
        );
        await mounted(root, async () => {
          await updated(root);
          assert(!root.open, 'Controlled false was lost');
          assert(
            diagnostics.filter((text) => text.includes('either open or defaultOpen')).length === 1,
            'Explicit false default conflict was not diagnosed once',
          );
        });
      },
    },
    {
      id: 'A05-checkbox-action-veto-and-indicator',
      scenarios: 'V-02,V-03,V-12',
      async run() {
        const { root } = menu();
        const item = new library.TpMenuCheckboxItem();
        item.textContent = 'Wrap';
        item.keepMounted = true;
        root.append(item);
        await mounted(root, async () => {
          await open(root);
          await updated(item);
          const veto = (event: Event) => event.preventDefault();
          root.addEventListener('tp-action', veto);
          item.activate(action());
          await updated(item);
          assert(!item.checked && root.open, 'Canceled action selected/closed');
          root.removeEventListener('tp-action', veto);
          item.activate(action());
          await updated(item);
          assert(item.checked && root.open, 'Checkbox default close policy/state failed');
          assert(
            item.controlElement?.getAttribute('aria-checked') === 'true',
            'Checkbox semantic host stale',
          );
          item.activate(action());
          await until(
            () =>
              item.shadowRoot
                ?.querySelector('[part~="indicator"]')
                ?.getAttribute('data-presence') === 'retained',
            'retained Indicator',
          );
        });
      },
    },
    {
      id: 'A06-radio-identity-veto-no-clear',
      scenarios: 'V-02,V-03,V-11',
      async run() {
        const { root } = menu();
        const group = new library.TpMenuRadioGroup();
        group.setAttribute('aria-label', 'View');
        group.value = 'one';
        const one = new library.TpMenuRadioItem();
        one.value = 'one';
        one.textContent = 'One';
        const two = new library.TpMenuRadioItem();
        two.value = 'two';
        two.textContent = 'Two';
        group.append(one, two);
        root.append(group);
        group.onValueChange = (event) => {
          group.value = event.detail.value;
        };
        await mounted(root, async () => {
          await open(root);
          await updated(group, one, two);
          one.activate(action());
          assert(group.value === 'one', 'Selected Radio cleared');
          const veto = (event: Event) => event.preventDefault();
          group.addEventListener('tp-value-change', veto);
          two.activate(action());
          await updated(group, two);
          assert(group.value === 'one', 'Radio veto failed');
          group.removeEventListener('tp-value-change', veto);
          two.activate(action());
          await updated(group, one, two);
          assert(
            String(group.value) === 'two' && two.checked && !one.checked && root.open,
            'Radio committed selection/default close failed',
          );
          const duplicate = new library.TpMenuRadioItem();
          duplicate.value = 'two';
          duplicate.textContent = 'Duplicate';
          group.append(duplicate);
          await updated(duplicate, group);
          assert(duplicate.itemDisabled, 'Later duplicate radio was not excluded');
        });
      },
    },
    {
      id: 'A07-membership-and-delegated-item',
      scenarios: 'V-01,V-11,V-12',
      async run() {
        const { root, first, second } = menu();
        let actual: HTMLElement | null = null;
        first.partContracts = {
          'menu-item': {
            renderDelegate: ({ bind, content }) => html`<section ${bind}>${content}</section>`,
            elementReference: (element) => {
              actual = element;
            },
          },
        };
        await mounted(root, async () => {
          await open(root);
          await updated(first);
          assert(
            actual?.localName === 'section' &&
              actual === first.controlElement &&
              actual.getAttribute('role') === 'menuitem',
            'Delegate lost semantic binding',
          );
          assert(root.commandItems.includes(actual), 'Collection retained old target');
          second.remove();
          await updated(root);
          assert(root.commandItems.length === 1, 'Removed item retained in collection');
          first.disabled = true;
          await updated(first, root);
          first.activate(action());
          assert(root.open, 'Disabled item activated');
        });
        assert(actual === null, 'Disconnected item ref did not clear');
      },
    },
    {
      id: 'A08-context-family-and-target',
      scenarios: 'V-01,V-09,V-12',
      async run() {
        const root = new library.TpMenu();
        root.invocation = 'context';
        root.label = 'Context';
        root.motionPolicy = 'reduce';
        const target = button('Native target');
        target.setAttribute('aria-label', 'Original target');
        root.append(target);
        const group = new library.TpMenuRadioGroup();
        group.setAttribute('aria-label', 'Options');
        const item = new library.TpMenuRadioItem();
        item.value = 'one';
        item.textContent = 'One';
        group.append(item);
        root.append(group);
        await mounted(root, async () => {
          await open(root);
          await updated(group, item);
          assert(
            item.presentationTagName === 'tp-menu' && group.presentationTagName === 'tp-menu',
            'Context constituent family alias lost',
          );
          assert(
            group.controlElement?.part.contains('menu-radio-group'),
            'Context RadioGroup semantic part missing',
          );
          assert(
            target.getAttribute('aria-label') === 'Original target' &&
              !target.hasAttribute('aria-haspopup'),
            'Context rewrote target semantics',
          );
        });
      },
    },
    {
      id: 'A09-popover-anatomy-and-close-veto',
      scenarios: 'V-01,V-03,V-09',
      async run() {
        const { root } = popover();
        const title = document.createElement('span');
        title.slot = 'title';
        title.textContent = 'Settings';
        const description = document.createElement('span');
        description.slot = 'description';
        description.textContent = 'Edit details';
        const close = new library.TpButton();
        close.slot = 'close';
        close.textContent = 'Done';
        root.append(title, description, close);
        await mounted(root, async () => {
          await open(root);
          await updated(close);
          assert(
            !!root.popupElement?.getAttribute('aria-labelledby') &&
              !!root.popupElement?.getAttribute('aria-describedby'),
            'Title/description relationships missing',
          );
          const veto = (event: Event) => event.preventDefault();
          root.addEventListener('tp-open-change', veto);
          close.click();
          await updated(root);
          assert(root.open, 'Canceled Close action closed');
          root.removeEventListener('tp-open-change', veto);
          close.click();
          await updated(root);
          assert(!root.open, 'Actual Button Close action did not close');
        });
      },
    },
    {
      id: 'A10-portal-projection-and-container-swap',
      scenarios: 'V-06,V-11',
      async run() {
        const { root, content } = popover();
        const target = document.createElement('div');
        const other = document.createElement('div');
        document.body.append(target, other);
        root.container = target;
        try {
          await mounted(root, async () => {
            await open(root);
            assert(target.contains(root.portalElement), 'Explicit portal target ignored');
            assert(
              content.isConnected && content.parentElement === root.portalElement,
              'Authored content was cloned or not projected',
            );
            root.container = { current: other };
            await updated(root);
            assert(
              other.contains(root.portalElement) && content.parentElement === root.portalElement,
              'Container swap lost original content',
            );
          });
          assert(content.parentElement === root, 'Disconnect did not restore authored content');
        } finally {
          target.remove();
          other.remove();
        }
      },
    },
    {
      id: 'A11-portal-identifier-sharing-and-cleanup',
      scenarios: 'V-06,V-11',
      async run() {
        const a = popover().root,
          b = popover().root;
        const identifier = `family-shared-${Date.now()}`;
        a.portalIdentifier = identifier;
        b.portalIdentifier = identifier;
        document.body.append(a, b);
        try {
          await updated(a, b);
          await open(a);
          await open(b);
          const container = document.getElementById(identifier);
          assert(
            container?.contains(a.portalElement) && container.contains(b.portalElement),
            'Named portals did not share the actual container',
          );
          a.remove();
          await pause();
          assert(
            document.getElementById(identifier) === container,
            'First disconnect removed a shared portal',
          );
          b.remove();
          await pause();
          assert(
            !document.getElementById(identifier),
            'Last disconnect leaked generated container',
          );
        } finally {
          a.remove();
          b.remove();
        }
      },
    },
    {
      id: 'A12-menubar-atomic-transfer-and-veto',
      scenarios: 'V-02,V-16',
      async run() {
        const root = new library.TpMenubar();
        root.value = '';
        root.onValueChange = (event) => {
          root.value = event.detail.value;
        };
        const a = menu('a').root,
          b = menu('b').root;
        root.append(a, b);
        await mounted(root, async () => {
          await updated(a, b, root);
          assert(a.setOpen(true), 'Bar initial Menu did not open');
          await updated(root, a, b);
          assert(!b.inert && !b.menuTriggerHost?.inert, 'Modal bar disabled its sibling trigger');
          assert(a.dismissController.contains(b.menuTrigger), 'Sibling is outside the bar branch');
          assert(!b.setOpen(false, 'focus-outside'), 'Inactive sibling accepted dismissal');
          assert(root.value === 'a' && a.open, 'Inactive sibling dismissed the active menu');
          const observations: boolean[][] = [];
          b.onOpenChange = () => {
            observations.push([a.open, b.open]);
          };
          const veto = (event: Event) => event.preventDefault();
          root.addEventListener('tp-value-change', veto);
          assert(
            !b.setOpen(true) && root.value === 'a' && a.open && !b.open,
            'Vetoed transfer changed scalar/derived state',
          );
          root.removeEventListener('tp-value-change', veto);
          assert(b.setOpen(true), 'Accepted transfer failed');
          assert(String(root.value) === 'b' && !a.open && b.open, 'Transfer was not atomic');
          assert(
            observations.every(([first, second]) => first && !second),
            'Proposal callback saw a partial transfer',
          );
        });
      },
    },
    {
      id: 'A13-menubar-full-projected-parts',
      scenarios: 'V-11,V-12,V-16',
      async run() {
        const root = new library.TpMenubar();
        const { root: commands, first } = menu('commands');
        const group = document.createElement('div');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'Grouped');
        const shortcut = document.createElement('span');
        shortcut.setAttribute('data-menu-shortcut', '');
        shortcut.textContent = '⌘N';
        first.append(shortcut);
        group.append(first);
        commands.append(group, new library.TpSeparator());
        const sub = menu('nested').root;
        commands.append(sub);
        root.append(commands);
        await mounted(root, async () => {
          await updated(root, commands, sub);
          await open(commands);
          await open(sub);
          await updated(commands, sub, root);
          const parts = commands.menubarPartTargets;
          for (const name of [
            'menu',
            'trigger',
            'content',
            'item',
            'group',
            'sub-trigger',
            'sub-content',
            'separator',
            'shortcut',
          ])
            assert(
              parts.some((part) => part.name === `menubar-${name}`),
              `Missing projected ${name}`,
            );
          assert(
            parts.find((part) => part.element === first.controlElement)?.owner === first,
            'Menubar installed a parallel item hook owner',
          );
        });
      },
    },
    {
      id: 'A14-navigation-scalar-and-native-links',
      scenarios: 'V-02,V-09,V-17',
      async run() {
        const { root, items } = navigation();
        root.value = '';
        root.onValueChange = (event) => {
          root.value = event.detail.value;
        };
        await mounted(root, async () => {
          root.value = 'first';
          await until(
            () => !!root.popupElement && !!items[0]!.item.contentElement,
            'Navigation content',
          );
          await updated(root, ...items.map(({ item }) => item));
          assert(
            root.open && items[0]!.item.active && !items[1]!.item.active,
            'Navigation scalar not sole owner',
          );
          const trigger = root.triggerElement;
          assert(
            trigger?.getAttribute('aria-expanded') === 'true' &&
              !!trigger.ariaControlsElements?.includes(shadowReferenceTarget(root.popupElement!)),
            'Navigation Trigger relationships absent',
          );
          assert(
            !trigger?.hasAttribute('aria-haspopup'),
            'Navigation acquired command popup semantics',
          );
          assert(
            items[0]!.item.contentElement?.ariaLabelledByElements?.includes(
              shadowReferenceTarget(trigger!),
            ),
            'Item Content not labelled by actual Trigger',
          );
          assert(
            items[0]!.link.localName === 'a' &&
              items[0]!.link.getAttribute('href') === '#api-first' &&
              !items[0]!.link.hasAttribute('role'),
            'Native link semantics replaced',
          );
          root.value = 'unknown';
          await updated(root);
          assert(!root.open, 'Unknown controlled Navigation value opened content');
        });
      },
    },
    {
      id: 'A15-navigation-viewport-and-direct-content',
      scenarios: 'V-08,V-12,V-17',
      async run() {
        const { root, items } = navigation();
        root.value = 'first';
        await mounted(root, async () => {
          await until(() => !!items[0]!.item.contentElement, 'First content');
          root.value = 'second';
          await updated(root, ...items.map(({ item }) => item));
          assert(root.viewportState.current === 'second', 'Viewport current identity stale');
          root.showViewport = false;
          await updated(root, ...items.map(({ item }) => item));
          assert(
            root.value === 'second' &&
              !!items[1]!.item.contentElement &&
              items[1]!.content.isConnected,
            'Independent viewport removal lost content/state',
          );
          assert(
            items[1]!.item.contentElement?.getAttribute('data-viewport') === 'false',
            'Direct content presentation marker stale',
          );
        });
      },
    },
    {
      id: 'A16-navigation-indicator-button-composition',
      scenarios: 'V-01,V-12,V-13',
      async run() {
        const { root, items } = navigation();
        await mounted(root, async () => {
          const item = items[0]!.item;
          await updated(item, item.triggerElement!);
          const trigger = item.triggerElement!;
          const indicator = allElements(trigger).find((element) =>
            element.part.contains('navigation-menu-indicator'),
          );
          assert(
            indicator &&
              trigger.contains(
                indicator.getRootNode() instanceof ShadowRoot
                  ? (indicator.getRootNode() as ShadowRoot).host
                  : indicator,
              ),
            'Indicator is outside actual Trigger composition',
          );
          const icon = indicator.querySelector('tp-icon');
          assert(
            icon && Math.abs(icon.getBoundingClientRect().width - 12) < 1,
            'Navigation artwork is not sourced 12px token size',
          );
          const originalTrigger = trigger;
          item.showIndicator = false;
          await updated(item);
          assert(
            !allElements(trigger).some((element) =>
              element.part.contains('navigation-menu-indicator'),
            ),
            'Independent Indicator removal failed',
          );
          assert(
            item.triggerElement === originalTrigger,
            'Indicator option replaced Trigger identity',
          );
        });
      },
    },
    {
      id: 'A17-independent-popup-delegate-and-arrow',
      scenarios: 'V-01,V-07,V-12',
      async run() {
        const { root } = popover();
        root.showArrow = true;
        root.showBackdrop = true;
        root.sideOffset = ({ anchor }) => anchor.height / 2;
        root.align = 'end';
        // Leave room for end alignment; otherwise collision flipping is correct.
        root.style.cssText = 'display:block;margin-inline-start:40vw';
        let target: HTMLElement | null = null;
        root.partContracts = {
          'popover-content': {
            renderDelegate: ({ bind, content }) => html`<section ${bind}>${content}</section>`,
            elementReference: (element) => {
              target = element;
            },
            styleHook: { outline: '3px solid rgb(1, 2, 3)' },
          },
        };
        await mounted(root, async () => {
          await open(root);
          assert(
            target === root.popupElement && target?.localName === 'section',
            'Popup delegate/ref mismatch',
          );
          assert(root.resolvedAlign === 'end', 'Independent alignment ignored');
          const nodes = allElements(root.popupElement!.getRootNode() as ParentNode);
          assert(
            nodes.some((element) => element.part.contains('arrow')) &&
              nodes.some((element) => element.part.contains('backdrop')),
            'Optional Arrow/Backdrop absent',
          );
          assert(
            getComputedStyle(target).outlineWidth === '3px',
            'Terminal popup styleHook missing',
          );
        });
        assert(target === null, 'Popup reference leaked after disconnect');
      },
    },
    {
      id: 'A18-unmount-veto-and-retention',
      scenarios: 'V-02,V-08',
      async run() {
        const { root } = popover();
        await mounted(root, async () => {
          await open(root);
          const veto = (event: Event) => event.preventDefault();
          root.addEventListener('tp-open-change', veto);
          root.actions.unmount();
          await updated(root);
          assert(root.open && !!root.popupElement, 'Vetoed unmount removed live content');
          root.removeEventListener('tp-open-change', veto);
          root.onOpenChange = (event) => {
            if (!event.detail.value) event.detail.preventUnmountOnClose();
          };
          root.close();
          await until(() => root.presenceState === 'retained', 'retained close');
          assert(!!root.popupElement, 'Retained content absent');
          root.actions.unmount();
          await until(() => root.presenceState === 'absent', 'imperative release');
        });
      },
    },
    {
      id: 'A19-modal-live-region-and-nested-branch',
      scenarios: 'V-06,V-09',
      async run() {
        const { root } = popover();
        root.modal = true;
        const live = document.createElement('div');
        live.setAttribute('role', 'status');
        live.textContent = 'Status';
        const outside = document.createElement('div');
        outside.textContent = 'Outside';
        document.body.append(live, outside);
        try {
          await mounted(root, async () => {
            await open(root);
            assert(!live.inert && outside.inert, 'Modal live-region/outside inert policy failed');
            const child = popover().root;
            root.append(child);
            await updated(root, child);
            await open(child);
            assert(
              root.dismissController.branchElements.includes(child),
              'Nested portaled surface absent from existing branch',
            );
            assert(!child.popupElement?.inert, 'Nested popup was made inert');
            child.remove();
            await pause();
            assert(
              !root.dismissController.branchElements.includes(child),
              'Removed nested surface retained in branch',
            );
          });
          assert(!outside.inert, 'Inert lease leaked');
        } finally {
          live.remove();
          outside.remove();
        }
      },
    },
    {
      id: 'A20-direction-and-geometric-resolver',
      scenarios: 'V-07,V-11',
      async run() {
        const { root } = popover();
        root.side = 'inline-end';
        root.collisionAvoidance = { side: 'none', align: 'none' };
        const seen: string[] = [];
        root.sideOffset = ({ side, anchor, positioner }) => {
          seen.push(side);
          assert(anchor.width > 0 && positioner.width > 0, 'Resolver missing measured geometry');
          return 11;
        };
        const scope = document.createElement('div');
        scope.dir = 'rtl';
        scope.append(root);
        await mounted(scope, async () => {
          await updated(root);
          await open(root);
          assert(
            root.resolvedSide === 'left' && seen.includes('left'),
            'RTL logical resolution failed',
          );
          scope.dir = 'ltr';
          await until(() => root.resolvedSide === 'right', 'inherited direction change');
          assert(seen.includes('right'), 'Resolver did not reevaluate resolved side');
        });
      },
    },
    {
      id: 'A21-disconnect-restores-projection-and-reconnects',
      scenarios: 'V-11',
      async run() {
        const { root, content } = popover();
        document.body.append(root);
        try {
          await updated(root);
          await open(root);
          const old = root.portalElement;
          root.remove();
          await pause();
          assert(
            !old?.isConnected && content.parentElement === root,
            'Disconnect leaked portal/projection',
          );
          document.body.append(root);
          await updated(root);
          if (!root.open) root.setOpen(true);
          await until(() => !!root.popupElement && root.positioned, 'reconnected popup');
          assert(content.isConnected, 'Reconnected original content lost');
        } finally {
          root.remove();
        }
      },
    },
    {
      id: 'A22-navigation-default-and-duplicate-removal',
      scenarios: 'V-02,V-11,V-17',
      async run() {
        const { root, items } = navigation();
        root.defaultValue = 'first';
        const duplicate = new library.TpNavigationMenuItem();
        duplicate.value = 'first';
        duplicate.append(button('Duplicate'));
        const panel = document.createElement('div');
        panel.slot = 'content';
        panel.textContent = 'Duplicate panel';
        duplicate.append(panel);
        root.append(duplicate);
        await mounted(root, async () => {
          await until(() => !!items[0]!.item.contentElement, 'default Navigation content');
          assert(
            !duplicate.active || !duplicate.contentElement,
            'Duplicate Navigation content became active',
          );
          items[0]!.item.remove();
          await updated(root);
          assert(root.value === '' && !root.open, 'Uncontrolled removed active item did not close');
        });
      },
    },
  ];
  cases.push(
    {
      id: 'A23-group-label-and-context-sub-parts',
      scenarios: 'V-09,V-11,V-12',
      async run() {
        const root = new library.TpMenu();
        root.invocation = 'context';
        root.motionPolicy = 'reduce';
        root.label = 'Context';
        root.append(button('Target'));
        const group = document.createElement('div');
        group.setAttribute('role', 'group');
        const label = document.createElement('span');
        label.setAttribute('data-menu-label', '');
        label.textContent = 'Editing';
        const item = new library.TpMenuItem();
        item.textContent = 'Edit';
        group.append(label, item);
        root.append(group);
        const sub = menu().root;
        root.append(sub);
        await mounted(root, async () => {
          await open(root);
          await open(sub);
          assert(
            group.ariaLabelledByElements?.includes(label),
            'Native Group not named by actual Label',
          );
          assert(
            sub.presentationTagName === 'tp-menu' &&
              sub.popupElement?.part.contains('menu-sub-content'),
            'Nested Context content uses the wrong public family',
          );
          label.remove();
          await updated(root);
          assert(!group.ariaLabelledByElements?.includes(label), 'Removed Label reference leaked');
        });
      },
    },
    {
      id: 'A24-parent-and-terminal-hooks',
      scenarios: 'V-12',
      async run() {
        const { root, first } = menu();
        root.partPresentation = {
          'menu-item': { styleHook: { outline: '3px solid rgb(1, 2, 3)' } },
        };
        first.partPresentation = {
          'menu-item': { styleHook: { outline: '5px solid rgb(4, 5, 6)' } },
        };
        await mounted(root, async () => {
          await open(root);
          await updated(first);
          assert(
            getComputedStyle(first.controlElement!).outlineWidth === '5px',
            'Parent clobbered terminal constituent hook',
          );
          first.partPresentation = {};
          await updated(first);
          assert(
            getComputedStyle(first.controlElement!).outlineWidth === '3px',
            'Parent contribution missing after terminal reset',
          );
        });
      },
    },
    {
      id: 'A25-full-dictionary-and-missing-key',
      scenarios: 'V-12',
      async run() {
        const { root, first } = menu();
        const dictionary = {
          ...library.defaultPresentationDictionary,
          'menu-item': [{ declarations: { color: 'rgb(17, 34, 51)' } }],
        };
        try {
          library.setPresentationDictionary(dictionary);
          await mounted(root, async () => {
            await open(root);
            await updated(first);
            assert(
              getComputedStyle(first.controlElement!).color === 'rgb(17, 34, 51)',
              'Complete dictionary did not reach actual Item',
            );
            assert(root.open, 'Dictionary replacement reset state');
            const diagnostics: string[] = [];
            root.addEventListener('tp-presentation-diagnostic', (event) =>
              diagnostics.push(JSON.stringify((event as CustomEvent).detail)),
            );
            const missing = { ...dictionary };
            delete (missing as Record<string, unknown>)['menu-item'];
            library.setPresentationDictionary(missing);
            await updated(root, first);
            assert(
              diagnostics.some((entry) => entry.includes('menu-item')),
              'Missing key produced no diagnostic',
            );
          });
        } finally {
          library.setPresentationDictionary(library.defaultPresentationDictionary);
        }
      },
    },
    {
      id: 'A26-foreign-first-connect-and-adoption',
      scenarios: 'V-11,V-15',
      async run() {
        const frame = document.createElement('iframe');
        frame.title = 'Owned foreign-document boundary';
        document.body.append(frame);
        try {
          const foreign = frame.contentDocument!;
          const stylesheet = foreign.createElement('link');
          stylesheet.rel = 'stylesheet';
          stylesheet.href = new URL(
            built ? '/dist/styles.css' : '/src/styles.css',
            location.href,
          ).href;
          const stylesReady = new Promise<void>((resolve, reject) => {
            stylesheet.onload = () => resolve();
            stylesheet.onerror = () => reject(new Error('Foreign fixture stylesheet failed'));
          });
          foreign.head.append(stylesheet);
          await Promise.race([
            stylesReady,
            pause(2200).then(() => {
              throw new Error('Foreign stylesheet timeout');
            }),
          ]);
          const { root, first } = menu();
          root.modal = false;
          root.style.setProperty('--tp-popover', 'rgb(12, 23, 34)');
          foreign.body.append(foreign.adoptNode(root));
          await updated(root, first);
          await open(root);
          await updated(root, first);
          assert(
            root.popupElement?.ownerDocument === foreign &&
              first.controlElement?.ownerDocument === foreign,
            'Adopted parts retained wrong owner document',
          );
          assert(
            foreign.defaultView!.getComputedStyle(first.controlElement!).position === 'relative',
            'Fresh foreign structural styles missing',
          );
          assert(
            foreign.defaultView!.getComputedStyle(root.popupElement!).borderRadius !== '0px',
            'Foreign recipe styles missing',
          );
          document.body.append(document.adoptNode(root));
          await updated(root, first);
          assert(
            first.controlElement?.ownerDocument === document,
            'Readoption retained foreign target',
          );
          root.remove();
        } finally {
          frame.remove();
        }
      },
    },
  );
  cases.push({
    id: 'A27-context-external-target-replacement',
    scenarios: 'V-11',
    async run() {
      const first = button('Original target');
      first.id = `context-api-${Date.now()}`;
      const second = button('Replacement target');
      second.id = first.id;
      const root = new library.TpMenu();
      root.invocation = 'context';
      root.for = first.id;
      root.label = 'Replacement commands';
      root.motionPolicy = 'reduce';
      const item = new library.TpMenuItem();
      item.textContent = 'Inspect';
      root.append(item);
      document.body.append(first);
      try {
        await mounted(root, async () => {
          await updated(first, root);
          first.replaceWith(second);
          await updated(second, root);
          await until(
            () => root.triggerElement === second.shadowRoot?.querySelector('button'),
            'rebound external target',
          );
          await open(root);
          assert(
            root.open && root.triggerElement === second.shadowRoot?.querySelector('button'),
            'External target retained a stale association',
          );
        });
      } finally {
        first.remove();
        second.remove();
      }
    },
  });
  cases.push({
    id: 'A28-one-highlight-across-tree',
    scenarios: 'menu-highlight/V-01,menu-highlight/V-02,menu-highlight/V-03',
    async run() {
      const parent = menu();
      const child = menu('Child');
      parent.root.append(child.root);
      await mounted(parent.root, async () => {
        await open(parent.root);
        assert(
          getComputedStyle(child.root.menuTrigger!).transitionDuration === '0s',
          'Submenu trigger retained Button fade',
        );
        parent.first.controlElement!.focus();
        assert(
          parent.root.highlightedItem === parent.first.controlElement,
          'Root focus not active',
        );
        await open(child.root);
        child.first.controlElement!.focus();
        await updated(parent.first, child.first);
        assert(parent.root.highlightedItem === null, 'Ancestor retained active item');
        assert(
          !parent.first.controlElement!.hasAttribute('data-highlighted'),
          'Ancestor marker retained',
        );
        assert(child.root.highlightedItem === child.first.controlElement, 'Child focus not active');
        child.second.controlElement!.focus();
        await updated(child.first, child.second);
        assert(
          !child.first.controlElement!.hasAttribute('data-highlighted'),
          'Sibling marker retained',
        );
        child.root.close();
        await until(() => !child.root.open, 'child close');
        await updated(parent.root, child.root);
        assert(child.root.highlightedItem === null, 'Closed child remained active');
        assert(
          parent.root.highlightedItem === child.root.menuTrigger,
          'Parent trigger not restored',
        );
        await open(child.root);
        child.first.controlElement!.focus();
        child.root.remove();
        await updated(parent.root);
        assert(!child.root.highlightedItem, 'Detached child remained active');
        parent.second.controlElement!.focus();
        assert(
          parent.root.highlightedItem === parent.second.controlElement,
          'Removed owner blocked root',
        );
        parent.root.append(child.root);
        await updated(parent.root, child.root);
        if (!child.root.open) await open(child.root);
        child.second.controlElement!.focus();
        assert(
          child.root.highlightedItem === child.second.controlElement,
          'Reconnected child inactive',
        );
        assert(parent.root.highlightedItem === null, 'Reconnection retained ancestor highlight');
      });
    },
  });
  cases.push({
    id: 'A29-parent-navigation-closes-child-branch',
    scenarios: 'menu-highlight/V-04',
    async run() {
      const parent = menu();
      const child = menu('Child');
      const grandchild = menu('Grandchild');
      parent.root.append(child.root);
      child.root.append(grandchild.root);
      await mounted(parent.root, async () => {
        await open(parent.root);
        await open(child.root);
        await open(grandchild.root);
        grandchild.first.controlElement!.focus();
        child.first.controlElement!.focus();
        await updated(child.root, grandchild.root);
        assert(parent.root.open && child.root.open, 'Navigation closed an ancestor');
        assert(!grandchild.root.open, 'Parent sibling left grandchild open');
        assert(child.root.highlightedItem === child.first.controlElement, 'Close stole highlight');
        await open(grandchild.root);
        grandchild.first.controlElement!.focus();
        parent.first.controlElement!.focus();
        await updated(parent.root, child.root, grandchild.root);
        assert(parent.root.open && !child.root.open && !grandchild.root.open, 'Branch not closed');
        assert(
          parent.root.highlightedItem === parent.first.controlElement,
          'Root highlight stolen',
        );
        await open(child.root);
        const veto = (event: Event) => event.preventDefault();
        child.root.addEventListener('tp-open-change', veto);
        parent.second.controlElement!.focus();
        await updated(parent.root, child.root);
        assert(child.root.open, 'Navigation bypassed close cancellation');
        child.root.removeEventListener('tp-open-change', veto);
        parent.first.controlElement!.focus();
        await updated(parent.root, child.root);
        assert(!child.root.open, 'Accepted navigation did not close child');
      });
    },
  });
  cases.push({
    id: 'A30-navigation-direct-link-hover-policy',
    scenarios: 'navigation-link-hover/V-02',
    async run() {
      const { root, items } = navigation();
      root.defaultValue = 'first';
      const direct = new library.TpNavigationMenuItem();
      direct.value = 'docs';
      const link = document.createElement('a');
      link.href = '#documentation';
      link.textContent = 'Documentation';
      direct.append(link);
      root.append(direct);
      // Event-policy assertions only; actual hover is verified through Chrome MCP.
      const enter = (target: Element, pointerType = 'mouse') =>
        target.dispatchEvent(
          new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType }),
        );
      await mounted(root, async () => {
        await until(() => root.open && !!items[0]!.item.contentElement, 'default navigation panel');
        enter(items[0]!.link);
        await updated(root);
        assert(root.open, 'Content link hover closed its panel');
        enter(link, 'touch');
        await updated(root);
        assert(root.open, 'Touch pointerover closed panel');
        direct.disabled = true;
        await updated(direct, root);
        enter(link);
        assert(root.open, 'Disabled direct item dismissed panel');
        direct.disabled = false;
        await updated(direct, root);
        const veto = (event: Event) => event.preventDefault();
        root.addEventListener('tp-value-change', veto);
        enter(link);
        await updated(root);
        assert(root.open && root.value === 'first', 'Hover bypassed value cancellation');
        root.removeEventListener('tp-value-change', veto);
        enter(link);
        await updated(root);
        assert(!root.open && root.value === '', 'Direct link did not close panel');
        assert(link.getAttribute('href') === '#documentation', 'Hover changed native navigation');
        const nativeItem = document.createElement('li');
        const nativeLink = document.createElement('a');
        nativeLink.href = '#native-documentation';
        nativeLink.textContent = 'Native documentation';
        nativeItem.append(nativeLink);
        root.append(nativeItem);
        root.onValueChange = (event) => {
          root.value = event.detail.value;
        };
        root.value = 'first';
        await updated(root);
        enter(nativeLink);
        await updated(root);
        assert(!root.open, 'Native direct-link composition did not dismiss panel');
      });
    },
  });
  Object.assign(window, {
    familyAPIManifest: cases.map(({ id, scenarios }) => ({ id, scenarios })),
    async runFamilyAPI(start = 0, count = 4) {
      if (
        !(window as Window & { familyVerificationAuthorized?: boolean })
          .familyVerificationAuthorized
      )
        throw new Error(
          'Pass and record early I01–I03 before authorizing the exhaustive API matrix.',
        );
      const results: Array<{ id: string; scenarios: string; passed: boolean; error?: string }> = [];
      for (const entry of cases.slice(start, start + Math.min(count, 4))) {
        try {
          await entry.run();
          results.push({ id: entry.id, scenarios: entry.scenarios, passed: true });
        } catch (error) {
          results.push({
            id: entry.id,
            scenarios: entry.scenarios,
            passed: false,
            error: String(error),
          });
        }
      }
      return { built, results, total: cases.length };
    },
  });
}
