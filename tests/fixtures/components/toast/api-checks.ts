import { html } from 'lit';
import type { TpToast, ToastObject } from '../../../../src/components/toast/index.js';
import type { ComponentPartContract } from '../../../../src/foundation/part.js';
import type { TpMotionRequestEvent } from '../../../../src/foundation/motion.js';

type API = typeof import('../../../../src/index.js');
interface Result {
  scenario: string;
  passed: boolean;
  details: string;
}
function assert(condition: unknown, details: string): asserts condition {
  if (!condition) throw new Error(details);
}
async function until(predicate: () => boolean, description: string, timeout = 4000) {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > timeout) throw new Error(`Timed out: ${description}`);
    await new Promise((resolve) => window.setTimeout(resolve, 20));
  }
}
const node = (host: TpToast, id: string) =>
  host.manager.toasts.find((toast) => toast.identifier === id)?.elementReference ?? undefined;
const state = (host: TpToast, id: string) =>
  host.manager.toasts.find((toast) => toast.identifier === id);

export async function runToastEarlyChecks() {
  await customElements.whenDefined('tp-toast');
  const host = document.createElement('tp-toast') as TpToast;
  host.timeout = 0;
  document.querySelector('#dynamic')!.append(host);
  await host.updateComplete;
  try {
    host.add({ identifier: 'early', title: 'Early integration', description: 'Stable content' });
    await until(() => !!node(host, 'early'), 'early semantic host');
    host.limit = 0;
    await host.updateComplete;
    const hidden = node(host, 'early')!;
    const hiddenStyle = getComputedStyle(hidden);
    const zero = { inert: hidden.inert, visibility: hiddenStyle.visibility };
    assert(hidden.inert && hiddenStyle.visibility === 'hidden', 'Zero limit exposes queued toast');
    host.limit = 3;
    await host.updateComplete;
    const oldViewport = host.shadowRoot!.querySelector('.viewport')!;
    const oldRoot = node(host, 'early');
    let replacement: Element | null = null;
    host.partContracts = {
      'toast-viewport': {
        renderDelegate: ({ bind, content }) => html`<div ${bind}>${content}</div>`,
        elementReference: (element) => {
          replacement = element;
        },
      },
    };
    await host.updateComplete;
    await until(
      () => !!replacement && replacement !== oldViewport && !!node(host, 'early'),
      'viewport replacement',
    );
    assert(!oldViewport.isConnected && !oldRoot?.isConnected, 'Old viewport retains a live toast');
    assert(
      node(host, 'early')!.isConnected && replacement!.contains(node(host, 'early')!),
      'Toast reference not rebound to replacement',
    );
    assert(
      node(host, 'early')!.textContent!.includes('Stable content'),
      'Replacement lost content',
    );
    host.manager.update('early', { description: 'Updated after replacement' });
    await host.updateComplete;
    assert(
      node(host, 'early')!.textContent!.includes('Updated after replacement'),
      'Replacement loses queue updates',
    );
    return {
      passed: true,
      zero,
      replacementTag: replacement!.tagName,
      queue: host.manager.toasts.length,
    };
  } finally {
    host.remove();
  }
}

