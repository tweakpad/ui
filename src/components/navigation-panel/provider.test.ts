import { describe, expect, it, vi } from 'vitest';
import { NavigationPanelProvider, type NavigationPanelProviderHost } from './provider.js';
import type { NavigationPanelResponsiveAdapter, NavigationPanelShortcut } from './types.js';
function fixture(properties: Record<string, unknown> = {}) {
  const host = Object.assign(new EventTarget(), {
    isConnected: true,
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
    controlledExpanded: undefined,
    defaultExpanded: true,
    hasExpandedDefault: false,
    compact: false,
    side: 'inline-start',
    collapseMode: 'off-canvas',
    variant: 'integrated',
    responsiveAdapter: undefined,
    shortcutAdapter: undefined,
    shortcut: undefined,
    persistenceAdapter: undefined,
    persistenceKey: undefined,
    onExpandedChange: undefined,
    onCompactOpenChange: undefined,
    reportProviderDiagnostic: vi.fn(),
    ...properties,
  }) as unknown as NavigationPanelProviderHost;
  const provider = new NavigationPanelProvider(host);
  provider.hostConnected();
  return {
    host,
    provider,
    update(properties: Record<string, unknown>) {
      Object.assign(host, properties);
      provider.hostUpdate();
    },
  };
}
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}
function key(properties: Record<string, unknown> = {}) {
  return Object.assign(new Event('keydown', { cancelable: true }), {
    key: 'b',
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    ...properties,
  }) as KeyboardEvent;
}
describe('Navigation Panel provider coordination', () => {
  it('diagnoses an absent application responsive policy without installing a fallback observer', () => {
    const f = fixture({ compact: undefined });
    expect(f.host.reportProviderDiagnostic).toHaveBeenCalledWith(
      'navigation-panel-responsive-source',
      expect.stringContaining('Supply compact'),
    );
    expect(f.provider.compact).toBe(false);
  });
  it('persists a reentrant accepted user edit queued during a persistence-load proposal', async () => {
    const save = vi.fn();
    const f = fixture({
      persistenceKey: 'panel',
      persistenceAdapter: { load: () => false, save },
    });
    Object.assign(f.host, {
      onExpandedChange: (event: CustomEvent) => {
        if (event.detail.value === false) f.provider.setExpanded(true, 'trigger-press');
      },
    });
    await flush();
    expect(f.provider.expanded).toBe(true);
    expect(save.mock.calls).toEqual([['panel', true]]);
  });
  it('keeps compact surface distinct and boundaries close through shared owner despite preference veto', () => {
    const f = fixture({ compact: true });
    const wide = f.provider.expanded;
    expect(f.provider.setCompactOpen(true)).toBe(true);
    f.update({ onCompactOpenChange: (event: Event) => event.preventDefault(), compact: false });
    expect(f.provider.state).toMatchObject({ compact: false, compactOpen: false, expanded: wide });
    f.update({ compact: true });
    expect(f.provider.compactOpen).toBe(false);
  });
  it('commits controlled wide values only when the owner publishes and honors cancellation', () => {
    const f = fixture({ controlledExpanded: true });
    expect(f.provider.setExpanded(false)).toBe(true);
    expect(f.provider.expanded).toBe(true);
    f.update({
      onExpandedChange: () => {
        Object.assign(f.host, { controlledExpanded: false });
        f.provider.publishExpanded();
      },
    });
    f.provider.setExpanded(false);
    expect(f.provider.expanded).toBe(false);
    f.update({
      onExpandedChange: (event: Event) => {
        Object.assign(f.host, { controlledExpanded: true });
        f.provider.publishExpanded();
        event.preventDefault();
      },
    });
    f.provider.setExpanded(true);
    expect(f.provider.expanded).toBe(false);
    f.provider.hostUpdate();
    expect(f.provider.expanded).toBe(false);
  });
  it('does not let late persistence overwrite an accepted session edit and saves only wide preference', async () => {
    let resolve!: (value: boolean) => void;
    const save = vi.fn();
    const f = fixture({
      compact: true,
      persistenceKey: 'panel',
      persistenceAdapter: {
        load: () =>
          new Promise<boolean>((r) => {
            resolve = r;
          }),
        save,
      },
    });
    f.provider.setExpanded(false);
    f.provider.setCompactOpen(true);
    resolve(true);
    await flush();
    expect(f.provider.expanded).toBe(false);
    expect(f.provider.compactOpen).toBe(true);
    expect(save.mock.calls).toEqual([['panel', false]]);
  });
  it('accepts loaded preferences before edits, with no re-save and controlled input precedence', async () => {
    const save = vi.fn();
    const adapter = { load: vi.fn(() => false), save };
    const f = fixture({ persistenceAdapter: adapter, persistenceKey: 'wide' });
    await flush();
    expect(f.provider.expanded).toBe(false);
    expect(save).not.toHaveBeenCalled();
    const controlled = fixture({
      controlledExpanded: true,
      persistenceAdapter: adapter,
      persistenceKey: 'wide',
    });
    await flush();
    expect(controlled.provider.expanded).toBe(true);
    expect(adapter.load).toHaveBeenCalledTimes(1);
  });
  it('releases replaced/disconnected responsive callbacks and preserves accepted wide state', () => {
    let publish!: (value: boolean) => void;
    const cleanup = vi.fn();
    const adapter: NavigationPanelResponsiveAdapter = {
      observe: (_host, callback) => {
        publish = callback;
        return cleanup;
      },
    };
    const f = fixture({ responsiveAdapter: adapter });
    publish(true);
    f.provider.setExpanded(false);
    f.update({ responsiveAdapter: undefined });
    expect(cleanup).toHaveBeenCalledTimes(1);
    publish(true);
    expect(f.provider.compact).toBe(false);
    f.provider.hostDisconnected();
    expect(f.provider.expanded).toBe(false);
    f.provider.hostConnected();
    expect(f.provider.expanded).toBe(false);
  });
  it('scopes shortcuts, rejects editable/canceled inputs and consumes only accepted committed toggles', () => {
    let handler!: (event: KeyboardEvent) => void;
    const cleanup = vi.fn();
    const binding: NavigationPanelShortcut = { key: 'b', ctrlKey: true };
    const f = fixture({
      shortcut: binding,
      shortcutAdapter: {
        register: (_host: unknown, _binding: unknown, callback: typeof handler) => {
          handler = callback;
          return cleanup;
        },
      },
    });
    const editable = key();
    editable.composedPath = () => [{ nodeType: 1, localName: 'input' } as unknown as EventTarget];
    handler(editable);
    expect(f.provider.expanded).toBe(true);
    expect(editable.defaultPrevented).toBe(false);
    const accepted = key();
    handler(accepted);
    expect(f.provider.expanded).toBe(false);
    expect(accepted.defaultPrevented).toBe(true);
    f.update({ onExpandedChange: (event: Event) => event.preventDefault() });
    const canceled = key();
    handler(canceled);
    expect(f.provider.expanded).toBe(false);
    expect(canceled.defaultPrevented).toBe(false);
    f.provider.hostDisconnected();
    expect(cleanup).toHaveBeenCalledTimes(1);
    const stale = key();
    handler(stale);
    expect(stale.defaultPrevented).toBe(false);
  });
  it('none is inert only for wide toggle; compact remains modal-capable', () => {
    const f = fixture({ collapseMode: 'none' });
    expect(f.provider.toggle()).toBe(false);
    expect(f.provider.expanded).toBe(true);
    f.update({ compact: true });
    expect(f.provider.toggle()).toBe(true);
    expect(f.provider.compactOpen).toBe(true);
  });
  it('reports persistence failures without blocking accepted state', async () => {
    const f = fixture({
      persistenceKey: 'wide',
      persistenceAdapter: {
        load: () => Promise.reject(new Error('failed')),
        save: () => Promise.reject(new Error('failed')),
      },
    });
    await flush();
    f.provider.setExpanded(false);
    await flush();
    expect(f.provider.expanded).toBe(false);
    expect(f.host.reportProviderDiagnostic).toHaveBeenCalledTimes(2);
  });
});
