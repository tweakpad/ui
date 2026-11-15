import { html, type TemplateResult } from 'lit';
import { refreshIcon } from '../../../icons/refresh.js';
import { shieldAlertIcon } from '../../../icons/shield-alert.js';
import type { IconDefinition } from '../../../icons/types.js';
import { gregorianCalendarAdapter, todayCalendarDate } from '../../../foundation/calendar.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import type { HeatmapDatum, HeatmapMessages } from '../../../widgets/heatmap/types.js';
import { quarterlyRenderer } from '../../data-visualization.examples.js';
import { initials } from '../data.js';
import { date, dateText, type PageView, type WorkspaceHost } from '../host.js';
import { plusIcon } from '../../../icons/plus.js';
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
  { author: 'Sam Rivera', action: 'approved the Lisbon kickoff agenda', ago: 260 },
  { author: 'Jamie Chen', action: 'shared the teaser cut with Caravel Logistics', ago: 410 },
  { author: 'Taylor Kim', action: 'closed 3 accessibility audit findings', ago: 620 },
  { author: 'Alex Morgan', action: 'invited Mara Quist to Campaign', ago: 1300 },
];
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const repository = 'https://code.atlas-launch.example/atlas/pilot';
const projectTags = [
  'Pilot',
  'Mobile checkout',
  'Analytics',
  'Accessibility',
  'Onboarding',
  'Payments',
  'Q4 launch',
];
/** Launch phases; `handoff` is the current one. */
const milestones = [
  { value: 'discovery', title: 'Discovery', date: '2026-08-24', note: 'Twelve pilot interviews' },
  { value: 'prototype', title: 'Prototype', date: '2026-09-14', note: 'Checkout flow tested' },
  { value: 'review', title: 'Design review', date: '2026-10-08', note: 'Signed off by Sam Rivera' },
  {
    value: 'handoff',
    title: 'Engineering handoff',
    date: '2026-10-12',
    note: 'Two approvals left',
  },
  { value: 'pilot', title: 'Pilot launch', date: '2026-10-16', note: '400 waitlist seats' },
  { value: 'release', title: 'General release', date: '2026-11-30', note: 'All regions' },
] as const;

/** A stable value from 0 to 1 for a key, so a day always shows the same activity. */
function hashed(key: string): number {
  let state = 2166136261;
  for (const character of key) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  state = Math.imul(state ^ (state >>> 15), 2246822507);
  state = Math.imul(state ^ (state >>> 13), 3266489909);
  return ((state ^ (state >>> 16)) >>> 0) / 4294967296;
}

/** A year of history; the heatmap shows the latest weeks that fit its width. */
const activityWeeks = 52;
let activityCache: { today: string; data: HeatmapDatum<string>[]; total: number } | undefined;
/** Team contributions per day over the recent weeks: busy weekdays, quiet weekends. */
function teamActivity(today: string) {
  if (activityCache?.today === today) return activityCache;
  const hints = new Map<string, string>(
    milestones.map((milestone) => [milestone.date, milestone.title]),
  );
  const data: HeatmapDatum<string>[] = [];
  for (let offset = activityWeeks * 7 - 1; offset >= 0; offset -= 1) {
    const key = gregorianCalendarAdapter.addDays(today, -offset);
    const weekday = gregorianCalendarAdapter.dayOfWeek(key);
    const weekend = weekday === 0 || weekday === 6;
    const hint = hints.get(key);
    if (!hint && hashed(`atlas:${key}`) < (weekend ? 0.75 : 0.08)) continue;
    const value = Math.max(1, Math.round(hashed(`atlas:value:${key}`) ** 1.5 * (weekend ? 3 : 14)));
    data.push(hint ? { key, value: value + 6, hint } : { key, value });
  }
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  activityCache = { today, data, total };
  return activityCache;
}
const activityMessages: Partial<HeatmapMessages> = {
  cell: (_state, value, where) => `${value} contributions on ${where}`,
};

