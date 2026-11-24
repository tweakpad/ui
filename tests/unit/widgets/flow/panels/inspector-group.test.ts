import { describe, expect, it, vi } from 'vitest';
import type * as NestedEvents from '../../../../../src/foundation/nested-events.js';
import type { FlowNodeDefinition } from '../../../../../src/foundation/flow/types.js';
import { templateMarkup } from '../../../template-markup.test.js';

/** The boundaries each element asks for at construction, in call order. */
const boundaries = vi.hoisted(
  (): { host: unknown; options: NestedEvents.NestedEventContainment }[] => [],
);

vi.mock('../../../../../src/foundation/nested-events.js', async (importOriginal) => {
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

const inspectorModule = await import('../../../../../src/widgets/flow/panels/inspector.js');
const {
  TpFlowInspector,
  INSPECTOR_GROUP_COLLAPSED,
  INSPECTOR_GROUP_LABEL,
  INSPECTOR_PORT_ADD,
  INSPECTOR_PORT_REMOVE,
  INSPECTOR_PORT_UPDATE,
} = inspectorModule;

const groupDefinition: FlowNodeDefinition = {
  type: 'stage',
  label: 'Stage',
  shape: 'group',
  ports: [{ id: 'source', direction: 'input', label: 'Source' }],
};

type Template = { strings: readonly string[]; values: unknown[] };

/** The listeners bound to one event attribute whose tag carries `marker`, in template order. */
const listeners = (value: unknown, attribute: string, marker: string) => {
  const found: ((event: Event) => void)[] = [];
  const walk = (part: unknown): void => {
    if (Array.isArray(part)) part.forEach(walk);
    else if (part && typeof part === 'object' && 'strings' in part && 'values' in part) {
      const { strings, values } = part as Template;
      values.forEach((entry, index) => {
        const before = strings.slice(0, index + 1).join('');
        const tag = before.slice(before.lastIndexOf('<'));
        if (
          typeof entry === 'function' &&
          strings[index]!.trimEnd().endsWith(`${attribute}=`) &&
          tag.includes(marker)
        )
          found.push(entry as (event: Event) => void);
        else walk(entry);
      });
    }
  };
  walk(value);
  return found;
};

function groupInspector() {
  boundaries.length = 0;
  const inspector = new TpFlowInspector();
  inspector.definition = groupDefinition;
  inspector.node = {
    id: 'stage',
    type: 'stage',
    position: { x: 0, y: 0 },
    data: {},
    label: 'Ingest',
    collapsed: true,
    ports: [
      { id: 'source', label: 'Feed' },
      { id: 'image', direction: 'output', label: 'Image' },
    ],
  };
  const owner = boundaries.find((boundary) => boundary.host === inspector)!.options;
  const events: { type: string; detail: Record<string, unknown> }[] = [];
  for (const type of [
    INSPECTOR_GROUP_LABEL,
    INSPECTOR_GROUP_COLLAPSED,
    INSPECTOR_PORT_ADD,
    INSPECTOR_PORT_UPDATE,
    INSPECTOR_PORT_REMOVE,
  ])
    inspector.addEventListener(type, (event) => {
      expect(event.composed).toBe(false);
      // Every detail carries its source event; the assertions compare the rest.
      const detail = { ...(event as CustomEvent<Record<string, unknown>>).detail };
      expect(detail['sourceEvent']).toBeInstanceOf(Event);
      delete detail['sourceEvent'];
      events.push({ type, detail });
    });
  const render = () => (inspector as unknown as { render(): unknown }).render();
  return { inspector, owner, events, render };
}

/** A group section control as the section renders it, carrying its `data-flow-group` role. */
function control(role: string, portId?: string): HTMLElement {
  const element = new EventTarget() as unknown as HTMLElement;
  const dataset: Record<string, string> = { flowGroup: role };
  if (portId) dataset['portId'] = portId;
  Object.defineProperty(element, 'dataset', { value: dataset });
  Object.defineProperty(element, 'closest', {
    value: (selector: string) => (selector === '[data-flow-group]' ? element : null),
  });
  Object.defineProperty(element, 'localName', { value: 'tp-input' });
  return element;
}

const valueChange = (value: unknown) =>
  new CustomEvent('tp-value-change', {
    cancelable: true,
    detail: { value, previousValue: undefined, reason: 'input-change' },
  });

describe('flow inspector group section (uwg-flg-req-prop-13)', () => {
  it('shows the label, the collapsed Switch and every port with rename, remove and the add actions', () => {
    const text = templateMarkup(groupInspector().render());
    expect(text).toMatch(/<tp-input class="control" data-flow-group="label"[^>]*\.value=Ingest/);
    expect(text).toMatch(
      /<tp-switch class="control" data-flow-group="collapsed"[^>]*\.checked=true/,
    );
    // The definition's port under the node's rename, then the node's own addition.
    expect(text).toMatch(/data-port-id=source[^>]*\.value=Feed/);
    expect(text).toMatch(/data-port-id=image[^>]*\.value=Image/);
    expect(text).toContain('.ariaLabel=Remove Feed');
    expect(text).toContain('data-direction="input"');
    expect(text).toContain('Add input');
    expect(text).toContain('Add output');
  });

  it('keeps a declared port of the definition (only instance ports are removable)', () => {
    const text = templateMarkup(groupInspector().render());
    expect(text).toMatch(
      /data-port-id=source \.icon=\[object Object\] \.ariaLabel=Remove Feed \.disabled=true/,
    );
    expect(text).toMatch(
      /data-port-id=image \.icon=\[object Object\] \.ariaLabel=Remove Image \.disabled=false/,
    );
  });

  it('reports a rename once its field settles', () => {
    const { owner, events, render } = groupInspector();
    const label = control('label');
    owner.contained?.(valueChange('Ingest A'), label);
    owner.contained?.(valueChange('Ingest All'), label);
    expect(events).toEqual([]);
    const [settle] = listeners(render(), '@change', 'data-flow-group="label"');
    const change = new Event('change');
    Object.defineProperty(change, 'currentTarget', { value: label });
    settle!(change);
    expect(events).toEqual([
      { type: INSPECTOR_GROUP_LABEL, detail: { nodeId: 'stage', label: 'Ingest All' } },
    ]);
  });

  it('reports a port rename with its patch', () => {
    const { owner, events, render } = groupInspector();
    const field = control('port', 'image');
    owner.contained?.(valueChange('Picture'), field);
    const [, , settle] = listeners(render(), '@change', 'data-flow-group');
    const change = new Event('change');
    Object.defineProperty(change, 'currentTarget', { value: field });
    settle!(change);
    expect(events).toEqual([
      {
        type: INSPECTOR_PORT_UPDATE,
        detail: { nodeId: 'stage', portId: 'image', patch: { label: 'Picture' } },
      },
    ]);
  });

  it('reports the collapsed Switch at once', () => {
    const { owner, events } = groupInspector();
    owner.contained?.(valueChange(false), control('collapsed'));
    expect(events).toEqual([
      {
        type: INSPECTOR_GROUP_COLLAPSED,
        detail: { nodeId: 'stage', collapsed: false, reason: 'input-change' },
      },
    ]);
  });

  it('reports the add and remove presses', () => {
    const { events, render } = groupInspector();
    const template = render();
    const press = (marker: string, dataset: Record<string, string>, index = 0) => {
      const event = new Event('click');
      Object.defineProperty(event, 'currentTarget', { value: { dataset } });
      listeners(template, '@click', marker)[index]!(event);
    };
    press('port-add', { direction: 'output' }, 1);
    press('port-remove', { portId: 'image' }, 1);
    expect(events).toEqual([
      { type: INSPECTOR_PORT_ADD, detail: { nodeId: 'stage', direction: 'output' } },
      { type: INSPECTOR_PORT_REMOVE, detail: { nodeId: 'stage', portId: 'image' } },
    ]);
  });

  it('shows no group section for other nodes', () => {
    const { inspector, render } = groupInspector();
    inspector.definition = { ...groupDefinition, shape: 'card' };
    expect(templateMarkup(render())).not.toContain('data-flow-group');
  });
});
