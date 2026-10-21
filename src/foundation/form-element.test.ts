import { describe, expect, it } from 'vitest';
import type { PropertyValues } from 'lit';
import { TpFormElement } from './form-element.js';
import type { FieldAssociationAttributes } from './form-element.js';

/** A node of the fake render tree: attributes, a parent, and the tree it belongs to. */
class FakeNode {
  readonly attributes = new Map<string, string>();
  parentNode: FakeTree | null = null;
  id = '';
  className = '';
  hidden = false;
  textContent = '';
  readonly style = { setProperty() {}, removeProperty() {} };
  constructor(readonly tree: FakeTree | null = null) {}
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }
  getRootNode(): FakeTree | null {
    return this.tree;
  }
  remove(): void {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
}
class FakeTree {
  children: FakeNode[] = [];
  append(node: FakeNode): void {
    node.remove();
    node.parentNode = this;
    this.children.push(node);
  }
  querySelector(): null {
    return null;
  }
  getElementById(id: string): FakeNode | null {
    return this.children.find((child) => child.id === id) ?? null;
  }
}

/** Unit-only form element: records each association and applies it when `applies` is set. */
class AssociationProbe extends TpFormElement {
  target: FakeNode | null = null;
  applies = false;
  readonly records: FieldAssociationAttributes[] = [];
  protected override associationTarget(): HTMLElement | null {
    return this.target as unknown as HTMLElement | null;
  }
  protected override applyFieldAssociation(attributes: FieldAssociationAttributes): boolean {
    this.records.push({ ...attributes });
    return this.applies;
  }
  protected resetFormValue(): void {}
  /** One association pass, as `updated()` runs it after every update. */
  sync(): void {
    this.updated(new Map() as PropertyValues<this>);
  }
}
customElements.define('tp-association-probe-unit', AssociationProbe);

/** Unit-only form element whose description and error nodes live in a container it chooses. */
class ContainerProbe extends AssociationProbe {
  container: FakeTree | null = null;
  protected override associationContainer(): ParentNode {
    return (this.container ?? super.associationContainer()) as unknown as ParentNode;
  }
}
customElements.define('tp-association-container-probe-unit', ContainerProbe);

function probe(options: { target?: boolean; applies?: boolean } = {}) {
  const element = new AssociationProbe();
  const shadow = new FakeTree();
  Object.defineProperty(element, 'ownerDocument', {
    value: { defaultView: { HTMLFormElement: class {} }, createElement: () => new FakeNode() },
  });
  Object.defineProperty(element, 'renderRoot', { value: shadow });
  if (options.target) element.target = new FakeNode(shadow);
  element.applies = !!options.applies;
  return { element, shadow, last: () => element.records.at(-1) };
}
const nodeIds = (shadow: FakeTree) => shadow.children.map((node) => node.id);
const cleared = {
  'aria-label': null,
  'aria-describedby': null,
  'aria-errormessage': null,
  'aria-invalid': null,
};