function metric(
  label: string,
  value: string | TemplateResult,
  trend: string,
  up: boolean,
  note: string,
  detail: string,
) {
  return html`<tp-card class="overview-metric">
    <tp-stack gap="4">
      <tp-stack gap="2">
        <span class="workspace-muted">${label}</span>
        <tp-stack direction="row" gap="2" align="center" justify="space-between" wrap="wrap">
          <strong class="workspace-metric overview-metric-value">${value}</strong>
          <tp-badge variant=${up ? 'success' : 'warning'}
            ><tp-icon .icon=${up ? trendUp : trendDown}></tp-icon>${trend}</tp-badge
          >
        </tp-stack>
      </tp-stack>
      <tp-stack gap="1">
        <tp-stack direction="row" gap="1" align="center" wrap="wrap">
          <strong>${note}</strong><tp-icon .icon=${up ? trendUp : trendDown}></tp-icon>
        </tp-stack>
        <span class="workspace-muted">${detail}</span>
      </tp-stack>
    </tp-stack>
  </tp-card>`;
}

export function renderOverview(host: WorkspaceHost): PageView {
  const tasks = host.tasks;
  const done = tasks.filter((t) => t.status === 'Done').length;
  const blocked = tasks.filter((t) => t.status === 'Blocked').length;
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
  const upNext = tasks.filter((t) => t.status !== 'Done');
  const remaining = tasks.length - done;
  const activity = teamActivity(todayCalendarDate());

  const actions = html`<tp-avatar-group
      >${host.members
        .slice(0, 4)
        .map(
          (name) => html`<tp-avatar .fallback=${initials(name)} .alt=${name}></tp-avatar>`,
        )}</tp-avatar-group
    >
    <tp-button variant="outline" size="sm" @click=${host.invite}>Invite</tp-button>
    <tp-button size="sm" @click=${host.newTask}
      ><tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon>New task</tp-button
    >`;

  const body = html`<div class="workspace-stack-lg">
    <tp-alert
      severity=${blocked ? 'warning' : 'success'}
      .title=${
        blocked
          ? `${blocked} blocked task${blocked === 1 ? ' needs' : 's need'} attention`
          : 'No launch blockers'
      }
    >
      <tp-icon slot="icon" .icon=${shieldAlertIcon}></tp-icon>
      ${
        blocked
          ? 'Clear the blocked work before the pilot release review.'
          : 'Keep the remaining work moving toward the release.'
      }
      <tp-button slot="actions" variant="outline" size="sm" @click=${() => host.go('work')}
        >${blocked ? 'Review blockers' : 'View work'}</tp-button
      >
    </tp-alert>

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
        html`<tp-text-transform preset="unit" unit="hour" value="38"></tp-text-transform>`,
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
        html`<tp-text-transform preset="compact" decimals="1" value="12438"></tp-text-transform>`,
        '+18.4%',
        true,
        'Strong waitlist growth',
        `Pilot opens ${dateText(host.deadline)}`,
      )}
    </div>

    <tp-card>
      <h2 slot="header">Release readiness</h2>
      <p slot="description">
        ${remaining} task${remaining === 1 ? '' : 's'} left before the pilot opens on
        ${dateText(host.deadline)}.
      </p>
      <div slot="action" class="workspace-row">
        <span class="workspace-muted workspace-small">${done} of ${tasks.length} tasks done</span>
        <tp-marker tone="success" label="On track"></tp-marker>
      </div>
      <tp-timeline orientation="responsive" value="handoff" aria-label="Launch milestones">
        ${milestones.map(
          (milestone) =>
            html`<tp-timeline-item value=${milestone.value}>
              <strong>${milestone.title}</strong>
              <div class="workspace-muted workspace-small">
                ${date(milestone.date)} · ${milestone.note}
              </div>
            </tp-timeline-item>`,
        )}
      </tp-timeline>
      <tp-button slot="footer" variant="outline" @click=${() => host.go('work')}
        >Open launch checklist</tp-button
      >
    </tp-card>

    <div class="workspace-columns">
      <tp-card>
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
        ></tp-data-visualization>
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
        <tp-scroll-area class="workspace-fill-scroll" aria-label="Recent activity">
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
              : html`<tp-list aria-label="Recent activity">
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
                </tp-list>`
          }
        </tp-scroll-area>
        <tp-button slot="footer" variant="outline" @click=${() => host.go('activity')}
          >Open the conversation</tp-button
        >
      </tp-card>
    </div>

    <div class="overview-sprint-row">
      <tp-card>
        <h2 slot="header">Up next</h2>
        <p slot="description">The next pieces of the launch.</p>
        <tp-scroll-area class="workspace-fill-scroll" aria-label="Upcoming tasks"
          ><tp-list aria-label="Upcoming tasks">
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
          </tp-list></tp-scroll-area
        >
        <tp-button slot="footer" variant="outline" @click=${() => host.go('work')}
          >View all work</tp-button
        >
      </tp-card>
      <tp-card class="overview-sprint">
        <h2 slot="header">Sprint 08</h2>
        <p slot="description">Oct 5 – Oct 16 · day 8 of 10</p>
        <tp-calendar
          label="Sprint 08 dates"
          selection-mode="range"
          .value=${{ from: '2026-10-05', to: '2026-10-16' }}
          default-displayed-month="2026-10-01"
        ></tp-calendar>
        <div slot="footer" class="workspace-row workspace-between">
          <span class="workspace-muted workspace-small"
            >Review on ${dateText(host.deadline)}, 15:00</span
          >
          <tp-button variant="outline" size="sm" @click=${() => host.go('brief')}
            >Open brief</tp-button
          >
        </div>
      </tp-card>
    </div>

    <div class="workspace-columns">
      <tp-card>
        <h2 slot="header">Team activity</h2>
        <p slot="description">Contributions per day across the project.</p>
        <tp-heatmap
          label="Team contributions"
          fit="trim"
          groups="separated"
          start=${gregorianCalendarAdapter.addDays(todayCalendarDate(), -(activityWeeks * 7 - 1))}
          .data=${activity.data}
          .messages=${activityMessages}
        >
          <span slot="footer" class="workspace-muted workspace-small"
            >${activity.total.toLocaleString('en')} contributions this year</span
          >
        </tp-heatmap>
      </tp-card>
      <tp-card>
        <h2 slot="header">Project details</h2>
        <p slot="description">The essentials of ${host.projectName}.</p>
        <tp-description-list>
          <tp-description-list-item label="Owner">
            <tp-stack direction="row" gap="2" align="center">
              <tp-avatar
                size="sm"
                aria-hidden="true"
                .fallback=${initials(host.members[0] ?? '')}
              ></tp-avatar>
              ${host.members[0]}
            </tp-stack>
          </tp-description-list-item>
          <tp-description-list-item label="Started">${date('2026-08-24')}</tp-description-list-item>
          <tp-description-list-item label="Budget">
            <tp-text-transform preset="currency" currency="USD" value="184000"></tp-text-transform>
          </tp-description-list-item>
          <tp-description-list-item label="Repository">
            <tp-stack direction="row" gap="1" align="center">
              <tp-button
                variant="link"
                size="sm"
                href=${repository}
                target="_blank"
                rel="noreferrer"
                >atlas/pilot</tp-button
              >
              <tp-copy-button
                size="xs"
                value=${repository}
                label="Copy repository URL"
                copied-label="Repository URL copied"
              ></tp-copy-button>
            </tp-stack>
          </tp-description-list-item>
          <tp-description-list-item label="Tags">
            <tp-overflow-list max-rows="1">
              ${projectTags.map((tag) => html`<tp-badge variant="outline">${tag}</tp-badge>`)}
            </tp-overflow-list>
          </tp-description-list-item>
        </tp-description-list>
      </tp-card>
    </div>
  </div>`;

  return {
    title: host.projectName,
    badge: html`<tp-badge variant="secondary">Sprint 08</tp-badge>`,
    actions,
    body,
  };
}
