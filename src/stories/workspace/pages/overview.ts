import { html, type TemplateResult } from 'lit';
import { refreshIcon } from '../../../icons/refresh.js';
import { shieldAlertIcon } from '../../../icons/shield-alert.js';
import type { IconDefinition } from '../../../icons/types.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { quarterlyRenderer } from '../../data-visualization.examples.js';
import { initials } from '../data.js';
import { date, dateText, type WorkspaceHost } from '../host.js';
import './overview.css';

const trendUp: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M3 17l6-6 4 4 8-8M15 7h6v6', strokeWidth: 2 }],
};
const trendDown: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M3 7l6 6 4-4 8 8M15 17h6v-6', strokeWidth: 2 }],
};

type Range = '7d' | '30d' | '90d';
const ranges: readonly { value: Range; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
];
/** Throughput samples; `quarter` is the category key the shared bar renderer labels. */
const throughput: Record<Range, readonly Record<string, string | number>[]> = {
  '7d': [
    { quarter: 'Mon', completed: 6, opened: 4 },
    { quarter: 'Tue', completed: 9, opened: 7 },
    { quarter: 'Wed', completed: 7, opened: 8 },
    { quarter: 'Thu', completed: 11, opened: 6 },
    { quarter: 'Fri', completed: 8, opened: 3 },
  ],
  '30d': [
    { quarter: 'Wk 38', completed: 24, opened: 31 },
    { quarter: 'Wk 39', completed: 33, opened: 28 },
    { quarter: 'Wk 40', completed: 29, opened: 22 },
    { quarter: 'Wk 41', completed: 41, opened: 26 },
  ],
  '90d': [
    { quarter: 'Jul', completed: 72, opened: 96 },
    { quarter: 'Aug', completed: 104, opened: 110 },
    { quarter: 'Sep', completed: 131, opened: 118 },
    { quarter: 'Oct', completed: 127, opened: 87 },
  ],
};
const throughputSeries = {
  completed: { label: 'Completed', color: 'var(--tp-chart-1)', appearance: { pattern: 'solid' } },
  opened: { label: 'Opened', color: 'var(--tp-chart-2)', appearance: { pattern: 'striped' } },
};

const recent = [
  { author: 'Sam Rivera', action: 'moved “Review the mobile checkout” to In review', ago: 12 },
  { author: 'Jamie Chen', action: 'uploaded Release checklist.csv', ago: 48 },
  { author: 'Taylor Kim', action: 'commented on Connect product analytics', ago: 95 },
  { author: 'Alex Morgan', action: 'scheduled the pilot launch for Oct 16', ago: 180 },
];
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

function metric(
  label: string,
  value: string,
  trend: string,
  up: boolean,
  note: string,
  detail: string,
) {
  return html`<tp-card class="overview-metric">
    <span slot="description">${label}</span>
    <strong slot="header" class="workspace-metric">${value}</strong>
    <tp-badge slot="action" variant="outline"
      ><tp-icon .icon=${up ? trendUp : trendDown}></tp-icon>${trend}</tp-badge
    >
    <div slot="footer" class="overview-metric-footer">
      <span class="overview-metric-note"
        >${note} <tp-icon .icon=${up ? trendUp : trendDown}></tp-icon
      ></span>
      <span class="workspace-muted">${detail}</span>
    </div>
  </tp-card>`;
}

/** Nova chart-area-interactive: a fixed 250px plot (aspect-auto h-[250px]) instead of the default ratio. */
const plotHeight = {
  'data-visualization-plot-region': {
    styleHook: { 'aspect-ratio': 'auto', 'block-size': 'calc(var(--tp-space-16) * 4)' },
  },
};

