import { html } from 'lit';
import documentation from '../../../../docs/navigation-panel.md?raw';
import type {
  TpNavigationPanel,
  TpNavigationPanelInput,
  TpNavigationPanelLink,
  TpNavigationPanelLoadingPlaceholder,
} from '../../../../src/components/navigation-panel/index.js';
import type { TpElement } from '../../../../src/foundation/element.js';
import type { TpButton } from '../../../../src/components/button/button.js';
import type { NavigationPanelDrawer } from '../../../../src/components/navigation-panel/drawer.js';
const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const { chevronRightIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/chevron-right.js' : '/src/icons/chevron-right.ts'
);
const { plusIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/plus.js' : '/src/icons/plus.ts'
);
const { navigationIcons } = await import(
  /* @vite-ignore */ built ? '/dist/icons/navigation.js' : '/src/icons/navigation.ts'
);
const panel = document.querySelector<TpNavigationPanel>('#panel')!;
const dynamic = document.querySelector<HTMLElement>('#dynamic')!;
for (const id of ['trigger', 'overview'])
  (document.querySelector(`#${id}`) as TpButton).icon = chevronRightIcon;
(document.querySelector('#group-action') as TpButton).icon = plusIcon;
(document.querySelector('#overview') as TpNavigationPanelLink).tooltip = html`<tp-icon
    .icon=${chevronRightIcon}
  ></tp-icon>
  Overview <tp-key-hint>O</tp-key-hint>`;
const events: { type: string; value: unknown; reason: string; target: string }[] = [];
for (const type of ['tp-value-change', 'tp-open-change'])
  panel.addEventListener(type, (event) => {
    const detail = (event as CustomEvent).detail;
    events.push({
      type,
      value: detail.value,
      reason: detail.reason,
      target: (event.target as Element).localName,
    });
  });
