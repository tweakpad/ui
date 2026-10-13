/**
 * Documentation example wiring for `tp-flow`. Every example uses only the public API:
 * properties (`schema`, `icons`, `value`, `defaultValue`, `run`, `router`, `isValidConnection`,
 * `autoLayout`), methods (`load`, `layout`, `deleteElements`), the lane events
 * (`tp-value-change` / `tp-value-commit`), `tp-connect`, `tp-delete`, `tp-layout-complete` and the
 * Form submit event. The `data-*` attributes are example setup, not component properties: they
 * pick the sample schema and document because `schema` and `icons` are property-only.
 */
import { zapIcon } from '../../icons/zap.js';
import { databaseIcon } from '../../icons/database.js';
import { mailIcon } from '../../icons/mail.js';
import { lockIcon } from '../../icons/lock.js';
import { gitBranchIcon } from '../../icons/git-branch.js';

/** Icon keys the sample schemas name, resolved to library icon definitions. */
export const flowIcons = {
  zap: zapIcon,
  database: databaseIcon,
  mail: mailIcon,
  lock: lockIcon,
  'git-branch': gitBranchIcon,
};

/** A workflow automation schema: card nodes with typed event and record ports. */
export const workflowSchema = {
  dataTypes: [
    { id: 'event', label: 'Event' },
    { id: 'record', label: 'Record', tone: 'chart-2' },
  ],
  nodes: [
    {
      type: 'trigger',
      label: 'Trigger',
      description: 'Webhook',
      icon: 'zap',
      tone: 'chart-1',
      ports: [{ id: 'out', label: 'Event', direction: 'output', dataType: 'event' }],
      properties: [{ key: 'path', label: 'Path', control: 'text', default: '/demo.request' }],
    },
    {
      type: 'condition',
      label: 'Condition',
      description: 'Branch on a value',
      icon: 'git-branch',
      tone: 'chart-3',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event' },
        { id: 'yes', label: 'Yes', direction: 'output', dataType: 'event' },
        { id: 'no', label: 'No', direction: 'output', dataType: 'event' },
      ],
      properties: [
        { key: 'expression', label: 'Expression', control: 'text', default: 'company.size > 200' },
      ],
    },
    {
      type: 'enrich',
      label: 'Enrich company',
      description: 'Clearbit lookup',
      icon: 'database',
      tone: 'chart-2',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event' },
        { id: 'out', label: 'Record', direction: 'output', dataType: 'record' },
      ],
      // Retry policy is secondary configuration: the card shows the lookup, the inspector (a
      // double press on the node) holds the policy.
      properties: [
        {
          key: 'retries',
          label: 'Retries',
          control: 'number',
          min: 0,
          max: 5,
          step: 1,
          default: 2,
          placement: 'inspector',
        },
        {
          key: 'timeout',
          label: 'Timeout (s)',
          control: 'number',
          min: 1,
          max: 60,
          step: 1,
          default: 4,
          placement: 'inspector',
        },
      ],
    },
    {
      type: 'deal',
      label: 'Create deal',
      description: 'HubSpot pipeline: Inbound',
      icon: 'zap',
      tone: 'chart-4',
      ports: [{ id: 'in', label: 'Record', direction: 'input', dataType: 'record' }],
      properties: [
        {
          key: 'pipeline',
          label: 'Pipeline',
          control: 'select',
          options: [
            { value: 'inbound', label: 'Inbound' },
            { value: 'outbound', label: 'Outbound' },
          ],
          default: 'inbound',
        },
      ],
    },
    {
      type: 'notify',
      label: 'Notify sales',
      description: 'Slack #inbound-leads',
      icon: 'mail',
      tone: 'chart-5',
      ports: [{ id: 'in', label: 'In', direction: 'input', dataType: 'event' }],
      properties: [
        { key: 'channel', label: 'Channel', control: 'text', default: '#inbound-leads' },
        {
          key: 'mention',
          label: 'Mention',
          control: 'switch',
          default: true,
          placement: 'inspector',
        },
      ],
    },
    {
      type: 'action',
      label: 'Action',
      description: 'Generic step',
      icon: 'mail',
      ports: [
        { id: 'in', label: 'In', direction: 'input' },
        { id: 'out', label: 'Out', direction: 'output' },
      ],
    },
  ],
};