export function renderOverview(host: WorkspaceHost): TemplateResult {
  const tasks = host.tasks;
  const done = tasks.filter((t) => t.status === 'Done').length;
  const blocked = tasks.filter((t) => t.status === 'Blocked').length;
  const percent = Math.round((done / Math.max(1, tasks.length)) * 100);
  const range = host.view<Range>('overview.range', '30d');
  const refreshing = host.view('overview.refreshing', false);
  const setRange = (value: Range | undefined) => {
    if (value) host.setView('overview.range', value);
  };
  const refresh = () => {
    if (refreshing) return;
    host.setView('overview.refreshing', true);
    setTimeout(() => {
      host.setView('overview.refreshing', false);
      host.notify('Activity is up to date');
    }, 1400);
  };
  const upNext = tasks.filter((t) => t.status !== 'Done').slice(0, 4);

  return html`<div class="workspace-stack-lg">
    <div class="workspace-metrics">
      ${metric(
        'Tasks completed',
        `${done} / ${tasks.length}`,
        '+2 this week',
        true,
        'Ahead of last sprint',
        'Release checklist for the pilot',
      )}
      ${metric(
        'Logged effort',
        '38 h',
        '+12.5%',
        true,
        'Steady delivery pace',
        'Across four teammates',
      )}
      ${metric(
        'Open blockers',
        String(blocked),
        blocked ? `${blocked} active` : 'None',
        !blocked,
        blocked ? 'Needs attention before review' : 'Nothing is blocked',
        'Resolve before the pilot',
      )}
      ${metric(
        'Pilot sign-ups',
        '1,248',
        '+18.4%',
        true,
        'Strong waitlist growth',
        `Pilot opens ${dateText(host.deadline)}`,
      )}
    </div>

    <tp-card class="overview-chart">
      <h2 slot="header">Weekly throughput</h2>
      <p slot="description">Tasks completed and opened across the launch.</p>
      <div slot="action">
        ${
          host.mobile
            ? html`<tp-select
                label="Time range"
                .items=${ranges}
                .value=${range}
                @tp-value-change=${(e: TpValueChangeEvent<Range>) =>
                  host.accept(e, (value) => setRange(value))}
              ></tp-select>`
            : html`<tp-toggle-group
                label="Time range"
                variant="outline"
                size="sm"
                .value=${[range]}
                @tp-value-change=${(e: TpValueChangeEvent<Range[]>) => {
                  // A single-selection group proposes [] when the pressed item is pressed again.
                  if (e.target !== e.currentTarget || !e.detail.value.length) {
                    e.preventDefault();
                    return;
                  }
                  host.accept(e, (value) => setRange(value[0]));
                }}
                >${ranges.map(
                  (option) => html`<tp-toggle value=${option.value}>${option.label}</tp-toggle>`,
                )}</tp-toggle-group
              >`
        }
      </div>
      <tp-data-visualization
        label="Weekly throughput"
        description="Completed tasks outpace newly opened tasks in the latest period. Striped bars are opened tasks."
        interaction="both"
        .data=${throughput[range]}
        .series=${throughputSeries}
        .renderer=${quarterlyRenderer}
        .partContracts=${plotHeight}
      ></tp-data-visualization>
    </tp-card>

    <div class="overview-grid">
      <tp-card>
        <h2 slot="header">Release readiness</h2>
        <p slot="description">Pilot launch on ${dateText(host.deadline)}.</p>
        <tp-marker slot="action" tone="success" label="On track"></tp-marker>
        <div class="workspace-stack">
          <div class="workspace-row workspace-between">
            <strong>${percent}% complete</strong>
            <span class="workspace-muted workspace-small">${done} of ${tasks.length} tasks</span>
          </div>
          <tp-progress label="Release readiness" .value=${percent}></tp-progress>
          <tp-separator></tp-separator>
          <tp-list-item-group aria-label="Milestones">
            <tp-list-item size="sm">
              Design review
              <span slot="description">${date('2026-10-08')} · Sam Rivera</span>
              <tp-badge slot="actions">Done</tp-badge>
            </tp-list-item>
            <tp-list-item size="sm">
              Engineering handoff
              <span slot="description">${date('2026-10-12')} · Taylor Kim</span>
              <tp-badge slot="actions" variant="secondary">In review</tp-badge>
            </tp-list-item>
            <tp-list-item size="sm">
              Pilot launch
              <span slot="description">${date(host.deadline)} · Everyone</span>
              <tp-badge slot="actions" variant="outline">Upcoming</tp-badge>
            </tp-list-item>
          </tp-list-item-group>
        </div>
        <tp-button slot="footer" variant="outline" @click=${() => host.go('work')}
          >Open launch checklist</tp-button
        >
      </tp-card>

      <tp-card>
        <h2 slot="header">Sprint 08</h2>
        <p slot="description">Two weeks, Oct 5 – Oct 16.</p>
        <tp-badge slot="action" variant="secondary">Day 8 of 10</tp-badge>
        <tp-calendar
          class="overview-calendar"
          label="Sprint 08 dates"
          selection-mode="range"
          .value=${{ from: '2026-10-05', to: '2026-10-16' }}
          default-displayed-month="2026-10-01"
        ></tp-calendar>
      </tp-card>
    </div>

    <tp-alert
      severity=${blocked ? 'warning' : 'success'}
      .title=${
        blocked
          ? `Warning: ${blocked} blocked task${blocked === 1 ? ' needs' : 's need'} attention`
          : 'No launch blockers'
      }
    >
      <tp-icon slot="icon" .icon=${shieldAlertIcon}></tp-icon>
      <div class="workspace-row workspace-between">
        <span
          >${
            blocked
              ? 'Clear the blocked work before the pilot release review.'
              : 'Keep the remaining work moving toward the release.'
          }</span
        >
        <tp-button variant="outline" size="sm" @click=${() => host.go('work')}
          >${blocked ? 'Review blockers' : 'View work'}</tp-button
        >
      </div>
    </tp-alert>

    <div class="workspace-columns">
      <tp-card>
        <h2 slot="header">Up next</h2>
        <p slot="description">The next pieces of the launch.</p>
        <tp-button slot="action" variant="ghost" size="sm" @click=${() => host.newTask()}
          >New task</tp-button
        >
        <tp-list-item-group aria-label="Upcoming tasks">
          ${upNext.map(
            (task) =>
              html`<tp-list-item>
                <tp-avatar
                  slot="media"
                  .fallback=${initials(task.owner)}
                  .alt=${task.owner}
                ></tp-avatar>
                ${task.title}
                <span slot="description">${task.owner} · due ${date(task.due)}</span>
                <tp-button
                  slot="actions"
                  variant="outline"
                  size="sm"
                  @click=${() => host.edit(task)}
                  >Open</tp-button
                >
              </tp-list-item>`,
          )}
        </tp-list-item-group>
      </tp-card>

      <tp-card>
        <h2 slot="header">Latest activity</h2>
        <p slot="description">What changed across the project.</p>
        <div slot="action" class="workspace-row">
          ${
            refreshing
              ? html`<tp-badge variant="secondary"
                  ><tp-spinner size="sm" label=""></tp-spinner>Syncing</tp-badge
                >`
              : null
          }
          <tp-button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh activity"
            .icon=${refreshIcon}
            .disabled=${refreshing}
            @click=${refresh}
          ></tp-button>
        </div>
        ${
          refreshing
            ? html`<div class="workspace-stack" aria-busy="true" aria-label="Refreshing activity">
                ${[0, 1, 2].map(
                  () =>
                    html`<div class="overview-skeleton-row">
                      <tp-skeleton class="overview-skeleton-avatar" animated></tp-skeleton>
                      <div class="workspace-stack">
                        <tp-skeleton class="overview-skeleton-line" animated></tp-skeleton>
                        <tp-skeleton class="overview-skeleton-short" animated></tp-skeleton>
                      </div>
                    </div>`,
                )}
              </div>`
            : html`<tp-list-item-group aria-label="Recent activity">
                ${recent.map(
                  (item) =>
                    html`<tp-list-item size="sm">
                      <tp-avatar
                        slot="media"
                        size="sm"
                        .fallback=${initials(item.author)}
                        .alt=${item.author}
                      ></tp-avatar>
                      ${item.author}
                      <span slot="description"
                        >${item.action} ·
                        <tp-time datetime=${minutesAgo(item.ago)} mode="relative"></tp-time
                      ></span>
                    </tp-list-item>`,
                )}
              </tp-list-item-group>`
        }
        <tp-button slot="footer" variant="link" @click=${() => host.go('activity')}
          >Join the conversation</tp-button
        >
      </tp-card>
    </div>
  </div>`;
}
