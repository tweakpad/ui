import { describe, expect, it, vi } from 'vitest';
import { PresentationController } from './controller.js';
import { ContentSecurityService, contentSecurityPolicy } from '../foundation/content-security.js';
import { GeneratedStyleResource } from '../foundation/generated-style.js';
import { setLogicalPortalOwner } from '../foundation/portal-ownership.js';

type Host = ConstructorParameters<typeof PresentationController>[0];
type TestStyle = {
  textContent: string;
  nodeType: number;
  parentNode: { removeChild: (node: TestStyle) => void } | null;
  nextSibling?: TestStyle | null;
  setAttribute: ReturnType<typeof vi.fn>;
  remove: () => void;
};
function node(nodeType: number): TestStyle {
  return {
    nodeType,
    textContent: '',
    parentNode: null,
    setAttribute: vi.fn(),
    remove() {
      this.parentNode?.removeChild(this);
    },
  };
}

function environment(realm: string, constructed = true) {
  class Sheet {
    readonly realm = realm;
    css = '';
    replaceSync(css: string) {
      this.css = css;
    }
  }
  const document = {
    nodeType: 9,
    defaultView: {
      CSSStyleSheet: constructed ? Sheet : undefined,
      litNonce: constructed ? undefined : `${realm}-nonce`,
    },
    createComment: vi.fn(() => node(8)),
    createElement: vi.fn(() => node(1)),
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
    insertBefore(style: TestStyle, reference: TestStyle | null) {
      const index = reference ? children.indexOf(reference) : children.length;
      children.splice(index, 0, style);
      style.parentNode = this;
    },
    removeChild(style: TestStyle) {
      children.splice(children.indexOf(style), 1);
      style.parentNode = null;
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
    parentNode: scope.document,
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
    expect(state.host.renderOptions.renderBefore).toBe(state.children[0]);
    expect(state.children[0]?.nodeType).toBe(8);
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
    state.host.parentNode = foreign.document;
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

  it('preserves the render boundary and reapplies target nonce across adoption', () => {
    const state = fixture(environment('source', false), false);
    state.controller.createRenderRoot();
    state.controller.hostConnected();
    const boundary = state.children[0]!;
    const style = state.children[1]!;
    expect(state.host.renderOptions.renderBefore).toBe(boundary);
    expect(style.setAttribute).toHaveBeenCalledWith('nonce', 'source-nonce');
    state.controller.hostDisconnected();
    const foreign = environment('target', false);
    state.host.ownerDocument = foreign.document;
    state.host.parentNode = foreign.document;
    state.root.ownerDocument = foreign.document;
    state.controller.hostConnected();
    expect(state.children).toHaveLength(2);
    expect(state.host.renderOptions.renderBefore).toBe(boundary);
    expect(state.children[1]!.setAttribute).toHaveBeenCalledWith('nonce', 'target-nonce');
    expect(style.parentNode).toBeNull();
  });
});

describe('shared generated resource policy', () => {
  it('uses nonce-bearing nodes, suppresses only owned resources, and preserves the Lit boundary', () => {
    const state = fixture(environment('same'));
    state.controller.createRenderRoot();
    state.controller.hostConnected();
    const root = state.root as unknown as ShadowRoot;
    const consumer = new state.host.ownerDocument.defaultView.CSSStyleSheet!();
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, consumer as unknown as CSSStyleSheet];
    const boundary = state.host.renderOptions.renderBefore;
    const policy = new ContentSecurityService(state.host.ownerDocument as unknown as Document, {
      nonce: 'first',
    });
    expect(state.sheets()).toEqual([consumer]);
    expect(state.children[1]!.setAttribute).toHaveBeenCalledWith('nonce', 'first');
    policy.update({ nonce: 'second' });
    expect(state.children).toHaveLength(2);
    expect(state.children[1]!.setAttribute).toHaveBeenCalledWith('nonce', 'second');
    policy.update({ disableStyleElements: true });
    expect(state.children).toEqual([boundary]);
    expect(state.sheets()).toEqual([consumer]);
    expect(state.host.renderOptions.renderBefore).toBe(boundary);
    policy.dispose();
    expect(state.sheets()).toHaveLength(2);
    expect(state.sheets()[0]).toBe(consumer);
    state.controller.hostDisconnected();
  });

  it('uses nearest policy through logical portals and restores an outer provider on dispose', () => {
    const state = fixture(environment('same'));
    const owner = state.host as unknown as HTMLElement;
    const outer = new ContentSecurityService(state.host.ownerDocument as unknown as Document, {
      nonce: 'outer',
    });
    const scoped = new ContentSecurityService(owner, { disableStyleElements: true });
    const portal = {
      ownerDocument: state.host.ownerDocument,
      parentNode: state.host.ownerDocument,
    } as unknown as HTMLElement;
    setLogicalPortalOwner(portal, owner);
    expect(contentSecurityPolicy(portal)).toEqual({ disableStyleElements: true });
    const inner = new ContentSecurityService(portal);
    expect(contentSecurityPolicy(portal)).toEqual({});
    inner.dispose();
    scoped.dispose();
    expect(contentSecurityPolicy(portal)).toEqual({ nonce: 'outer' });
    outer.dispose();
    setLogicalPortalOwner(portal, null);
  });

  it('stops policy subscriptions on disconnect/dispose and resynchronizes reconnect', () => {
    const state = fixture(environment('same'));
    const policy = new ContentSecurityService(state.host.ownerDocument as unknown as Document);
    const resource = new GeneratedStyleResource(
      state.host as unknown as HTMLElement,
      state.root as unknown as ShadowRoot,
    );
    resource.setText(':host{display:block}');
    const original = state.sheets()[0];
    resource.disconnect();
    policy.update({ disableStyleElements: true });
    expect(state.sheets()).toEqual([original]);
    resource.connect();
    expect(state.sheets()).toEqual([]);
    resource.dispose();
    policy.update({ nonce: 'ignored' });
    expect(state.children).toEqual([]);
    expect(state.sheets()).toEqual([]);
    policy.dispose();
  });
});
