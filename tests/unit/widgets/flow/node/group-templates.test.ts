import { describe, expect, it } from 'vitest';
import type {
  FlowNodeDefinition,
  FlowResolvedPort,
} from '../../../../../src/foundation/flow/types.js';
import { templateMarkup } from '../../../template-markup.test.js';

const { TpFlowNode } = await import('../../../../../src/widgets/flow/node/node.js');
const { DEFAULT_STRINGS } = await import('../../../../../src/widgets/flow/strings.js');
const { GROUP_TOGGLE, TERMINAL_ADD_PORT } =
  await import('../../../../../src/widgets/flow/groups/events.js');
const { groupAccessibleName, terminalGroupId } =
  await import('../../../../../src/widgets/flow/node/group-templates.js');
const { renderFlowBreadcrumb } =
  await import('../../../../../src/widgets/flow/groups/breadcrumb.js');

const groupDefinition: FlowNodeDefinition = {
  type: 'stage',
  label: 'Stage',
  shape: 'group',
  resizable: true,
  ports: [],
};
const panelDefinition: FlowNodeDefinition = {
  type: '@inputs',
  label: 'Inputs',
  shape: 'panel',
  ports: [],
};

const port = (
  id: string,
  direction: 'input' | 'output',
  side: 'left' | 'right',
  nodeId = 'stage',
): FlowResolvedPort => ({
  id,
  label: id,
  direction,
  nodeId,
  geometry: { id, x: 0, y: 0, width: 12, height: 12, side },
  index: 0,
  count: 1,
});

type Template = { strings: readonly string[]; values: unknown[] };

/** The listeners bound to one event attribute, in template order. */
const listeners = (value: unknown, attribute: string): ((event: Event) => void)[] => {
  const found: ((event: Event) => void)[] = [];
  const walk = (part: unknown): void => {
    if (Array.isArray(part)) part.forEach(walk);
    else if (part && typeof part === 'object' && 'strings' in part && 'values' in part) {
      const { strings, values } = part as Template;
      values.forEach((entry, index) => {
        if (typeof entry === 'function' && strings[index]!.trimEnd().endsWith(`${attribute}=`))
          found.push(entry as (event: Event) => void);
        else walk(entry);
      });
    }
  };
  walk(value);
  return found;
};

function groupNode(options: { collapsed?: boolean; terminal?: 'inputs' | 'outputs' } = {}) {
  const node = new TpFlowNode();
  node.definition = options.terminal ? panelDefinition : groupDefinition;
  const id = options.terminal ? `stage#${options.terminal}` : 'stage';
  node.node = {
    id,
    type: node.definition.type,
    position: { x: 0, y: 0 },
    data: {},
    label: 'Ingest',
  };
  node.collapsed = options.collapsed ?? false;
  node.memberCount = 3;
  node.terminal = options.terminal;
  node.ports = options.terminal
    ? [port('image', 'output', 'right', id)]
    : [port('image', 'input', 'left'), port('mask', 'output', 'right')];
  const render = () => (node as unknown as { render(): unknown }).render();
  return { node, render, markup: () => templateMarkup(render()) };
}

describe('flow group frame (uwg-flg-req-ana-6)', () => {
  it('paints the frame with a header strip, the member count Badge, a collapse Button and four border strips', () => {
    const { markup } = groupNode();
    const text = markup();
    expect(text).toContain('part="flow-node-group"');
    expect(text).toContain('part="flow-node-group-header"');
    expect(text).toMatch(
      /<tp-badge class="group-count" part="flow-node-group-count"[^>]*>3<\/tp-badge>/,
    );
    expect(text).toMatch(/<tp-button class="group-toggle"[^>]*data-no-drag/);
    for (const edge of ['top', 'right', 'bottom', 'left'])
      expect(text).toContain(`part="flow-node-group-edge" data-edge=${edge}`);
    // Its ports sit on the frame edges, not in rows.
    expect(text).toContain('class="ports" data-side=left part="flow-node-ports"');
    expect(text).not.toContain('<tp-card');
  });

  it('marks the node part with the group states the recipe styles (uwg-flg-req-pres-5)', () => {
    const { node, render } = groupNode();
    let properties: Record<string, unknown> = {};
    node.partContracts = {
      'flow-node': {
        renderDelegate: (args: { properties: Record<string, unknown> }) => {
          properties = args.properties;
          return '';
        },
      },
    } as unknown as typeof node.partContracts;
    render();
    expect(properties).toMatchObject({
      'data-shape': 'group',
      'data-collapsed': false,
      'data-drop-target': false,
    });
    node.collapsed = true;
    node.dropTarget = true;
    render();
    expect(properties).toMatchObject({ 'data-collapsed': true, 'data-drop-target': true });
  });

  it('keeps the frame at low detail (groups never use the shell)', () => {
    const { node, markup } = groupNode();
    node.lod = 'low';
    expect(markup()).toContain('part="flow-node-group"');
    expect(markup()).not.toContain('flow-node-shell');
  });
});

