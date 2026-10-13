/* Sample schemas, documents and run states shared by the fixture and the docs examples. */
import type { FlowDocument, FlowSchema, FlowEdgeKind } from '/src/foundation/flow/types.ts';

export const workflowSchema: FlowSchema = {
  categories: [
    { id: 'triggers', label: 'Triggers', tone: 'chart-1' },
    { id: 'logic', label: 'Logic', tone: 'chart-2' },
    { id: 'data', label: 'Data', tone: 'chart-3' },
    { id: 'actions', label: 'Actions', tone: 'chart-4' },
  ],
  dataTypes: [
    { id: 'event', label: 'Event' },
    { id: 'record', label: 'Record', tone: 'chart-2' },
  ],
  nodes: [
    {
      type: 'trigger',
      label: 'Trigger',
      category: 'triggers',
      description: 'Webhook',
      icon: 'zap',
      tone: 'chart-1',
      ports: [{ id: 'out', label: 'Event', direction: 'output', dataType: 'event' }],
      properties: [{ key: 'path', label: 'Path', control: 'text', default: '/demo.request' }],
    },
    {
      type: 'condition',
      label: 'Condition',
      category: 'logic',
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
      category: 'data',
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
      category: 'actions',
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
      category: 'actions',
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
      category: 'actions',
      description: 'Generic step',
      icon: 'mail',
      ports: [
        { id: 'in', label: 'In', direction: 'input' },
        { id: 'out', label: 'Out', direction: 'output' },
      ],
    },
  ],
};

