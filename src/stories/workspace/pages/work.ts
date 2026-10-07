import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { navigationIcons } from '../../../icons/navigation.js';
import { chevronDownIcon } from '../../../icons/chevron-down.js';
import { downloadIcon } from '../../../icons/download.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { initials, statuses, type Task } from '../data.js';
import { date, icon, statusVariant, type WorkspaceHost } from '../host.js';
import { renderBoard } from './board.js';
import './work.css';

const PAGE_SIZE = 6;
const optionalColumns = [
  ['status', 'Status'],
  ['owner', 'Owner'],
  ['due', 'Due'],
  ['hours', 'Hours'],
] as const;
type Column = (typeof optionalColumns)[number][0];

/** Accepts a controlled proposal on a property other than `value` (Checkbox, Pagination). */
function accept<T>(event: TpValueChangeEvent<T>, property: string, apply: (value: T) => void) {
  if (event.defaultPrevented || event.detail.cancelled) return;
  (event.target as unknown as Record<string, T>)[property] = event.detail.value;
  apply(event.detail.value);
}

function setStatus(host: WorkspaceHost, task: Task, status: string) {
  host.tasks = host.tasks.map((t) => (t.id === task.id ? { ...t, status } : t));
  host.notify(`“${task.title}” set to ${status}`);
  host.setView('work.rev', Date.now());
}

