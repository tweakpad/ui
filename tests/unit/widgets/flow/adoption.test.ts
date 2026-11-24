import { describe, expect, it } from 'vitest';
import type { FlowChange, FlowNode } from '../../../../src/foundation/flow/types.js';
import type { FlowModel } from '../../../../src/foundation/flow/model/model.js';

const { LightDomAdoption } = await import('../../../../src/widgets/flow/adoption.js');

/** An authored `tp-flow-node` child: its id and attributes. */
const authored = (id: string, attributes: Record<string, string>) => ({
  localName: 'tp-flow-node',
  id,
  getAttribute: (name: string) => attributes[name] ?? null,
  hasAttribute: (name: string) => name in attributes,
});

function adopt(children: ReturnType<typeof authored>[]): FlowChange[] {
  const proposed: FlowChange[] = [];
  const adoption = new LightDomAdoption({
    host: { children, ownerDocument: { defaultView: null } } as unknown as HTMLElement,
    model: () => ({ getNode: () => undefined, getEdge: () => undefined }) as unknown as FlowModel,
    adopt: (changes) => proposed.push(...changes),
    conflict: () => {},
    onChanged: () => {},
  });
  adoption.scan();
  return proposed;
}

const added = (changes: FlowChange[]): FlowNode[] =>
  changes.flatMap((change) => (change.type === 'node-add' ? [change.node] : []));

describe('flow node adoption of groups (uwg-flg-req-def-5)', () => {
  it('adopts `collapsed` and the `ports` JSON into the document node', () => {
    const [group] = added(
      adopt([
        authored('stage', {
          type: 'group',
          collapsed: '',
          ports:
            '[{"id":"image","direction":"input","label":"Image"},{"id":"mask","direction":"output"}]',
        }),
      ]),
    );
    expect(group).toMatchObject({
      id: 'stage',
      type: 'group',
      collapsed: true,
      ports: [
        { id: 'image', direction: 'input', label: 'Image' },
        { id: 'mask', direction: 'output' },
      ],
    });
  });

  it('leaves both out when the attributes are absent', () => {
    const [node] = added(adopt([authored('decode', { type: 'decode' })]));
    expect(node).not.toHaveProperty('collapsed');
    expect(node).not.toHaveProperty('ports');
  });

  it('keeps only port entries with a string id and ignores malformed JSON', () => {
    const [kept, broken] = added(
      adopt([
        authored('a', { type: 'group', ports: '[{"id":"in"},{"label":"no id"},3,null]' }),
        authored('b', { type: 'group', ports: '{not json' }),
      ]),
    );
    expect(kept?.ports).toEqual([{ id: 'in' }]);
    expect(broken).not.toHaveProperty('ports');
  });
});