/** Setup only; invoke the Action with actual MCP pointer/keyboard input. */
export async function prepareToastActionHostCheck(api: API) {
  await customElements.whenDefined('tp-toast');
  const host = document.createElement('tp-toast') as TpToast;
  host.timeout = 0;
  const counters = { entered: 0, initiating: 0, handled: 0 };
  const reference: { current: HTMLElement | null } = { current: null };
  document.querySelector('#dynamic')!.append(host);
  await host.updateComplete;
  host.add({
    identifier: 'per-entry-handler',
    title: 'Per-entry handler',
    actionProperties: {
      label: 'Cancel component action',
      title: 'Entry handler',
      'data-entry': 'one',
      elementReference: reference,
      '@pointerenter': () => counters.entered++,
      '@click': (event: Event) => {
        counters.initiating++;
        api.preventComponentHandling(event);
      },
      onClick: () => counters.handled++,
      closeOnAction: true,
    },
  });
  await until(() => !!reference.current, 'entry handler reference');
  return {
    host,
    reference,
    counters,
    assert: () => {
      assert(
        counters.entered > 0 && counters.initiating === 1 && counters.handled === 0,
        'Per-entry initiating handler/cancellation failed',
      );
      assert(host.manager.toasts.length === 1, 'Cancelled component action closed queue');
      host.remove();
      assert(reference.current === null, 'Reference cleanup failed');
      return { ...counters, queueRetained: true, referenceReleased: true };
    },
  };
}

