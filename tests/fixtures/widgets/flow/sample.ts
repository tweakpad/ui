/* Sample schemas, documents and run states shared by the fixture and the docs examples. */
import type { FlowDocument, FlowSchema, FlowEdgeKind } from '/src/foundation/flow/types.ts';

/** A workflow automation schema: card nodes with typed event and record ports. */
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
      description: 'Incoming event',
      icon: 'zap',
      tone: 'chart-1',
      ports: [{ id: 'out', label: 'Event', direction: 'output', dataType: 'event' }],
      properties: [{ key: 'path', label: 'Path', control: 'text', default: '/support/tickets' }],
    },
    {
      type: 'condition',
      label: 'Condition',
      category: 'logic',
      description: 'Branch on a rule',
      icon: 'git-branch',
      tone: 'chart-3',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event' },
        { id: 'yes', label: 'Yes', direction: 'output', dataType: 'event' },
        { id: 'no', label: 'No', direction: 'output', dataType: 'event' },
      ],
      properties: [
        {
          key: 'expression',
          label: 'Expression',
          control: 'text',
          default: 'priority == "urgent"',
        },
      ],
    },
    {
      type: 'lookup',
      label: 'Look up customer',
      category: 'data',
      description: 'CRM account lookup',
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
      type: 'assign',
      label: 'Assign agent',
      category: 'actions',
      description: 'Round robin within a queue',
      icon: 'zap',
      tone: 'chart-4',
      ports: [{ id: 'in', label: 'Record', direction: 'input', dataType: 'record' }],
      properties: [
        {
          key: 'queue',
          label: 'Queue',
          control: 'select',
          options: [
            { value: 'tier1', label: 'Tier 1' },
            { value: 'tier2', label: 'Tier 2' },
          ],
          default: 'tier2',
        },
      ],
    },
    {
      type: 'reply',
      label: 'Send auto-reply',
      category: 'actions',
      description: 'Email the requester',
      icon: 'mail',
      tone: 'chart-5',
      ports: [{ id: 'in', label: 'In', direction: 'input', dataType: 'event' }],
      properties: [
        { key: 'template', label: 'Template', control: 'text', default: 'We are on it' },
        {
          key: 'cc',
          label: 'Copy the team',
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

/** The support triage of the Default story: a trigger, a branch and three actions. */
export const workflowDocument: FlowDocument = {
  version: 1,
  nodes: [
    {
      id: 'ticket',
      type: 'trigger',
      position: { x: 40, y: 220 },
      data: { path: '/support/tickets' },
      label: 'Ticket received',
    },
    {
      id: 'urgent',
      type: 'condition',
      position: { x: 360, y: 220 },
      data: { expression: 'priority == "urgent"' },
      label: 'Priority is urgent',
    },
    { id: 'lookup', type: 'lookup', position: { x: 700, y: 60 }, data: { retries: 2 } },
    { id: 'assign', type: 'assign', position: { x: 1020, y: 60 }, data: { queue: 'tier2' } },
    {
      id: 'reply',
      type: 'reply',
      position: { x: 700, y: 380 },
      data: { template: 'We are on it', cc: true },
    },
  ],
  edges: [
    { id: 'e1', source: 'ticket', sourcePort: 'out', target: 'urgent', targetPort: 'in' },
    {
      id: 'e2',
      source: 'urgent',
      sourcePort: 'yes',
      target: 'lookup',
      targetPort: 'in',
      label: 'Yes',
    },
    {
      id: 'e3',
      source: 'urgent',
      sourcePort: 'no',
      target: 'reply',
      targetPort: 'in',
      label: 'No',
    },
    {
      id: 'e4',
      source: 'lookup',
      sourcePort: 'out',
      target: 'assign',
      targetPort: 'in',
      markerEnd: 'arrowclosed',
    },
  ],
};

/** A stage lighting graph: panel nodes with rows of label + control and labelled typed ports. */
export const lightingSchema: FlowSchema = {
  categories: [
    { id: 'inputs', label: 'Inputs', tone: 'chart-4' },
    { id: 'color', label: 'Color', tone: 'chart-3' },
    { id: 'motion', label: 'Motion', tone: 'chart-1' },
    { id: 'mix', label: 'Mix', tone: 'chart-2' },
    { id: 'output', label: 'Output', tone: 'chart-5' },
  ],
  dataTypes: [
    { id: 'color', label: 'Color', tone: 'chart-3' },
    { id: 'level', label: 'Level', tone: 'chart-5' },
    { id: 'position', label: 'Position', tone: 'chart-1' },
    { id: 'beat', label: 'Beat', tone: 'chart-4' },
    { id: 'cue', label: 'Cue', tone: 'chart-2' },
  ],
  rules: { defaultEdgeKind: 'bezier' },
  nodes: [
    {
      type: 'beat',
      label: 'Beat detector',
      category: 'inputs',
      shape: 'panel',
      tone: 'chart-4',
      ports: [{ id: 'beat', label: 'beat', direction: 'output', dataType: 'beat' }],
      properties: [
        {
          key: 'sensitivity',
          label: 'sensitivity',
          control: 'slider',
          min: 0,
          max: 1,
          step: 0.01,
          default: 0.6,
        },
      ],
    },
    {
      type: 'fader',
      label: 'Fader',
      category: 'inputs',
      shape: 'panel',
      tone: 'chart-4',
      ports: [{ id: 'level', label: 'level', direction: 'output', dataType: 'level' }],
      properties: [
        {
          key: 'level',
          label: 'level',
          control: 'number',
          min: 0,
          max: 1,
          step: 0.01,
          default: 0.8,
        },
      ],
    },
    {
      type: 'swatch',
      label: 'Color swatch',
      category: 'inputs',
      shape: 'panel',
      tone: 'chart-4',
      ports: [{ id: 'color', label: 'color', direction: 'output', dataType: 'color' }],
      properties: [{ key: 'color', label: 'color', control: 'color', default: '#ff5a36' }],
    },
    {
      type: 'tempo',
      label: 'Tempo clock',
      category: 'inputs',
      shape: 'panel',
      tone: 'chart-4',
      ports: [{ id: 'beat', label: 'beat', direction: 'output', dataType: 'beat' }],
      properties: [
        { key: 'bpm', label: 'bpm', control: 'number', min: 40, max: 240, step: 1, default: 120 },
      ],
    },
    {
      type: 'fade',
      label: 'Color fade',
      category: 'color',
      shape: 'panel',
      tone: 'chart-3',
      ports: [
        { id: 'color', label: 'color', direction: 'output', dataType: 'color' },
        { id: 'from', label: 'from', direction: 'input', dataType: 'color' },
        { id: 'to', label: 'to', direction: 'input', dataType: 'color' },
        { id: 'beat', label: 'beat', direction: 'input', dataType: 'beat' },
      ],
      properties: [
        {
          key: 'curve',
          label: 'curve',
          control: 'select',
          options: [
            { value: 'linear', label: 'linear' },
            { value: 'smooth', label: 'smooth' },
          ],
          default: 'smooth',
        },
        { key: 'mix', label: 'mix', control: 'slider', min: 0, max: 1, step: 0.01, default: 0.35 },
      ],
    },
    {
      type: 'hue',
      label: 'Hue rotate',
      category: 'color',
      shape: 'panel',
      tone: 'chart-3',
      ports: [
        { id: 'color', label: 'color', direction: 'output', dataType: 'color' },
        { id: 'input', label: 'input', direction: 'input', dataType: 'color' },
      ],
      properties: [
        {
          key: 'degrees',
          label: 'degrees',
          control: 'slider',
          min: 0,
          max: 360,
          step: 1,
          default: 90,
        },
      ],
    },
    {
      type: 'strobe',
      label: 'Strobe',
      category: 'color',
      shape: 'panel',
      tone: 'chart-3',
      ports: [
        { id: 'color', label: 'color', direction: 'output', dataType: 'color' },
        { id: 'input', label: 'input', direction: 'input', dataType: 'color' },
        { id: 'beat', label: 'beat', direction: 'input', dataType: 'beat' },
      ],
      properties: [
        { key: 'rate', label: 'rate', control: 'number', min: 1, max: 20, step: 1, default: 4 },
      ],
    },
    {
      type: 'gradient',
      label: 'Gradient',
      category: 'color',
      shape: 'panel',
      tone: 'chart-3',
      ports: [{ id: 'color', label: 'color', direction: 'output', dataType: 'color' }],
      properties: [
        { key: 'start', label: 'start', control: 'color', default: '#1f6feb' },
        { key: 'end', label: 'end', control: 'color', default: '#a371f7' },
      ],
    },
    {
      type: 'sweep',
      label: 'Pan sweep',
      category: 'motion',
      shape: 'panel',
      tone: 'chart-1',
      ports: [
        { id: 'position', label: 'position', direction: 'output', dataType: 'position' },
        { id: 'beat', label: 'beat', direction: 'input', dataType: 'beat' },
      ],
      properties: [
        {
          key: 'width',
          label: 'width',
          control: 'slider',
          min: 0,
          max: 1,
          step: 0.01,
          default: 0.1,
        },
      ],
    },
    {
      type: 'circle',
      label: 'Circle',
      category: 'motion',
      shape: 'panel',
      tone: 'chart-1',
      ports: [{ id: 'position', label: 'position', direction: 'output', dataType: 'position' }],
      properties: [
        {
          key: 'radius',
          label: 'radius',
          control: 'slider',
          min: 0,
          max: 1,
          step: 0.01,
          default: 0.4,
        },
      ],
    },
    {
      type: 'bounce',
      label: 'Tilt bounce',
      category: 'motion',
      shape: 'panel',
      tone: 'chart-1',
      ports: [
        { id: 'position', label: 'position', direction: 'output', dataType: 'position' },
        { id: 'beat', label: 'beat', direction: 'input', dataType: 'beat' },
      ],
      properties: [
        {
          key: 'height',
          label: 'height',
          control: 'number',
          min: 0,
          max: 90,
          step: 1,
          default: 30,
        },
      ],
    },
    {
      type: 'home',
      label: 'Home position',
      category: 'motion',
      shape: 'panel',
      tone: 'chart-1',
      ports: [{ id: 'position', label: 'position', direction: 'output', dataType: 'position' }],
    },
    {
      type: 'fixture',
      label: 'Fixture group',
      category: 'mix',
      shape: 'panel',
      tone: 'chart-2',
      resizable: true,
      minSize: { width: 200, height: 160 },
      ports: [
        { id: 'cue', label: 'cue', direction: 'output', dataType: 'cue' },
        { id: 'color', label: 'Color', direction: 'input', dataType: 'color' },
        { id: 'position', label: 'Position', direction: 'input', dataType: 'position' },
        { id: 'dimmer', label: 'Dimmer', direction: 'input', dataType: 'level', control: 'dimmer' },
      ],
      properties: [
        {
          key: 'profile',
          label: 'profile',
          control: 'select',
          options: [
            { value: 'wash', label: 'wash' },
            { value: 'spot', label: 'spot' },
          ],
          default: 'wash',
        },
        { key: 'tint', label: 'tint', control: 'color', default: '#ffffff' },
        {
          key: 'dimmer',
          label: 'dimmer',
          control: 'slider',
          min: 0,
          max: 1,
          step: 0.01,
          default: 0.5,
        },
        { key: 'invert', label: 'invert pan', control: 'checkbox', default: true },
      ],
    },
    {
      type: 'merge',
      label: 'Merge cues',
      category: 'mix',
      shape: 'panel',
      tone: 'chart-2',
      ports: [
        { id: 'cue', label: 'cue', direction: 'output', dataType: 'cue' },
        { id: 'a', label: 'a', direction: 'input', dataType: 'cue' },
        { id: 'b', label: 'b', direction: 'input', dataType: 'cue' },
      ],
      properties: [
        {
          key: 'priority',
          label: 'priority',
          control: 'select',
          options: [
            { value: 'highest', label: 'highest' },
            { value: 'latest', label: 'latest' },
          ],
          default: 'highest',
        },
      ],
    },
    {
      type: 'crossfade',
      label: 'Crossfade',
      category: 'mix',
      shape: 'panel',
      tone: 'chart-2',
      ports: [
        { id: 'cue', label: 'cue', direction: 'output', dataType: 'cue' },
        { id: 'a', label: 'a', direction: 'input', dataType: 'cue' },
        { id: 'b', label: 'b', direction: 'input', dataType: 'cue' },
        { id: 'mix', label: 'mix', direction: 'input', dataType: 'level' },
      ],
      properties: [
        { key: 'seconds', label: 'seconds', control: 'number', min: 0, step: 0.1, default: 2 },
      ],
    },
    {
      type: 'universe',
      label: 'DMX output',
      category: 'output',
      shape: 'panel',
      tone: 'destructive',
      ports: [{ id: 'cue', label: 'Cue', direction: 'input', dataType: 'cue' }],
      properties: [
        {
          key: 'universe',
          label: 'universe',
          control: 'number',
          min: 1,
          max: 64,
          step: 1,
          default: 1,
        },
      ],
    },
    {
      type: 'recorder',
      label: 'Show recorder',
      category: 'output',
      shape: 'panel',
      tone: 'destructive',
      ports: [{ id: 'cue', label: 'cue', direction: 'input', dataType: 'cue' }],
      properties: [{ key: 'name', label: 'name', control: 'text', default: 'Opening act' }],
    },
  ],
};

export const lightingDocument: FlowDocument = {
  version: 1,
  nodes: [
    {
      id: 'fade',
      type: 'fade',
      position: { x: 40, y: 120 },
      data: { curve: 'smooth', mix: 0.35 },
    },
    { id: 'sweep', type: 'sweep', position: { x: 380, y: 240 }, data: { width: 0.1 } },
    {
      id: 'fixture',
      type: 'fixture',
      position: { x: 720, y: 80 },
      data: { profile: 'wash', tint: '#ffffff', dimmer: 0.5, invert: true },
    },
    { id: 'universe', type: 'universe', position: { x: 1080, y: 120 }, data: { universe: 1 } },
  ],
  edges: [
    { id: 'm1', source: 'fade', sourcePort: 'color', target: 'fixture', targetPort: 'color' },
    {
      id: 'm2',
      source: 'sweep',
      sourcePort: 'position',
      target: 'fixture',
      targetPort: 'position',
    },
    { id: 'm3', source: 'fixture', sourcePort: 'cue', target: 'universe', targetPort: 'cue' },
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

/** A finished run of the support triage as a snapshot: the customer lookup timed out twice. */
export const sampleRun = {
  id: 'run-1',
  status: 'failed',
  startedAt: 0,
  endedAt: 9000,
  lastSeq: 6,
  applied: 6,
  nodes: new Map([
    ['ticket', { status: 'success', attempts: 1, durationMs: 200, ports: ['out'] }],
    ['urgent', { status: 'success', attempts: 1, durationMs: 100, ports: ['yes'] }],
    ['lookup', { status: 'failed', attempts: 2, durationMs: 8000, error: 'CRM timeout' }],
    ['assign', { status: 'idle', attempts: 0 }],
    ['reply', { status: 'skipped', attempts: 0 }],
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
  { seq: 2, at: 0, type: 'node_started', nodeId: 'ticket' },
  { seq: 3, at: 200, type: 'node_completed', nodeId: 'ticket', port: 'out' },
  { seq: 4, at: 200, type: 'node_started', nodeId: 'urgent' },
  { seq: 5, at: 300, type: 'node_completed', nodeId: 'urgent', port: 'yes' },
  { seq: 6, at: 300, type: 'node_skipped', nodeId: 'reply', reason: 'branch not taken' },
  { seq: 7, at: 300, type: 'node_started', nodeId: 'lookup', attempt: 1 },
  { seq: 8, at: 4300, type: 'node_started', nodeId: 'lookup', attempt: 2 },
  { seq: 9, at: 8300, type: 'node_failed', nodeId: 'lookup', error: 'CRM timeout' },
  { seq: 10, at: 9000, type: 'run_failed', error: 'CRM timeout' },
] as const;

/**
 * Execution example: a product photo import with card nodes. Node data scripts the mock backend
 * of the example (`wait`, `warning`, `error`, `port`); the cache purge's required input is left
 * unconnected, so validation reports it before any run.
 */
export const photoSchema: FlowSchema = {
  categories: [
    { id: 'triggers', label: 'Triggers', tone: 'chart-1' },
    { id: 'media', label: 'Media', tone: 'chart-2' },
    { id: 'checks', label: 'Checks', tone: 'chart-3' },
    { id: 'publish', label: 'Publish', tone: 'chart-4' },
    { id: 'messages', label: 'Messages', tone: 'chart-5' },
  ],
  dataTypes: [
    { id: 'event', label: 'Event' },
    { id: 'image', label: 'Image', tone: 'chart-2' },
  ],
  nodes: [
    {
      type: 'upload',
      label: 'Photo uploaded',
      category: 'triggers',
      description: 'A merchant adds product photos',
      icon: 'upload-cloud',
      tone: 'chart-1',
      ports: [{ id: 'out', label: 'Event', direction: 'output', dataType: 'event' }],
      properties: [
        {
          key: 'folder',
          label: 'Folder',
          control: 'text',
          default: '/incoming',
          placement: 'inspector',
        },
      ],
    },
    {
      type: 'resize',
      label: 'Resize variants',
      category: 'media',
      description: 'Thumbnail, card and zoom sizes',
      icon: 'download',
      tone: 'chart-2',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', required: true },
        { id: 'out', label: 'Images', direction: 'output', dataType: 'image' },
      ],
    },
    {
      type: 'moderate',
      label: 'Moderation check',
      category: 'checks',
      description: 'Screen for policy issues',
      icon: 'shield-alert',
      tone: 'chart-3',
      ports: [
        { id: 'in', label: 'Images', direction: 'input', dataType: 'image', required: true },
        { id: 'safe', label: 'Safe', direction: 'output', dataType: 'image' },
        { id: 'flagged', label: 'Flagged', direction: 'output', dataType: 'image' },
      ],
    },
    {
      type: 'publish',
      label: 'Publish to catalog',
      category: 'publish',
      description: 'Attach to the product page',
      icon: 'database',
      tone: 'chart-4',
      ports: [
        { id: 'in', label: 'Images', direction: 'input', dataType: 'image', required: true },
        { id: 'out', label: 'Done', direction: 'output', dataType: 'event' },
      ],
      properties: [
        {
          key: 'channel',
          label: 'Channel',
          control: 'text',
          default: 'web',
          placement: 'inspector',
        },
      ],
    },
    {
      type: 'flag',
      label: 'Send to review',
      category: 'checks',
      description: 'Queue for a moderator',
      icon: 'lock',
      tone: 'warning',
      ports: [{ id: 'in', label: 'Images', direction: 'input', dataType: 'image', required: true }],
    },
    {
      type: 'merchant',
      label: 'Notify merchant',
      category: 'messages',
      description: 'Email the import result',
      icon: 'mail',
      tone: 'chart-5',
      ports: [{ id: 'in', label: 'In', direction: 'input', dataType: 'event', required: true }],
    },
    {
      type: 'purge',
      label: 'Purge CDN cache',
      category: 'publish',
      description: 'Refresh the cached images',
      icon: 'upload-cloud',
      tone: 'chart-4',
      ports: [{ id: 'in', label: 'Images', direction: 'input', dataType: 'image', required: true }],
    },
  ],
};

export const photoDocument: FlowDocument = {
  version: 1,
  layout: { direction: 'vertical' },
  nodes: [
    { id: 'upload', type: 'upload', position: { x: 180, y: 0 }, data: {} },
    { id: 'resize', type: 'resize', position: { x: 180, y: 170 }, data: {} },
    { id: 'moderate', type: 'moderate', position: { x: 180, y: 340 }, data: { port: 'safe' } },
    {
      id: 'publish',
      type: 'publish',
      position: { x: 20, y: 530 },
      data: {
        wait: 'Merchant approval',
        warning: 'One variant fell back to JPEG',
      },
    },
    { id: 'flag', type: 'flag', position: { x: 340, y: 530 }, data: {} },
    {
      id: 'merchant',
      type: 'merchant',
      position: { x: 20, y: 720 },
      data: { error: 'Mail service rejected the message' },
    },
    { id: 'purge', type: 'purge', position: { x: 340, y: 720 }, data: {} },
  ],
  edges: [
    { id: 'i1', source: 'upload', sourcePort: 'out', target: 'resize', targetPort: 'in' },
    { id: 'i2', source: 'resize', sourcePort: 'out', target: 'moderate', targetPort: 'in' },
    {
      id: 'i3',
      source: 'moderate',
      sourcePort: 'safe',
      target: 'publish',
      targetPort: 'in',
      label: 'Safe',
    },
    {
      id: 'i4',
      source: 'moderate',
      sourcePort: 'flagged',
      target: 'flag',
      targetPort: 'in',
      label: 'Flagged',
    },
    { id: 'i5', source: 'publish', sourcePort: 'out', target: 'merchant', targetPort: 'in' },
  ],
};

/** A vertical order fulfillment flow: compact icon nodes, branch labels, orthogonal edges. */
export const pipelineSchema: FlowSchema = {
  categories: [
    { id: 'triggers', label: 'Triggers', tone: 'chart-1' },
    { id: 'tasks', label: 'Tasks', tone: 'chart-3' },
    { id: 'flow', label: 'Flow control', tone: 'chart-4' },
    { id: 'messages', label: 'Messages', tone: 'chart-2' },
  ],
  dataTypes: [{ id: 'event', label: 'Event' }],
  rules: { connectionMode: 'strict', cycles: 'forbid', defaultEdgeKind: 'orthogonal' },
  nodes: [
    {
      type: 'trigger',
      label: 'Trigger',
      category: 'triggers',
      description: 'Starts on a new order',
      icon: 'zap',
      tone: 'chart-1',
      shape: 'compact',
      ports: [{ id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' }],
    },
    {
      type: 'step',
      label: 'Step',
      category: 'tasks',
      description: 'Runs a fulfillment task',
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
      description: 'Waits for a decision',
      icon: 'lock',
      tone: 'warning',
      shape: 'compact',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' },
        { id: 'yes', label: 'Approved', direction: 'output', dataType: 'event', side: 'bottom' },
        { id: 'no', label: 'Rejected', direction: 'output', dataType: 'event', side: 'bottom' },
      ],
      properties: [{ key: 'reviewer', label: 'Reviewer', control: 'text', default: 'fraud-team' }],
    },
    {
      type: 'message',
      label: 'Message',
      category: 'messages',
      description: 'Messages the customer',
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
      type: 'import',
      label: 'File import',
      category: 'triggers',
      description: 'Starts on a dropped file',
      icon: 'upload-cloud',
      tone: 'chart-1',
      shape: 'compact',
      ports: [{ id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' }],
    },
    {
      type: 'script',
      label: 'Script',
      category: 'tasks',
      description: 'Runs custom code',
      icon: 'file-text',
      tone: 'chart-2',
      shape: 'compact',
      ports: [
        { id: 'in', label: 'In', direction: 'input', dataType: 'event', side: 'top' },
        { id: 'out', label: 'Out', direction: 'output', dataType: 'event', side: 'bottom' },
      ],
      properties: [{ key: 'command', label: 'Command', control: 'text', default: 'print-labels' }],
    },
    {
      type: 'sync',
      label: 'Sync stock',
      category: 'tasks',
      description: 'Refreshes inventory counts',
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
      properties: [{ key: 'condition', label: 'Condition', control: 'text', default: 'express' }],
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
      category: 'messages',
      description: 'Pages the warehouse lead',
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
    { id: 'p1', type: 'trigger', position: { x: 200, y: 0 }, data: {}, label: 'Order placed' },
    {
      id: 'p2',
      type: 'step',
      position: { x: 200, y: 160 },
      data: { timeout: 120 },
      label: 'Reserve stock',
    },
    {
      id: 'p3',
      type: 'approval',
      position: { x: 200, y: 320 },
      data: { reviewer: 'risk' },
      label: 'Fraud review',
    },
    {
      id: 'p4',
      type: 'step',
      position: { x: 40, y: 500 },
      data: { timeout: 300 },
      label: 'Ship order',
    },
    { id: 'p5', type: 'message', position: { x: 360, y: 500 }, data: {}, label: 'Notify customer' },
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
