import { html } from 'lit';
import { calendarIcon } from '../../../icons/calendar.js';
import { gitBranchIcon } from '../../../icons/git-branch.js';
import { playIcon } from '../../../icons/media.js';
import { navigationIcons } from '../../../icons/navigation.js';
import { zapIcon } from '../../../icons/zap.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import type {
  FlowDocument,
  FlowRun,
  FlowRunEventBody,
  FlowRunRequestDetail,
  FlowSchema,
  TpFlow,
} from '../../../widgets/flow/index.js';
import type { PageView, WorkspaceHost } from '../host.js';
import './automations.css';

/** Icon keys the schema names. */
const icons = {
  zap: zapIcon,
  branch: gitBranchIcon,
  bell: navigationIcons.bell,
  calendar: calendarIcon,
};

/** Triage rules for new launch tasks: one trigger, one condition and two actions. */
const schema: FlowSchema = {
  categories: [
    { id: 'triggers', label: 'Triggers', tone: 'chart-1' },
    { id: 'logic', label: 'Logic', tone: 'chart-3' },
    { id: 'actions', label: 'Actions', tone: 'chart-4' },
  ],
  dataTypes: [{ id: 'task', label: 'Task' }],
  nodes: [
    {
      type: 'trigger',
      label: 'Task created',
      category: 'triggers',
      description: 'When a task is added to Atlas',
      icon: 'zap',
      tone: 'chart-1',
      ports: [{ id: 'out', label: 'Task', direction: 'output', dataType: 'task' }],
      properties: [
        {
          key: 'board',
          label: 'Board',
          control: 'select',
          options: [
            { value: 'launch', label: 'Launch' },
            { value: 'pilot', label: 'Pilot cities' },
          ],
          default: 'launch',
          placement: 'inspector',
        },
      ],
    },
    {
      type: 'condition',
      label: 'Condition',
      category: 'logic',
      description: 'Branch on a rule',
      icon: 'branch',
      tone: 'chart-3',
      ports: [
        { id: 'in', label: 'Task', direction: 'input', dataType: 'task' },
        { id: 'yes', label: 'Yes', direction: 'output', dataType: 'task' },
        { id: 'no', label: 'No', direction: 'output', dataType: 'task' },
      ],
      properties: [
        {
          key: 'rule',
          label: 'Rule',
          control: 'text',
          mono: true,
          default: 'priority == "urgent"',
        },
      ],
    },
    {
      type: 'notify',
      label: 'Notify team',
      category: 'actions',
      description: 'Post to a channel',
      icon: 'bell',
      tone: 'chart-4',
      ports: [{ id: 'in', label: 'Task', direction: 'input', dataType: 'task' }],
      properties: [
        {
          key: 'channel',
          label: 'Channel',
          control: 'select',
          options: [
            { value: 'launch', label: '#atlas-launch' },
            { value: 'pilots', label: '#pilot-leads' },
          ],
          default: 'launch',
        },
        {
          key: 'mention',
          label: 'Mention the owner',
          control: 'switch',
          default: true,
          placement: 'inspector',
        },
      ],
    },
    {
      type: 'sprint',
      label: 'Add to sprint',
      category: 'actions',
      description: 'Plan it with the team',
      icon: 'calendar',
      tone: 'chart-5',
      ports: [{ id: 'in', label: 'Task', direction: 'input', dataType: 'task' }],
      properties: [
        {
          key: 'sprint',
          label: 'Sprint',
          control: 'select',
          options: [
            { value: 'current', label: 'Sprint 08' },
            { value: 'next', label: 'Sprint 09' },
          ],
          default: 'next',
        },
      ],
    },
  ],
};