/** The lead pipeline of the Default story: a trigger, a branch and three actions. */
export const workflowDocument = {
  version: 1,
  nodes: [
    {
      id: 'form',
      type: 'trigger',
      position: { x: 40, y: 220 },
      data: { path: '/demo.request' },
      label: 'Form submitted',
    },
    {
      id: 'plan',
      type: 'condition',
      position: { x: 360, y: 220 },
      data: { expression: 'company.size > 200' },
      label: 'Plan is Enterprise',
    },
    { id: 'enrich', type: 'enrich', position: { x: 700, y: 60 }, data: { retries: 2 } },
    { id: 'deal', type: 'deal', position: { x: 1020, y: 60 }, data: { pipeline: 'inbound' } },
    {
      id: 'notify',
      type: 'notify',
      position: { x: 700, y: 380 },
      data: { channel: '#inbound-leads', mention: true },
    },
  ],
  edges: [
    { id: 'e1', source: 'form', sourcePort: 'out', target: 'plan', targetPort: 'in' },
    {
      id: 'e2',
      source: 'plan',
      sourcePort: 'yes',
      target: 'enrich',
      targetPort: 'in',
      label: 'Yes',
    },
    { id: 'e3', source: 'plan', sourcePort: 'no', target: 'notify', targetPort: 'in', label: 'No' },
    {
      id: 'e4',
      source: 'enrich',
      sourcePort: 'out',
      target: 'deal',
      targetPort: 'in',
      markerEnd: 'arrowclosed',
    },
  ],
};

/** A finished run of the lead pipeline as a snapshot: the enrichment timed out twice. */
export const sampleRun = {
  id: 'run-1',
  status: 'failed',
  startedAt: 0,
  endedAt: 9000,
  lastSeq: 6,
  applied: 6,
  nodes: new Map([
    ['form', { status: 'success', attempts: 1, durationMs: 200, ports: ['out'] }],
    ['plan', { status: 'success', attempts: 1, durationMs: 100, ports: ['yes'] }],
    ['enrich', { status: 'failed', attempts: 2, durationMs: 8000, error: 'Timeout' }],
    ['deal', { status: 'idle', attempts: 0 }],
    ['notify', { status: 'skipped', attempts: 0 }],
  ]),
  edges: new Map([
    ['e1', { status: 'taken', explicit: false }],
    ['e2', { status: 'taken', explicit: false }],
    ['e3', { status: 'not-taken', explicit: false }],
    ['e4', { status: 'inactive', explicit: false }],
  ]),
};

/** The same run as a trace of events: `run` plays it through the built-in stepper. */
export const sampleTrace = [
  { seq: 1, at: 0, type: 'run_started' },
  { seq: 2, at: 0, type: 'node_started', nodeId: 'form' },
  { seq: 3, at: 200, type: 'node_completed', nodeId: 'form', port: 'out' },
  { seq: 4, at: 200, type: 'node_started', nodeId: 'plan' },
  { seq: 5, at: 300, type: 'node_completed', nodeId: 'plan', port: 'yes' },
  { seq: 6, at: 300, type: 'node_skipped', nodeId: 'notify', reason: 'branch not taken' },
  { seq: 7, at: 300, type: 'node_started', nodeId: 'enrich', attempt: 1 },
  { seq: 8, at: 4300, type: 'node_started', nodeId: 'enrich', attempt: 2 },
  { seq: 9, at: 8300, type: 'node_failed', nodeId: 'enrich', error: 'Timeout' },
  { seq: 10, at: 9000, type: 'run_failed', error: 'Timeout' },
];