document.querySelector('#compact-probe')!.addEventListener('click', () => {
  panel.compact = !panel.provider.compact;
});
const records: { name: string; pass: boolean; actual: unknown }[] = [];
function check(name: string, pass: boolean, actual: unknown) {
  records.push({ name, pass, actual });
  if (!pass) throw new Error(`${name}: ${JSON.stringify(actual)}`);
}
async function settle(target: TpNavigationPanel = panel) {
  for (let i = 0; i < 5; i++) {
    await target.updateComplete;
    await Promise.all(
      [...target.querySelectorAll<TpElement>('*')]
        .filter((element) => 'updateComplete' in element)
        .map((element) => element.updateComplete),
    );
    const drawer = target.renderRoot.querySelector<NavigationPanelDrawer>(
      'tp-navigation-panel-drawer',
    );
    if (drawer) await drawer.updateComplete;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 32);
      requestAnimationFrame(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
async function create(properties: Partial<TpNavigationPanel> = {}) {
  const target = document.createElement('tp-navigation-panel') as TpNavigationPanel;
  Object.assign(target, { compact: false }, properties);
  target.label = 'API navigation';
  dynamic.append(target);
  await settle(target);
  return target;
}
const view = (target: TpNavigationPanel = panel) =>
  target.querySelector<HTMLDivElement>('[data-tp-navigation-view]')!;
const drawer = (target: TpNavigationPanel = panel) =>
  target.renderRoot.querySelector<NavigationPanelDrawer>('tp-navigation-panel-drawer')!;
const semantic = (target: TpElement, part: string) =>
  target.renderRoot.querySelector<HTMLElement>(`[part~="${part}"]`)!;
async function assertProvider() {
  records.length = 0;
  const target = await create();
  const snapshots: unknown[] = [];
  const unsubscribe = target.provider.subscribe((state) => snapshots.push(state));
  check(
    'C01 one logical Provider and canonical defaults',
    target.provider.host === target &&
      target.expanded === true &&
      target.compactOpen === false &&
      target.provider.state.side === 'inline-start',
    target.provider.state,
  );
  target.setExpanded(false);
  await settle(target);
  check(
    'C02 accepted wide preference publication',
    !target.expanded && snapshots.length === 2 && target.provider.state.collapsed,
    snapshots,
  );
  target.compact = true;
  await settle(target);
  target.setCompactOpen(true);
  await settle(target);
  check(
    'C03 compact scalar separate from wide preference',
    target.compactOpen && !target.expanded && drawer(target).open,
    target.provider.state,
  );
  target.setCompactOpen(false);
  await settle(target);
  check(
    'C03 compact closing does not overwrite wide',
    !target.compactOpen && !target.expanded,
    target.provider.state,
  );
  target.compact = false;
  target.collapseMode = 'none';
  await settle(target);
  check('C06 none inert wide only', !target.toggle() && !target.expanded, target.provider.state);
  target.compact = true;
  await settle(target);
  check(
    'C06 none compact remains modal capable',
    target.toggle() && target.compactOpen,
    target.provider.state,
  );
  target.remove();
  unsubscribe();
  return [...records];
}
async function assertIdentityAndBoundary() {
  records.length = 0;
  panel.compact = false;
  panel.setExpanded(true);
  await settle();
  const input = panel.querySelector<TpNavigationPanelInput>('#filter')!;
  const initialInput = input.inputElement;
  const initialForm = input.form;
  const initialView = view();
  const projection = panel.renderRoot.querySelector<HTMLSlotElement>(
    'slot[name="__navigation-view"]',
  )!;
  const initialRoot = projection.getRootNode();
  check(
    'C14 persistent light view retains native form owner',
    initialForm === document.querySelector('#native-form') && initialView.contains(input),
    { form: initialForm?.id, view: initialView.contains(input) },
  );
  panel.compact = true;
  await settle();
  check(
    'C05 projection relocates within Root shadow',
    projection.parentNode === drawer() &&
      projection.getRootNode() === initialRoot &&
      initialRoot === panel.shadowRoot,
    {
      parent: projection.parentElement?.localName,
      rootSame: projection.getRootNode() === initialRoot,
    },
  );
  panel.setCompactOpen(true);
  await settle();
  check(
    'C14 actual Drawer opens native modal',
    drawer().open && drawer().renderRoot.querySelector('dialog')?.matches(':modal'),
    drawer().renderRoot.querySelector('dialog')?.outerHTML.slice(0, 400),
  );
  check(
    'C05 authored input/native target/form identity preserved compact',
    panel.querySelector('#filter') === input &&
      input.inputElement === initialInput &&
      input.form === initialForm &&
      view() === initialView,
    { sameInput: input.inputElement === initialInput, form: input.form?.id },
  );
  input.focus();
  panel.compact = false;
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 400));
  await settle();
  check(
    'C05 boundary closes compact scalar and native modal',
    !panel.compactOpen &&
      !drawer().open &&
      !drawer().renderRoot.querySelector('dialog')?.matches(':modal'),
    { state: panel.provider.state, presence: drawer().presenceState },
  );
  check(
    'C05 cleanup precedes wide slot relocation with identities retained',
    projection.parentElement?.classList.contains('wide') === true &&
      projection.getRootNode() === initialRoot &&
      input.inputElement === initialInput &&
      input.form === initialForm,
    { parent: projection.parentElement?.className, form: input.form?.id },
  );
  panel.compact = true;
  await settle();
  check(
    'C05 returning compact starts closed',
    !panel.compactOpen && !drawer().open,
    panel.provider.state,
  );
  panel.compact = false;
  await settle();
  return [...records];
}
async function assertControlsAndConstituents() {
  records.length = 0;
  panel.compact = false;
  panel.setExpanded(true);
  await settle();
  const trigger = panel.querySelector<TpButton>('#trigger')!;
  const rail = panel.querySelector<TpButton>('#rail')!;
  const link = panel.querySelector<TpButton>('#overview')!;
  const command = panel.querySelector<TpButton>('#command')!;
  check(
    'C12 actual Button trigger semantics/relationship',
    semantic(trigger, 'button').localName === 'button' &&
      semantic(trigger, 'button').getAttribute('aria-expanded') === 'true' &&
      semantic(trigger, 'button').ariaControlsElements?.includes(view()) === true,
    semantic(trigger, 'button').outerHTML,
  );
  const before = events.length;
  trigger.click();
  await settle();
  check(
    'C12 one wide activation proposal',
    !panel.expanded &&
      events.slice(before).filter((event) => event.type === 'tp-value-change').length === 1,
    events.slice(before),
  );
  rail.click();
  await settle();
  check(
    'C13 rail toggles same wide owner and remains outside tab order',
    panel.expanded && semantic(rail, 'button').tabIndex === -1,
    { state: panel.provider.state, tabIndex: semantic(rail, 'button').tabIndex },
  );
  check(
    'C18 destinations native links and active source state',
    semantic(link, 'button').localName === 'a' &&
      semantic(link, 'button').getAttribute('href') === '#overview-content' &&
      semantic(link, 'button').getAttribute('aria-current') === 'page',
    semantic(link, 'button').outerHTML,
  );
  check(
    'C19 commands remain actual native actions',
    semantic(command, 'button').localName === 'button' &&
      !semantic(command, 'button').hasAttribute('href'),
    semantic(command, 'button').outerHTML,
  );
  const loading = panel.querySelector<TpNavigationPanelLoadingPlaceholder>('#loading')!;
  const initialWidth = loading.textWidth;
  await loading.updateComplete;
  check(
    'C21 loading uses actual Skeleton/text only by default',
    loading.renderRoot.querySelectorAll('tp-skeleton').length === 1 &&
      parseFloat(initialWidth) >= 50 &&
      parseFloat(initialWidth) <= 90,
    { count: loading.renderRoot.querySelectorAll('tp-skeleton').length, width: initialWidth },
  );
  loading.showIcon = true;
  await loading.updateComplete;
  check(
    'C21 optional icon independent and lifetime width stable',
    loading.renderRoot.querySelectorAll('tp-skeleton').length === 2 &&
      loading.textWidth === initialWidth,
    { count: loading.renderRoot.querySelectorAll('tp-skeleton').length, width: loading.textWidth },
  );
  loading.showIcon = false;
  check(
    'C20 Badge and C24 Separator inherit actual owners',
    (panel.querySelector('#badge') as TpElement).renderRoot.querySelector('[part~="badge"]') !==
      null &&
      (panel.querySelector('#separator') as TpElement).renderRoot.querySelector('[role="none"]') !==
        null,
    {
      badge: panel.querySelector('#badge')?.localName,
      separator: panel.querySelector('#separator')?.localName,
    },
  );
  panel.compact = true;
  await settle();
  const start = events.length;
  trigger.click();
  await settle();
  check(
    'C12 compact trigger one actual Drawer bridge proposal',
    panel.compactOpen &&
      events.slice(start).filter((event) => event.type === 'tp-open-change').length === 1,
    events.slice(start),
  );
  panel.setCompactOpen(false);
  panel.compact = false;
  await settle();
  return [...records];
}
async function assertCustomization() {
  records.length = 0;
  const target = await create({ variant: 'floating' });
  const ref = { current: null as HTMLElement | null };
  let seen: unknown;
  target.partContracts = {
    'navigation-panel': {
      renderDelegate: ({ state, bind, content }) => {
        seen = state;
        return html`<nav ${bind}>${content}</nav>`;
      },
      elementReference: ref,
      hostProperties: { title: 'Consumer nav', id: 'forged' },
      classHook: 'consumer-nav',
      styleHook: { '--nav-fixture': 'owned' },
    },
  };
  await settle(target);
  check(
    'C26 actual delegated semantic target/neutral hooks and protected id',
    ref.current?.localName === 'nav' &&
      ref.current.title === 'Consumer nav' &&
      ref.current.id !== 'forged' &&
      ref.current.classList.contains('consumer-nav') &&
      ref.current.style.getPropertyValue('--nav-fixture') === 'owned',
    ref.current?.outerHTML.slice(0, 500),
  );
  target.setExpanded(false);
  await settle(target);
  check(
    'C27 delegate committed state agrees markers',
    (seen as { expanded: boolean }).expanded === false &&
      ref.current!.hasAttribute('data-collapsed'),
    { seen, collapsed: ref.current!.hasAttribute('data-collapsed') },
  );
  const original = ref.current;
  target.partContracts = {};
  await settle(target);
  check(
    'C26 outgoing ref cleanup/default host restoration',
    ref.current === null &&
      !original!.isConnected &&
      view(target).shadowRoot!.querySelector('nav') !== original,
    { ref: ref.current, oldConnected: original!.isConnected },
  );
  target.side = 'inline-end';
  target.dir = 'rtl';
  await settle(target);
  check(
    'C07 logical side resolves inherited Drawer physical edge',
    drawer(target).side === 'left',
    drawer(target).side,
  );
  target.remove();
  return [...records];
}
async function assertInitialCompactTrigger() {
  records.length = 0;
  const target = document.createElement('tp-navigation-panel') as TpNavigationPanel;
  target.compact = true;
  target.label = 'Initially compact navigation';
  const trigger = document.createElement('tp-navigation-panel-trigger') as TpButton;
  trigger.ariaLabel = 'Open initially compact navigation';
  target.append(trigger);
  const changes: unknown[] = [];
  target.addEventListener('tp-open-change', (event) => changes.push((event as CustomEvent).detail));
  dynamic.append(target);
  await settle(target);
  const control = semantic(trigger, 'button');
  check(
    'C12 initial compact trigger native relationship uses actual Drawer registration',
    control.getAttribute('aria-haspopup') === 'dialog' &&
      control.ariaControlsElements?.includes(view(target)) === true,
    control.outerHTML,
  );
  trigger.click();
  await settle(target);
  check(
    'C12 initial compact activation commits once through actual Drawer',
    target.compactOpen && drawer(target).open && changes.length === 1,
    { state: target.provider.state, count: changes.length },
  );
  target.compact = false;
  await settle(target);
  await new Promise((resolve) => setTimeout(resolve, 400));
  await settle(target);
  check(
    'C05 initially compact boundary releases actual modal and returns trigger wide relationship',
    !target.compactOpen &&
      !drawer(target).renderRoot.querySelector('dialog')?.matches(':modal') &&
      control.getAttribute('aria-expanded') === 'true' &&
      !control.hasAttribute('aria-haspopup'),
    { state: target.provider.state, html: control.outerHTML },
  );
  target.remove();
  return [...records];
}
async function assertOffcanvasVisibility() {
  records.length = 0;
  panel.compact = false;
  panel.collapseMode = 'off-canvas';
  panel.setExpanded(true);
  await settle();
  const input = panel.querySelector<TpNavigationPanelInput>('#filter')!;
  const original = input.inputElement;
  panel.setExpanded(false);
  await settle();
  check(
    'C06 off-canvas closed navigation is inert and hidden from AT with nodes retained',
    view().inert &&
      view().getAttribute('aria-hidden') === 'true' &&
      input.inputElement === original &&
      original!.isConnected,
    {
      inert: view().inert,
      hidden: view().getAttribute('aria-hidden'),
      identity: input.inputElement === original,
    },
  );
  panel.compact = true;
  await settle();
  check(
    'C05 compact projection restores navigation interactivity without changing wide preference',
    !view().inert &&
      !view().hasAttribute('aria-hidden') &&
      !panel.expanded &&
      input.inputElement === original,
    { state: panel.provider.state, inert: view().inert },
  );
  panel.compact = false;
  panel.collapseMode = 'compact';
  panel.setExpanded(true);
  await settle();
  check(
    'C06 reopened wide view restores native field and AT visibility',
    !view().inert && !view().hasAttribute('aria-hidden') && input.inputElement === original,
    { state: panel.provider.state, inert: view().inert },
  );
  return [...records];
}
async function assertNativeHookContexts() {
  records.length = 0;
  panel.compact = false;
  panel.variant = 'floating';
  await settle();
  const input = panel.querySelector<TpNavigationPanelInput>('#filter')!;
  const link = panel.querySelector<TpNavigationPanelLink>('#overview')!;
  let rootInput: unknown;
  let localInput: unknown;
  let rootLink: unknown;
  let localLink: unknown;
  const reference = { current: null as HTMLElement | null };
  panel.partContracts = {
    'navigation-panel-input': {
      classHook: (state) => {
        rootInput = state;
        return 'root-input-context';
      },
      elementReference: reference,
    },
    'navigation-panel-link': {
      classHook: (state) => {
        rootLink = state;
        return 'root-link-context';
      },
    },
  };
  input.partContracts = {
    input: {
      classHook: (state) => {
        localInput = state;
        return 'native-input-context';
      },
      hostProperties: { title: 'Native input hook' },
    },
  };
  link.variant = 'outline';
  link.partContracts = {
    button: {
      classHook: (state) => {
        localLink = state;
        return 'native-link-context';
      },
    },
  };
  await settle();
  check(
    'C26 Input root hooks receive Provider state and local hooks retain actual committed value',
    (rootInput as { variant: string })?.variant === 'floating' &&
      (localInput as { value: string })?.value === input.value &&
      input.inputElement!.classList.contains('root-input-context') &&
      input.inputElement!.classList.contains('native-input-context') &&
      reference.current === input.inputElement &&
      input.inputElement!.title === 'Native input hook',
    {
      rootInput,
      localInput,
      title: input.inputElement?.title,
      ref: reference.current === input.inputElement,
    },
  );
  check(
    'C26 Button root hooks receive Provider state and local hooks retain native variant/href',
    (rootLink as { variant: string })?.variant === 'floating' &&
      (localLink as { variant: string; href: string })?.variant === 'outline' &&
      (localLink as { href: string }).href === '#overview-content' &&
      semantic(link, 'button').classList.contains('root-link-context') &&
      semantic(link, 'button').classList.contains('native-link-context'),
    { rootLink, localLink },
  );
  const original = input.inputElement;
  input.partContracts = {
    input: {
      renderDelegate: ({ state, bind }) => {
        localInput = state;
        return html`<input ${bind} />`;
      },
    },
  };
  await settle();
  check(
    'C26 delegated actual Input retains native form/commit owner and root ref',
    input.inputElement !== original &&
      reference.current === input.inputElement &&
      input.form === document.querySelector('#native-form') &&
      (localInput as { value: string })?.value === input.value,
    { value: input.value, nativeValue: input.inputElement?.value, form: input.form?.id },
  );
  input.partContracts = {};
  link.partContracts = {};
  link.variant = 'ghost';
  panel.partContracts = {};
  panel.variant = 'integrated';
  await settle();
  check(
    'C26 removing root hook releases adapted ref and terminal native targets stay mounted',
    reference.current === null && input.inputElement?.isConnected === true,
    { ref: reference.current, connected: input.inputElement?.isConnected },
  );
  return [...records];
}
async function assertCopiedDocumentation() {
  records.length = 0;
  const copied = documentation.match(/```js\n([\s\S]*?)\n```/)?.[1];
  if (!copied) throw new Error('Missing executable documentation source');
  const script = copied.replace(/^import[^\n]*;\n/gm, '');
  const container = (await Function(
    'navigationIcons',
    'plusIcon',
    `return (async () => { ${script}\nreturn example; })();`,
  )(navigationIcons, plusIcon)) as HTMLElement;
  const target = container.querySelector<TpNavigationPanel>('tp-navigation-panel')!;
  await settle(target);
  check(
    'C30 copied complete public composition mounts actual Root and constituent controls',
    target.provider.state.expanded &&
      !target.provider.compact &&
      target.querySelectorAll('tp-navigation-panel-link').length === 3 &&
      target.querySelectorAll('tp-collapsible').length === 4 &&
      target.querySelectorAll('tp-menu').length === 5 &&
      target.querySelectorAll('tp-avatar').length === 2 &&
      target.querySelector('tp-navigation-panel-footer tp-menu')?.getAttribute('label') ===
        'Account',
    {
      state: target.provider.state,
      count: target.querySelectorAll('tp-navigation-panel-link').length,
    },
  );
  const trigger = target.querySelector<TpButton>('tp-navigation-panel-trigger')!;
  trigger.click();
  await settle(target);
  check(
    'C30 copied controlled owner accepts actual Button proposal',
    !target.expanded && semantic(trigger, 'button').getAttribute('aria-expanded') === 'false',
    { state: target.provider.state, html: semantic(trigger, 'button').outerHTML },
  );
  target.compact = true;
  await settle(target);
  trigger.click();
  await settle(target);
  check(
    'C30 copied composition uses same actual compact Drawer',
    target.compactOpen &&
      drawer(target).open &&
      drawer(target).renderRoot.querySelector('dialog')?.matches(':modal') === true,
    { state: target.provider.state, presence: drawer(target).presenceState },
  );
  container.remove();
  return [...records];
}
async function assertDelegatedSemantics() {
  records.length = 0;
  panel.compact = false;
  panel.setExpanded(true);
  await settle();
  const hooks = Object.fromEntries(
    [
      'navigation-panel',
      'navigation-panel-inset',
      'navigation-panel-menu',
      'navigation-panel-item',
      'navigation-panel-submenu',
      'navigation-panel-subitem',
    ].map((name) => [
      name,
      {
        hostProperties: { '.role': 'checkbox' },
        renderDelegate: ({
          bind,
          content,
        }: import('../../../../src/foundation/part.js').PartRenderContext) =>
          html`<div ${bind}>${content}</div>`,
      },
    ]),
  );
  panel.partContracts = hooks;
  await settle();
  const nav = view().shadowRoot!.querySelector<HTMLElement>('[part~="navigation-panel"]')!;
  check(
    'C26 delegated navigation target protects named navigation semantics',
    nav.localName === 'div' &&
      nav.getAttribute('role') === 'navigation' &&
      nav.getAttribute('aria-label') === panel.label,
    nav.outerHTML.slice(0, 400),
  );
  for (const [tag, part, role] of [
    ['inset', 'navigation-panel-inset', 'main'],
    ['menu', 'navigation-panel-menu', 'list'],
    ['item', 'navigation-panel-item', 'listitem'],
    ['submenu', 'navigation-panel-submenu', 'list'],
    ['subitem', 'navigation-panel-subitem', 'listitem'],
  ] as const) {
    const member = panel.querySelector<TpElement>(`tp-navigation-panel-${tag}`)!;
    const target = semantic(member, part);
    check(
      `C26 delegated ${tag} preserves protected native ${role} semantics`,
      target.localName === 'div' && target.getAttribute('role') === role,
      target.outerHTML.slice(0, 250),
    );
  }
  panel.partContracts = {};
  await settle();
  return [...records];
}
async function assertSlottedButtonReplacement() {
  records.length = 0;
  const target = await create();
  const trigger = document.createElement('tp-button') as TpButton;
  trigger.slot = 'trigger';
  trigger.textContent = 'Interoperable toggle';
  target.append(trigger);
  await settle(target);
  const original = semantic(trigger, 'button');
  check(
    'C12 authored standard Button slot registers actual native target',
    original.getAttribute('aria-expanded') === 'true' &&
      original.ariaControlsElements?.includes(view(target)) === true,
    original.outerHTML,
  );
  trigger.partContracts = {
    button: { renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>` },
  };
  await settle(target);
  const replacement = semantic(trigger, 'button');
  trigger.click();
  await settle(target);
  check(
    'C26 standard Button delegated host replacement retains current activation/relationship',
    replacement !== original &&
      !original.isConnected &&
      !target.expanded &&
      replacement.getAttribute('aria-expanded') === 'false',
    { state: target.provider.state, html: replacement.outerHTML },
  );
  target.compact = true;
  await settle(target);
  trigger.click();
  await settle(target);
  check(
    'C12 standard Button replacement reaches same actual compact Drawer lane',
    target.compactOpen &&
      drawer(target).open &&
      replacement.getAttribute('aria-haspopup') === 'dialog',
    { state: target.provider.state, html: replacement.outerHTML },
  );
  trigger.remove();
  await settle(target);
  const before = target.compactOpen;
  replacement.click();
  await settle(target);
  check(
    'C28 removed standard Button target releases activation ownership',
    target.compactOpen === before,
    target.provider.state,
  );
  target.remove();
  return [...records];
}
async function assertControlsRelationships() {
  records.length = 0;
  const target = await create();
  const authored = document.createElement('div');
  authored.id = 'authored-controls-reference';
  dynamic.append(authored);
  const trigger = document.createElement('tp-button') as TpButton;
  trigger.slot = 'trigger';
  trigger.textContent = 'Relationship toggle';
  dynamic.append(trigger);
  await trigger.updateComplete;
  const control = semantic(trigger, 'button');
  // The controlled target is outside Button's shadow root. Use the explicit
  // element relationship rather than an unresolved shadow-scoped IDREF.
  control.ariaControlsElements = [authored];
  control.setAttribute('aria-expanded', 'authored');
  control.setAttribute('aria-haspopup', 'menu');
  target.append(trigger);
  await settle(target);
  const persistentView = view(target);
  check(
    'C12 wide relationship reaches persistent View through allowed ancestor scope',
    control.ariaControlsElements?.includes(persistentView) === true &&
      persistentView.getRootNode() === document &&
      control.getRootNode() === trigger.shadowRoot,
    { controls: control.ariaControlsElements?.map((element) => element.id) },
  );
  check(
    'C12 wide relationship preserves authored control reference',
    control.ariaControlsElements?.includes(authored) === true,
    control.outerHTML,
  );
  target.compact = true;
  await settle(target);
  check(
    'C12 compact actual Drawer registration retains same persistent View target',
    control.ariaControlsElements?.includes(persistentView) === true &&
      control.ariaControlsElements?.includes(authored) === true &&
      control.getAttribute('aria-haspopup') === 'dialog',
    control.outerHTML,
  );
  target.compact = false;
  await settle(target);
  check(
    'C12 boundary restores wide relationship without private Drawer host reference',
    control.ariaControlsElements?.includes(persistentView) === true &&
      control.ariaControlsElements?.includes(drawer(target)) === false &&
      !control.hasAttribute('aria-haspopup'),
    control.outerHTML,
  );
  trigger.remove();
  await settle(target);
  // Explicit relationship getters filter targets outside the current scope
  // while disconnected. Reconnect outside Provider to inspect restored metadata.
  dynamic.append(trigger);
  await trigger.updateComplete;
  check(
    'C28 removal restores authored controls attribute and relationship metadata',
    control.ariaControlsElements?.includes(authored) === true &&
      control.getAttribute('aria-expanded') === 'authored' &&
      control.getAttribute('aria-haspopup') === 'menu',
    control.outerHTML,
  );
  target.append(trigger);
  await settle(target);
  control.setAttribute('aria-controls', 'consumer-later-reference');
  control.setAttribute('aria-expanded', 'consumer-later');
  control.setAttribute('aria-haspopup', 'tree');
  trigger.remove();
  await settle(target);
  check(
    'C28 removal preserves later consumer relationship writes',
    control.getAttribute('aria-controls') === 'consumer-later-reference' &&
      control.getAttribute('aria-expanded') === 'consumer-later' &&
      control.getAttribute('aria-haspopup') === 'tree',
    control.outerHTML,
  );
  authored.remove();
  target.remove();
  return [...records];
}
await settle();
Object.assign(window, {
  navigationPanelAPI: {
    built,
    panel,
    api,
    events,
    records,
    settle,
    view,
    drawer,
    semantic,
    assertProvider,
    assertIdentityAndBoundary,
    assertControlsAndConstituents,
    assertCustomization,
    assertInitialCompactTrigger,
    assertOffcanvasVisibility,
    assertNativeHookContexts,
    assertCopiedDocumentation,
    assertDelegatedSemantics,
    assertSlottedButtonReplacement,
    assertControlsRelationships,
  },
});
await import('./review.js');