function renderTable(host: WorkspaceHost): TemplateResult {
  const query = host.view('work.query', '');
  const filter = host.view('work.filter', 'All statuses');
  const page = host.view('work.page', 1);
  const columns = host.view<readonly Column[]>('work.columns', ['status', 'owner', 'due', 'hours']);
  const selected = host.view<ReadonlySet<number>>('work.selected', new Set());
  const shown = (column: Column) => columns.includes(column);
  const filtered = host.tasks.filter(
    (task) =>
      (filter === 'All statuses' || task.status === filter) &&
      `${task.title} ${task.owner} ATL-${task.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const chosen = host.tasks.filter((task) => selected.has(task.id));
  const select = (ids: readonly number[], checked: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    host.setView('work.selected', next);
  };
  const clear = () => {
    host.setView('work.query', '');
    host.setView('work.filter', 'All statuses');
    host.setView('work.page', 1);
  };
  const allVisible = visible.length > 0 && visible.every((t) => selected.has(t.id));
  const someVisible = visible.some((t) => selected.has(t.id));
  const span = 3 + columns.length;

  return html`<div class="workspace-stack">
    <div class="workspace-row workspace-between">
      <div class="workspace-row workspace-grow">
        <tp-input-group class="work-search">
          <tp-icon slot="prefix" .icon=${navigationIcons.search}></tp-icon>
          <tp-input
            label="Search tasks"
            placeholder="Search tasks, owners or IDs…"
            .value=${query}
            @tp-value-change=${(e: TpValueChangeEvent<string>) =>
              host.accept(e, (value) => {
                host.setView('work.query', value);
                host.setView('work.page', 1);
              })}
          ></tp-input>
        </tp-input-group>
        <tp-select
          class="work-filter"
          label="Filter status"
          .items=${['All statuses', ...statuses]}
          .value=${filter}
          @tp-value-change=${(e: TpValueChangeEvent<string>) =>
            host.accept(e, (value) => {
              host.setView('work.filter', value);
              host.setView('work.page', 1);
            })}
        ></tp-select>
      </div>
      <div class="workspace-row">
        <tp-menu label="Visible columns">
          <tp-button slot="trigger" variant="outline" size="sm"
            >Columns<tp-icon slot="icon-end" .icon=${chevronDownIcon}></tp-icon
          ></tp-button>
          <span data-menu-label>Visible columns</span>
          ${optionalColumns.map(
            ([id, label]) =>
              html`<tp-menu-checkbox-item
                .checked=${shown(id)}
                @tp-value-change=${(e: TpValueChangeEvent<boolean>) => {
                  if (e.target !== e.currentTarget || e.defaultPrevented || e.detail.cancelled)
                    return;
                  host.setView(
                    'work.columns',
                    optionalColumns
                      .map(([column]) => column)
                      .filter((column) => (column === id ? e.detail.value : shown(column))),
                  );
                }}
                >${label}</tp-menu-checkbox-item
              >`,
          )}
        </tp-menu>
        <tp-button-group aria-label="Table actions">
          <tp-button
            variant="outline"
            size="sm"
            @click=${() => host.notify(`${filtered.length} tasks exported to atlas-work.csv`)}
            ><tp-icon slot="icon-start" .icon=${downloadIcon}></tp-icon>Export</tp-button
          >
          <tp-button variant="outline" size="sm" @click=${clear}>Clear filters</tp-button>
        </tp-button-group>
      </div>
    </div>

    ${
      chosen.length
        ? html`<div class="work-selection" role="status">
            <tp-badge variant="secondary">${chosen.length} selected</tp-badge>
            <tp-button
              size="sm"
              variant="outline"
              @click=${() => {
                host.tasks = host.tasks.map((task) =>
                  selected.has(task.id) ? { ...task, status: 'Done' } : task,
                );
                host.notify(`${chosen.length} tasks completed`);
                host.setView('work.selected', new Set());
              }}
              >Mark complete</tp-button
            >
            <tp-button
              size="sm"
              variant="destructive"
              @click=${() => {
                host.pendingDelete = chosen.map((task) => task.id);
                host.setView('work.selected', new Set());
                host.open('delete');
              }}
              >Delete selected</tp-button
            >
            <tp-button
              size="sm"
              variant="ghost"
              @click=${() => host.setView('work.selected', new Set())}
              >Clear selection</tp-button
            >
          </div>`
        : nothing
    }
    ${
      visible.length
        ? html`<tp-table
            class="work-table"
            label="Launch work"
            sticky-header
            sticky-footer
            selection-presentation="row"
          >
            <tp-table-caption
              >Sprint 08 · ${filtered.length} of ${host.tasks.length} tasks
              ${filter === 'All statuses' ? '' : `· ${filter}`}</tp-table-caption
            >
            <tp-table-header>
              <tp-table-row>
                <tp-table-head scope="col" class="work-check">
                  <tp-checkbox
                    aria-label="Select visible tasks"
                    .checked=${allVisible}
                    .indeterminate=${someVisible && !allVisible}
                    @tp-value-change=${(e: TpValueChangeEvent<boolean>) =>
                      accept(e, 'checked', (value) =>
                        select(
                          visible.map((t) => t.id),
                          value,
                        ),
                      )}
                  ></tp-checkbox>
                </tp-table-head>
                <tp-table-head scope="col">Task</tp-table-head>
                ${shown('status') ? html`<tp-table-head scope="col">Status</tp-table-head>` : nothing}
                ${shown('owner') ? html`<tp-table-head scope="col">Owner</tp-table-head>` : nothing}
                ${shown('due') ? html`<tp-table-head scope="col">Due</tp-table-head>` : nothing}
                ${
                  shown('hours')
                    ? html`<tp-table-head scope="col" class="work-number">Hours</tp-table-head>`
                    : nothing
                }
                <tp-table-head scope="col"><span class="work-sr">Actions</span></tp-table-head>
              </tp-table-row>
            </tp-table-header>
            <tp-table-body>
              ${repeat(
                visible,
                (task) => task.id,
                (task) =>
                  html`<tp-table-row ?selected=${selected.has(task.id)}>
                    <tp-table-cell>
                      <tp-checkbox
                        .ariaLabel=${`Select ${task.title}`}
                        .checked=${selected.has(task.id)}
                        @tp-value-change=${(e: TpValueChangeEvent<boolean>) =>
                          accept(e, 'checked', (value) => select([task.id], value))}
                      ></tp-checkbox>
                    </tp-table-cell>
                    <tp-table-head scope="row">
                      <tp-button
                        variant="link"
                        .partContracts=${linkTitle}
                        @click=${() => host.edit(task)}
                        >${task.title}</tp-button
                      >
                      <div class="workspace-muted workspace-small">
                        ATL-${task.id} · ${task.priority} priority
                      </div>
                    </tp-table-head>
                    ${
                      shown('status')
                        ? html`<tp-table-cell
                            ><tp-badge .variant=${statusVariant(task.status)}
                              >${task.status}</tp-badge
                            ></tp-table-cell
                          >`
                        : nothing
                    }
                    ${
                      shown('owner')
                        ? html`<tp-table-cell>
                            <div class="workspace-row work-owner">
                              <tp-avatar
                                size="sm"
                                .fallback=${initials(task.owner)}
                                .alt=${task.owner}
                              ></tp-avatar>
                              <span>${task.owner}</span>
                            </div>
                          </tp-table-cell>`
                        : nothing
                    }
                    ${shown('due') ? html`<tp-table-cell>${date(task.due)}</tp-table-cell>` : nothing}
                    ${
                      shown('hours')
                        ? html`<tp-table-cell class="work-number">${task.hours}</tp-table-cell>`
                        : nothing
                    }
                    <tp-table-cell class="work-actions">
                      <tp-menu
                        .label=${`Actions for ${task.title}`}
                        @tp-action=${(e: CustomEvent<{ value: string }>) => {
                          if (e.detail.value === 'edit') host.edit(task);
                          else if (e.detail.value === 'duplicate')
                            host.notify(`“${task.title}” duplicated`);
                          else if (e.detail.value === 'delete') {
                            host.pendingDelete = [task.id];
                            host.open('delete');
                          }
                        }}
                      >
                        <tp-button
                          slot="trigger"
                          variant="ghost"
                          size="icon-sm"
                          .icon=${navigationIcons.more}
                          .ariaLabel=${`Actions for ${task.title}`}
                        ></tp-button>
                        <tp-menu-item value="edit">${icon('settings')}Edit task</tp-menu-item>
                        <tp-menu-item value="duplicate">Duplicate</tp-menu-item>
                        <tp-separator></tp-separator>
                        <span data-menu-label>Set status</span>
                        <tp-menu-radio-group
                          aria-label="Set status"
                          .value=${task.status}
                          @tp-value-change=${(e: TpValueChangeEvent<string>) => {
                            if (
                              e.target !== e.currentTarget ||
                              e.defaultPrevented ||
                              e.detail.cancelled
                            )
                              return;
                            (e.currentTarget as HTMLElement & { value: string }).value =
                              e.detail.value;
                            setStatus(host, task, e.detail.value);
                          }}
                        >
                          ${statuses.map(
                            (status) =>
                              html`<tp-menu-radio-item value=${status}
                                >${status}</tp-menu-radio-item
                              >`,
                          )}
                        </tp-menu-radio-group>
                        <tp-separator></tp-separator>
                        <tp-menu-item value="delete" variant="destructive"
                          >${icon('trash')}Delete task</tp-menu-item
                        >
                      </tp-menu>
                    </tp-table-cell>
                  </tp-table-row>`,
              )}
            </tp-table-body>
            <tp-table-footer>
              <tp-table-row>
                <tp-table-cell colspan=${span - (shown('hours') ? 2 : 1)}
                  >${filtered.length} tasks in this view</tp-table-cell
                >
                ${
                  shown('hours')
                    ? html`<tp-table-cell class="work-number"
                        >${filtered.reduce((sum, t) => sum + t.hours, 0)} h</tp-table-cell
                      >`
                    : nothing
                }
                <tp-table-cell></tp-table-cell>
              </tp-table-row>
            </tp-table-footer>
          </tp-table>`
        : html`<tp-empty-state
            title="No matching tasks"
            description="Try another search, or clear the status filter to see every task."
          >
            <tp-icon slot="media" .icon=${navigationIcons.search}></tp-icon>
            <tp-button slot="actions" variant="outline" @click=${clear}>Clear filters</tp-button>
            <tp-button slot="actions" @click=${() => host.newTask()}>New task</tp-button>
          </tp-empty-state>`
    }

    <div class="workspace-row workspace-between">
      <span class="workspace-muted workspace-small"
        >Showing
        ${filtered.length ? (current - 1) * PAGE_SIZE + 1 : 0}–${Math.min(
          current * PAGE_SIZE,
          filtered.length,
        )}
        of ${filtered.length} tasks</span
      >
      <tp-pagination
        label="Task pages"
        .page=${current}
        .pages=${pages}
        @tp-value-change=${(e: TpValueChangeEvent<number>) => {
          e.detail.sourceEvent?.preventDefault();
          accept(e, 'page', (value) => host.setView('work.page', value));
        }}
      ></tp-pagination>
    </div>
  </div>`;
}

/** Nova data-table: the task title is a link Button with `px-0`, flush with its metadata line. */
const linkTitle = { button: { styleHook: { 'padding-inline': '0' } } };

/** Work: one task set shown as a filterable table or a drag-and-drop status board. */
export function renderWork(host: WorkspaceHost): TemplateResult {
  const view = host.view<'table' | 'board'>('work.view', 'table');
  const open = host.tasks.filter((task) => task.status !== 'Done').length;
  return html`<div class="workspace-stack-lg">
    <div class="workspace-row workspace-between">
      <div class="workspace-stack">
        <h2>Launch work</h2>
        <p class="workspace-muted">${open} open tasks across the pilot launch.</p>
      </div>
    </div>
    <tp-tabs
      class="work-views"
      label="Work views"
      .value=${view}
      @tp-value-change=${(e: TpValueChangeEvent<'table' | 'board'>) => {
        if (e.target !== e.currentTarget) return;
        host.accept(e, (value) => host.setView('work.view', value));
      }}
    >
      <button slot="tab" value="table">
        Table <tp-badge variant="secondary">${host.tasks.length}</tp-badge>
      </button>
      <button slot="tab" value="board">
        Board <tp-badge variant="secondary">${open}</tp-badge>
      </button>
      <div slot="panel" value="table" class="work-panel">${renderTable(host)}</div>
      <div slot="panel" value="board" class="work-panel">
        ${view === 'board' ? renderBoard(host) : nothing}
      </div>
    </tp-tabs>
  </div>`;
}