/** A material graph: panel nodes with rows of label + control and labelled typed ports. */
export const materialSchema = {
  dataTypes: [
    { id: 'color', label: 'Color', tone: 'chart-3' },
    { id: 'float', label: 'Float', tone: 'chart-5' },
    { id: 'vector', label: 'Vector', tone: 'chart-1' },
    { id: 'shader', label: 'Shader', tone: 'chart-2' },
  ],
  rules: { defaultEdgeKind: 'bezier' },
  nodes: [
    {
      type: 'blend',
      label: 'Darken stone edges',
      shape: 'panel',
      tone: 'chart-4',
      ports: [
        { id: 'color', label: 'color', direction: 'output', dataType: 'color' },
        { id: 'base', label: 'base', direction: 'input', dataType: 'color' },
        { id: 'over', label: 'over', direction: 'input', dataType: 'color' },
        { id: 'mask', label: 'mask', direction: 'input', dataType: 'float' },
      ],
      properties: [
        {
          key: 'mode',
          label: 'mode',
          control: 'select',
          options: [
            { value: 'multiply', label: 'multiply' },
            { value: 'screen', label: 'screen' },
          ],
          default: 'multiply',
        },
        {
          key: 'opacity',
          label: 'opacity',
          control: 'slider',
          min: 0,
          max: 1,
          step: 0.01,
          default: 0.35,
        },
      ],
    },
    {
      type: 'normal',
      label: 'Normal From Height',
      shape: 'panel',
      tone: 'chart-1',
      ports: [
        { id: 'normal', label: 'normal', direction: 'output', dataType: 'vector' },
        { id: 'height', label: 'height', direction: 'input', dataType: 'float' },
      ],
      properties: [
        {
          key: 'strength',
          label: 'strength',
          control: 'slider',
          min: 0,
          max: 1,
          step: 0.01,
          default: 0.1,
        },
      ],
    },
    {
      type: 'material',
      label: 'Material',
      shape: 'panel',
      tone: 'chart-2',
      resizable: true,
      minSize: { width: 200, height: 160 },
      ports: [
        { id: 'bsdf', label: 'bsdf', direction: 'output', dataType: 'shader' },
        { id: 'baseColor', label: 'Base Color', direction: 'input', dataType: 'color' },
        { id: 'normal', label: 'Normal', direction: 'input', dataType: 'vector' },
        {
          id: 'roughness',
          label: 'Roughness',
          direction: 'input',
          dataType: 'float',
          control: 'roughness',
        },
      ],
      properties: [
        {
          key: 'type',
          label: 'type',
          control: 'select',
          options: [
            { value: 'physical', label: 'physical' },
            { value: 'toon', label: 'toon' },
          ],
          default: 'physical',
        },
        { key: 'baseColor', label: 'base color', control: 'color', default: '#cccccc' },
        {
          key: 'roughness',
          label: 'roughness',
          control: 'slider',
          min: 0,
          max: 1,
          step: 0.01,
          default: 0.5,
        },
        { key: 'packed', label: 'pack ARMH', control: 'checkbox', default: true },
      ],
    },
    {
      type: 'output',
      label: 'Material Output',
      shape: 'panel',
      tone: 'destructive',
      ports: [{ id: 'surface', label: 'Surface', direction: 'input', dataType: 'shader' }],
      properties: [
        {
          key: 'resolution',
          label: 'output res',
          control: 'number',
          min: 256,
          max: 4096,
          step: 256,
          default: 1024,
        },
      ],
    },
  ],
};

export const materialDocument = {
  version: 1,
  nodes: [
    {
      id: 'blend',
      type: 'blend',
      position: { x: 40, y: 120 },
      data: { mode: 'multiply', opacity: 0.35 },
    },
    { id: 'normal', type: 'normal', position: { x: 380, y: 240 }, data: { strength: 0.1 } },
    {
      id: 'material',
      type: 'material',
      position: { x: 720, y: 80 },
      data: { type: 'physical', baseColor: '#cccccc', roughness: 0.5, packed: true },
    },
    { id: 'output', type: 'output', position: { x: 1080, y: 120 }, data: { resolution: 1024 } },
  ],
  edges: [
    { id: 'm1', source: 'blend', sourcePort: 'color', target: 'material', targetPort: 'baseColor' },
    { id: 'm2', source: 'normal', sourcePort: 'normal', target: 'material', targetPort: 'normal' },
    { id: 'm3', source: 'material', sourcePort: 'bsdf', target: 'output', targetPort: 'surface' },
  ],
};

