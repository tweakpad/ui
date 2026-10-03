import { html } from 'lit';
import type { TpButton } from '../../../../src/components/button.js';
import type { ComponentInitiatingEvent } from '../../../../src/foundation/part.js';
import type { ComponentPartContract } from '../../../../src/foundation/part.js';
import type { TpElement } from '../../../../src/foundation/element.js';
const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const publicAPI = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
class FixtureInheritedButton extends publicAPI.TpButton {
  static presentationTagName = 'tp-button';
  protected override buttonTabIndex(): string | null {
    return '-1';
  }
  protected override buttonPartContract(): ComponentPartContract | undefined {
    const contract = super.buttonPartContract();
    return {
      ...contract,
      hostProperties: { ...contract?.hostProperties, title: 'Inherited contract' },
    };
  }
}
customElements.define('fixture-inherited-button', FixtureInheritedButton);
const dynamic = document.querySelector<HTMLElement>('#dynamic')!;
const custom = document.querySelector<TpButton>('#custom')!;
custom.partContracts = {
  button: { renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>` },
};
const records: { name: string; pass: boolean; actual: unknown }[] = [];
const check = (name: string, pass: boolean, actual: unknown) => {
  records.push({ name, pass, actual });
  if (!pass) throw new Error(`${name}: ${JSON.stringify(actual)}`);
};
const control = (button: TpButton) =>
  button.renderRoot.querySelector<HTMLElement>('[part~="button"]')!;
async function settle(button: TpButton) {
  for (let i = 0; i < 3; i++) {
    await button.updateComplete;
    await Promise.resolve();
  }
}
async function create(properties: Partial<TpButton> = {}) {
  const button = document.createElement('tp-button') as TpButton;
  button.textContent = 'Fixture action';
  Object.assign(button, properties);
  dynamic.append(button);
  await settle(button);
  return button;
}
async function assertParts() {
  records.length = 0;
  const refs: (HTMLElement | null)[] = [];
  let seen: unknown;
  const button = await create({
    partContracts: {
      button: {
        hostProperties: {
          title: 'Native title',
          'data-consumer': 'yes',
          '.role': 'checkbox',
          '.type': 'reset',
        },
        classHook: 'consumer-class',
        styleHook: { '--button-fixture': 'retained' },
        elementReference: (element) => refs.push(element),
        renderDelegate: ({ state, bind, content }) => {
          seen = state;
          return html`<span ${bind}>${content}</span>`;
        },
      },
      'button-label': { content: 'Delegated label' },
    },
  });
  const span = control(button);
  check(
    'part custom semantic host/native focus invariants',
    span.localName === 'span' &&
      span.getAttribute('role') === 'button' &&
      span.tabIndex === 0 &&
      !span.hasAttribute('disabled'),
    span.outerHTML,
  );
  check(
    'part neutral title/data props + protected role/type',
    span.title === 'Native title' &&
      span.dataset.consumer === 'yes' &&
      span.getAttribute('type') === 'button',
    span.outerHTML,
  );
  check(
    'part class/style hooks and committed state',
    span.classList.contains('consumer-class') &&
      span.style.getPropertyValue('--button-fixture') === 'retained' &&
      (seen as { disabled: boolean }).disabled === false,
    { state: seen, html: span.outerHTML },
  );
  check(
    'part current actual-host ref and label content',
    refs.at(-1) === span && span.textContent!.includes('Delegated label'),
    { refs: refs.length, content: span.textContent },
  );
  const nativeRef = { current: null as HTMLElement | null };
  button.partContracts = {
    button: { elementReference: nativeRef },
    'button-leading-mark': { content: 'Leading content' },
    'button-trailing-mark': { content: 'Trailing content' },
  };
  await settle(button);
  const native = control(button);
  check(
    'part default host restored and outgoing ref released',
    native.localName === 'button' &&
      nativeRef.current === native &&
      refs.at(-1) === null &&
      !span.isConnected,
    { tag: native.localName, old: span.isConnected, refs: refs.map((r) => r?.localName ?? null) },
  );
  check(
    'part independent leading/trailing content visibility',
    [
      ...native.querySelectorAll<HTMLElement>(
        '[part~="button-leading-mark"],[part~="button-trailing-mark"]',
      ),
    ].every((part) => !part.hidden) &&
      native.textContent!.includes('Leading content') &&
      native.textContent!.includes('Trailing content'),
    native.innerHTML,
  );
  button.remove();
  await Promise.resolve();
  check(
    'part disconnect clears actual consumer ref',
    nativeRef.current === null,
    nativeRef.current?.localName ?? null,
  );
  return [...records];
}
async function assertActions() {
  records.length = 0;
  const button = await create({
    partContracts: {
      button: { renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>` },
    },
  });
  let actions = 0;
  button.addEventListener('click', () => actions++);
  const key = (type: string, value: string) =>
    control(button).dispatchEvent(
      new KeyboardEvent(type, { key: value, bubbles: true, composed: true, cancelable: true }),
    );
  key('keydown', 'Enter');
  key('keyup', 'Enter');
  check('synthetic Enter exactly once', actions === 1, actions);
  key('keydown', ' ');
  check('synthetic Space waits release', actions === 1, actions);
  key('keyup', ' ');
  check('synthetic Space once on release', actions === 2, actions);
  button.partContracts = {
    button: {
      renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>`,
      hostProperties: {
        '@keydown': (event: ComponentInitiatingEvent) => event.preventComponentHandling(),
      },
    },
  };
  await settle(button);
  const canceled = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  control(button).dispatchEvent(canceled);
  check(
    'synthetic component key cancellation distinct from native default',
    actions === 2 &&
      !canceled.defaultPrevented &&
      (canceled as ComponentInitiatingEvent).componentHandlingPrevented,
    { actions, defaultPrevented: canceled.defaultPrevented },
  );
  let consumer = 0;
  button.partContracts = {
    button: {
      renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>`,
      hostProperties: { '@click': () => consumer++ },
    },
  };
  button.disabled = true;
  button.focusableWhenDisabled = true;
  await settle(button);
  button.click();
  check(
    'disabled custom host suppresses consumer and ancestor activation',
    consumer === 0 &&
      actions === 2 &&
      control(button).getAttribute('aria-disabled') === 'true' &&
      control(button).tabIndex === 0,
    { consumer, actions, html: control(button).outerHTML },
  );
  button.disabled = false;
  await settle(button);
  button.click();
  check('reenabled custom activation retained', consumer === 1 && actions === 3, {
    consumer,
    actions,
  });
  button.remove();
  return [...records];
}
async function assertFormsAndLinks() {
  records.length = 0;
  const form = document.createElement('form');
  dynamic.append(form);
  let submits = 0;
  let resets = 0;
  let submitter: HTMLButtonElement | null = null;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submits++;
    submitter = (event as SubmitEvent).submitter as HTMLButtonElement;
  });
  form.addEventListener('reset', () => resets++);
  const button = await create({ type: 'submit', name: 'intent', value: 'save' });
  form.append(button);
  await settle(button);
  button.click();
  await Promise.resolve();
  check(
    'form native submit and submitter contribution',
    submits === 1 && submitter!.name === 'intent' && submitter!.value === 'save',
    { submits, name: submitter?.name, value: submitter?.value },
  );
  button.partContracts = {
    button: {
      hostProperties: {
        '@click': (event: ComponentInitiatingEvent) => event.preventComponentHandling(),
      },
    },
  };
  await settle(button);
  button.click();
  await Promise.resolve();
  check('form part component cancellation prevents submit', submits === 1, submits);
  button.partContracts = {};
  button.type = 'reset';
  await settle(button);
  const cancel = (event: Event) => {
    (event as ComponentInitiatingEvent).preventComponentHandling?.();
  };
  button.addEventListener('click', cancel);
  // The generic event channel is exposed when a consumer host handler is supplied.
  button.partContracts = { button: { hostProperties: { '@click': () => {} } } };
  await settle(button);
  button.click();
  await Promise.resolve();
  check('form ancestor component cancellation prevents queued reset', resets === 0, resets);
  button.removeEventListener('click', cancel);
  button.click();
  await Promise.resolve();
  check('form accepted reset retained', resets === 1, resets);
  button.href = '#button-target';
  button.target = '_self';
  button.rel = 'nofollow';
  button.download = 'fixture.txt';
  button.partContracts = {
    button: {
      hostProperties: {
        '@click': (event: ComponentInitiatingEvent) => event.preventComponentHandling(),
      },
    },
  };
  await settle(button);
  const a = control(button);
  const click = new MouseEvent('click', { bubbles: true, cancelable: true });
  a.dispatchEvent(click);
  check(
    'link native attrs and no form behavior',
    a.localName === 'a' &&
      a.getAttribute('href') === '#button-target' &&
      a.getAttribute('target') === '_self' &&
      a.getAttribute('rel') === 'nofollow' &&
      a.getAttribute('download') === 'fixture.txt' &&
      submits === 1 &&
      resets === 1,
    a.outerHTML,
  );
  check('link component cancellation prevents native navigation', click.defaultPrevented, {
    defaultPrevented: click.defaultPrevented,
  });
  button.partContracts = {
    button: { renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>` },
  };
  await settle(button);
  check(
    'link invalid nonanchor delegate falls back native anchor',
    control(button).localName === 'a',
    control(button).outerHTML,
  );
  button.remove();
  form.remove();
  return [...records];
}
async function assertMarks() {
  records.length = 0;
  const button = await create();
  const icon = document.createElement('tp-icon');
  icon.slot = 'icon-start';
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon);
  await settle(button);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settle(button);
  check(
    'mark authored slot visible',
    !button.renderRoot.querySelector<HTMLElement>('[part~="button-leading-mark"]')!.hidden,
    control(button).innerHTML,
  );
  button.variant = 'outline';
  await settle(button);
  check(
    'mark slot stays visible on unrelated updates',
    !button.renderRoot.querySelector<HTMLElement>('[part~="button-leading-mark"]')!.hidden,
    control(button).innerHTML,
  );
  button.loadingPosition = 'trailing';
  await settle(button);
  check(
    'mark loading uses actual Spinner and busy semantics',
    button.renderRoot.querySelectorAll('tp-spinner').length === 1 &&
      control(button).getAttribute('aria-busy') === 'true' &&
      button.renderRoot.querySelector<HTMLElement>('[part~="button-leading-mark"]')!.hidden,
    control(button).innerHTML,
  );
  button.loadingPosition = null;
  await settle(button);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settle(button);
  check(
    'mark clearing loading restores original authored node/slot',
    icon.isConnected &&
      button.contains(icon) &&
      !button.renderRoot.querySelector<HTMLElement>('[part~="button-leading-mark"]')!.hidden &&
      !control(button).hasAttribute('aria-busy'),
    control(button).innerHTML,
  );
  button.remove();
  return [...records];
}
async function assertInheritedOwner() {
  records.length = 0;
  const button = document.createElement('fixture-inherited-button') as TpButton;
  button.textContent = 'Inherited action';
  dynamic.append(button);
  await settle(button);
  const original = control(button);
  check(
    'inherited native target uses protected tabindex and contract',
    original.localName === 'button' &&
      original.tabIndex === -1 &&
      original.title === 'Inherited contract',
    original.outerHTML,
  );
  let clicks = 0;
  button.addEventListener('click', () => clicks++);
  button.nativeAction = false;
  const reference = { current: null as HTMLElement | null };
  button.partContracts = {
    button: {
      elementReference: reference,
      renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>`,
    },
  };
  await settle(button);
  const target = control(button);
  check(
    'inherited delegate retains real owner/ref/tabindex/role',
    target.localName === 'span' &&
      target.tabIndex === -1 &&
      target.getAttribute('role') === 'button' &&
      target.title === 'Inherited contract' &&
      reference.current === target &&
      !original.isConnected,
    target.outerHTML,
  );
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
  target.dispatchEvent(
    new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }),
  );
  check(
    'inherited nativeAction=false retains exactly one SyntheticPress activation',
    clicks === 1,
    clicks,
  );
  button.partContracts = {
    button: {
      elementReference: reference,
      hostProperties: {
        '@keydown': (event: ComponentInitiatingEvent) => event.preventComponentHandling(),
      },
      renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>`,
    },
  };
  await settle(button);
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  control(button).dispatchEvent(event);
  check(
    'inherited terminal handler cancels same press owner preserving native default',
    clicks === 1 &&
      !event.defaultPrevented &&
      (event as ComponentInitiatingEvent).componentHandlingPrevented,
    { clicks, defaultPrevented: event.defaultPrevented },
  );
  button.remove();
  await Promise.resolve();
  check(
    'inherited actual ref released on disconnect',
    reference.current === null,
    reference.current,
  );
  return [...records];
}
async function assertSharedOwners() {
  records.length = 0;
  for (const [tag, part] of [
    ['tp-badge', 'badge'],
    ['tp-skeleton', 'skeleton'],
    ['tp-separator', 'root'],
  ] as const) {
    const host = document.createElement(tag) as TpElement;
    const reference = { current: null as HTMLElement | null };
    let seen: Readonly<Record<string, unknown>> | undefined;
    let clicks = 0;
    host.partContracts = {
      [part]: {
        elementReference: reference,
        hostProperties: {
          title: 'Shared owner title',
          '.role': 'checkbox',
          '.ariaHidden': 'false',
          '@click': (event: ComponentInitiatingEvent) => {
            clicks++;
            event.preventComponentHandling();
          },
        },
        classHook: 'shared-owner-hook',
        styleHook: { '--shared-owner-fixture': 'retained' },
        renderDelegate: ({ state, bind, content }) => {
          seen = state;
          return html`<section ${bind}>${content}</section>`;
        },
      },
    };
    dynamic.append(host);
    await host.updateComplete;
    const target = host.renderRoot.querySelector<HTMLElement>(`[part~="${part}"]`)!;
    check(
      `${tag} delegates actual owner with ref/neutral hooks`,
      target.localName === 'section' &&
        reference.current === target &&
        target.title === 'Shared owner title' &&
        target.classList.contains('shared-owner-hook') &&
        target.style.getPropertyValue('--shared-owner-fixture') === 'retained',
      target.outerHTML,
    );
    if (tag === 'tp-skeleton')
      check(
        'Skeleton protects hidden decorative surface and removes status announcement',
        target.getAttribute('aria-hidden') === 'true' &&
          !host.renderRoot.querySelector('[role="status"]') &&
          seen?.animated === true,
        { state: seen, html: target.outerHTML },
      );
    if (tag === 'tp-separator')
      check(
        'Separator protects actual decorative role and publishes orientation',
        target.getAttribute('role') === 'none' &&
          !target.hasAttribute('aria-orientation') &&
          seen?.decorative === true,
        { state: seen, html: target.outerHTML },
      );
    if (tag === 'tp-badge')
      check('Badge publishes actual variant state', seen?.variant === 'default', seen);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    target.dispatchEvent(click);
    check(
      `${tag} terminal handler component cancellation stays separate from native`,
      clicks === 1 &&
        !click.defaultPrevented &&
        (click as ComponentInitiatingEvent).componentHandlingPrevented,
      { clicks, defaultPrevented: click.defaultPrevented },
    );
    host.partContracts = { [part]: { elementReference: reference } };
    await host.updateComplete;
    const restored = host.renderRoot.querySelector<HTMLElement>(`[part~="${part}"]`)!;
    check(
      `${tag} default target replaces delegated ref`,
      restored.localName === (tag === 'tp-badge' ? 'span' : 'div') &&
        reference.current === restored &&
        !target.isConnected,
      restored.outerHTML,
    );
    host.remove();
    await Promise.resolve();
    check(
      `${tag} disconnect releases owned reference`,
      reference.current === null,
      reference.current,
    );
  }
  return [...records];
}
Object.assign(window, {
  buttonAPI: {
    built,
    custom,
    control,
    settle,
    assertParts,
    assertActions,
    assertFormsAndLinks,
    assertMarks,
    assertInheritedOwner,
    assertSharedOwners,
    records,
  },
});
