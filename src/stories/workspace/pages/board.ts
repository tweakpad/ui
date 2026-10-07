import { html, nothing, type TemplateResult } from 'lit';
import { DragDropManager } from '../../../foundation/drag-drop/index.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import type { TpDragDropList } from '../../../components/drag-drop-list/index.js';
import { initials, type Task } from '../data.js';
import { date, statusVariant, type WorkspaceHost } from '../host.js';

/** Board lanes; In progress also holds blocked work, which keeps its own status. */
const lanes = [
  { group: 'backlog', label: 'Backlog', statuses: ['Backlog'], status: 'Backlog' },
  {
    group: 'progress',
    label: 'In progress',
    statuses: ['In progress', 'Blocked'],
    status: 'In progress',
  },
  { group: 'review', label: 'In review', statuses: ['In review'], status: 'In review' },
  { group: 'done', label: 'Done', statuses: ['Done'], status: 'Done' },
] as const;
type LaneGroup = (typeof lanes)[number]['group'];

interface BoardState {
  manager: DragDropManager;
  /** Task order across lanes, kept between drags and renders. */
  order: number[];
  signature: string;
  lanes: Record<LaneGroup, readonly Task[]>;
  staged: Map<unknown, Map<string, readonly Task[]>>;
}
const boards = new WeakMap<WorkspaceHost, BoardState>();

const laneOf = (task: Task) =>
  lanes.find((lane) => (lane.statuses as readonly string[]).includes(task.status)) ?? lanes[0];

/** Stable lane arrays: unchanged tasks keep the same references, so the lists keep their state. */
function laneValues(host: WorkspaceHost, state: BoardState) {
  const rank = new Map(state.order.map((id, index) => [id, index]));
  const sorted = host.tasks
    .slice()
    .sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  const signature = sorted.map((task) => `${task.id}:${task.status}`).join('|');
  if (signature !== state.signature) {
    state.signature = signature;
    state.lanes = Object.fromEntries(
      lanes.map((lane) => [lane.group, sorted.filter((task) => laneOf(task) === lane)]),
    ) as unknown as BoardState['lanes'];
  }
  return state.lanes;
}

function boardState(host: WorkspaceHost): BoardState {
  let state = boards.get(host);
  if (!state) {
    state = {
      manager: new DragDropManager(),
      order: host.tasks.map((task) => task.id),
      signature: '',
      lanes: { backlog: [], progress: [], review: [], done: [] },
      staged: new Map(),
    };
    boards.set(host, state);
  }
  const current = state;
  host.retain('work.board', () => () => {
    current.manager.destroy();
    boards.delete(host);
  });
  return state;
}

const renderItem = (task: Task) =>
  html`${task.title}
    <span slot="description">ATL-${task.id} · due ${date(task.due)}</span>
    <tp-avatar
      slot="media"
      size="sm"
      .fallback=${initials(task.owner)}
      .alt=${task.owner}
    ></tp-avatar>
    ${
      // The lane names the status; a card only flags the exception.
      task.status === 'Blocked'
        ? html`<tp-badge slot="actions" .variant=${statusVariant(task.status)}>Blocked</tp-badge>`
        : nothing
    }`;
const itemId = (task: Task) => task.id;
const itemLabel = (task: Task) => task.title;

/** Four connected Drag Drop Lists sharing one manager; moving a card changes its status. */
export function renderBoard(host: WorkspaceHost): TemplateResult {
  const state = boardState(host);
  const values = laneValues(host, state);
  const listsOf = (list: Element) =>
    [
      ...(list.closest('.work-board')?.querySelectorAll('tp-drag-drop-list') ?? []),
    ] as TpDragDropList<Task>[];
  const change = (event: TpValueChangeEvent<readonly Task[]>) => {
    const list = event.currentTarget as TpDragDropList<Task>;
    if (event.target !== list || event.defaultPrevented || event.detail.cancelled) return;
    const metadata = (event.detail as { metadata?: Record<string, unknown> }).metadata;
    if (!metadata) return;
    let proposal = state.staged.get(metadata.operationId);
    if (!proposal) state.staged.set(metadata.operationId, (proposal = new Map()));
    proposal.set(String(list.group), event.detail.value);
    const groups = new Set([String(metadata.sourceGroup), String(metadata.destinationGroup)]);
    if ([...groups].every((group) => proposal.has(group))) {
      // Acknowledge every changed lane synchronously before the transaction resolves.
      for (const member of listsOf(list))
        if (proposal.has(String(member.group))) member.value = proposal.get(String(member.group))!;
      state.staged.delete(metadata.operationId);
    }
  };
  const commit = (event: Event) => {
    const list = event.currentTarget as TpDragDropList<Task>;
    if (event.target !== list) return;
    const placed = new Map<number, string>();
    const order: number[] = [];
    for (const member of listsOf(list)) {
      const lane = lanes.find((entry) => entry.group === member.group)!;
      for (const task of member.value ?? []) {
        order.push(task.id);
        placed.set(
          task.id,
          (lane.statuses as readonly string[]).includes(task.status) ? task.status : lane.status,
        );
      }
    }
    state.order = order;
    const moved = host.tasks.find((task) => placed.get(task.id) !== task.status);
    host.tasks = host.tasks.map((task) =>
      placed.has(task.id) && placed.get(task.id) !== task.status
        ? { ...task, status: placed.get(task.id)! }
        : task,
    );
    if (moved) host.notify(`“${moved.title}” moved to ${placed.get(moved.id)}`);
    host.setView('work.rev', Date.now());
  };
  return html`<div class="work-board">
    ${lanes.map(
      (lane) =>
        html`<section class="work-lane" aria-label=${lane.label}>
          <header class="work-lane-header">
            <strong>${lane.label}</strong>
            <tp-badge variant="secondary">${values[lane.group].length}</tp-badge>
          </header>
          <tp-drag-drop-list
            label=${lane.label}
            variant="outline"
            size="sm"
            .manager=${state.manager}
            .group=${lane.group}
            .value=${values[lane.group]}
            .getItemId=${itemId}
            .getItemLabel=${itemLabel}
            .renderItem=${renderItem}
            @tp-value-change=${change}
            @tp-value-commit=${commit}
          ></tp-drag-drop-list>
        </section>`,
    )}
  </div>`;
}
