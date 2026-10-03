import { describe, expect, it, vi } from 'vitest';
import { PresentationController } from './controller.js';

type Host = ConstructorParameters<typeof PresentationController>[0];
type TestStyle = {
  textContent: string;
  parentNode: unknown;
  setAttribute: ReturnType<typeof vi.fn>;
};

function environment(realm: string, constructed = true) {
  class Sheet {
    readonly realm = realm;
    css = '';
    replaceSync(css: string) {
      this.css = css;
    }
  }
  const document = {
    defaultView: { CSSStyleSheet: constructed ? Sheet : undefined, litNonce: `${realm}-nonce` },
    createElement: vi.fn((): TestStyle => ({
      textContent: '',
      parentNode: null,
      setAttribute: vi.fn(),
    })),
  };
  return { document, Sheet };
}

function fixture(scope: ReturnType<typeof environment>, constructed = true) {
  const children: TestStyle[] = [];
  let sheets: Array<{ realm: string; css?: string }> = [];
  const root = {
    nodeType: 11,
    host: {},
    ownerDocument: scope.document,
    get firstChild() {
      return children[0] ?? null;
    },
    append(style: TestStyle) {
      children.push(style);
      style.parentNode = this;
    },
  };
  if (constructed)
    Object.defineProperty(root, 'adoptedStyleSheets', {
      get: () => sheets,
      set: (value: typeof sheets) => {
        const realm = new root.ownerDocument.defaultView.CSSStyleSheet!().realm;
        if (value.some((sheet) => sheet.realm !== realm)) throw new Error('foreign sheet');
        sheets = value;
      },
    });
  const host = {
    ownerDocument: scope.document,
    constructor: {
      elementStyles: [{ cssText: ':host { display: inline-flex; }' }],
      shadowRootOptions: { mode: 'open' },
    },
    shadowRoot: null as typeof root | null,
    renderRoot: root,
    renderOptions: {} as Host['renderOptions'],
    attachShadow: vi.fn(() => {
      host.shadowRoot = root;
      return root;
    }),
    addController: vi.fn(),
    requestUpdate: vi.fn(),
  };
  const controller = new PresentationController(host as unknown as Host);
  return { host, root, children, controller, sheets: () => sheets };
}

describe('document-local structural style owner', () => {
  it('creates first-connected structural sheets in the target document', () => {
    const foreign = environment('foreign');
    const state = fixture(foreign);
    expect(state.controller.createRenderRoot()).toBe(state.root);
    expect(state.sheets()).toHaveLength(1);
    expect(state.sheets()[0]).toMatchObject({
      realm: 'foreign',
      css: ':host { display: inline-flex; }',
    });
    expect(state.host.attachShadow).toHaveBeenCalledWith({ mode: 'open' });
    expect(state.host.renderOptions.renderBefore).toBeNull();
  });

  it('preserves structural sheet identity on ordinary reconnect', () => {
    const state = fixture(environment('same'));
    state.controller.createRenderRoot();
    state.controller.hostConnected();
    const original = state.sheets()[0];
    state.controller.hostDisconnected();
    state.controller.hostConnected();
    expect(state.sheets()).toEqual([original]);
    expect(state.host.requestUpdate).not.toHaveBeenCalled();
  });

  it('restores owned sheets after adoption and preserves destination consumer sheets', () => {
    const state = fixture(environment('source'));
    state.controller.createRenderRoot();
    state.controller.hostConnected();
    const previous = state.sheets()[0];
    state.controller.hostDisconnected();
    const foreign = environment('target');
    state.host.ownerDocument = foreign.document;
    state.root.ownerDocument = foreign.document;
    const consumer = new foreign.Sheet();
    (state.root as unknown as ShadowRoot).adoptedStyleSheets = [
      consumer as unknown as CSSStyleSheet,
    ];
    state.controller.hostConnected();
    expect(state.sheets()).toHaveLength(2);
    expect(state.sheets()[0]).toBe(consumer);
    expect(state.sheets()[1]).toMatchObject({
      realm: 'target',
      css: ':host { display: inline-flex; }',
    });
    expect(state.sheets()).not.toContain(previous);
    expect(state.host.requestUpdate).toHaveBeenCalledOnce();
  });

  it('preserves the fallback style render boundary and target nonce across adoption', () => {
    const state = fixture(environment('source', false), false);
    state.controller.createRenderRoot();
    state.controller.hostConnected();
    const style = state.children[0]!;
    expect(state.host.renderOptions.renderBefore).toBe(style);
    expect(style.setAttribute).toHaveBeenCalledWith('nonce', 'source-nonce');
    state.controller.hostDisconnected();
    const foreign = environment('target', false);
    state.host.ownerDocument = foreign.document;
    state.root.ownerDocument = foreign.document;
    state.controller.hostConnected();
    expect(state.children).toEqual([style]);
    expect(state.host.renderOptions.renderBefore).toBe(style);
    expect(style.setAttribute).toHaveBeenLastCalledWith('nonce', 'target-nonce');
  });
});