/** A vertical release pipeline: compact icon nodes, branch labels and orthogonal edges. */
export const pipelineSchema = {
  dataTypes: [{ id: 'event', label: 'Event' }],
  rules: { connectionMode: 'strict', cycles: 'forbid', defaultEdgeKind: 'orthogonal' },
  nodes: [
    {
      type: 'trigger',
      label: 'Trigger',
      description: 'Starts the pipeline',
      icon: 'zap',
      tone: 'chart-1',
      shape: 'compact',
      ports: [{ id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' }],
    },
    {
      type: 'step',
      label: 'Step',
      description: 'Runs a task',
      icon: 'database',
      tone: 'chart-2',
      shape: 'compact',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' },
        { id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' },
      ],
      properties: [
        { key: 'timeout', label: 'Timeout', control: 'number', min: 0, max: 600, default: 30 },
      ],
    },
    {
      type: 'approval',
      label: 'Approval',
      description: 'Waits for a reviewer',
      icon: 'lock',
      tone: 'warning',
      shape: 'compact',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' },
        { id: 'yes', label: 'Approved', direction: 'output', dataType: 'event', side: 'bottom' },
        { id: 'no', label: 'Rejected', direction: 'output', dataType: 'event', side: 'bottom' },
      ],
      properties: [{ key: 'reviewer', label: 'Reviewer', control: 'text', default: 'ops' }],
    },
    {
      type: 'notify',
      label: 'Notify',
      description: 'Sends a message',
      icon: 'mail',
      tone: 'chart-4',
      shape: 'compact',
      ports: [{ id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' }],
    },
  ],
};

export const pipelineDocument = {
  version: 1,
  layout: { direction: 'vertical' },
  nodes: [
    { id: 'p1', type: 'trigger', position: { x: 200, y: 0 }, data: {}, label: 'Build pushed' },
    {
      id: 'p2',
      type: 'step',
      position: { x: 200, y: 160 },
      data: { timeout: 120 },
      label: 'Run tests',
    },
    {
      id: 'p3',
      type: 'approval',
      position: { x: 200, y: 320 },
      data: { reviewer: 'release' },
      label: 'Release review',
    },
    {
      id: 'p4',
      type: 'step',
      position: { x: 40, y: 500 },
      data: { timeout: 300 },
      label: 'Deploy',
    },
    { id: 'p5', type: 'notify', position: { x: 360, y: 500 }, data: {}, label: 'Notify author' },
  ],
  edges: [
    // The path a build takes flows: animated edges march their dash toward the target.
    {
      id: 'q1',
      source: 'p1',
      sourcePort: 'out',
      target: 'p2',
      targetPort: 'in',
      markerEnd: 'arrowclosed',
      animated: true,
    },
    {
      id: 'q2',
      source: 'p2',
      sourcePort: 'out',
      target: 'p3',
      targetPort: 'in',
      markerEnd: 'arrowclosed',
      animated: true,
    },
    {
      id: 'q3',
      source: 'p3',
      sourcePort: 'yes',
      target: 'p4',
      targetPort: 'in',
      label: 'Yes',
      markerEnd: 'arrowclosed',
    },
    {
      id: 'q4',
      source: 'p3',
      sourcePort: 'no',
      target: 'p5',
      targetPort: 'in',
      label: 'No',
      markerEnd: 'arrowclosed',
    },
  ],
};

/**
 * A grid of generic action nodes chained left to right and top to bottom, for the read-only
 * dependency viewer.
 * @param {number} count
 * @param {number} [columns]
 * @param {'bezier' | 'straight' | 'step' | 'smoothstep' | 'orthogonal'} [kind]
 */
export function generateDocument(count, columns = 25, kind) {
  const nodes = [];
  const edges = [];
  for (let i = 0; i < count; i += 1) {
    nodes.push({
      id: `n${i}`,
      type: 'action',
      position: { x: (i % columns) * 300, y: Math.floor(i / columns) * 160 },
      data: {},
      label: `Node ${i}`,
    });
    if (i > 0)
      edges.push({
        id: `g${i}`,
        source: `n${i - 1}`,
        sourcePort: 'out',
        target: `n${i}`,
        targetPort: 'in',
        ...(kind ? { kind } : {}),
      });
    if (i >= columns)
      edges.push({
        id: `v${i}`,
        source: `n${i - columns}`,
        sourcePort: 'out',
        target: `n${i}`,
        targetPort: 'in',
        ...(kind ? { kind } : {}),
      });
  }
  return { version: 1, nodes, edges };
}

const samples = {
  workflow: { schema: workflowSchema, document: workflowDocument },
  material: { schema: materialSchema, document: materialDocument },
  pipeline: { schema: pipelineSchema, document: pipelineDocument },
};

/**
 * @param {HTMLElement} root
 * @returns {() => void} cleanup
 */
export function setupFlowExample(root) {
  const cleanups = [];
  const listen = (target, type, listener) => {
    target.addEventListener(type, listener);
    cleanups.push(() => target.removeEventListener(type, listener));
  };
  const readout = (after) => {
    const output = root.ownerDocument.createElement('output');
    output.style.display = 'block';
    output.style.marginBlockStart = 'var(--tp-space-2)';
    output.style.font = 'var(--tp-text-sm) var(--tp-font-mono)';
    after.insertAdjacentElement('afterend', output);
    cleanups.push(() => output.remove());
    return output;
  };
  const summary = (document) => `${document.nodes.length} nodes, ${document.edges.length} edges`;
  for (const authored of root.querySelectorAll('tp-flow')) {
    let flow = authored;
    // The sample schema and its icons (`schema` and `icons` are properties, not attributes).
    const schema = samples[flow.getAttribute('data-schema') || ''];
    if (schema) {
      flow.schema = schema.schema;
      flow.icons = flowIcons;
    }
    // The sample document, optionally with one node pinned for the layout engine.
    const sample = samples[flow.getAttribute('data-document') || ''];
    let document = sample ? JSON.parse(JSON.stringify(sample.document)) : undefined;
    const pinned = flow.getAttribute('data-pin');
    if (document && pinned)
      document.nodes = document.nodes.map((node) =>
        node.id === pinned ? { ...node, pinned: true } : node,
      );
    // A generated dependency graph of orthogonal edges, routed by the obstacle-aware router.
    const count = Number(flow.getAttribute('data-generate'));
    if (count > 0) {
      document = generateDocument(count, 6, 'orthogonal');
      flow.router = 'orthogonal';
    }
    if (flow.hasAttribute('data-controlled')) {
      // A controlled owner. The lane fixes its mode when the element connects, so the owner creates
      // the instance with `value` set and connects it in place of the authored one; its document is
      // the state and every accepted proposal is written back.
      let owned = document || { version: 1, nodes: [], edges: [] };
      const owner = authored.cloneNode(true);
      owner.schema = authored.schema;
      owner.icons = authored.icons;
      owner.router = authored.router;
      owner.value = owned;
      authored.replaceWith(owner);
      flow = owner;
      listen(flow, 'tp-value-change', (event) => {
        if (event.defaultPrevented) return;
        owned = event.detail.value;
        flow.value = owned;
      });
    } else if (document) {
      // Uncontrolled: the document seeds the default (what Reset restores) and loads programmatically.
      flow.defaultValue = document;
      flow.load(document);
    }
    // Run state: a finished snapshot, or a trace the built-in stepper plays (`controls` lists `run`).
    if (flow.hasAttribute('data-run'))
      flow.run = flow.getAttribute('data-run') === 'trace' ? sampleTrace : sampleRun;
    // Connection validation beyond the schema: Notify sales only follows the condition. A string
    // is a rejection message; `false` rejects silently.
    if (flow.hasAttribute('data-validate'))
      flow.isValidConnection = (connection) =>
        connection.target !== 'notify' ||
        connection.source === 'plan' ||
        'Notify sales only follows the condition.';
    // Deletion confirmed in a Dialog: cancel `tp-delete`, ask, then delete the same elements.
    const dialog = root.querySelector(`#${flow.getAttribute('data-confirm-delete')}`);
    const confirm = dialog && dialog.querySelector('[data-confirm]');
    if (dialog && confirm) {
      let pending;
      let confirmed = false;
      listen(flow, 'tp-delete', (event) => {
        if (confirmed) return;
        event.preventDefault();
        pending = {
          nodes: event.detail.nodes.map((node) => node.id),
          edges: event.detail.edges.map((edge) => edge.id),
        };
        dialog.setOpen(true, 'trigger-press');
      });
      listen(confirm, 'click', () => {
        if (!pending) return;
        confirmed = true;
        flow.deleteElements(pending, 'item-press');
        confirmed = false;
        pending = undefined;
        dialog.setOpen(false, 'close-action');
      });
    }
    // Layout readout: `tp-layout-complete` carries the direction, the stats and the bounds.
    if (flow.hasAttribute('data-layout-readout')) {
      const output = readout(flow);
      output.textContent = 'Drop a node or press the layout control to lay out';
      listen(flow, 'tp-layout-complete', (event) => {
        const { direction, stats } = event.detail;
        output.textContent = `${direction}: ${stats.layers} layers, ${stats.crossings} crossings, ${stats.components} components, ${Math.round(stats.elapsed)} ms`;
      });
    }
    // Undo and redo state: `tp-history-change` carries `canUndo`, `canRedo` and the labels of the
    // steps they would take back or forward.
    if (flow.hasAttribute('data-history-readout')) {
      const output = readout(flow);
      const show = (state) => {
        const undo = state.canUndo ? (state.undoLabel ?? 'available') : 'nothing';
        const redo = state.canRedo ? (state.redoLabel ?? 'available') : 'nothing';
        output.textContent = `Undo: ${undo} · Redo: ${redo}`;
      };
      show({ canUndo: flow.canUndo, canRedo: flow.canRedo });
      listen(flow, 'tp-history-change', (event) => show(event.detail));
    }
    // Consumer bars: a child Button calls the public method its `data-flow-call` names; one with
    // `data-flow-enabled` follows that boolean getter on every history change.
    const commands = [...flow.querySelectorAll('[data-flow-call]')];
    if (commands.length) {
      const refresh = () => {
        for (const button of commands)
          if (button.dataset.flowEnabled) button.disabled = !flow[button.dataset.flowEnabled];
      };
      for (const button of commands)
        listen(button, 'click', () => flow[button.dataset.flowCall]('trigger-press'));
      listen(flow, 'tp-history-change', refresh);
      refresh();
    }
    // Live readout: proposals with their reason and change types, commits, connections.
    if (flow.hasAttribute('data-output')) {
      const output = readout(flow);
      output.textContent = summary(flow.value);
      listen(flow, 'tp-value-change', (event) => {
        if (event.defaultPrevented) return;
        const types = [...new Set(event.detail.metadata.changes.map((change) => change.type))];
        const where = event.detail.metadata.nodeId
          ? ` on ${event.detail.metadata.nodeId}${event.detail.metadata.property ? `.${event.detail.metadata.property}` : ''}`
          : '';
        output.textContent = `${event.detail.reason}: ${types.join(', ')}${where}`;
      });
      listen(flow, 'tp-value-commit', (event) => {
        output.textContent = `${summary(event.detail.value)} (committed: ${event.detail.reason})`;
      });
      listen(flow, 'tp-connect', (event) => {
        const { connection } = event.detail;
        output.textContent = `connect: ${connection.source} → ${connection.target}`;
      });
    }
  }
  // A layout switch: the Toggle group's value becomes `autoLayout` and lays the graph out.
  for (const group of root.querySelectorAll('tp-toggle-group[data-layout-switch]')) {
    const flow = root.querySelector(`#${group.getAttribute('data-layout-switch')}`);
    if (!flow) continue;
    listen(group, 'tp-value-change', (event) => {
      const [mode] = event.detail.value;
      if (!mode) {
        event.preventDefault();
        return;
      }
      flow.autoLayout = mode;
      flow.layout(mode);
    });
  }
  // Form submit readout: the document submits as JSON under the widget's name.
  for (const form of root.querySelectorAll('tp-form[data-form-output]')) {
    const output = readout(form);
    listen(form, 'tp-submit', (event) => {
      event.preventDefault();
      const entries = [...event.detail.data.entries()].map(
        ([name, value]) => `${name}=${String(value).slice(0, 72)}…`,
      );
      output.textContent = entries.join('; ') || '(no entries)';
    });
  }
  return () => {
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  };
}
