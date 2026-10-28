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
import { clockIcon } from '../../icons/clock.js';
import { uploadCloudIcon } from '../../icons/upload-cloud.js';
import { fileTextIcon } from '../../icons/file-text.js';
import { downloadIcon } from '../../icons/download.js';
import { shieldAlertIcon } from '../../icons/shield-alert.js';
import { circleHelpIcon } from '../../icons/circle-help.js';
import { plusIcon } from '../../icons/plus.js';

/** Icon keys the sample schemas name, resolved to library icon definitions. */
export const flowIcons = {
  zap: zapIcon,
  database: databaseIcon,
  mail: mailIcon,
  lock: lockIcon,
  'git-branch': gitBranchIcon,
  clock: clockIcon,
  'upload-cloud': uploadCloudIcon,
  'file-text': fileTextIcon,
  download: downloadIcon,
  'shield-alert': shieldAlertIcon,
  'circle-help': circleHelpIcon,
  plus: plusIcon,
};

/** A workflow automation schema: card nodes with typed event and record ports. */
export const workflowSchema = {
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
      properties: [
        { key: 'path', label: 'Path', control: 'text', mono: true, default: '/support/tickets' },
      ],
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
          mono: true,
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
export const workflowDocument = {
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
];

/** A stage lighting graph: panel nodes with rows of label + control and labelled typed ports. */
export const lightingSchema = {
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

export const lightingDocument = {
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

/** A vertical order fulfillment flow: compact icon nodes, branch labels and orthogonal edges. */
export const pipelineSchema = {
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

export const pipelineDocument = {
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
    // The path an order takes flows: animated edges march their dash toward the target.
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
 * Execution example: a product photo import with card nodes. Node data scripts the mock backend
 * of the example (`wait`, `warning`, `error`, `port`); the cache purge's required input is left
 * unconnected, so validation reports it before any run.
 */
export const photoSchema = {
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

export const photoDocument = {
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

/** One trigger fanning out over every edge kind, each `animated` toward its target. */
export const edgeKindsDocument = {
  version: 1,
  nodes: [
    { id: 'hook', type: 'trigger', position: { x: 0, y: 160 }, data: {}, label: 'Event' },
    ...['bezier', 'smoothstep', 'step', 'straight'].map((kind, index) => ({
      id: kind,
      type: 'action',
      position: { x: 420, y: index * 120 },
      data: {},
      label: kind,
    })),
  ],
  edges: ['bezier', 'smoothstep', 'step', 'straight'].map((kind) => ({
    id: `hook-${kind}`,
    source: 'hook',
    sourcePort: 'out',
    target: kind,
    targetPort: 'in',
    kind,
    animated: true,
  })),
};

const samples = {
  workflow: { schema: workflowSchema, document: workflowDocument },
  edges: { schema: workflowSchema, document: edgeKindsDocument },
  lighting: { schema: lightingSchema, document: lightingDocument },
  pipeline: { schema: pipelineSchema, document: pipelineDocument },
  photo: { schema: photoSchema, document: photoDocument },
};

/**
 * A mock backend: it answers `tp-run-request` with the events a real backend would stream,
 * pushed with `pushRunEvent` after short delays. Node data scripts each outcome: `wait` pauses
 * the node with a reason, `warning` reports one, `error` fails it (and the run), `port` picks the
 * branch it finishes through. A node whose inputs are not connected is skipped.
 * @param {HTMLElement & Record<string, any>} flow
 * @returns {{ request: (event: CustomEvent) => void, dispose: () => void }}
 */
function mockBackend(flow) {
  const view = flow.ownerDocument.defaultView;
  let token = 0;
  const timers = new Set();
  const delay = (ms) =>
    new Promise((resolve) => {
      const timer = view.setTimeout(() => {
        timers.delete(timer);
        resolve(undefined);
      }, ms);
      timers.add(timer);
    });
  const push = (event) => flow.pushRunEvent({ ...event, at: view.performance.now() });
  const halt = () => {
    token += 1;
    for (const timer of timers) view.clearTimeout(timer);
    timers.clear();
  };
  async function run(detail) {
    halt();
    const run = token;
    const alive = () => run === token;
    const { nodeIds, scope } = detail;
    const covered = new Set(nodeIds);
    const edges = flow.edges;
    const definitionOf = (node) => flow.schema?.nodes.find((item) => item.type === node.type);
    // Roots: nodes the run reaches without an edge from inside the scope. A root whose inputs
    // have no edge at all is not connected and is skipped.
    const reached = new Set(
      nodeIds.filter((id) => {
        if (edges.some((edge) => edge.target === id && covered.has(edge.source))) return false;
        const node = flow.nodes.find((item) => item.id === id);
        const inputs = (definitionOf(node)?.ports ?? []).filter(
          (port) => port.direction === 'input',
        );
        return inputs.length === 0 || edges.some((edge) => edge.target === id);
      }),
    );
    push({ type: 'run_started', ...(scope === 'graph' ? {} : { scope: nodeIds }) });
    for (const nodeId of nodeIds) {
      if (!alive()) return;
      if (!reached.has(nodeId)) {
        push({ type: 'node_skipped', nodeId, reason: 'not reached' });
        continue;
      }
      const data = flow.nodes.find((item) => item.id === nodeId)?.data ?? {};
      push({ type: 'node_started', nodeId });
      for (const progress of [0.35, 0.7]) {
        await delay(350);
        if (!alive()) return;
        push({ type: 'node_progress', nodeId, progress });
      }
      if (data.wait) {
        push({ type: 'node_waiting', nodeId, reason: data.wait });
        await delay(1600);
        if (!alive()) return;
      }
      await delay(350);
      if (!alive()) return;
      if (data.warning) push({ type: 'node_warning', nodeId, message: data.warning });
      if (data.error) {
        push({ type: 'node_failed', nodeId, error: data.error });
        push({ type: 'run_failed', error: data.error });
        return;
      }
      push({ type: 'node_completed', nodeId, ...(data.port ? { port: data.port } : {}) });
      for (const edge of edges)
        if (edge.source === nodeId && (!data.port || edge.sourcePort === data.port))
          reached.add(edge.target);
    }
    if (alive()) push({ type: 'run_completed' });
  }
  return {
    request: (event) => {
      const { action } = event.detail;
      if (action === 'run') void run(event.detail);
      else if (action === 'stop') {
        halt();
        push({ type: 'run_cancelled' });
      } else if (action === 'clear') {
        halt();
        flow.clearRun();
      }
    },
    dispose: halt,
  };
}

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
  // Icons of consumer Buttons in the markup (`icon` is a property).
  for (const icon of root.querySelectorAll('tp-icon[data-flow-icon]'))
    icon.icon = flowIcons[icon.getAttribute('data-flow-icon') || ''];
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
    // Execution: a mock backend answers the run requests (`runnable`) with delayed run events.
    if (flow.hasAttribute('data-execute')) {
      const backend = mockBackend(flow);
      listen(flow, 'tp-run-request', backend.request);
      cleanups.push(backend.dispose);
    }
    // "Add task": a consumer Button that toggles the node library through its lane.
    for (const button of flow.querySelectorAll('[data-flow-palette]'))
      listen(button, 'click', (event) =>
        flow.setPaletteOpen(!flow.paletteOpen, 'trigger-press', event),
      );
    // Run state: a finished snapshot, or a trace the built-in stepper plays (`controls` lists `run`).
    if (flow.hasAttribute('data-run'))
      flow.run = flow.getAttribute('data-run') === 'trace' ? sampleTrace : sampleRun;
    // Connection validation beyond the schema: the auto-reply only follows the condition. A string
    // is a rejection message; `false` rejects silently.
    if (flow.hasAttribute('data-validate'))
      flow.isValidConnection = (connection) =>
        connection.target !== 'reply' ||
        connection.source === 'urgent' ||
        'The auto-reply only follows the condition.';
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