/** Public-API checks only. Real keyboard, pointer, AX, axe and screenshots are separate root MCP evidence. */
export async function runToastAPIChecks(api: API): Promise<Result[]> {
  const results: Result[] = [];
  const dynamic = document.querySelector('#dynamic')!;
  async function test(scenario: string, execute: () => Promise<string> | string) {
    try {
      results.push({ scenario, passed: true, details: await execute() });
    } catch (error) {
      results.push({ scenario, passed: false, details: String(error) });
    }
  }
  async function host(options: Partial<TpToast> = {}) {
    const element = document.createElement('tp-toast') as TpToast;
    Object.assign(element, { timeout: 0, position: 'block-start inline-start' }, options);
    dynamic.append(element);
    await element.updateComplete;
    return element;
  }

  await test('V-13: actual package exports and standalone registered compositions', () => {
    assert(
      typeof api.ToastManager === 'function' &&
        typeof api.ToastProvider === 'function' &&
        typeof api.createToastManager === 'function',
      'Toast services missing from package graph',
    );
    assert(
      customElements.get('tp-toast') === api.TpToast,
      'Registered Toast is not exported class',
    );
    assert(
      customElements.get('tp-button') &&
        customElements.get('tp-icon') &&
        customElements.get('tp-spinner'),
      'Required composed component registration missing',
    );
    return 'Exported Toast/services and actual Button/Icon/Spinner registration are available independently of Storybook.';
  });

  await test('V-01/V-02: isolated providers, aliases, stable upsert and coherent subscriptions', async () => {
    const a = await host();
    const b = await host();
    try {
      assert(a.manager !== b.manager, 'Two hosts share state');
      assert(a.duration === 'persistent' && a.maximumVisible === 3, 'Aliases mismatch');
      a.maximumVisible = 2;
      a.duration = 800;
      await a.updateComplete;
      assert(
        a.limit === 2 && a.timeout === 800 && a.manager.limit === 2 && a.manager.timeout === 800,
        'Aliases created independent state',
      );
      a.timeout = 0;
      await a.updateComplete;
      a.add({ identifier: 'stable', title: 'Original', data: { a: 1 } });
      a.add({ identifier: 'second', title: 'Second' });
      await until(() => !!node(a, 'stable'), 'stable rendered');
      const original = node(a, 'stable');
      a.manager.update('stable', { title: 'Changed', data: { b: 2 } });
      a.add({ identifier: 'stable', description: 'Upsert' });
      await a.updateComplete;
      assert(node(a, 'stable') === original, 'Upsert replaced semantic host');
      assert(
        a.manager.toasts.map((toast) => toast.identifier).join(',') === 'second,stable',
        'Upsert reordered queue',
      );
      assert(
        JSON.stringify(state(a, 'stable')?.data) === '{"a":1,"b":2}',
        'Partial data merge failed',
      );
      assert(
        state(a, 'stable')?.updateKey === 2 && b.manager.toasts.length === 0,
        'Update count/isolation incorrect',
      );
      return 'Aliases route to queue policy; partial updates preserve element/ID/order, independent Provider unaffected.';
    } finally {
      a.remove();
      b.remove();
    }
  });

  await test('V-03/V-09: promise outcome, loading lifetime, stale settlement and close/removal causes', async () => {
    const element = await host();
    try {
      let resolve!: (value: number) => void;
      const pending = element.manager.promise(
        new Promise<number>((done) => {
          resolve = done;
        }),
        { loading: 'Loading', success: (value) => `Result ${value}`, error: 'Error' },
      );
      const id = element.manager.toasts[0]!.identifier;
      await until(() => !!node(element, id), 'loading rendered');
      assert(node(element, id)!.querySelector('tp-spinner'), 'Loading substituted Spinner');
      resolve(9);
      assert((await pending) === 9, 'Promise result changed');
      await until(
        () => node(element, id)?.textContent?.includes('Result 9') ?? false,
        'success rendered',
      );
      assert(state(element, id)?.type === 'success', 'Settlement did not change type');
      const phases: string[] = [];
      element.add({
        identifier: 'causes',
        title: 'Dismiss',
        onClose: (cause) => phases.push(`close:${cause}`),
        onRemove: (cause) => phases.push(`remove:${cause}`),
      });
      await until(() => !!node(element, 'causes'), 'cause toast rendered');
      element.close('causes', 'action');
      element.close('causes', 'programmatic');
      assert(phases.join(',') === 'close:action', 'Close duplicated or cause incorrect');
      await until(() => !state(element, 'causes'), 'exit removed');
      assert(phases.join(',') === 'close:action,remove:action', 'Removal callback/cause incorrect');
      let finish!: (value: number) => void;
      const stale = element.manager.promise(
        new Promise<number>((done) => {
          finish = done;
        }),
        { loading: 'Waiting', success: 'Cannot revive', error: 'Error' },
      );
      const staleId = element.manager.toasts[0]!.identifier;
      element.close(staleId);
      await until(() => !state(element, staleId), 'stale entry removed');
      finish(7);
      assert((await stale) === 7, 'Removed promise lost outcome');
      assert(!state(element, staleId), 'Settlement recreated removed Toast');
      return 'Actual render/presence removal reports same cause once; promise result survives, loading uses Spinner, stale settlement cannot recreate.';
    } finally {
      element.remove();
    }
  });

  await test('V-05: live limit, inertness and measured queue geometry', async () => {
    const element = await host({ limit: 2 });
    try {
      for (let index = 0; index < 4; index++)
        element.add({
          identifier: `limit-${index}`,
          title: `Toast ${index}`,
          description:
            index % 2
              ? 'Short.'
              : 'A longer message with details that naturally wrap across several lines to establish independent height measurements.',
        });
      await until(
        () => element.manager.toasts.every((toast) => toast.height > 0),
        'measured heights',
      );
      assert(
        element.manager.toasts.map((toast) => toast.limited).join(',') === 'false,false,true,true',
        'Limited markers wrong',
      );
      for (const toast of element.manager.toasts) {
        assert(
          node(element, toast.identifier)?.inert === toast.limited,
          `Inertness mismatch ${toast.identifier}`,
        );
        assert(
          Number.parseFloat(
            node(element, toast.identifier)!.style.getPropertyValue('--tp-toast-height'),
          ) > 0,
          'Natural height missing',
        );
      }
      const front = element.shadowRoot!.querySelector<HTMLElement>('.viewport')!;
      assert(
        Number.parseFloat(front.style.getPropertyValue('--tp-toast-frontmost-height')) ===
          element.manager.toasts[0]!.height,
        'Frontmost height mismatch',
      );
      element.limit = 0;
      await element.updateComplete;
      assert(
        element.manager.toasts.every(
          (toast) => toast.limited && node(element, toast.identifier)?.inert,
        ),
        'Limit zero discarded or exposed queued entries',
      );
      element.limit = 3;
      await element.updateComplete;
      element.close('limit-3');
      await element.updateComplete;
      assert(!state(element, 'limit-0')?.limited, 'Ending entry consumes active limit slot');
      return 'All natural heights/frontmost outputs present; limited nodes retained/inert; zero and promotion update coherently.';
    } finally {
      element.remove();
    }
  });

  await test('V-06/V-10: independent constituents, semantic references and announcement deduplication', async () => {
    const element = await host();
    try {
      element.add({
        identifier: 'parts',
        title: 'Named notification',
        description: 'Details',
        type: 'warning',
        actionProperties: { label: 'Undo' },
      });
      await until(() => !!node(element, 'parts')?.querySelector('tp-button'), 'constituents');
      const root = node(element, 'parts')!;
      const closeButton = root.querySelector<TpToast & { updateComplete: Promise<unknown> }>(
        '.close',
      )!;
      await closeButton.updateComplete;
      const closeGraphic = closeButton.shadowRoot!.querySelector('tp-icon')!;
      await (closeGraphic as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      assert(
        closeGraphic.getBoundingClientRect().width > 0,
        'Close graphic hidden by Button icon-only label policy',
      );
      assert(
        root.getAttribute('role') === 'dialog' && root.getAttribute('aria-modal') === 'false',
        'Notification modal or wrong role',
      );
      const title = element.shadowRoot!.getElementById(root.getAttribute('aria-labelledby')!);
      const description = element.shadowRoot!.getElementById(
        root.getAttribute('aria-describedby')!,
      );
      assert(
        title?.textContent === 'Named notification' && description?.textContent === 'Details',
        'Same-tree references mismatch',
      );
      const action = root.querySelector<HTMLElement>('[part~="toast-action"]')!;
      await (action as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      assert(
        action.localName === 'tp-button' &&
          action.shadowRoot?.querySelector('button') &&
          !action.shadowRoot?.querySelector('a'),
        'Action substituted or accidental href',
      );
      assert(root.querySelector('[part~="toast-icon"] tp-icon'), 'Status icon substituted');
      const announcements = [...element.shadowRoot!.querySelectorAll('[aria-live]')]
        .map((region) => region.textContent?.trim())
        .join('|');
      element.manager.update('parts', { title: 'Named notification', description: 'Details' });
      await element.updateComplete;
      assert(
        [...element.shadowRoot!.querySelectorAll('[aria-live]')]
          .map((region) => region.textContent?.trim())
          .join('|') === announcements,
        'Unchanged content reannounced',
      );
      element.dismissible = false;
      element.showIcon = false;
      await element.updateComplete;
      assert(
        !root.querySelector('[part~="toast-close"]') &&
          !root.querySelector('[part~="toast-icon"]') &&
          !!root.querySelector('[part~="toast-action"]'),
        'Constituent options conflated',
      );
      element.manager.update('parts', {
        title: '',
        description: 'Description only',
        actionProperties: { label: '' },
        priority: 'high',
      });
      await element.updateComplete;
      assert(
        !root.querySelector('[part~="toast-title"]') &&
          !root.querySelector('[part~="toast-action"]'),
        'Optional empty constituents remain',
      );
      assert(
        root.getAttribute('role') === 'alertdialog' &&
          root.getAttribute('aria-labelledby') ===
            root.querySelector('[part~="toast-description"]')?.id,
        'Description-only high semantic name wrong',
      );
      const arbitrary = element.add({
        identifier: 'space and "quotes"',
        title: 'Arbitrary stable identity',
      });
      await until(() => !!node(element, arbitrary), 'arbitrary identifier rendered');
      const arbitraryRoot = node(element, arbitrary)!;
      assert(
        !!element.shadowRoot!.getElementById(arbitraryRoot.getAttribute('aria-labelledby')!),
        'User identifier corrupted generated ARIA IDREF',
      );
      return 'Independent icon/Close/action/title/description options; actual Button/Icon, native action default, same-tree semantics and unchanged-text dedupe.';
    } finally {
      element.remove();
    }
  });

  await test('V-10/V-12: per-entry Action host records reuse binding and retain terminal hooks', async () => {
    const element = await host();
    const references: (HTMLElement | null)[] = [];
    try {
      element.partContracts = {
        'toast-action': {
          classHook: 'terminal-action',
          styleHook: { outline: '3px solid rgb(0, 150, 90)' },
        },
      };
      element.add({
        identifier: 'host-record',
        title: 'Host record',
        type: 'info',
        actionProperties: {
          children: 'Per-entry action',
          title: 'Native title',
          'data-action-id': 'entry-specific',
          class: 'entry-action',
          style: { outline: '1px solid red', background: 'rgb(30, 40, 50)' },
          role: 'link',
          '.role': 'link',
          type: 'submit',
          '.type': 'submit',
          disabled: false,
          '.disabled': true,
          'data-type': 'forged',
          elementReference: (part) => references.push(part),
        },
      });
      await until(() => references.some(Boolean), 'per-entry Action reference');
      const action = references.find(Boolean)!;
      await (action as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      assert(
        action.title === 'Native title' && action.dataset.actionId === 'entry-specific',
        'Per-entry host attributes missing',
      );
      assert(
        action.classList.contains('action') &&
          action.classList.contains('entry-action') &&
          action.classList.contains('terminal-action'),
        'Host/global classes lost',
      );
      assert(action.textContent?.includes('Per-entry action'), 'Native content alias missing');
      assert(
        getComputedStyle(action).outlineWidth === '3px' &&
          getComputedStyle(action).backgroundColor === 'rgb(30, 40, 50)',
        'Terminal hook/entry style precedence wrong',
      );
      assert(
        !action.hasAttribute('role') &&
          action.getAttribute('type') === 'button' &&
          action.shadowRoot?.querySelector('button')?.type === 'button' &&
          !action.shadowRoot?.querySelector('button')?.disabled &&
          action.dataset.type === 'info',
        'Host record changed behavior-owned semantics',
      );
      element.manager.update('host-record', { description: 'Updated in place' });
      await element.updateComplete;
      assert(
        references.filter(Boolean).length === 1 && references[0] === action,
        'Reference churn on state update',
      );
      element.remove();
      assert(references.at(-1) === null, 'Per-entry Action reference not released');
      return 'Native title/data/class/style/content and stable per-entry reference bind through the same owner; global hooks stay terminal, role/type/state protected.';
    } finally {
      element.remove();
    }
  });

  await test('V-09/V-12: renderDelegate/reference/state hook adoption preserves identity and current state', async () => {
    const element = await host();
    const refs: (HTMLElement | null)[] = [];
    const received: unknown[] = [];
    const titleContract: ComponentPartContract = {
      renderDelegate: ({ bind, content, state: current }) => {
        received.push(current.type);
        return html`<strong ${bind}>${content}</strong>`;
      },
      elementReference: (part) => refs.push(part),
      styleHook: { fontStyle: 'italic' },
    };
    try {
      element.partContracts = { 'toast-title': titleContract };
      element.add({ identifier: 'delegate', title: 'Delegated', type: 'info' });
      await until(() => !!node(element, 'delegate')?.querySelector('strong'), 'delegate rendered');
      const original = node(element, 'delegate')!;
      const title = original.querySelector<HTMLElement>('strong')!;
      assert(
        title.id === original.getAttribute('aria-labelledby') &&
          getComputedStyle(title).fontStyle === 'italic',
        'Delegate lost behavior or styleHook',
      );
      assert(
        refs.filter(Boolean).length === 1 && received.includes('info'),
        'Initial reference/state incorrect',
      );
      element.manager.update('delegate', { type: 'success', title: 'Updated' });
      await element.updateComplete;
      assert(
        node(element, 'delegate') === original && received.includes('success'),
        'Hook update replaced root or stale state',
      );
      assert(refs.filter(Boolean).length === 1, 'Reference churned without host replacement');
      element.partContracts = {};
      await element.updateComplete;
      assert(
        refs.at(-1) === null && !original.querySelector('strong'),
        'Delegate/ref cleanup failed',
      );
      return 'Actual delegated host keeps ARIA bundle; state resolvers update; reference fires once for mount and null on replacement.';
    } finally {
      element.remove();
    }
  });

  await test('V-11: anchored placement/arrow and disconnected anchor lifecycle', async () => {
    const element = await host();
    const anchor = document.createElement('tp-button');
    anchor.textContent = 'Anchor';
    dynamic.append(anchor);
    const phases: string[] = [];
    try {
      element.add({
        identifier: 'anchor',
        title: 'Anchored',
        description: 'Near source',
        positionerProperties: { anchor, side: 'top', sideOffset: 8, showArrow: true },
        onClose: (cause) => phases.push(cause),
        onRemove: (cause) => phases.push(cause),
      });
      await until(
        () => !!node(element, 'anchor')?.parentElement?.hasAttribute('data-positioned'),
        'anchor positioning',
      );
      const root = node(element, 'anchor')!;
      const positioner = root.parentElement!;
      const arrow = root.querySelector<HTMLElement>('.arrow')!;
      assert(
        ['top', 'bottom', 'left', 'right'].includes(positioner.dataset.side!),
        'Resolved side absent',
      );
      assert(arrow && arrow.dataset.side === positioner.dataset.side, 'Arrow output mismatch');
      const bounds = root.getBoundingClientRect();
      assert(
        bounds.left >= -1 &&
          bounds.right <= innerWidth + 1 &&
          bounds.top >= -1 &&
          bounds.bottom <= innerHeight + 1,
        'Anchored toast not viewport visible',
      );
      const resolvedSide = positioner.dataset.side;
      anchor.remove();
      await until(() => !state(element, 'anchor'), 'anchor removal closes');
      assert(
        phases.join(',') === 'anchor-removed,anchor-removed',
        'Anchor removal cause/callback order wrong',
      );
      return `Shared engine placed ${resolvedSide}, arrow coherent, viewport bounds valid, anchor removal reported once for close/remove.`;
    } finally {
      element.remove();
      anchor.remove();
    }
  });

  await test('V-01/V-09/V-11: external portal cleanup and Provider reconnect', async () => {
    const container = document.createElement('div');
    dynamic.append(container);
    const element = await host({ container });
    const phases: string[] = [];
    try {
      element.add({
        identifier: 'portal',
        title: 'External container',
        onClose: (cause) => phases.push(cause),
        onRemove: (cause) => phases.push(cause),
      });
      await until(() => !!node(element, 'portal')?.isConnected, 'external portal mounted');
      const layerRoot = container.firstElementChild!.shadowRoot!;
      assert(
        layerRoot.querySelector('.viewport') && layerRoot.querySelector('style'),
        'External portal lacks structure',
      );
      await until(() => element.manager.toasts[0]!.height > 0, 'external portal measurement');
      element.remove();
      assert(!container.firstElementChild, 'External portal work leaked');
      assert(
        phases.join(',') === 'provider-destroyed,provider-destroyed',
        'Provider destroy cause not propagated',
      );
      dynamic.append(element);
      await element.updateComplete;
      element.add({ identifier: 'again', title: 'Reconnected' });
      await until(() => !!node(element, 'again')?.isConnected, 'reconnected portal');
      assert(element.manager.toasts.length === 1, 'Reconnect retained destroyed queue');
      return 'External viewport/styles removed; same manager reconnects with a fresh queue and correct destroy callbacks.';
    } finally {
      element.remove();
      container.remove();
    }
  });

  await test('V-04: browser focus pauses remaining lifetime without resetting it', async () => {
    const element = await host({ timeout: 700 });
    try {
      element.add({ identifier: 'timed', title: 'Timed' });
      await until(() => !!node(element, 'timed'), 'timed rendered');
      // Direct public focus is API evidence; root separately checks actual F6/Tab input.
      node(element, 'timed')!.focus();
      assert(element.manager.paused, 'Focus did not pause timer');
      await new Promise((resolve) => setTimeout(resolve, 800));
      assert(state(element, 'timed')?.transitionStatus !== 'ending', 'Focused toast dismissed');
      (document.querySelector('#outside') as HTMLElement).focus();
      await until(() => !state(element, 'timed'), 'unfocused timer dismissed', 2000);
      return 'Real owner-window clock stays paused for 800ms of focus and dismisses after focus leaves; exact pause accounting is independently unit-tested.';
    } finally {
      element.remove();
    }
  });

  await test('V-09: claimed presence drivers participate in completion and cancel reversals', async () => {
    const element = await host();
    const playbacks: { phase: string; signal: AbortSignal; finish(): void; canceled: number }[] =
      [];
    const listener = (event: Event) => {
      const motion = event as TpMotionRequestEvent;
      if (motion.request.role !== 'toast.presence') return;
      motion.respondWith({
        play(request) {
          let finish!: () => void;
          const finished = new Promise<void>((done) => {
            finish = done;
          });
          const playback = { phase: request.phase, signal: request.signal, finish, canceled: 0 };
          playbacks.push(playback);
          return {
            finished,
            cancel() {
              playback.canceled++;
            },
          };
        },
      });
    };
    element.addEventListener('tp-motion-request', listener);
    try {
      element.add({ identifier: 'motion', title: 'Driver controlled completion' });
      await until(() => playbacks.length === 1, 'entry playback');
      const original = node(element, 'motion')!;
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      assert(
        state(element, 'motion')?.transitionStatus === 'starting',
        'Entry completed before claimed playback',
      );
      element.close('motion');
      await until(() => playbacks.length === 2, 'exit playback');
      assert(
        playbacks[0]!.signal.aborted && playbacks[0]!.canceled === 1,
        'Entry reversal did not cancel once',
      );
      assert(
        original.inert && state(element, 'motion')?.transitionStatus === 'ending',
        'Exit exposes active semantics',
      );
      element.add({ identifier: 'motion', title: 'Reopened' });
      await until(() => playbacks.length === 3, 'reopened playback');
      assert(
        playbacks[1]!.signal.aborted && playbacks[1]!.canceled === 1,
        'Exit reversal did not cancel once',
      );
      assert(
        node(element, 'motion') === original && !original.inert,
        'Reopen lost identity/active semantics',
      );
      playbacks[0]!.finish();
      playbacks[1]!.finish();
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      assert(
        state(element, 'motion')?.transitionStatus === 'starting',
        'Stale playback completed current entry',
      );
      playbacks[2]!.finish();
      await until(
        () => state(element, 'motion')?.transitionStatus === undefined,
        'current entry stable',
      );
      return 'Claimed completion blocks lifecycle; close/reopen aborts entry and exit exactly once, preserving root; stale settlement ignored.';
    } finally {
      element.removeEventListener('tp-motion-request', listener);
      element.remove();
    }
  });

  // V-07/V-08/V-12/V-13 real keyboard/pointer/AX/axe/visual/Docs/package
  // deliberately remain separate root MCP evidence; this suite cannot certify them.
  return results;
}

export function describeToastSnapshot(host: TpToast) {
  return host.manager.toasts.map((toast: ToastObject) => ({
    identifier: toast.identifier,
    type: toast.type,
    limited: toast.limited,
    transitionStatus: toast.transitionStatus,
    height: toast.height,
    cause: toast.cause,
    connected: !!toast.elementReference?.isConnected,
    inert: toast.elementReference?.inert,
  }));
}