describe('flow collapsed group (uwg-flg-req-ana-7)', () => {
  it('renders an enclosed Card with the header, the count, an expand Button and one row per port', () => {
    const { markup } = groupNode({ collapsed: true });
    const text = markup();
    expect(text).toMatch(/<tp-card class="card panel"[^>]*data-shape="group" data-collapsed>/);
    expect(text).toContain('part="flow-node-header flow-node-group-header"');
    expect(text).toContain('part="flow-node-group-count"');
    expect(text).toContain('data-port-id=image');
    expect(text).toContain('data-port-id=mask');
    // The ports follow their rows on the card edge.
    expect(text).toContain('data-rows part="flow-node-ports"');
    expect(text).not.toContain('part="flow-node-group-edge"');
  });

  it('shows the run status in the footer like the other cards', () => {
    const { node, markup } = groupNode({ collapsed: true });
    node.status = { status: 'running', attempts: 1 } as typeof node.status;
    expect(markup()).toContain('part="flow-node-footer"');
  });

  it('never shows the resizer while collapsed', () => {
    const { node, markup } = groupNode({ collapsed: true });
    node.selected = true;
    expect(markup()).not.toContain('tp-flow-node-resizer');
    node.collapsed = false;
    expect(markup()).toContain('tp-flow-node-resizer');
  });
});

describe('flow group terminals (uwg-flg-req-ana-8)', () => {
  it('renders a Card titled from the strings with inward rows and an add Button', () => {
    const { node, markup } = groupNode({ terminal: 'inputs' });
    expect(node.label).toBe(DEFAULT_STRINGS.groupInputs);
    const text = markup();
    expect(text).toContain('part="flow-node-card flow-node-terminal"');
    expect(text).toContain('data-terminal=inputs');
    expect(text).toMatch(
      /<tp-button class="terminal-add" part="flow-node-terminal-add"[^>]*data-no-drag/,
    );
    // An inputs terminal lists the group inputs as outputs on its end side, as the view hands them.
    expect(text).toContain('data-direction=output');
    expect(text).toContain('class="ports" data-side=right data-rows');
  });

  it('names an outputs terminal from the strings', () => {
    expect(groupNode({ terminal: 'outputs' }).node.label).toBe(DEFAULT_STRINGS.groupOutputs);
  });

  it('finds the group of a terminal from its id', () => {
    expect(terminalGroupId('stage#inputs', 'inputs')).toBe('stage');
    expect(terminalGroupId('a#b#outputs', 'outputs')).toBe('a#b');
    expect(terminalGroupId('stage', 'inputs')).toBe('stage');
  });
});

describe('flow group interaction parts', () => {
  it('reports a header press as a non-composed group toggle', () => {
    const { node, render } = groupNode();
    const details: unknown[] = [];
    node.addEventListener(GROUP_TOGGLE, (event) => {
      expect(event.composed).toBe(false);
      details.push((event as CustomEvent<{ nodeId: string }>).detail.nodeId);
    });
    const [toggle] = listeners(render(), '@click');
    toggle!(new Event('click'));
    expect(details).toEqual(['stage']);
  });

  it('reports a terminal "+" press with the group and the terminal kind', () => {
    const { node, render } = groupNode({ terminal: 'outputs' });
    const details: unknown[] = [];
    node.addEventListener(TERMINAL_ADD_PORT, (event) => {
      const { groupId, kind } = (event as CustomEvent<{ groupId: string; kind: string }>).detail;
      details.push({ groupId, kind });
    });
    const [add] = listeners(render(), '@click');
    add!(new Event('click'));
    expect(details).toEqual([{ groupId: 'stage', kind: 'outputs' }]);
  });

  it('turns the header Buttons off while the document takes no edits', () => {
    const { node, markup } = groupNode({ collapsed: true });
    node.readOnly = true;
    expect(markup()).toMatch(/<tp-button class="group-toggle"[^>]*\?disabled=true/);
  });
});

describe('flow group names (uwg-flg-req-a11y-4)', () => {
  it('includes the label, the expanded or collapsed state and the member count', () => {
    expect(groupAccessibleName('Ingest', false, 3, DEFAULT_STRINGS)).toBe(
      'Ingest, expanded, members: 3',
    );
    expect(groupAccessibleName('Ingest', true, 1, DEFAULT_STRINGS)).toBe(
      'Ingest, collapsed, members: 1',
    );
  });
});

describe('flow path Breadcrumb (uwg-flg-req-ana-9)', () => {
  const crumbs = [
    { id: 'ingest', label: 'Ingest' },
    { id: 'decode', label: 'Decode' },
  ];

  it('links the root and every enclosing group and shows the current group as the page', () => {
    const text = templateMarkup(
      renderFlowBreadcrumb({
        rootLabel: 'Pipeline',
        crumbs,
        strings: DEFAULT_STRINGS,
        onNavigate: () => {},
      }),
    );
    expect(text).toContain('part="flow-breadcrumb" label=Pipeline group path');
    expect(text).toContain('<a href="#" data-group= @click=[function]>Pipeline</a>');
    expect(text).toContain('<a href="#" data-group=ingest @click=[function]>Ingest</a>');
    expect(text).toContain('<span data-group=decode>Decode</span>');
  });

  it('navigates to the pressed crumb, -1 for the root', () => {
    const pressed: number[] = [];
    const template = renderFlowBreadcrumb({
      rootLabel: 'Pipeline',
      crumbs,
      strings: DEFAULT_STRINGS,
      onNavigate: (index) => pressed.push(index),
    });
    const events = listeners(template, '@click').map((press) => {
      const event = new Event('click', { cancelable: true }) as MouseEvent;
      press(event);
      return event.defaultPrevented;
    });
    expect(pressed).toEqual([-1, 0]);
    expect(events).toEqual([true, true]);
  });
});