const workflow: FlowDocument = {
  version: 1,
  nodes: [
    {
      id: 'created',
      type: 'trigger',
      position: { x: 0, y: 150 },
      data: { board: 'launch' },
      label: 'New task',
    },
    {
      id: 'urgent',
      type: 'condition',
      position: { x: 320, y: 150 },
      data: { rule: 'priority == "urgent"' },
      label: 'Is urgent?',
    },
    {
      id: 'notify',
      type: 'notify',
      position: { x: 660, y: 0 },
      data: { channel: 'launch', mention: true },
    },
    { id: 'sprint', type: 'sprint', position: { x: 660, y: 300 }, data: { sprint: 'next' } },
  ],
  edges: [
    { id: 'route', source: 'created', sourcePort: 'out', target: 'urgent', targetPort: 'in' },
    {
      id: 'urgent-yes',
      source: 'urgent',
      sourcePort: 'yes',
      target: 'notify',
      targetPort: 'in',
      label: 'Yes',
      markerEnd: 'arrowclosed',
    },
    {
      id: 'urgent-no',
      source: 'urgent',
      sourcePort: 'no',
      target: 'sprint',
      targetPort: 'in',
      label: 'No',
      markerEnd: 'arrowclosed',
    },
  ],
};

/** The last run before the page opened: an urgent task that reached the team. */
const lastRun: FlowRun = {
  id: 'run-128',
  status: 'completed',
  startedAt: 0,
  endedAt: 1400,
  lastSeq: 8,
  applied: 8,
  nodes: new Map([
    ['created', { status: 'success', attempts: 1, durationMs: 120, ports: ['out'] }],
    ['urgent', { status: 'success', attempts: 1, durationMs: 80, ports: ['yes'] }],
    ['notify', { status: 'success', attempts: 1, durationMs: 1200 }],
    ['sprint', { status: 'skipped', attempts: 0 }],
  ]),
  edges: new Map([
    ['route', { status: 'taken', explicit: false }],
    ['urgent-yes', { status: 'taken', explicit: false }],
    ['urgent-no', { status: 'not-taken', explicit: false }],
  ]),
};

interface RunRecord {
  id: number;
  task: string;
  urgent: boolean;
  /** Minutes before the page opened, or the moment a test run finished. */
  at: Date;
}

/** A moment the given number of minutes before now. */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const initialRuns: RunRecord[] = [
  { id: 3, task: 'Keyboard trap in checkout', urgent: true, at: ago(18) },
  { id: 2, task: 'Translate the pilot FAQ', urgent: false, at: ago(64) },
  { id: 1, task: 'Lisbon kickoff agenda', urgent: false, at: ago(190) },
];
/** Sample tasks the test runs route, urgent and not in turn. */
const testTasks = [
  { task: 'Payment step fails on Safari', urgent: true },
  { task: 'Refresh the onboarding screenshots', urgent: false },
  { task: 'Berlin partner contract expires', urgent: true },
  { task: 'Draft the launch newsletter', urgent: false },
];
const outcome = (record: { urgent: boolean }) =>
  record.urgent ? 'Notified #atlas-launch' : 'Added to Sprint 09';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** The current test run; a newer request or leaving the page ends an older one. */
let runToken = 0;

/**
 * A stand-in for the automation backend: it answers the widget's run requests with run events,
 * taking the branch the sample task calls for, and records each finished run.
 */
