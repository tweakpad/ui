/**
 * The sample the Flow story renders: the support triage workflow with its schema, its icons and
 * a finished run. Story setup only; the documentation page carries its own examples.
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