export const workflowDocument: FlowDocument = {
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

export const materialSchema: FlowSchema = {
  categories: [
    { id: 'input', label: 'Input', tone: 'chart-4' },
    { id: 'color', label: 'Color', tone: 'chart-3' },
    { id: 'vector', label: 'Vector', tone: 'chart-1' },
    { id: 'shader', label: 'Shader', tone: 'chart-2' },
    { id: 'output', label: 'Output', tone: 'chart-5' },
  ],
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
      category: 'color',
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
      category: 'vector',
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
      category: 'shader',
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
      category: 'output',
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
    {
      type: 'uv',
      label: 'Texture Coordinate',
      category: 'input',
      shape: 'panel',
      tone: 'chart-4',
      ports: [{ id: 'uv', label: 'uv', direction: 'output', dataType: 'vector' }],
    },
    {
      type: 'value',
      label: 'Value',
      category: 'input',
      shape: 'panel',
      tone: 'chart-4',
      ports: [{ id: 'value', label: 'value', direction: 'output', dataType: 'float' }],
      properties: [{ key: 'value', label: 'value', control: 'number', step: 0.01, default: 0.5 }],
    },
    {
      type: 'rgb',
      label: 'RGB',
      category: 'input',
      shape: 'panel',
      tone: 'chart-4',
      ports: [{ id: 'color', label: 'color', direction: 'output', dataType: 'color' }],
      properties: [{ key: 'color', label: 'color', control: 'color', default: '#7f7f7f' }],
    },
    {
      type: 'noise',
      label: 'Noise Texture',
      category: 'input',
      shape: 'panel',
      tone: 'chart-4',
      ports: [
        { id: 'fac', label: 'fac', direction: 'output', dataType: 'float' },
        { id: 'vector', label: 'vector', direction: 'input', dataType: 'vector' },
      ],
      properties: [
        { key: 'scale', label: 'scale', control: 'number', min: 0, step: 0.1, default: 5 },
        { key: 'detail', label: 'detail', control: 'slider', min: 0, max: 15, step: 1, default: 2 },
      ],
    },
    {
      type: 'invert',
      label: 'Invert',
      category: 'color',
      shape: 'panel',
      tone: 'chart-3',
      ports: [
        { id: 'color', label: 'color', direction: 'output', dataType: 'color' },
        { id: 'input', label: 'input', direction: 'input', dataType: 'color' },
      ],
    },
    {
      type: 'hsv',
      label: 'Hue / Saturation',
      category: 'color',
      shape: 'panel',
      tone: 'chart-3',
      ports: [
        { id: 'color', label: 'color', direction: 'output', dataType: 'color' },
        { id: 'input', label: 'input', direction: 'input', dataType: 'color' },
      ],
      properties: [
        { key: 'hue', label: 'hue', control: 'slider', min: 0, max: 1, step: 0.01, default: 0.5 },
        {
          key: 'saturation',
          label: 'saturation',
          control: 'slider',
          min: 0,
          max: 2,
          step: 0.01,
          default: 1,
        },
      ],
    },
    {
      type: 'gamma',
      label: 'Gamma',
      category: 'color',
      shape: 'panel',
      tone: 'chart-3',
      ports: [
        { id: 'color', label: 'color', direction: 'output', dataType: 'color' },
        { id: 'input', label: 'input', direction: 'input', dataType: 'color' },
      ],
      properties: [
        { key: 'gamma', label: 'gamma', control: 'number', min: 0, step: 0.1, default: 1 },
      ],
    },
    {
      type: 'mapping',
      label: 'Mapping',
      category: 'vector',
      shape: 'panel',
      tone: 'chart-1',
      ports: [
        { id: 'vector', label: 'vector', direction: 'output', dataType: 'vector' },
        { id: 'input', label: 'input', direction: 'input', dataType: 'vector' },
      ],
      properties: [
        {
          key: 'type',
          label: 'type',
          control: 'select',
          options: [
            { value: 'point', label: 'point' },
            { value: 'texture', label: 'texture' },
            { value: 'normal', label: 'normal' },
          ],
          default: 'point',
        },
      ],
    },
    {
      type: 'bump',
      label: 'Bump',
      category: 'vector',
      shape: 'panel',
      tone: 'chart-1',
      ports: [
        { id: 'normal', label: 'normal', direction: 'output', dataType: 'vector' },
        { id: 'height', label: 'height', direction: 'input', dataType: 'float' },
      ],
      properties: [
        { key: 'distance', label: 'distance', control: 'number', min: 0, step: 0.1, default: 1 },
      ],
    },
    {
      type: 'displacement',
      label: 'Displacement',
      category: 'vector',
      shape: 'panel',
      tone: 'chart-1',
      ports: [
        { id: 'displacement', label: 'displacement', direction: 'output', dataType: 'vector' },
        { id: 'height', label: 'height', direction: 'input', dataType: 'float' },
      ],
      properties: [
        { key: 'scale', label: 'scale', control: 'number', min: 0, step: 0.1, default: 1 },
      ],
    },
    {
      type: 'emission',
      label: 'Emission',
      category: 'shader',
      shape: 'panel',
      tone: 'chart-2',
      ports: [
        { id: 'emission', label: 'emission', direction: 'output', dataType: 'shader' },
        { id: 'color', label: 'color', direction: 'input', dataType: 'color' },
      ],
      properties: [
        { key: 'strength', label: 'strength', control: 'number', min: 0, step: 0.1, default: 1 },
      ],
    },
    {
      type: 'mix-shader',
      label: 'Mix Shader',
      category: 'shader',
      shape: 'panel',
      tone: 'chart-2',
      ports: [
        { id: 'shader', label: 'shader', direction: 'output', dataType: 'shader' },
        { id: 'fac', label: 'fac', direction: 'input', dataType: 'float' },
        { id: 'a', label: 'a', direction: 'input', dataType: 'shader' },
        { id: 'b', label: 'b', direction: 'input', dataType: 'shader' },
      ],
    },
    {
      type: 'transparent',
      label: 'Transparent',
      category: 'shader',
      shape: 'panel',
      tone: 'chart-2',
      ports: [
        { id: 'bsdf', label: 'bsdf', direction: 'output', dataType: 'shader' },
        { id: 'color', label: 'color', direction: 'input', dataType: 'color' },
      ],
    },
    {
      type: 'aov',
      label: 'AOV Output',
      category: 'output',
      shape: 'panel',
      tone: 'destructive',
      ports: [
        { id: 'color', label: 'color', direction: 'input', dataType: 'color' },
        { id: 'value', label: 'value', direction: 'input', dataType: 'float' },
      ],
      properties: [{ key: 'name', label: 'name', control: 'text', default: 'mask' }],
    },
  ],
};

