import { describe, expect, it, vi } from 'vitest';
import type * as NestedEvents from '../../../foundation/nested-events.js';
import type { FlowNodeDefinition } from '../../../foundation/flow/types.js';

/** The boundaries each element asks for at construction, in call order. */
const boundaries = vi.hoisted(
  (): { host: unknown; options: NestedEvents.NestedEventContainment }[] => [],
);

vi.mock('../../../foundation/nested-events.js', async (importOriginal) => {
  const original = await importOriginal<typeof NestedEvents>();
  return {
    ...original,
    containNestedEvents: (
      host: NestedEvents.NestedEventHost,
      options: NestedEvents.NestedEventContainment,
    ) => {
      boundaries.push({ host, options });
      return original.containNestedEvents(host, options);
    },
  };
});

const { TpFlowNode, NODE_PROPERTY } = await import('./node.js');
const { TpFlowInspector } = await import('../panels/inspector.js');
const { TpInput } = await import('../../../components/input/input.js');
const { TpTextArea } = await import('../../../components/text-area/text-area.js');
const { TpInputGroup } = await import('../../../components/input-group/input-group.js');

type TextControl = InstanceType<typeof TpInput> | InstanceType<typeof TpTextArea>;

const definition: FlowNodeDefinition = {
  type: 'webhook',
  label: 'Webhook',
  ports: [],
  properties: [
    { key: 'path', label: 'Path', control: 'text' },
    { key: 'note', label: 'Note', control: 'textarea', placement: 'inspector' },
    { key: 'retries', label: 'Retries', control: 'number' },
  ],
};

const record = (data: Record<string, unknown>) => ({
  id: 'ticket',
  type: 'webhook',
  position: { x: 0, y: 0 },
  data,
});

/** The contained-event handler a host's boundary runs, as its constructor asked for it. */
function boundaryOf(host: unknown): NestedEvents.NestedEventContainment {
  const found = boundaries.find((boundary) => boundary.host === host);
  if (!found) throw new Error('The host asked for no event boundary.');
  return found.options;
}

/**
 * A bound property control as a factory renders it (`data-flow-property` on the control),
 * controlled with `value` like the factories bind it. Its own proposals run through the host's
 * boundary the way the capture listener runs them: during the control's dispatch.
 */
function boundControl<T extends Element>(
  control: T,
  key: string,
  owner: NestedEvents.NestedEventContainment,
): T {
  Object.defineProperty(control, 'dataset', { value: { flowProperty: key } });
  Object.defineProperty(control, 'closest', {
    value: (selector: string) => (selector === '[data-flow-property]' ? control : null),
  });
  // No light-DOM editor in Node: the proposal path runs without a native element.
  Object.defineProperty(control, 'querySelector', { value: () => null });
  control.addEventListener('tp-value-change', (event) => owner.contained?.(event, control));
  return control;
}

/** Runs the text control's own first update step, which creates its value owner. */
function initialize(control: TextControl, value: string): TextControl {
  control.value = value;
  (control as unknown as { willUpdate(changed: Map<string, unknown>): void }).willUpdate(new Map());
  return control;
}

function flowNode() {
  const node = new TpFlowNode();
  node.definition = definition;
  node.node = record({ path: '/support/tickets', note: 'Escalate', retries: 2 });
  const proposals: unknown[] = [];
  return { node, proposals, owner: boundaryOf(node) };
}

describe('flow property controls keep the text being edited', () => {
  it('uwg-fl-req-evt-3, ucl17-input-anatomy-r0c1-p: a node property edit the graph accepts is the text control value when its proposal returns', () => {
    const { node, proposals, owner } = flowNode();
    // The graph accepts the proposal; the node renders its new data later.
    node.addEventListener(NODE_PROPERTY, (event) => {
      proposals.push((event as CustomEvent<{ value: unknown }>).detail.value);
    });
    const control = initialize(boundControl(new TpInput(), 'path', owner), '/support/tickets');
    expect(control.controlled).toBe(true);
    expect(control.setValue('/supXport/tickets')).toBe(true);
    expect(proposals).toEqual(['/supXport/tickets']);
    // The committed text equals what the user typed, so the native editor and its caret stay.
    expect(control.value).toBe('/supXport/tickets');
    expect(control.setValue('/supXYport/tickets')).toBe(true);
    expect(control.value).toBe('/supXYport/tickets');
  });

  it('uwg-fl-req-evt-3: a node property edit the graph rejects leaves the text control at the graph value', () => {
    const { node, owner } = flowNode();
    node.addEventListener(NODE_PROPERTY, (event) => event.preventDefault());
    const control = initialize(boundControl(new TpInput(), 'path', owner), '/support/tickets');
    expect(control.setValue('/supXport/tickets')).toBe(false);
    expect(control.value).toBe('/support/tickets');
  });

  it('uwg-fl-req-evt-3: an external value change after an accepted edit still shows', () => {
    const { node, owner } = flowNode();
    node.addEventListener(NODE_PROPERTY, () => undefined);
    const control = initialize(boundControl(new TpInput(), 'path', owner), '/support/tickets');
    control.setValue('/supXport/tickets');
    // The graph's next value reaches the control through the factory binding.
    control.value = '/billing/tickets';
    expect(control.value).toBe('/billing/tickets');
  });

  it('uwg-fl-req-prop-3: a text area property edit the graph accepts is its value when its proposal returns', () => {
    const { node, owner } = flowNode();
    node.addEventListener(NODE_PROPERTY, () => undefined);
    const control = initialize(boundControl(new TpTextArea(), 'note', owner), 'Escalate');
    expect(control.setValue('Esc-alate')).toBe(true);
    expect(control.value).toBe('Esc-alate');
  });

  it('uwg-fl-req-prop-3: a number field root is not given the parsed number as text', () => {
    const { node, owner } = flowNode();
    node.addEventListener(NODE_PROPERTY, () => undefined);
    const root = boundControl(new TpInputGroup(), 'retries', owner);
    const writes: unknown[] = [];
    Object.defineProperty(root, 'value', {
      set: (value: unknown) => writes.push(value),
      get: () => undefined,
    });
    const event = new CustomEvent('tp-value-change', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { value: 3, previousValue: 2, reason: 'increment' },
    });
    owner.contained?.(event, root);
    expect(event.defaultPrevented).toBe(false);
    expect(writes).toEqual([]);
  });

  it('uwg-fl-req-evt-3, ucl17-input-anatomy-r0c1-p: an inspector edit is the text control value when its proposal returns', () => {
    for (const commit of ['live', 'explicit'] as const) {
      boundaries.length = 0;
      const inspector = new TpFlowInspector();
      inspector.commit = commit;
      inspector.definition = definition;
      inspector.node = record({ path: '/support/tickets', note: 'Escalate' });
      const owner = boundaryOf(inspector);
      const control = initialize(boundControl(new TpTextArea(), 'note', owner), 'Escalate');
      expect(control.setValue('Esc-alate')).toBe(true);
      expect(control.value, commit).toBe('Esc-alate');
    }
  });
});