describe('TpFormElement Field association hook', () => {
  it('passes the association to applyFieldAssociation after every update (ucl17-field-q1)', () => {
    const { element, shadow, last } = probe({ applies: true });
    element.setFieldAssociation({ label: 'Crew log', description: 'Shared', error: 'Missing' });
    element.invalid = true;
    element.sync();
    const [description, error] = nodeIds(shadow);
    expect(last()).toEqual({
      'aria-label': 'Crew log',
      'aria-describedby': `${description} ${error}`,
      'aria-errormessage': error,
      'aria-invalid': 'true',
    });
    element.sync();
    expect(element.records).toHaveLength(2);
  });

  it('creates the description and error nodes without an element target when the hook applies (uwg-te-req-a11y-1)', () => {
    const { element, shadow, last } = probe({ applies: true });
    element.setFieldAssociation({ description: 'Shared', error: 'Missing' });
    element.sync();
    expect(shadow.children.map((node) => [node.className, node.textContent, node.hidden])).toEqual([
      ['visually-hidden', 'Shared', false],
      ['visually-hidden', 'Missing', false],
    ]);
    for (const id of `${last()!['aria-describedby']} ${last()!['aria-errormessage']}`.split(' '))
      expect(shadow.getElementById(id)).not.toBeNull();
  });

  it('writes nothing to the element target when the hook applies', () => {
    const { element } = probe({ target: true, applies: true });
    element.target!.setAttribute('aria-describedby', 'own');
    element.setFieldAssociation({ label: 'Crew log', description: 'Shared', error: 'Missing' });
    element.invalid = true;
    element.sync();
    expect([...element.target!.attributes]).toEqual([['aria-describedby', 'own']]);
  });

  it('passes null for each absent value; a host aria-label stands in for a missing Field label', () => {
    const { element, last } = probe({ applies: true });
    element.sync();
    expect(last()).toEqual(cleared);
    element.setAttribute('aria-label', 'Host name');
    element.sync();
    expect(last()!['aria-label']).toBe('Host name');
  });

  it('passes nulls and removes the nodes once the Field clears its association (node-000630-atomic-2)', () => {
    const { element, shadow, last } = probe({ applies: true });
    element.setFieldAssociation({ label: 'Crew log', description: 'Shared', error: 'Missing' });
    element.sync();
    element.setFieldAssociation({ label: '', description: '', error: '' });
    element.sync();
    expect(last()).toEqual(cleared);
    expect(shadow.children).toHaveLength(0);
  });

  it('keeps the default writes on the element target when the hook does not apply', () => {
    const { element, shadow, last } = probe({ target: true });
    const target = element.target!;
    target.setAttribute('aria-describedby', 'own');
    target.setAttribute('aria-errormessage', 'own-error');
    element.setFieldAssociation({ label: 'Crew log', description: 'Shared', error: 'Missing' });
    element.invalid = true;
    element.sync();
    const [description, error] = nodeIds(shadow);
    expect(Object.fromEntries(target.attributes)).toEqual({
      'aria-describedby': `own ${description} ${error}`,
      'aria-errormessage': `own-error ${error}`,
      'aria-label': 'Crew log',
      'aria-invalid': 'true',
    });
    expect(last()).toEqual({
      'aria-label': 'Crew log',
      'aria-describedby': `${description} ${error}`,
      'aria-errormessage': error,
      'aria-invalid': 'true',
    });
    element.disconnectedCallback();
    expect(Object.fromEntries(target.attributes)).toEqual({
      'aria-describedby': 'own',
      'aria-errormessage': 'own-error',
    });
  });

  it('creates no nodes without an element target when the hook does not apply', () => {
    const { element, shadow } = probe();
    element.setFieldAssociation({ label: 'Crew log', description: 'Shared', error: 'Missing' });
    element.sync();
    expect(shadow.children).toHaveLength(0);
    expect(element.records).toHaveLength(1);
  });

  it('keeps the Field description and error nodes in the container associationContainer() returns (uwg-te-tab-anatomy-r1, uwg-te-req-ana-3)', () => {
    const element = new ContainerProbe();
    const shadow = new FakeTree();
    Object.defineProperty(element, 'ownerDocument', {
      value: { defaultView: { HTMLFormElement: class {} }, createElement: () => new FakeNode() },
    });
    Object.defineProperty(element, 'renderRoot', { value: shadow });
    element.applies = true;
    const part = new FakeTree();
    element.container = part;
    element.setFieldAssociation({ description: 'Shared', error: 'Missing' });
    element.sync();
    expect(shadow.children).toHaveLength(0);
    expect(part.children.map((node) => [node.className, node.textContent])).toEqual([
      ['visually-hidden', 'Shared'],
      ['visually-hidden', 'Missing'],
    ]);
    const ids = nodeIds(part);
    expect(element.records.at(-1)!['aria-describedby']).toBe(ids.join(' '));
    element.container = null;
    element.sync();
    expect(part.children).toHaveLength(0);
    expect(nodeIds(shadow)).toEqual(ids);
  });
});