export const materialDocument: FlowDocument = {
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

export function generateDocument(count: number, columns = 25, kind?: FlowEdgeKind): FlowDocument {
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
    ['enrich', { status: 'failed', attempts: 2, durationMs: 8000, error: { message: 'Timeout' } }],
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

/** The same run as `sampleRun`, as a trace for the stepper (`run` accepts either). */
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
] as const;

/** Vertical pipeline (reference images 30/31): compact icon nodes, branch labels, orthogonal edges. */
export const pipelineSchema: FlowSchema = {
  categories: [
    { id: 'triggers', label: 'Triggers', tone: 'chart-1' },
    { id: 'tasks', label: 'Tasks', tone: 'chart-3' },
    { id: 'flow', label: 'Flow control', tone: 'chart-4' },
    { id: 'notifications', label: 'Notifications', tone: 'chart-2' },
  ],
  dataTypes: [{ id: 'event', label: 'Event' }],
  rules: { connectionMode: 'strict', cycles: 'forbid', defaultEdgeKind: 'orthogonal' },
  nodes: [
    {
      type: 'trigger',
      label: 'Trigger',
      category: 'triggers',
      description: 'Starts the pipeline',
      icon: 'zap',
      tone: 'chart-1',
      shape: 'compact',
      ports: [{ id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' }],
    },
    {
      type: 'step',
      label: 'Step',
      category: 'tasks',
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
      category: 'flow',
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
      category: 'notifications',
      description: 'Sends a message',
      icon: 'mail',
      tone: 'chart-4',
      shape: 'compact',
      ports: [{ id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' }],
    },
    {
      type: 'schedule',
      label: 'Schedule',
      category: 'triggers',
      description: 'Runs on a timer',
      icon: 'clock',
      tone: 'chart-1',
      shape: 'compact',
      ports: [{ id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' }],
      properties: [{ key: 'cron', label: 'Cron', control: 'text', default: '0 * * * *' }],
    },
    {
      type: 'artifact',
      label: 'Artifact',
      category: 'triggers',
      description: 'Starts on a new upload',
      icon: 'upload-cloud',
      tone: 'chart-1',
      shape: 'compact',
      ports: [{ id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' }],
    },
    {
      type: 'script',
      label: 'Script',
      category: 'tasks',
      description: 'Runs a shell command',
      icon: 'file-text',
      tone: 'chart-2',
      shape: 'compact',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' },
        { id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' },
      ],
      properties: [{ key: 'command', label: 'Command', control: 'text', default: 'npm test' }],
    },
    {
      type: 'cache',
      label: 'Restore cache',
      category: 'tasks',
      description: 'Restores build files',
      icon: 'download',
      tone: 'chart-2',
      shape: 'compact',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' },
        { id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' },
      ],
    },
    {
      type: 'branch',
      label: 'Branch',
      category: 'flow',
      description: 'Splits on a condition',
      icon: 'git-branch',
      tone: 'warning',
      shape: 'compact',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' },
        { id: 'yes', label: 'Yes', direction: 'output', dataType: 'event', side: 'bottom' },
        { id: 'no', label: 'No', direction: 'output', dataType: 'event', side: 'bottom' },
      ],
      properties: [{ key: 'condition', label: 'Condition', control: 'text', default: 'main' }],
    },
    {
      type: 'wait',
      label: 'Wait',
      category: 'flow',
      description: 'Pauses for a delay',
      icon: 'clock',
      tone: 'warning',
      shape: 'compact',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' },
        { id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' },
      ],
      properties: [
        { key: 'delay', label: 'Delay', control: 'number', min: 0, max: 3600, default: 60 },
      ],
    },
    {
      type: 'alert',
      label: 'Alert',
      category: 'notifications',
      description: 'Pages the on-call',
      icon: 'shield-alert',
      tone: 'chart-4',
      shape: 'compact',
      ports: [{ id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' }],
    },
  ],
};

export const pipelineDocument: FlowDocument = {
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
    {
      id: 'q1',
      source: 'p1',
      sourcePort: 'out',
      target: 'p2',
      targetPort: 'in',
      markerEnd: 'arrowclosed',
    },
    {
      id: 'q2',
      source: 'p2',
      sourcePort: 'out',
      target: 'p3',
      targetPort: 'in',
      markerEnd: 'arrowclosed',
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