async function answerRun(host: WorkspaceHost, event: CustomEvent<FlowRunRequestDetail>) {
  const flow = event.currentTarget as TpFlow;
  const { action } = event.detail;
  const token = ++runToken;
  const alive = () => token === runToken && flow.isConnected;
  const push = (body: FlowRunEventBody) => flow.pushRunEvent({ ...body, at: performance.now() });
  if (action === 'clear') return flow.clearRun();
  if (action === 'stop') return push({ type: 'run_cancelled' });
  const runs = host.view<RunRecord[]>('automations.runs', initialRuns);
  const sample = testTasks[runs.length % testTasks.length]!;
  const step = async (nodeId: string, ms: number, port?: string) => {
    push({ type: 'node_started', nodeId });
    await wait(ms);
    if (alive()) push({ type: 'node_completed', nodeId, port });
    return alive();
  };
  push({ type: 'run_started' });
  if (!(await step('created', 400, 'out'))) return;
  if (!(await step('urgent', 500, sample.urgent ? 'yes' : 'no'))) return;
  push({
    type: 'node_skipped',
    nodeId: sample.urgent ? 'sprint' : 'notify',
    reason: 'branch not taken',
  });
  if (!(await step(sample.urgent ? 'notify' : 'sprint', 900))) return;
  push({ type: 'run_completed' });
  const latest = host.view<RunRecord[]>('automations.runs', initialRuns);
  host.setView('automations.runs', [
    { id: latest.length + 1, ...sample, at: new Date() },
    ...latest,
  ]);
  host.notify(`Test run: ${outcome(sample)}`);
}

/** The urgent-task rule as a workflow canvas, with its run history beside it. */
export function renderAutomations(host: WorkspaceHost): PageView {
  const active = host.view('automations.active', true);
  const runs = host.view<RunRecord[]>('automations.runs', initialRuns);
  const flow = () => host.querySelector<TpFlow>('#automations-flow');
  const actions = html`<tp-switch
      size="sm"
      .checked=${active}
      @tp-value-change=${(event: TpValueChangeEvent<boolean>) =>
        host.accept(event, (value) => {
          host.setView('automations.active', value);
          host.notify(value ? 'Automation resumed' : 'Automation paused');
        })}
      >Active</tp-switch
    >
    <tp-button variant="outline" size="sm" @click=${() => flow()?.requestRun('graph')}
      ><tp-icon slot="icon-start" .icon=${playIcon}></tp-icon>Test run</tp-button
    >
    <tp-button size="sm" @click=${() => host.notify('Automation published')}>Publish</tp-button>`;
  const body = html` <div class="workspace-columns">
    <div class="automations-canvas">
      <tp-flow
        id="automations-flow"
        class=${host.mobile ? 'automations-flow automations-compact' : 'automations-flow'}
        label="Route urgent tasks"
        runnable
        fit-view
        fit-padding="32"
        controls="zoom-out zoom-in fit undo redo"
        controls-orientation="horizontal"
        .size=${host.mobile ? 'sm' : 'default'}
        .schema=${schema}
        .icons=${icons}
        .defaultValue=${workflow}
        .run=${lastRun}
        @tp-run-request=${(event: CustomEvent<FlowRunRequestDetail>) => void answerRun(host, event)}
      ></tp-flow>
    </div>
    <tp-card
      ><h2 slot="header">Recent runs</h2>
      <p slot="description">Tasks this rule routed</p>
      <tp-badge slot="action" variant="secondary">${runs.length} runs</tp-badge>
      <tp-scroll-area class="workspace-fill-scroll" aria-label="Recent runs"
        ><tp-list aria-label="Recent runs">
          ${runs.map(
            (run) =>
              html`<tp-list-item size="sm" .description=${outcome(run)}
                >${run.task}<tp-badge
                  slot="actions"
                  .variant=${run.urgent ? 'destructive' : 'outline'}
                  >${run.urgent ? 'Urgent' : 'Normal'}</tp-badge
                ><tp-time
                  slot="actions"
                  class="workspace-muted workspace-small"
                  mode="relative"
                  .datetime=${run.at}
                ></tp-time
              ></tp-list-item>`,
          )}
        </tp-list></tp-scroll-area
      >
      <tp-button slot="footer" variant="outline" @click=${() => host.go('work')}
        >Open the task board</tp-button
      >
    </tp-card>
  </div>`;
  return {
    title: 'Route urgent tasks',
    badge: html`<tp-badge .variant=${active ? 'default' : 'outline'}
      >${active ? 'Active' : 'Paused'}</tp-badge
    >`,
    description:
      'New launch tasks reach the team right away when they are urgent, or join the next sprint.',
    actions,
    body,
  };
}
