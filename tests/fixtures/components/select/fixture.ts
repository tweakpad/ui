import { html, render } from 'lit';
import type { PartRenderContext } from '../../../../src/foundation/part.js';
import type { TpSelect } from '../../../../src/components/select/index.js';
const built = new URL(location.href).searchParams.has('package');
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(style);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const { boldIcon, italicIcon, underlineIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/text-formatting.js' : '/src/icons/text-formatting.ts'
);
const byId = (id: string): TpSelect => document.getElementById(id) as TpSelect;
const fruit = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'disabled', label: 'Unavailable', disabled: true },
];
byId('single').items = fruit;
byId('rich').items = [
  {
    type: 'group',
    label: 'Formatting',
    items: [
      {
        value: 'bold',
        label: html`<tp-icon .icon=${boldIcon} size="var(--tp-icon-size-sm)"></tp-icon> Bold`,
        text: 'Bold',
      },
      {
        value: 'italic',
        label: html`<tp-icon .icon=${italicIcon} size="var(--tp-icon-size-sm)"></tp-icon> Italic`,
        text: 'Italic',
        indicatorKeepMounted: true,
      },
    ],
  },
  { type: 'separator' },
  {
    type: 'group',
    label: 'Other',
    items: [
      {
        value: 'underline',
        label: html`<tp-icon .icon=${underlineIcon} size="var(--tp-icon-size-sm)"></tp-icon>
          Underline`,
        text: 'Underline',
      },
    ],
  },
];
byId('multiple').items = [
  { value: 'bold', label: 'Bold' },
  { value: 'italic', label: 'Italic' },
  { value: 'underline', label: 'Underline' },
];
byId('long').items = Array.from({ length: 70 }, (_, index) => ({
  value: `country-${index}`,
  label: `Country ${index + 1}`,
}));
byId('long').scrollUpKeepMounted = true;
byId('offset').items = fruit;
byId('offset').alignItemWithTrigger = false;
byId('offset').sideOffset = 12;
byId('offset').showArrow = true;
byId('portal').items = fruit;
byId('portal').container = document.getElementById('portal-target');
render(
  html`<tp-dialog label="Selection in Dialog"
    ><tp-button slot="trigger" variant="outline">Open select dialog</tp-button
    ><tp-field label="Nested fruit"
      ><tp-select
        id="nested"
        .items=${fruit}
        placeholder="Choose nested fruit"
      ></tp-select></tp-field
    ><tp-button data-dialog-close variant="outline">Close dialog</tp-button></tp-dialog
  >`,
  document.getElementById('dialog-host')!,
);
await Promise.all(
  [...document.querySelectorAll('tp-select')].map((host) => (host as TpSelect).updateComplete),
);
const bounded = async <T>(promise: PromiseLike<T>, label: string, duration = 1800): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout: ${label}`)), duration);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const wait = async (host: TpSelect): Promise<void> => {
  await bounded(host.updateComplete, 'updateComplete');
  await bounded(
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    ),
    'rendered frames',
  );
  await bounded(host.updateComplete, 'settled update');
};
const settle = async (host: TpSelect): Promise<void> => {
  await wait(host);
  await delay(180);
  await wait(host);
};
const activeElement = (): Element | null => {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
};
const key = (
  target: Element,
  key: string,
  type = 'keydown',
  extra: KeyboardEventInit = {},
): void => {
  target.dispatchEvent(
    new KeyboardEvent(type, { key, bubbles: true, composed: true, cancelable: true, ...extra }),
  );
};
const testHosts = new Set<TpSelect>();
const cleanups: Array<() => void> = [];
const assertion = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};
const cases: Array<{ name: string; passed: boolean; detail?: string }> = [];
async function test(name: string, run: () => void | Promise<void>): Promise<void> {
  try {
    await run();
    cases.push({ name, passed: true });
  } catch (error) {
    cases.push({ name, passed: false, detail: String(error) });
  } finally {
    for (const host of testHosts) host.remove();
    testHosts.clear();
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  }
}
async function make(properties: Record<string, unknown> = {}): Promise<TpSelect> {
  const host = document.createElement('tp-select') as TpSelect;
  testHosts.add(host);
  Object.assign(host, { items: fruit, label: 'API choice', modal: false, ...properties });
  document.getElementById('test-host')!.append(host);
  await wait(host);
  return host;
}
async function choose(host: TpSelect, text: string): Promise<void> {
  host.setOpen(true);
  await wait(host);
  const option = [...host.listElement!.querySelectorAll<HTMLElement>('[role=option]')].find(
    (element) => element.textContent!.includes(text),
  );
  assertion(option, `Missing option ${text}`);
  option!.focus();
  await wait(host);
  option!.click();
  await wait(host);
}
async function apiChecks() {
  cases.length = 0;
  await test('Uncontrolled single committed selection and accepted close', async () => {
    const host = await make({ name: 'choice' });
    await choose(host, 'Banana');
    assertion(host.value === 'banana' && !host.open, 'single commit/close');
    host.remove();
  });
  await test('Multiple ordered toggle remains open', async () => {
    const host = await make({ multiple: true });
    await choose(host, 'Cherry');
    await choose(host, 'Apple');
    assertion(JSON.stringify(host.value) === '["cherry","apple"]' && host.open, 'ordered append');
    await choose(host, 'Cherry');
    assertion(JSON.stringify(host.value) === '["apple"]', 'ordered removal');
    host.remove();
  });
  await test('Controlled synchronous owner acceptance and DOM veto', async () => {
    const host = await make({ value: 'apple' });
    host.onValueChange = (event) => {
      host.value = event.detail.value;
    };
    const veto = (event: Event) => event.preventDefault();
    host.addEventListener('tp-value-change', veto);
    await choose(host, 'Banana');
    assertion(host.value === 'apple' && host.open, 'veto leaked owner value/closed');
    host.removeEventListener('tp-value-change', veto);
    await choose(host, 'Cherry');
    assertion(host.value === 'cherry' && !host.open, 'accepted owner value');
    host.remove();
  });
  await test('Controlled owner publishing later still closes on the item press', async () => {
    const host = await make({ value: 'apple' });
    host.onValueChange = (event) => {
      queueMicrotask(() => {
        host.value = event.detail.value;
      });
    };
    await choose(host, 'Banana');
    assertion(!host.open, 'late owner publication kept the popup open');
    assertion(host.value === 'banana', 'late owner publication lost');
    host.remove();
  });
  await test('Controlled owner ignoring the proposal closes and keeps its value', async () => {
    const host = await make({ value: 'apple' });
    await choose(host, 'Cherry');
    assertion(!host.open, 'ignored proposal kept the popup open');
    assertion(host.value === 'apple', 'ignored proposal changed the value');
    host.remove();
  });
  await test('ReadOnly opens but rejects value change', async () => {
    const host = await make({ readOnly: true });
    await choose(host, 'Banana');
    assertion(host.value === null && host.open, 'readonly changed/closed');
    host.remove();
  });
  await test('Custom equality, duplicate source, unknown controlled value', async () => {
    const host = await make({
      items: [
        { value: { id: 1 }, label: 'One' },
        { value: { id: 1 }, label: 'Duplicate' },
      ],
      value: { id: 1 },
      isItemEqual: (a: { id: number }, b: { id: number }) => a?.id === b?.id,
      itemToText: (value: { id: number }) => `Number ${value.id}`,
    });
    host.setOpen(true);
    await wait(host);
    assertion(
      host.listElement!.querySelectorAll('[role=option]').length === 1,
      'duplicate not excluded',
    );
    assertion(host.listElement!.querySelector('[aria-selected=true]'), 'custom match missing');
    host.value = { id: 2 };
    await wait(host);
    assertion(!host.listElement!.querySelector('[aria-selected=true]'), 'unknown claims option');
    host.remove();
  });
  await test('Dynamic source preserves highlighted identity and fallback', async () => {
    const host = await make({ defaultValue: 'banana' });
    host.setOpen(true);
    await wait(host);
    host.items = [fruit[2]!, fruit[1]!, fruit[0]!];
    await wait(host);
    assertion(host.highlightedValue === 'banana', 'reorder lost identity');
    host.items = [fruit[0]!];
    await wait(host);
    assertion(host.highlightedValue === 'apple', 'removal fallback');
    host.remove();
  });
  await test('Open callback cancellation + explicit later publication', async () => {
    const host = await make({ open: false });
    host.onOpenChange = (event) => {
      host.open = event.detail.value;
    };
    const veto = (event: Event) => event.preventDefault();
    host.addEventListener('tp-open-change', veto);
    host.setOpen(true);
    await wait(host);
    assertion(!host.open, 'open veto leaked');
    host.removeEventListener('tp-open-change', veto);
    host.open = true;
    await wait(host);
    assertion(host.open && host.popupElement, 'explicit same value failed');
    host.remove();
  });
  await test('Explicit portal uses real part bindings + independent placement', async () => {
    const portal = document.createElement('div');
    document.body.append(portal);
    const host = await make({ container: portal, alignItemWithTrigger: false, sideOffset: 15 });
    host.setOpen(true);
    await wait(host);
    await host.updatePosition();
    assertion(
      portal.querySelector('[data-select-portal]')?.shadowRoot?.contains(host.popupElement!),
      'portal ownership',
    );
    assertion(host.popupElement!.hasAttribute('data-positioned'), 'portal geometry');
    await choose(host, 'Apple');
    assertion(host.value === 'apple', 'portal activation');
    host.remove();
    assertion(!portal.childElementCount, 'portal cleanup');
    portal.remove();
  });
  await test('Repeated scalar/exact record source renders a single stable option', async () => {
    const entry = { value: 'same', label: 'Same' };
    const host = await make({ items: ['apple', 'apple', entry, entry] });
    host.setOpen(true);
    await wait(host);
    assertion(
      host.listElement!.querySelectorAll('[role=option]').length === 2,
      'duplicate identity rendered twice',
    );
    host.items = [entry, 'apple', entry];
    await wait(host);
    assertion(
      host.listElement!.querySelectorAll('[role=option]').length === 2,
      'repeat reorder broke identity',
    );
  });
  await test('Controlled plus default emits one diagnostic and retains controlled owner', async () => {
    const messages: string[] = [];
    const listen = (event: Event) => messages.push((event as CustomEvent).detail.message);
    document.addEventListener('tp-diagnostic', listen);
    cleanups.push(() => document.removeEventListener('tp-diagnostic', listen));
    const host = await make({ value: 'apple', defaultValue: 'banana' });
    host.requestUpdate();
    await wait(host);
    await choose(host, 'Cherry');
    assertion(
      host.value === 'apple' && messages.filter((text) => text.includes('not both')).length === 1,
      'invalid ownership was silent or changed mode',
    );
  });
  await test('Native repeated FormData, reset, restore and disabled fieldset', async () => {
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    form.append(fieldset);
    document.body.append(form);
    cleanups.push(() => form.remove());
    const host = await make({ multiple: true, name: 'fruit', defaultValue: ['apple'] });
    fieldset.append(host);
    await wait(host);
    await choose(host, 'Cherry');
    assertion(
      JSON.stringify(new FormData(form).getAll('fruit')) === '["apple","cherry"]',
      'form order/serialization',
    );
    form.reset();
    await wait(host);
    assertion(JSON.stringify(host.value) === '["apple"]', 'reset default');
    host.formStateRestoreCallback('["banana","cherry"]', 'restore');
    await wait(host);
    assertion(
      JSON.stringify(new FormData(form).getAll('fruit')) === '["banana","cherry"]',
      'restore serialization',
    );
    fieldset.disabled = true;
    await wait(host);
    assertion(
      new FormData(form).getAll('fruit').length === 0 &&
        host.triggerElement!.getAttribute('aria-disabled') === 'true',
      'fieldset disabled',
    );
  });
  await test('Native option attributes remain supported and mutation updates labels', async () => {
    const host = await make({ items: undefined, value: 'express' });
    host.innerHTML =
      '<optgroup label="Delivery"><option value="standard">Standard</option><option value="express">Express</option><option disabled value="priority">Priority</option></optgroup>';
    await wait(host);
    host.setOpen(true);
    await wait(host);
    assertion(
      host.value === 'express' &&
        host.listElement!.querySelector('[aria-selected=true]')?.textContent?.includes('Express'),
      'native source selected',
    );
    host.querySelector('option[value=express]')!.textContent = 'Fast';
    await wait(host);
    assertion(host.triggerElement!.textContent?.includes('Fast'), 'native label mutation');
  });
  await test('Removed focused option moves to live enabled fallback without closing', async () => {
    const host = await make({ defaultValue: 'banana', initialFocus: 'first' });
    host.setOpen(true);
    await wait(host);
    assertion(activeElement()?.textContent?.includes('Banana'), 'setup focus');
    host.items = [fruit[0]!, fruit[2]!];
    await wait(host);
    assertion(
      host.open && activeElement()?.textContent?.includes('Apple'),
      'removed focus fell outside',
    );
    host.items = [];
    await wait(host);
    assertion(host.open && activeElement() === host.triggerElement, 'empty focus fallback');
  });
  await test('Focus resolver true/null defaults and final closing interaction', async () => {
    const interactions: string[] = [];
    const host = await make({
      initialFocus: () => true,
      finalFocus: (interaction: string) => {
        interactions.push(interaction);
        return true;
      },
    });
    host.setOpen(true, 'keyboard', new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await wait(host);
    assertion(activeElement()?.getAttribute('role') === 'option', 'true ignored keyboard default');
    host.setOpen(false, 'escape-key', new KeyboardEvent('keydown', { key: 'Escape' }));
    await wait(host);
    assertion(
      interactions.at(-1) === 'keyboard' && activeElement() === host.triggerElement,
      'closing interaction/restoration',
    );
    host.initialFocus = { current: null };
    host.setOpen(true);
    await wait(host);
    assertion(activeElement() === host.triggerElement, 'empty ref default');
    host.close();
    await wait(host);
    assertion(interactions.at(-1) === '', 'programmatic close interaction');
  });
  await test('Independent item/scroll kept-mount visibility and required Arrow', async () => {
    const host = await make({
      items: [
        { value: 'a', label: 'Alpha', indicatorKeepMounted: true },
        { value: 'b', label: 'Beta' },
      ],
      scrollUpKeepMounted: true,
      showArrow: true,
      alignItemWithTrigger: false,
    });
    host.setOpen(true);
    await settle(host);
    const indicators = host.listElement!.querySelectorAll('.select-indicator');
    assertion(
      indicators.length === 1 && indicators[0]!.getAttribute('data-presence') === 'retained',
      'indicator independent keep',
    );
    assertion(
      host.popupElement!.querySelector('.select-scroll-up[data-presence=retained]') &&
        !host.popupElement!.querySelector('.select-scroll-down'),
      'scroll independent keep',
    );
    assertion(host.popupElement!.querySelector('.select-arrow svg path'), 'arrow real geometry');
  });
  await test('Retained close, accepted unmount, canceled unmount and re-open', async () => {
    const host = await make({ keepMounted: true });
    host.setOpen(true);
    await settle(host);
    host.close();
    await settle(host);
    assertion(host.popupElement && host.presenceState === 'retained', 'retained close');
    host.actions.unmount();
    await wait(host);
    assertion(!host.popupElement, 'unmount did not release retained');
    host.setOpen(true);
    await settle(host);
    const veto = (event: Event) => event.preventDefault();
    host.addEventListener('tp-open-change', veto);
    host.actions.unmount();
    await wait(host);
    assertion(host.open && host.popupElement, 'unmount ignored veto');
    host.removeEventListener('tp-open-change', veto);
    host.actions.unmount();
    await settle(host);
    assertion(!host.open && !host.popupElement, 'accepted unmount did not finish');
  });
  await test('Popup close retention event is accepted only with close', async () => {
    const host = await make();
    host.setOpen(true);
    await settle(host);
    host.onOpenChange = (event) => {
      if (!event.detail.value) event.detail.preventUnmountOnClose();
    };
    host.close();
    await settle(host);
    assertion(host.presenceState === 'retained', 'accepted retention missing');
    host.actions.unmount();
    await wait(host);
    assertion(!host.popupElement, 'retention release');
  });
  await test('Delegated Trigger and Option keep semantics, refs, and keyboard cancellation', async () => {
    const ref = { current: null as HTMLElement | null };
    let suppress = true;
    const host = await make({
      nativeAction: false,
      partContracts: {
        'select-trigger': {
          renderDelegate: ({ bind, content }: PartRenderContext) =>
            html`<section ${bind}>${content}</section>`,
          elementReference: ref,
        },
        'select-option': {
          renderDelegate: ({ bind, content }: PartRenderContext) =>
            html`<article ${bind}>${content}</article>`,
          hostProperties: {
            '@keydown': (event: KeyboardEvent) => event.stopPropagation(),
            '@keyup': (event: KeyboardEvent & { preventComponentHandling(): void }) => {
              if (suppress) event.preventComponentHandling();
            },
          },
        },
      },
    });
    assertion(
      ref.current === host.triggerElement &&
        ref.current?.localName === 'section' &&
        ref.current.getAttribute('role') === 'combobox',
      'trigger delegate/ref',
    );
    host.setOpen(true);
    await wait(host);
    const option = host.listElement!.querySelector<HTMLElement>('[role=option]')!;
    key(option, ' ');
    key(option, ' ', 'keyup');
    suppress = false;
    key(option, ' ', 'keyup');
    await wait(host);
    assertion(host.value === null, 'canceled Space left armed gesture');
    key(option, 'Enter');
    await wait(host);
    assertion(host.value === 'apple', 'stopPropagation suppressed own internal keyboard');
    host.partContracts = { 'select-trigger': { elementReference: ref } };
    await wait(host);
    assertion(
      ref.current === host.triggerElement && ref.current?.localName === 'div',
      'replacement stale ref',
    );
  });
  await test('Inherited shadow direction, locale and portal token clearing', async () => {
    const scope = document.createElement('div');
    const root = scope.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    root.append(inner);
    document.body.append(scope);
    cleanups.push(() => scope.remove());
    const portal = document.createElement('div');
    document.body.append(portal);
    cleanups.push(() => portal.remove());
    scope.dir = 'rtl';
    scope.lang = 'tr';
    scope.style.setProperty('--tp-select-test-token', '37px');
    const host = await make({
      container: portal,
      items: [
        { value: 'i', label: 'İzmir' },
        { value: 'dotless', label: 'Isparta' },
      ],
    });
    inner.append(host);
    await wait(host);
    host.setOpen(true);
    await wait(host);
    const portalHost = portal.querySelector<HTMLElement>('[data-select-portal]')!;
    assertion(
      portalHost.dir === 'rtl' &&
        portalHost.style.getPropertyValue('--tp-select-test-token') === '37px',
      'initial inheritance',
    );
    scope.dir = 'ltr';
    scope.style.removeProperty('--tp-select-test-token');
    await wait(host);
    assertion(
      portalHost.dir === 'ltr' && !portalHost.style.getPropertyValue('--tp-select-test-token'),
      'dynamic inheritance stale',
    );
    key(host.triggerElement!, 'ı');
    await wait(host);
    assertion(host.highlightedValue === 'dotless', 'inherited Turkish matching');
  });
  await test('Modal lease observes new outside descendants inside shadow scopes', async () => {
    const scope = document.createElement('div');
    const root = scope.attachShadow({ mode: 'open' });
    const inside = document.createElement('div');
    root.append(inside);
    document.body.append(scope);
    cleanups.push(() => scope.remove());
    const host = await make({ modal: true });
    inside.append(host);
    await wait(host);
    host.setOpen(true);
    await wait(host);
    const outside = document.createElement('tp-button');
    outside.textContent = 'Outside';
    root.append(outside);
    await wait(host);
    assertion(outside.hasAttribute('inert'), 'new shadow sibling not inert');
    host.close();
    await wait(host);
    assertion(!outside.hasAttribute('inert'), 'lease did not restore shadow sibling');
  });
  await test('Typeahead preserves exact prefix, unmatched reset, open reset, and IME', async () => {
    const host = await make({
      items: [
        { value: 'apple', label: 'Apple' },
        { value: 'aaron', label: 'Aaron' },
        { value: 'berry', label: 'Berry' },
      ],
    });
    host.setOpen(true);
    await wait(host);
    key(host.triggerElement!, 'a');
    key(host.triggerElement!, 'a');
    await wait(host);
    assertion(host.highlightedValue === 'aaron', 'double initial label cycling');
    key(host.triggerElement!, 'x');
    key(host.triggerElement!, 'b');
    await wait(host);
    assertion(host.highlightedValue === 'berry', 'unmatched reset');
    host.close();
    await wait(host);
    host.setOpen(true);
    await wait(host);
    key(host.triggerElement!, 'a');
    await wait(host);
    assertion(host.highlightedValue === 'aaron', 'opening reset buffer');
    key(host.triggerElement!, 'b', 'keydown', { isComposing: true });
    await wait(host);
    assertion(host.highlightedValue === 'aaron', 'composition changed highlight');
  });
  await test('Scroll repeat owns timer and stops after pointer release/close', async () => {
    let renders = 0;
    const host = await make({
      items: Array.from({ length: 80 }, (_, index) => ({ value: index, label: `Item ${index}` })),
      alignItemWithTrigger: false,
      partContracts: {
        'select-list': {
          styleHook: () => {
            renders++;
            return {};
          },
        },
      },
    });
    host.setOpen(true);
    await settle(host);
    const down = host.popupElement!.querySelector<HTMLElement>('.select-scroll-down')!;
    assertion(down, 'overflow scroll control missing');
    down.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await delay(100);
    assertion(host.listElement!.scrollTop > 0, 'hold did not scroll');
    down.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    const top = host.listElement!.scrollTop;
    await delay(90);
    assertion(host.listElement!.scrollTop === top, 'repeat leaked after release');
    host.listElement!.scrollTop =
      host.listElement!.scrollHeight - host.listElement!.clientHeight - 2;
    host.listElement!.dispatchEvent(new Event('scroll'));
    await wait(host);
    host
      .popupElement!.querySelector('.select-scroll-down')!
      .dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await settle(host);
    const atEdgeRenders = renders;
    await delay(120);
    assertion(renders === atEdgeRenders, 'repeat timer kept rendering after directional edge');
    host.close();
    await settle(host);
    assertion(!host.popupElement, 'closed scroll popup retained unexpectedly');
  });
  await test('Constrained popup clips overlay scroll controls and keeps focus and Arrow visible', async () => {
    const host = await make({
      items: Array.from({ length: 80 }, (_, index) => ({ value: index, label: `Item ${index}` })),
      alignItemWithTrigger: false,
      showArrow: true,
      partContracts: {
        'select-content': { styleHook: { 'max-block-size': '128px', 'border-radius': '18px' } },
      },
    });
    host.setOpen(true);
    await settle(host);
    const popup = host.popupElement!,
      list = host.listElement!;
    list.scrollTop = 200;
    list.dispatchEvent(new Event('scroll'));
    await wait(host);
    const body = popup.querySelector<HTMLElement>('.select-body')!;
    const bounds = popup.getBoundingClientRect();
    assertion(bounds.height <= 129, 'popup ignored its constrained height');
    for (const target of [list, ...popup.querySelectorAll<HTMLElement>('.select-scroll')]) {
      const rect = target.getBoundingClientRect();
      assertion(
        rect.top >= bounds.top - 1 &&
          rect.bottom <= bounds.bottom + 1 &&
          rect.left >= bounds.left - 1 &&
          rect.right <= bounds.right + 1,
        `scroll region escaped popup: ${target.className}`,
      );
    }
    assertion(
      getComputedStyle(body).overflow === 'hidden' &&
        getComputedStyle(body).borderRadius === getComputedStyle(popup).borderRadius,
      'scroll overlay bypasses rounded clip',
    );
    const arrow = popup.querySelector<HTMLElement>('.select-arrow')!;
    assertion(
      arrow.parentElement === popup &&
        !body.contains(arrow) &&
        getComputedStyle(popup).overflow === 'visible',
      'Arrow trapped inside rounded clip',
    );
    key(host.triggerElement!, 'Home');
    await wait(host);
    for (let index = 0; index < 6; index++) {
      key(host.triggerElement!, 'ArrowDown');
      await wait(host);
    }
    const focused = activeElement()!.getBoundingClientRect();
    const up = popup.querySelector<HTMLElement>('.select-scroll-up')!.getBoundingClientRect();
    const down = popup.querySelector<HTMLElement>('.select-scroll-down')!.getBoundingClientRect();
    assertion(
      focused.top >= up.bottom - 1 && focused.bottom <= down.top + 1,
      'keyboard focus hidden under a scroll overlay',
    );
  });
  await test('All public parts accept independent terminal hooks', async () => {
    const refs: Record<string, { current: HTMLElement | null }> = {};
    const names = [
      'select',
      'select-trigger',
      'select-value',
      'select-content',
      'select-list',
      'select-group',
      'select-label',
      'select-option',
      'select-separator',
      'select-scroll-up-button',
      'select-scroll-down-button',
    ];
    const contracts = Object.fromEntries(
      names.map((name) => [
        name,
        {
          classHook: `verified-${name}`,
          styleHook: { '--verified-part': name },
          elementReference: (refs[name] = { current: null }),
        },
      ]),
    );
    const host = await make({
      items: [{ type: 'group', label: 'Group', items: fruit }, { type: 'separator' }],
      scrollUpKeepMounted: true,
      scrollDownKeepMounted: true,
      partContracts: contracts,
    });
    host.setOpen(true);
    await settle(host);
    for (const name of names)
      assertion(
        refs[name]!.current?.classList.contains(`verified-${name}`) &&
          refs[name]!.current?.style.getPropertyValue('--verified-part') === name,
        `missing hook ${name}`,
      );
    assertion(host.value === null && host.open, 'hook changed state');
  });
  await test('Nested portaled choice stays inside parent floating focus/dismiss branch', async () => {
    const outerPortal = document.createElement('div'),
      innerPortal = document.createElement('div');
    document.body.append(outerPortal, innerPortal);
    cleanups.push(() => {
      outerPortal.remove();
      innerPortal.remove();
    });
    const parent = await make({ container: outerPortal });
    parent.setOpen(true);
    await wait(parent);
    const child = await make({ container: innerPortal, initialFocus: 'first' });
    parent.popupElement!.append(child);
    await wait(child);
    child.setOpen(true);
    await wait(child);
    await wait(parent);
    assertion(
      parent.open && child.open && activeElement()?.getAttribute('role') === 'option',
      'portaled child focus closed parent',
    );
    const option = child.listElement!.querySelector<HTMLElement>('[role=option]')!;
    option.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse' }),
    );
    await wait(parent);
    assertion(parent.open && child.open, 'inside child press dismissed branch');
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse' }),
    );
    await wait(child);
    await wait(parent);
    assertion(parent.open && !child.open, 'outside press did not dismiss only topmost');
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse' }),
    );
    await wait(parent);
    assertion(!parent.open, 'parent dismissal after child');
  });
  await test('Adoption awaits current constituents and preserves structural/recipe paint + focus', async () => {
    const host = await make({ initialFocus: 'first', alignItemWithTrigger: false });
    const frame = document.createElement('iframe');
    document.body.append(frame);
    cleanups.push(() => frame.remove());
    const target = frame.contentDocument!;
    const css = target.createElement('link');
    css.rel = 'stylesheet';
    css.href = style.href;
    const loaded = new Promise<void>((resolve, reject) => {
      css.onload = () => resolve();
      css.onerror = () => reject(new Error('iframe stylesheet'));
    });
    target.head.append(css);
    await bounded(loaded, 'adoption style');
    const freshIcon = document.createElement('tp-icon') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    const freshButton = document.createElement('tp-button') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    Object.assign(freshIcon, { icon: boldIcon, size: 'var(--tp-icon-size-sm)' });
    freshButton.textContent = 'Fresh foreign button';
    target.body.append(freshIcon, freshButton);
    await Promise.all([
      bounded(freshIcon.updateComplete, 'fresh foreign Icon first update'),
      bounded(freshButton.updateComplete, 'fresh foreign TpElement first update'),
    ]);
    const freshControl = freshButton.shadowRoot!.querySelector<HTMLElement>('[part~=button]')!;
    assertion(
      freshIcon.shadowRoot!.querySelector('svg') &&
        Math.abs(freshIcon.getBoundingClientRect().width - 16) < 0.5 &&
        target.defaultView!.getComputedStyle(freshControl).alignItems === 'center' &&
        freshControl.getBoundingClientRect().height > 0,
      'first foreign constituent structural/recipe paint',
    );
    freshIcon.remove();
    freshButton.remove();
    target.body.append(host);
    await wait(host);
    host.setOpen(true, 'keyboard', new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await wait(host);
    await Promise.all(
      [...host.shadowRoot!.querySelectorAll('tp-icon')].map(async (element) => {
        const icon = element as HTMLElement & {
          updateComplete: Promise<boolean>;
          hasUpdated: boolean;
          isUpdatePending: boolean;
        };
        try {
          await bounded(icon.updateComplete, 'adopted icon');
        } catch (error) {
          throw new Error(
            `${String(error)} ${JSON.stringify({
              connected: icon.isConnected,
              current: host.shadowRoot!.contains(icon),
              foreign: icon.ownerDocument === target,
              constructor: icon.constructor.name,
              hasUpdated: icon.hasUpdated,
              pending: icon.isUpdatePending,
              shadow: !!icon.shadowRoot,
              parentPart: icon.parentElement?.getAttribute('part'),
            })}`,
            { cause: error },
          );
        }
      }),
    );
    const computed = target.defaultView!.getComputedStyle(host.triggerElement!);
    assertion(
      computed.alignItems === 'center' && parseFloat(computed.borderTopWidth) > 0,
      'adopted structural/recipe paint',
    );
    assertion(
      host.popupElement!.hasAttribute('data-positioned') &&
        host.shadowRoot!.activeElement?.getAttribute('role') === 'option',
      'adopted positioning/focus',
    );
    host.close();
    await wait(host);
    assertion(host.shadowRoot!.activeElement === host.triggerElement, 'adopted final focus');
    document.getElementById('test-host')!.append(host);
    await wait(host);
    assertion(
      host.ownerDocument === document && host.triggerElement!.getAttribute('role') === 'combobox',
      'return adoption',
    );
  });
  await test('Aligned opening guards accidental release and accepts intentional item/drag press', async () => {
    const host = await make({ multiple: true });
    host.setOpen(true);
    await wait(host);
    const options = [...host.listElement!.querySelectorAll<HTMLElement>('[role=option]')];
    const apple = options[0]!,
      banana = options[1]!;
    banana.dispatchEvent(
      new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true, composed: true }),
    );
    banana.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true, composed: true }));
    await wait(host);
    assertion(JSON.stringify(host.value) === '[]', 'opening release selected neighboring option');
    apple.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'mouse',
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );
    apple.dispatchEvent(
      new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true, composed: true }),
    );
    apple.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true, composed: true }));
    await wait(host);
    assertion(JSON.stringify(host.value) === '["apple"]', 'item press not committed once');
    banana.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        buttons: 1,
        movementY: 10,
        bubbles: true,
        composed: true,
      }),
    );
    banana.dispatchEvent(
      new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true, composed: true }),
    );
    await wait(host);
    assertion(
      JSON.stringify(host.value) === '["apple","banana"]',
      'intentional drag release failed',
    );
  });
  await test('Removed source references release while replacement and closing content retain ownership', async () => {
    const references: Array<HTMLElement | null> = [];
    const item = {
      value: 'a',
      label: 'Alpha',
      partContract: { elementReference: (element: HTMLElement | null) => references.push(element) },
    };
    const host = await make({ items: [item, { value: 'b', label: 'Beta' }], keepMounted: true });
    host.setOpen(true);
    await settle(host);
    const first = references.at(-1);
    assertion(first?.isConnected, 'initial option ref');
    host.items = [{ value: 'b', label: 'Beta' }];
    await wait(host);
    assertion(references.at(-1) === null && !first!.isConnected, 'retired option ref not released');
    host.items = [item];
    await wait(host);
    const replacement = references.at(-1);
    assertion(replacement?.isConnected && replacement !== first, 'replacement ref stale');
    host.close();
    await settle(host);
    assertion(
      references.at(-1) === replacement && replacement!.isConnected,
      'retained popup lost constituent ref',
    );
    host.actions.unmount();
    await wait(host);
    assertion(references.at(-1) === null, 'unmount reference cleanup');
  });
  await test('Actual library icons use length tokens and inherit scoped size overrides', async () => {
    const host = await make({
      defaultValue: 'bold',
      items: [
        {
          value: 'bold',
          text: 'Bold',
          label: html`<tp-icon size="var(--tp-icon-size-sm)" .icon=${boldIcon}></tp-icon>Bold`,
        },
        { value: 'italic', label: 'Italic' },
      ],
    });
    host.setOpen(true);
    await settle(host);
    const icons = [
      ...host.shadowRoot!.querySelectorAll<HTMLElement & { updateComplete: Promise<boolean> }>(
        'tp-icon',
      ),
    ];
    await Promise.all(icons.map((icon) => bounded(icon.updateComplete, 'measured icon')));
    const visible = icons.filter((icon) => icon.getBoundingClientRect().width > 0);
    const expected = parseFloat(getComputedStyle(document.documentElement).fontSize);
    assertion(
      visible.length >= 4 &&
        visible.every(
          (icon) =>
            Math.abs(icon.getBoundingClientRect().width - expected) < 0.5 &&
            Math.abs(icon.getBoundingClientRect().height - expected) < 0.5,
        ),
      'default small token extent',
    );
    host.style.setProperty('--tp-icon-size-sm', '23px');
    await wait(host);
    assertion(
      visible.every((icon) => Math.abs(icon.getBoundingClientRect().width - 23) < 0.5) &&
        host.value === 'bold',
      'scoped icon override/state',
    );
  });
  return {
    cases: [...cases],
    passed: cases.every((entry) => entry.passed),
    count: cases.length,
    built,
  };
}
Object.assign(window, {
  selectAPI: { byId, make, wait, choose, apiChecks, api, fruit, built },
  selectReady: true,
});
