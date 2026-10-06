import { LitElement, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { keyed } from 'lit/directives/keyed.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { navigationIcons } from '../../icons/navigation.js';
import { refreshIcon } from '../../icons/refresh.js';
import { downloadIcon } from '../../icons/download.js';
import { fileTextIcon } from '../../icons/file-text.js';
import { plusIcon } from '../../icons/plus.js';
import { calendarIcon } from '../../icons/calendar.js';
import { datePickerTriggerContracts } from '../date-picker-trigger.js';
import {
  quarterlyRenderer,
  quarterlyData,
  quarterlySeries,
} from '../data-visualization.examples.js';
import {
  destinations,
  initialTasks,
  statuses,
  people,
  initials,
  commands,
  questions,
  type Section,
  type Task,
} from './data.js';
import type { TpToast } from '../../components/toast/index.js';
import type { TpDialog } from '../../components/dialog/index.js';
import type { TpNavigationPanel } from '../../components/navigation-panel/index.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { formatTime, resolveTime } from '../../foundation/time/index.js';
type WorkspaceOpenChange = CustomEvent<{ value: boolean }>;
import './styles.css';

const icon = (name: keyof typeof navigationIcons) =>
  html`<tp-icon .icon=${navigationIcons[name]}></tp-icon>`;
const shortDate: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
/** Date-only value as an inline Time; the surrounding control owns any focus. */
const date = (value: string) =>
  html`<tp-time
    datetime=${value}
    mode="absolute"
    .format=${shortDate}
    .tooltip=${false}
  ></tp-time>`;
/** The same presentation for string-only properties. */
const dateText = (value: string) =>
  formatTime(resolveTime(value)!, Date.now(), { locale: 'en', mode: 'absolute', format: shortDate })
    .text;
/** Today, or a number of days earlier, at a local wall-clock time. */
const at = (time: string, daysAgo = 0) => {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  value.setHours(hours, minutes, 0, 0);
  return value;
};
const statusVariant = (status: string) =>
  status === 'Blocked'
    ? 'destructive'
    : status === 'Done'
      ? 'default'
      : status === 'Backlog'
        ? 'outline'
        : 'secondary';

/** Application state for the catalog composition. Controls retain their own behavior. */
export class CatalogWorkspace extends LitElement {
  static override properties = {
    section: { state: true },
    tasks: { state: true },
    query: { state: true },
    filter: { state: true },
    page: { state: true },
    selected: { state: true },
    overlay: { state: true },
    editing: { state: true },
    files: { state: true },
    messages: { state: true },
    refreshing: { state: true },
    brief: { state: true },
    bold: { state: true },
    italic: { state: true },
    alignment: { state: true },
    watched: { state: true },
    members: { state: true },
    verified: { state: true },
    code: { state: true },
    notice: { state: true },
    projectName: { state: true },
    deadline: { state: true },
    goal: { state: true },
    theme: { state: true },
    mobile: { state: true },
    draftDue: { state: true },
    projectSettings: { state: true },
    memberAccess: { state: true },
    historyLoaded: { state: true },
  };
  section: Section = 'overview';
  tasks = initialTasks.map((task) => ({ ...task }));
  query = '';
  filter = 'All statuses';
  page = 1;
  selected = new Set<number>();
  overlay = '';
  editing: Task | null = null;
  files: { id: number; filename: string; size: number; type: string; text: string | Blob }[] = [
    {
      id: 1,
      filename: 'Launch brief.md',
      size: 4820,
      type: 'text/markdown',
      text: '# Launch brief\n\nA calmer, faster workspace for product teams.',
    },
    {
      id: 2,
      filename: 'Research notes.txt',
      size: 2140,
      type: 'text/plain',
      text: 'Customer research\n\nMake the first meaningful action easy to discover.',
    },
    {
      id: 3,
      filename: 'Release checklist.csv',
      size: 1640,
      type: 'text/csv',
      text: 'Item,Status\nAccessibility review,In progress\nDesign review,Done',
    },
  ];
  messages = [
    {
      id: 1,
      author: 'Sam Rivera',
      time: at('09:12'),
      text: 'The mobile checkout is ready for a second look. I simplified the confirmation step.',
      own: false,
    },
    {
      id: 2,
      author: 'Alex Morgan',
      time: at('09:18'),
      text: 'Great. Let’s check keyboard navigation before the review on Friday.',
      own: true,
    },
    {
      id: 3,
      author: 'Jamie Chen',
      time: at('09:24'),
      text: 'I added the release checklist to Files. The launch announcement is next.',
      own: false,
    },
  ];
  refreshing = false;
  brief =
    'A calmer workspace for teams.\n\nWe are bringing planning, files and conversations into one place. The launch should make the first ten minutes feel effortless.\n\nWhat success looks like\n• New teammates can find their first task without help.\n• Every important action works with a keyboard.\n• The mobile experience feels as considered as desktop.\n\nRelease plan\nReview the onboarding journey, close the accessibility audit, then invite our pilot teams.';
  bold = false;
  italic = false;
  alignment = 'start';
  watched = true;
  members = people.slice();
  verified = false;
  code = '';
  notice = '';
  projectName = 'Atlas launch';
  deadline = '2026-10-16';
  draftDue = '2026-10-16';
  goal = '';
  theme = 'system';
  historyLoaded = false;
  projectSettings = { timezone: 'paris', cadence: 'Weekly', visibility: 'team', capacity: 40 };
  memberAccess: Record<string, string> = {};
  mobile = false;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #media: MediaQueryList | undefined;
  protected override createRenderRoot() {
    return this;
  }
  override connectedCallback() {
    super.connectedCallback();
    this.ownerDocument.addEventListener('keydown', this.#shortcut);
    this.#media = this.ownerDocument.defaultView?.matchMedia('(max-width: 40rem)');
    this.#responsive();
    this.#media?.addEventListener('change', this.#responsive);
  }
  override disconnectedCallback() {
    this.ownerDocument.removeEventListener('keydown', this.#shortcut);
    this.#media?.removeEventListener('change', this.#responsive);
    clearTimeout(this.#timer);
    super.disconnectedCallback();
  }
  readonly #dueCalendar = createRef<HTMLElement>();
  readonly #inviteDialog = createRef<TpDialog>();
  // Passing the press keeps its interaction type for the Dialog's initial focus policy.
  #invite = (event: Event) => this.#inviteDialog.value?.setOpen(true, 'trigger-press', event);
  #responsive = () => {
    this.mobile = this.#media?.matches ?? false;
  };
  #shortcut = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.overlay = this.overlay === 'commands' ? '' : 'commands';
    }
  };
  #value<T>(event: TpValueChangeEvent<T>, apply: (value: T) => void) {
    if (event.defaultPrevented || event.detail.cancelled) return;
    (event.target as HTMLElement & { value: T }).value = event.detail.value;
    apply(event.detail.value);
  }
  #open = (name: string) => (event: WorkspaceOpenChange) => {
    if (event.target !== event.currentTarget || event.defaultPrevented) return;
    (event.target as HTMLElement & { open: boolean }).open = event.detail.value;
    this.overlay = event.detail.value ? name : '';
  };
  #notify(title: string) {
    this.querySelector<TpToast>('tp-toast')?.add({ title });
  }
  #go = (section: Section) => {
    this.section = section;
    this.querySelector<TpNavigationPanel>('tp-navigation-panel')?.provider.setCompactOpen(
      false,
      'programmatic',
    );
  };
  #newTask = () => {
    this.editing = null;
    this.draftDue = this.deadline;
    this.overlay = 'task';
  };
  #edit(task: Task) {
    this.editing = task;
    this.draftDue = task.due;
    this.overlay = 'task';
  }
  #download(filename: string, text: string | Blob, type = 'text/plain') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = this.ownerDocument.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  #export = () => {
    const rows = [
      ['ID', 'Task', 'Status', 'Owner', 'Due', 'Hours'],
      ...this.#filtered.map((t) => [t.id, t.title, t.status, t.owner, t.due, t.hours]),
    ];
    this.#download(
      'atlas-work.csv',
      rows
        .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
        .join('\n'),
      'text/csv',
    );
    this.#notify('Work exported as CSV');
  };
  #command(value: string) {
    if (destinations.some(([id]) => id === value)) this.#go(value as Section);
    else if (value === 'new-task') this.#newTask();
    else if (value === 'invite') this.overlay = 'invite';
    else if (value === 'export') this.#export();
    else if (value === 'brief-download')
      this.#download('Launch brief.md', this.brief, 'text/markdown');
    else if (value === 'brief-reset') {
      this.brief = 'New release brief\n\nDescribe the problem, audience and success measures.';
      this.#notify('Brief reset to a new outline');
    } else if (value === 'discovery') this.overlay = 'discovery';
    else if (value === 'verify') this.overlay = 'verify';
  }
  #refresh = () => {
    if (this.refreshing) return;
    this.refreshing = true;
    this.#timer = setTimeout(() => {
      this.refreshing = false;
      this.#notify('Activity is up to date');
    }, 900);
  };
  get #filtered() {
    return this.tasks.filter(
      (task) =>
        (this.filter === 'All statuses' || task.status === this.filter) &&
        `${task.title} ${task.owner} ${task.id}`.toLowerCase().includes(this.query.toLowerCase()),
    );
  }
  #selectTask(id: number, checked: boolean) {
    const next = new Set(this.selected);
    if (checked) next.add(id);
    else next.delete(id);
    this.selected = next;
  }
  #completeSelected = () => {
    this.tasks = this.tasks.map((task) =>
      this.selected.has(task.id) ? { ...task, status: 'Done' } : task,
    );
    this.#notify(`${this.selected.size} tasks completed`);
    this.selected = new Set();
  };
  protected override render() {
    return html`
      <tp-navigation-panel
        class="catalog-workspace"
        label="Atlas workspace"
        .compact=${this.mobile}
        collapse-mode="compact"
        wide-width="calc(var(--tp-spacing) * 62)"
      >
        ${this.#sidebar()}
        <header slot="trigger" class="workspace-topbar">
          <div class="workspace-row">
            <tp-navigation-panel-trigger
              .icon=${navigationIcons.panel}
            ></tp-navigation-panel-trigger>
            <tp-breadcrumb aria-label="Workspace location"
              ><span>Studio North</span><span>${this.projectName}</span></tp-breadcrumb
            >
          </div>
          <div class="workspace-row">
            <tp-navigation-menu class="workspace-resources" aria-label="Project resources">
              <tp-navigation-menu-item value="resources"
                ><tp-button slot="trigger" variant="ghost" size="sm">Resources</tp-button>
                <div slot="content">
                  <a
                    href="#brief"
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.#go('brief');
                    }}
                    close-on-click
                    >Release brief</a
                  >
                  <a
                    href="#files"
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.#go('files');
                    }}
                    close-on-click
                    >Project files</a
                  >
                  <a
                    href="#settings"
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.#go('settings');
                    }}
                    close-on-click
                    >Workspace settings</a
                  >
                </div></tp-navigation-menu-item
              >
            </tp-navigation-menu>
            <tp-tooltip
              ><tp-button
                slot="trigger"
                variant="ghost"
                size="icon"
                .icon=${navigationIcons.search}
                aria-label="Search workspace"
                @click=${() => {
                  this.overlay = 'commands';
                }}
                >${icon('search')}</tp-button
              >Search workspace · ⌘K / Ctrl K</tp-tooltip
            >
            <tp-tooltip
              ><tp-button
                slot="trigger"
                variant="ghost"
                size="icon"
                .icon=${navigationIcons.bell}
                aria-label="Open recent activity"
                @click=${() => {
                  this.overlay = 'updates';
                }}
                >${icon('bell')}</tp-button
              >Recent activity</tp-tooltip
            >
            <tp-avatar fallback="AM" size="sm" alt="Alex Morgan"></tp-avatar>
          </div>
        </header>
        <tp-navigation-panel-inset>
          <section class="workspace-content" aria-label="Project workspace">
            <div class="workspace-row workspace-between workspace-heading">
              <div class="workspace-stack">
                <div class="workspace-row">
                  <h1>${this.projectName}</h1>
                  <tp-badge variant="secondary">Sprint 08</tp-badge>
                </div>
                <p class="workspace-muted">
                  A thoughtful launch, from first idea to the final detail.
                </p>
              </div>
              <div class="workspace-row">
                <tp-avatar-group
                  >${this.members.slice(0, 4).map((name) => html`<tp-avatar size="sm" .fallback=${initials(name)} .alt=${name}></tp-avatar>`)}</tp-avatar-group
                >
                <tp-button variant="outline" size="sm" @click=${this.#invite}>Invite</tp-button>
                <tp-button size="sm" @click=${this.#newTask}
                  ><tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon>New task</tp-button
                >
              </div>
            </div>
            <tp-tabs
              label="Project sections"
              variant="underline"
              .value=${this.section}
              @tp-value-change=${(e: TpValueChangeEvent<string>) => {
                if (e.target === e.currentTarget)
                  this.#value(e, (value) => {
                    this.section = value as Section;
                  });
              }}
            >
              ${destinations.map(([id, label]) => html`<button slot="tab" value=${id}>${label}</button>`)}
              <div slot="panel" value="overview" class="workspace-tab-content">
                ${this.#overview()}
              </div>
              <div slot="panel" value="work" class="workspace-tab-content">${this.#work()}</div>
              <div slot="panel" value="files" class="workspace-tab-content">${this.#files()}</div>
              <div slot="panel" value="brief" class="workspace-tab-content">${this.#brief()}</div>
              <div slot="panel" value="activity" class="workspace-tab-content">
                ${this.#activity()}
              </div>
              <div slot="panel" value="settings" class="workspace-tab-content">
                ${this.#settings()}
              </div>
            </tp-tabs>
          </section>
        </tp-navigation-panel-inset>
      </tp-navigation-panel>
      ${this.#overlays()}
      <tp-toast></tp-toast>
    `;
  }
  #sidebar() {
    return html`
      <tp-navigation-panel-header>
        <tp-navigation-panel-menu
          ><tp-navigation-panel-item>
            <tp-menu
              label="Workspace actions"
              placement="inline-end start"
              @tp-action=${(e: CustomEvent<{ value: string }>) => this.#command(e.detail.value)}
            >
              <tp-navigation-panel-action
                slot="trigger"
                size="lg"
                tooltip="Studio North workspace"
                aria-label="Studio North workspace"
              >
                <tp-avatar slot="icon-start" size="sm" fallback="N" alt="Studio North"></tp-avatar>
                <span>Studio North</span><br /><small>Product studio</small
                ><tp-icon slot="icon-end" .icon=${navigationIcons.selector}></tp-icon>
              </tp-navigation-panel-action>
              <span data-menu-label>Studio North</span>
              <tp-menu-item value="settings">${icon('settings')}Workspace settings</tp-menu-item>
              <tp-menu-item value="invite">${icon('account')}Invite people</tp-menu-item>
            </tp-menu>
          </tp-navigation-panel-item></tp-navigation-panel-menu
        >
      </tp-navigation-panel-header>
      <tp-navigation-panel-content>
        <tp-navigation-panel-group
          ><tp-navigation-panel-group-label>Workspace</tp-navigation-panel-group-label>
          <tp-navigation-panel-menu
            >${destinations.map(
              ([id, label, name]) =>
                html`<tp-navigation-panel-item
                  ><tp-navigation-panel-link
                    href=${`#${id}`}
                    .icon=${navigationIcons[name]}
                    .active=${this.section === id}
                    .tooltip=${label}
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.#go(id);
                    }}
                    >${label}</tp-navigation-panel-link
                  ></tp-navigation-panel-item
                >`,
            )}</tp-navigation-panel-menu
          >
        </tp-navigation-panel-group>
        <tp-navigation-panel-group
          ><tp-navigation-panel-group-label>Projects</tp-navigation-panel-group-label>
          <tp-navigation-panel-menu
            ><tp-navigation-panel-item
              ><tp-collapsible default-open
                ><span slot="label">${this.projectName}</span
                ><tp-icon slot="leading" .icon=${navigationIcons.folder}></tp-icon
                ><tp-navigation-panel-submenu>
                  <tp-navigation-panel-subitem
                    ><tp-navigation-panel-sublink
                      href="#work"
                      @click=${(e: Event) => {
                        e.preventDefault();
                        this.#go('work');
                      }}
                      >Launch checklist</tp-navigation-panel-sublink
                    ></tp-navigation-panel-subitem
                  >
                  <tp-navigation-panel-subitem
                    ><tp-navigation-panel-sublink
                      href="#brief"
                      @click=${(e: Event) => {
                        e.preventDefault();
                        this.#go('brief');
                      }}
                      >Release brief</tp-navigation-panel-sublink
                    ></tp-navigation-panel-subitem
                  >
                </tp-navigation-panel-submenu></tp-collapsible
              ></tp-navigation-panel-item
            ></tp-navigation-panel-menu
          >
        </tp-navigation-panel-group>
      </tp-navigation-panel-content>
      <tp-navigation-panel-footer>
        <tp-navigation-panel-menu
          ><tp-navigation-panel-item
            ><tp-navigation-panel-action
              .icon=${navigationIcons.search}
              tooltip="Search workspace"
              @click=${() => {
                this.overlay = 'commands';
              }}
              >Search workspace<tp-key-hint-group slot="icon-end" separator="none" platform="mac"
                ><tp-key-hint key="command"></tp-key-hint
                ><tp-key-hint
                  key="K"
                ></tp-key-hint></tp-key-hint-group></tp-navigation-panel-action></tp-navigation-panel-item
        ></tp-navigation-panel-menu>
        <tp-navigation-panel-separator></tp-navigation-panel-separator>
        <tp-navigation-panel-menu
          ><tp-navigation-panel-item
            ><tp-navigation-panel-action
              size="lg"
              tooltip="Your settings"
              @click=${() => this.#go('settings')}
              ><tp-avatar slot="icon-start" size="sm" fallback="AM" alt="Alex Morgan"></tp-avatar
              >Alex Morgan<br /><small>Personal settings</small></tp-navigation-panel-action
            ></tp-navigation-panel-item
          ></tp-navigation-panel-menu
        >
      </tp-navigation-panel-footer>
    `;
  }
  #overview() {
    const done = this.tasks.filter((t) => t.status === 'Done').length;
    const blocked = this.tasks.filter((t) => t.status === 'Blocked').length;
    return html`<div class="workspace-stack-lg">
      <div class="workspace-metrics">
        ${[
          [
            'Tasks completed',
            `${done} / ${this.tasks.length}`,
            'Release checklist',
            `${Math.round((done / Math.max(1, this.tasks.length)) * 100)}% complete`,
          ],
          [
            'In motion',
            String(this.tasks.filter((t) => t.status === 'In progress').length),
            'Actively being worked on',
            'This sprint',
          ],
          [
            'Needs attention',
            String(this.tasks.filter((t) => t.status === 'Blocked').length),
            'Clear blockers before review',
            'Action needed',
          ],
          ['Release date', dateText(this.deadline), 'Pilot team rollout', 'Milestone'],
        ].map(
          ([label, value, description, badge]) =>
            html`<tp-card
              ><span slot="description">${label}</span
              ><strong slot="header" class="workspace-metric">${value}</strong
              ><tp-badge slot="action" variant="outline">${badge}</tp-badge>
              <p class="workspace-muted workspace-small">${description}</p></tp-card
            >`,
        )}
      </div>
      <div class="workspace-columns">
        <tp-card>
          <h2 slot="header">Product reach</h2>
          <p slot="description">Quarterly visits to the Atlas experience</p>
          <tp-badge slot="action" variant="secondary">Desktop + mobile</tp-badge>
          <tp-data-visualization
            label="Quarterly visits"
            description="Desktop visits rose from 186 in Q1 to 273 in Q4. Mobile visits rose from 80 to 190. Striped bars represent mobile."
            interaction="both"
            .data=${quarterlyData}
            .series=${quarterlySeries}
            .renderer=${quarterlyRenderer}
          ></tp-data-visualization>
          <div slot="footer" class="workspace-row workspace-between">
            <span class="workspace-muted workspace-small">Sample analytics · 2026</span
            ><tp-button variant="link" size="sm" @click=${this.#export}
              >Export project work</tp-button
            >
          </div>
        </tp-card>
        <tp-card
          ><h2 slot="header">Release readiness</h2>
          <p slot="description">The final stretch, together.</p>
          <div class="workspace-stack">
            <div class="workspace-row workspace-between">
              <strong>${Math.round((done / Math.max(1, this.tasks.length)) * 100)}% complete</strong
              ><tp-marker tone="success" label="Project active"></tp-marker>
            </div>
            <tp-progress
              label="Release readiness"
              .value=${(done / Math.max(1, this.tasks.length)) * 100}
            ></tp-progress>
            <tp-separator></tp-separator>
            <tp-list-item description="Oct 8 · Sam Rivera"
              >Design review<tp-badge slot="trailing" variant="secondary"
                >In review</tp-badge
              ></tp-list-item
            >
            <tp-list-item description="Oct 12 · Taylor Kim"
              >Engineering handoff<tp-badge slot="trailing" variant="outline"
                >Upcoming</tp-badge
              ></tp-list-item
            >
            <tp-list-item .description=${`${dateText(this.deadline)} · Everyone`}
              >Pilot launch<tp-badge slot="trailing">Milestone</tp-badge></tp-list-item
            >
          </div>
          <tp-button slot="footer" variant="outline" @click=${() => this.#go('work')}
            >Open launch checklist</tp-button
          >
        </tp-card>
      </div>
      <tp-alert
        .title=${blocked ? `${blocked} blocked task${blocked === 1 ? ' needs' : 's need'} attention` : 'No launch blockers'}
        variant="default"
        ><div class="workspace-row workspace-between">
          <span
            >${blocked ? 'Clear the blocked work before the pilot release.' : 'Keep the remaining work moving toward the release.'}</span
          ><tp-button
            variant="outline"
            size="sm"
            @click=${() => {
              this.filter = blocked ? 'Blocked' : 'All statuses';
              this.page = 1;
              this.#go('work');
            }}
            >${blocked ? 'Review blockers' : 'View work'}</tp-button
          >
        </div></tp-alert
      >
      <div class="workspace-columns">
        <tp-card
          ><h2 slot="header">Up next</h2>
          <p slot="description">The next pieces of the launch.</p>
          <div class="workspace-stack">
            ${this.tasks
              .filter((t) => t.status !== 'Done')
              .slice(0, 3)
              .map(
                (task) =>
                  html`<div class="workspace-row workspace-between">
                    <div class="workspace-stack">
                      <strong>${task.title}</strong
                      ><span class="workspace-muted workspace-small"
                        >${task.owner} · ${date(task.due)}</span
                      >
                    </div>
                    <tp-button variant="ghost" size="sm" @click=${() => this.#edit(task)}
                      >Open</tp-button
                    >
                  </div>`,
              )}
          </div></tp-card
        >
        <tp-card
          ><h2 slot="header">Latest activity</h2>
          <tp-button
            slot="action"
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh activity"
            .icon=${refreshIcon}
            .disabled=${this.refreshing}
            @click=${this.#refresh}
          ></tp-button>
          ${this.refreshing ? html`<div class="workspace-stack" aria-label="Refreshing activity" aria-busy="true"><tp-skeleton class="workspace-skeleton-line" animated></tp-skeleton><tp-skeleton class="workspace-skeleton-line" animated></tp-skeleton><tp-skeleton class="workspace-skeleton-line" animated></tp-skeleton></div>` : html`<div class="workspace-stack">${this.messages.slice(-3).map((message) => html`<tp-list-item .description=${message.text}><tp-avatar slot="leading" size="sm" .fallback=${initials(message.author)} .alt=${message.author}></tp-avatar>${message.author}</tp-list-item>`)}</div>`}
          <tp-button slot="footer" variant="link" @click=${() => this.#go('activity')}
            >Join the conversation</tp-button
          >
        </tp-card>
      </div>
    </div>`;
  }
  #work() {
    const filtered = this.#filtered;
    const pages = Math.max(1, Math.ceil(filtered.length / 6));
    const page = Math.min(this.page, pages);
    const visible = filtered.slice((page - 1) * 6, page * 6);
    return html`<div class="workspace-stack">
      <div class="workspace-row workspace-between">
        <div class="workspace-row">
          <tp-input-group class="workspace-search"
            ><tp-icon slot="prefix" .icon=${navigationIcons.search}></tp-icon
            ><tp-input
              label="Search tasks"
              placeholder="Search tasks or teammates…"
              .value=${this.query}
              @tp-value-change=${(e: TpValueChangeEvent<string>) =>
                this.#value(e, (value) => {
                  this.query = value;
                  this.page = 1;
                })}
            ></tp-input
          ></tp-input-group>
          <tp-select
            class="workspace-filter"
            label="Filter status"
            .items=${['All statuses', ...statuses]}
            .value=${this.filter}
            @tp-value-change=${(e: TpValueChangeEvent<string>) =>
              this.#value(e, (value) => {
                this.filter = value;
                this.page = 1;
              })}
          ></tp-select>
        </div>
        <tp-button-group
          ><tp-button variant="outline" size="sm" @click=${this.#export}>Export</tp-button
          ><tp-button
            variant="outline"
            size="sm"
            @click=${() => {
              this.query = '';
              this.filter = 'All statuses';
              this.page = 1;
            }}
            >Clear filters</tp-button
          ></tp-button-group
        >
      </div>
      ${
        this.selected.size
          ? html`<div class="workspace-row">
              <tp-badge variant="secondary">${this.selected.size} selected</tp-badge
              ><tp-button size="sm" variant="outline" @click=${this.#completeSelected}
                >Mark complete</tp-button
              ><tp-button
                size="sm"
                variant="destructive"
                @click=${() => {
                  this.overlay = 'delete';
                }}
                >Delete selected</tp-button
              >
            </div>`
          : nothing
      }
      ${
        visible.length
          ? html`<tp-table
              class="workspace-table"
              label="Launch work"
              sticky-header
              sticky-footer
              selection-presentation="row"
            >
              <tp-table-header
                ><tp-table-row
                  ><tp-table-head scope="col"
                    ><tp-checkbox
                      aria-label="Select visible tasks"
                      .checked=${visible.every((t) => this.selected.has(t.id))}
                      .indeterminate=${visible.some((t) => this.selected.has(t.id)) && !visible.every((t) => this.selected.has(t.id))}
                      @tp-value-change=${(e: TpValueChangeEvent<boolean>) => {
                        const owner = e.target as HTMLElement & { checked: boolean };
                        owner.checked = e.detail.value;
                        visible.forEach((task) => this.#selectTask(task.id, e.detail.value));
                      }}
                    ></tp-checkbox></tp-table-head
                  ><tp-table-head scope="col">Task</tp-table-head
                  ><tp-table-head scope="col">Status</tp-table-head
                  ><tp-table-head scope="col">Owner</tp-table-head
                  ><tp-table-head scope="col">Due</tp-table-head
                  ><tp-table-head scope="col">Hours</tp-table-head
                  ><tp-table-head scope="col">Actions</tp-table-head></tp-table-row
                ></tp-table-header
              >
              <tp-table-body
                >${repeat(
                  visible,
                  (task) => task.id,
                  (task) =>
                    html`<tp-table-row ?selected=${this.selected.has(task.id)}>
                      <tp-table-cell
                        ><tp-checkbox
                          .ariaLabel=${`Select ${task.title}`}
                          .checked=${this.selected.has(task.id)}
                          @tp-value-change=${(e: TpValueChangeEvent<boolean>) => {
                            (e.target as HTMLElement & { checked: boolean }).checked =
                              e.detail.value;
                            this.#selectTask(task.id, e.detail.value);
                          }}
                        ></tp-checkbox
                      ></tp-table-cell>
                      <tp-table-head scope="row"
                        ><tp-button variant="link" @click=${() => this.#edit(task)}
                          >${task.title}</tp-button
                        >
                        <div class="workspace-muted workspace-small">
                          ATL-${task.id} · ${task.priority} priority
                        </div></tp-table-head
                      >
                      <tp-table-cell
                        ><tp-badge .variant=${statusVariant(task.status)}
                          >${task.status}</tp-badge
                        ></tp-table-cell
                      >
                      <tp-table-cell
                        ><div class="workspace-row">
                          <tp-avatar
                            size="sm"
                            .fallback=${initials(task.owner)}
                            .alt=${task.owner}
                          ></tp-avatar
                          ><span>${task.owner.split(' ')[0]}</span>
                        </div></tp-table-cell
                      >
                      <tp-table-cell>${date(task.due)}</tp-table-cell
                      ><tp-table-cell>${task.hours}</tp-table-cell>
                      <tp-table-cell
                        ><tp-menu
                          .label=${`Actions for ${task.title}`}
                          @tp-action=${(e: CustomEvent<{ value: string }>) => {
                            if (e.detail.value === 'edit') this.#edit(task);
                            else if (e.detail.value === 'done') {
                              this.tasks = this.tasks.map((t) =>
                                t.id === task.id ? { ...t, status: 'Done' } : t,
                              );
                              this.#notify('Task completed');
                            } else {
                              this.selected = new Set([task.id]);
                              this.overlay = 'delete';
                            }
                          }}
                          ><tp-button
                            slot="trigger"
                            variant="ghost"
                            size="icon"
                            .icon=${navigationIcons.more}
                            .ariaLabel=${`Actions for ${task.title}`}
                            >${icon('more')}</tp-button
                          ><tp-menu-item value="edit">${icon('settings')}Edit task</tp-menu-item
                          ><tp-menu-item value="done">Mark complete</tp-menu-item
                          ><tp-separator></tp-separator
                          ><tp-menu-item value="delete" variant="destructive"
                            >${icon('trash')}Delete task</tp-menu-item
                          ></tp-menu
                        ></tp-table-cell
                      >
                    </tp-table-row>`,
                )}</tp-table-body
              >
              <tp-table-footer
                ><tp-table-row
                  ><tp-table-cell colspan="5">${filtered.length} tasks in this view</tp-table-cell
                  ><tp-table-cell>${filtered.reduce((sum, t) => sum + t.hours, 0)} h</tp-table-cell
                  ><tp-table-cell>Total</tp-table-cell></tp-table-row
                ></tp-table-footer
              >
            </tp-table>`
          : html`<tp-empty-state
              title="No matching tasks"
              description="Try another search or clear the status filter."
              ><tp-icon slot="media" .icon=${navigationIcons.search}></tp-icon
              ><tp-button
                slot="actions"
                variant="outline"
                @click=${() => {
                  this.query = '';
                  this.filter = 'All statuses';
                }}
                >Clear filters</tp-button
              ></tp-empty-state
            >`
      }
      <div class="workspace-row workspace-between">
        <span class="workspace-muted workspace-small"
          >${filtered.length ? (page - 1) * 6 + 1 : 0}–${Math.min(page * 6, filtered.length)} of
          ${filtered.length} tasks</span
        ><tp-pagination
          label="Task pages"
          .page=${page}
          .pages=${pages}
          @tp-value-change=${(e: TpValueChangeEvent<number>) => {
            e.detail.sourceEvent?.preventDefault();
            (e.target as HTMLElement & { page: number }).page = e.detail.value;
            this.page = e.detail.value;
          }}
        ></tp-pagination>
      </div>
    </div>`;
  }
  #files() {
    return html`<div class="workspace-stack-lg">
      <div class="workspace-row workspace-between">
        <div class="workspace-stack">
          <h2>Project files</h2>
          <p class="workspace-muted">The latest references, decisions and deliverables.</p>
        </div>
        <tp-button
          variant="outline"
          @click=${() => this.querySelector<HTMLInputElement>('#workspace-upload')?.click()}
          ><tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon>Add files</tp-button
        ><input
          hidden
          id="workspace-upload"
          type="file"
          multiple
          @change=${async (e: Event) => {
            const input = e.target as HTMLInputElement;
            const files = Array.from(input.files ?? []);
            const additions = await Promise.all(
              files.map(async (file, i) => ({
                id: Date.now() + i,
                filename: file.name,
                size: file.size,
                type: file.type,
                text: file,
              })),
            );
            if (!this.isConnected) return;
            this.files = [...this.files, ...additions];
            input.value = '';
            this.#notify(`${additions.length} files added to this session`);
          }}
        />
      </div>
      <div class="workspace-columns">
        <tp-card
          ><h2 slot="header">Creative direction</h2>
          <p slot="description">Three directions for the launch campaign</p>
          <tp-carousel label="Campaign directions">
            ${[
              ['Make room for better work.', '01 / Clarity', 'primary'],
              ['Good work happens together.', '02 / Collaboration', 'muted'],
              ['Less friction. More momentum.', '03 / Focus', 'dark'],
            ].map(
              ([title, subtitle, tone]) =>
                html`<tp-aspect-ratio .ratio=${16 / 9}
                  ><div class="workspace-art" data-tone=${tone}>
                    <span class="workspace-small">ATLAS / STUDIO NORTH</span
                    ><strong>${title}</strong><span>${subtitle}</span>
                  </div></tp-aspect-ratio
                >`,
            )}
          </tp-carousel></tp-card
        >
        <tp-card
          ><h2 slot="header">Shared files</h2>
          <p slot="description">Stored locally for this preview session</p>
          <div class="workspace-stack">
            ${repeat(
              this.files,
              (file) => file.id,
              (file) =>
                html`<tp-attachment
                  .filename=${file.filename}
                  status="complete"
                  .fileSize=${new Blob([file.text]).size}
                  removable
                  @tp-remove=${() => {
                    this.files = this.files.filter((f) => f.id !== file.id);
                    this.#notify(`${file.filename} removed`);
                  }}
                  ><tp-icon slot="media" .icon=${fileTextIcon}></tp-icon
                  ><tp-button
                    slot="actions"
                    variant="ghost"
                    size="icon-sm"
                    .ariaLabel=${`Download ${file.filename}`}
                    .icon=${downloadIcon}
                    @click=${() => this.#download(file.filename, file.text, file.type)}
                  ></tp-button
                ></tp-attachment>`,
            )}
            ${!this.files.length ? html`<tp-empty-state title="No shared files" description="Add the first reference for your team."><tp-button slot="actions" variant="outline" @click=${() => this.querySelector<HTMLInputElement>('#workspace-upload')?.click()}>Add files</tp-button></tp-empty-state>` : nothing}
          </div></tp-card
        >
      </div>
    </div>`;
  }
  #brief() {
    return html`<div class="workspace-stack">
      <div class="workspace-row">
        <tp-menubar
          aria-label="Brief actions"
          @tp-action=${(e: CustomEvent<{ value: string }>) => this.#command(e.detail.value)}
        >
          <tp-menu value="file" label="File"
            ><tp-button slot="trigger" variant="ghost">File</tp-button
            ><tp-menu-item value="brief-download">${icon('share')}Download Markdown</tp-menu-item
            ><tp-separator></tp-separator
            ><tp-menu label="Share brief"
              ><tp-button slot="trigger" variant="ghost">Share</tp-button
              ><tp-menu-item value="invite">Invite teammate</tp-menu-item
              ><tp-menu-item value="activity">Discuss with team</tp-menu-item></tp-menu
            ><tp-separator></tp-separator
            ><tp-menu-item value="brief-reset" variant="destructive"
              >Reset to outline</tp-menu-item
            ></tp-menu
          >
          <tp-menu value="project" label="Project"
            ><tp-button slot="trigger" variant="ghost">Project</tp-button
            ><tp-menu-item value="discovery">${icon('sparkle')}Define release goals</tp-menu-item
            ><tp-menu-item value="settings"
              >${icon('settings')}Project settings</tp-menu-item
            ></tp-menu
          >
        </tp-menubar>
        <div class="workspace-row">
          <tp-toggle
            aria-label="Bold preview"
            .pressed=${this.bold}
            @tp-value-change=${(e: TpValueChangeEvent<boolean>) => {
              (e.target as HTMLElement & { pressed: boolean }).pressed = e.detail.value;
              this.bold = e.detail.value;
            }}
            >B</tp-toggle
          ><tp-toggle
            aria-label="Italic preview"
            .pressed=${this.italic}
            @tp-value-change=${(e: TpValueChangeEvent<boolean>) => {
              (e.target as HTMLElement & { pressed: boolean }).pressed = e.detail.value;
              this.italic = e.detail.value;
            }}
            ><em>I</em></tp-toggle
          >
          <tp-toggle-group
            label="Preview alignment"
            .value=${[this.alignment]}
            @tp-value-change=${(e: TpValueChangeEvent<string[]>) => {
              if (e.target === e.currentTarget)
                this.#value(e, (value) => {
                  this.alignment = value[0] ?? 'start';
                });
            }}
            ><tp-toggle value="start">Start</tp-toggle><tp-toggle value="center">Center</tp-toggle
            ><tp-toggle value="end">End</tp-toggle></tp-toggle-group
          >
        </div>
      </div>
      <tp-resizable-panel-group
        class="workspace-editor"
        .orientation=${this.mobile ? 'vertical' : 'horizontal'}
      >
        <tp-resizable-panel default-size="50%" min-size="25%"
          ><div class="workspace-editor-pane">
            <div class="workspace-editor-heading workspace-row">
              <tp-label for="workspace-brief-input">Release brief</tp-label>
            </div>
            <tp-text-area
              id="workspace-brief-input"
              label="Release brief"
              resize="none"
              .value=${this.brief}
              @tp-value-change=${(e: TpValueChangeEvent<string>) =>
                this.#value(e, (value) => {
                  this.brief = value;
                })}
            ></tp-text-area></div
        ></tp-resizable-panel>
        <tp-resizable-handle label="Resize editor and preview" with-handle></tp-resizable-handle>
        <tp-resizable-panel min-size="25%"
          ><div class="workspace-editor-pane">
            <div class="workspace-editor-heading workspace-row workspace-between">
              <strong>Preview</strong><tp-badge variant="outline">Live</tp-badge>
            </div>
            <tp-scroll-area class="workspace-editor-scroll" aria-label="Brief preview"
              ><article
                class="workspace-preview"
                ?data-bold=${this.bold}
                ?data-italic=${this.italic}
                data-align=${this.alignment}
                .textContent=${this.brief}
              ></article
            ></tp-scroll-area></div
        ></tp-resizable-panel>
      </tp-resizable-panel-group>
      <p class="workspace-muted workspace-small">
        Edits stay in this preview session. Download a copy from File.
      </p>
      <tp-collapsible
        ><span slot="label">Release criteria</span>
        <p class="workspace-muted">
          Every flow supports keyboard navigation, all launch copy is approved, and the pilot team
          has access. Update project goals from the Project menu.
        </p></tp-collapsible
      >
    </div>`;
  }
  #activity() {
    return html`<div class="workspace-columns">
      <tp-card
        ><h2 slot="header">Team conversation</h2>
        <p slot="description">Decisions and updates for this release</p>
        <tp-message-scroller label="Team conversation">
          <tp-message-scroller-item message-id="history-control"
            ><div class="workspace-history">
              <tp-button
                size="sm"
                variant="ghost"
                ?disabled=${this.historyLoaded}
                @click=${() => {
                  this.messages = [
                    {
                      id: -2,
                      author: 'Sam Rivera',
                      time: at('16:20', 1),
                      text: 'The pilot team can start on Friday. Are we ready to share the new onboarding flow?',
                      own: false,
                    },
                    {
                      id: -1,
                      author: 'Alex Morgan',
                      time: at('16:24', 1),
                      text: 'Yes. Let’s finish the accessibility review first and share the release brief with everyone.',
                      own: true,
                    },
                    {
                      id: 0,
                      author: 'Jamie Chen',
                      time: at('16:31', 1),
                      text: 'I’ll collect the final copy and the launch checklist in Files.',
                      own: false,
                    },
                    ...this.messages,
                  ];
                  this.historyLoaded = true;
                }}
                >${this.historyLoaded ? 'Beginning of conversation' : 'Load earlier messages'}</tp-button
              >
            </div></tp-message-scroller-item
          >

          ${repeat(
            this.messages,
            (message) => message.id,
            (message) =>
              html`<tp-message-scroller-item .messageId=${String(message.id)}
                ><tp-message
                  .align=${message.own ? 'end' : 'start'}
                  .author=${message.author}
                  .timestamp=${message.time}
                  ><tp-avatar
                    slot="avatar"
                    size="sm"
                    .fallback=${initials(message.author)}
                    .alt=${message.author}
                  ></tp-avatar
                  ><tp-bubble
                    .align=${message.own ? 'end' : 'start'}
                    .variant=${message.own ? 'default' : 'secondary'}
                    >${message.text}</tp-bubble
                  ></tp-message
                ></tp-message-scroller-item
              >`,
          )}
        </tp-message-scroller>
        <tp-form
          slot="footer"
          class="workspace-grow"
          .onFormSubmit=${(values: Record<string, unknown>, details: { form: HTMLFormElement }) => {
            const text = String(values.message ?? '').trim();
            if (!text) return;
            this.messages = [
              ...this.messages,
              {
                id: Date.now(),
                author: 'Alex Morgan',
                time: new Date(),
                text,
                own: true,
              },
            ];
            details.form.reset();
          }}
          ><tp-field label="Message to the team"
            ><tp-text-area
              name="message"
              placeholder="Share an update…"
              rows="2"
              required
            ></tp-text-area
          ></tp-field>
          <div slot="actions" class="workspace-row workspace-between">
            <tp-switch
              .checked=${this.watched}
              @tp-value-change=${(e: TpValueChangeEvent<boolean>) => {
                (e.target as HTMLElement & { checked: boolean }).checked = e.detail.value;
                this.watched = e.detail.value;
              }}
              >Follow conversation</tp-switch
            ><tp-button type="submit" size="sm">Send message</tp-button>
          </div></tp-form
        >
      </tp-card>
      <tp-card
        ><h2 slot="header">Working together</h2>
        <p slot="description">${this.members.length} people in this project</p>
        <div class="workspace-stack">
          ${this.members.map(
            (name) =>
              html`<tp-preview-card .label=${name} placement="bottom-start"
                ><tp-button class="workspace-member" slot="trigger" variant="ghost"
                  ><tp-avatar
                    slot="icon-start"
                    size="sm"
                    .fallback=${initials(name)}
                    .alt=${name}
                  ></tp-avatar
                  >${name}</tp-button
                >
                <div class="workspace-profile">
                  <div class="workspace-profile-heading">
                    <tp-avatar .fallback=${initials(name)} .alt=${name}></tp-avatar>
                    <div>
                      <strong>${name}</strong>
                      <p class="workspace-muted workspace-small">Product team · Studio North</p>
                    </div>
                  </div>
                  <p class="workspace-muted workspace-small">
                    ${this.memberAccess[name] ?? 'Can edit'}
                  </p>
                  <tp-marker tone="success" label="Available for review"></tp-marker></div
              ></tp-preview-card>`,
          )}
        </div>
        <tp-button slot="footer" variant="outline" @click=${this.#invite}
          >Invite a teammate</tp-button
        ></tp-card
      >
    </div>`;
  }
  #settings() {
    return html`<div class="workspace-settings workspace-stack-lg">
      <tp-card
        ><h2 slot="header">Project details</h2>
        <p slot="description">
          ${this.projectSettings.cadence} reviews · ${this.projectSettings.capacity} hours per week
          ·
          ${this.projectSettings.visibility === 'team' ? 'Workspace members' : 'Invited people only'}
        </p>
        <tp-form
          .onFormSubmit=${(values: Record<string, unknown>) => {
            this.projectName = String(values.name);
            this.projectSettings = {
              timezone: String(values.timezone),
              cadence: String(values.cadence),
              visibility: String(values.visibility),
              capacity: Number(values.capacity),
            };
            this.#notify('Project settings saved');
          }}
        >
          <tp-field label="Project name" description="Visible to everyone in the workspace."
            ><tp-input name="name" no-autofill .defaultValue=${this.projectName} required></tp-input
          ></tp-field>
          <div class="workspace-grid">
            <tp-field label="Timezone"
              ><tp-select
                name="timezone"
                label="Project timezone"
                default-value="paris"
                .items=${[
                  { value: 'paris', label: 'Paris · CET' },
                  { value: 'london', label: 'London · GMT' },
                  { value: 'new-york', label: 'New York · ET' },
                ]}
              ></tp-select></tp-field
            ><tp-field label="Review cadence"
              ><tp-select
                name="cadence"
                label="Review cadence"
                .items=${['Weekly', 'Every two weeks', 'Monthly']}
                default-value="Weekly"
              ></tp-select
            ></tp-field>
          </div>
          <tp-field label="Project visibility"
            ><tp-radio-group name="visibility" label="Project visibility" default-value="team"
              ><tp-radio-group-item value="team">Workspace members</tp-radio-group-item
              ><tp-radio-group-item value="private"
                >Invited people only</tp-radio-group-item
              ></tp-radio-group
            ></tp-field
          >
          <tp-field description="Hours available for this project."
            ><tp-slider
              name="capacity"
              label="Weekly capacity"
              min="0"
              max="80"
              step="4"
              default-value="40"
            ></tp-slider
          ></tp-field>
          <div slot="actions">
            <tp-button type="submit">Save changes</tp-button
            ><tp-button type="reset" variant="outline">Reset</tp-button>
          </div>
        </tp-form>
      </tp-card>
      <tp-card
        ><h2 slot="header">Preferences & access</h2>
        <p slot="description">Your view of the workspace.</p>
        <div class="workspace-stack">
          <div class="workspace-row workspace-between">
            <div class="workspace-stack">
              <strong>Appearance</strong
              ><span class="workspace-muted">Uses the library’s light and dark themes.</span>
            </div>
            <tp-native-select
              label="Appearance"
              .value=${this.theme}
              @tp-value-change=${(e: TpValueChangeEvent<string>) =>
                this.#value(e, (value) => {
                  this.theme = value;
                  if (value === 'system') this.removeAttribute('data-theme');
                  else this.setAttribute('data-theme', value);
                  this.style.colorScheme = value === 'system' ? 'light dark' : value;
                })}
              ><option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option></tp-native-select
            >
          </div>
          <tp-separator></tp-separator><tp-switch default-checked>Weekly project digest</tp-switch
          ><tp-checkbox default-checked>Include me in review requests</tp-checkbox>
          <tp-separator></tp-separator>
          <div class="workspace-row workspace-between">
            <div class="workspace-stack">
              <strong>Workspace access</strong
              ><span class="workspace-muted"
                >${this.verified ? 'Demo verification complete for this session.' : 'Try the six-digit verification flow.'}</span
              >
            </div>
            <tp-button
              variant="outline"
              @click=${() => {
                this.overlay = 'verify';
              }}
              >${this.verified ? 'Verify again' : 'Verify access'}</tp-button
            >
          </div>
        </div></tp-card
      >
      <tp-accordion variant="outline"
        ><tp-accordion-item value="storage"
          ><span slot="label">Where are my changes saved?</span>
          <p>
            This is a local, interactive workspace preview. Changes stay in memory until the page
            reloads. Download files or export work to keep a copy.
          </p></tp-accordion-item
        ><tp-accordion-item value="shortcuts"
          ><span slot="label">Keyboard shortcuts</span>
          <div class="workspace-row">
            <tp-key-hint-group separator="none" platform="mac"
              ><tp-key-hint key="command"></tp-key-hint
              ><tp-key-hint key="K"></tp-key-hint></tp-key-hint-group
            ><span>or</span
            ><tp-key-hint-group separator="none" platform="windows"
              ><tp-key-hint key="control"></tp-key-hint
              ><tp-key-hint key="K"></tp-key-hint></tp-key-hint-group
            ><span>opens workspace commands.</span>
          </div></tp-accordion-item
        ></tp-accordion
      >
      <div class="workspace-row workspace-between">
        <div class="workspace-stack">
          <h2>Release discovery</h2>
          <p class="workspace-muted">
            ${this.goal || 'Clarify the audience and the outcome before shipping.'}
          </p>
        </div>
        <tp-button
          variant="secondary"
          @click=${() => {
            this.overlay = 'discovery';
          }}
          >Define release goals</tp-button
        >
      </div>
    </div>`;
  }
  #overlays() {
    return html`
      <tp-command-palette
        label="Search workspace"
        .items=${commands}
        .open=${this.overlay === 'commands'}
        @tp-open-change=${this.#open('commands')}
        .onExecute=${(e: CustomEvent<{ commandId: string }>) => {
          this.overlay = '';
          this.#command(e.detail.commandId);
        }}
      ></tp-command-palette>
      <tp-drawer
        edge="inline-end"
        swipe-enabled="false"
        label=${this.editing ? 'Task details' : 'Create a task'}
        description="Plan the next piece of the launch."
        .open=${this.overlay === 'task'}
        @tp-open-change=${this.#open('task')}
      >
        ${keyed(
          `${this.editing?.id ?? 'new'}:${this.overlay === 'task'}`,
          html`<tp-form
            class="workspace-overlay"
            .onFormSubmit=${(values: Record<string, unknown>) => {
              const task: Task = {
                id: this.editing?.id ?? Math.max(100, ...this.tasks.map((t) => t.id)) + 1,
                title: String(values.title),
                status: String(values.status),
                priority: String(values.priority),
                owner: String(values.owner),
                due: this.draftDue,
                hours: Number(values.hours || 0),
              };
              this.tasks = this.editing
                ? this.tasks.map((t) => (t.id === task.id ? task : t))
                : [task, ...this.tasks];
              this.overlay = '';
              this.#go('work');
              this.query = '';
              this.filter = 'All statuses';
              this.page = 1;
              this.#notify(this.editing ? 'Task updated' : 'Task created');
            }}
          >
            <tp-field label="Task name"
              ><tp-input
                name="title"
                .defaultValue=${this.editing?.title ?? ''}
                placeholder="What needs to happen?"
                required
              ></tp-input
            ></tp-field>
            <tp-field label="Status"
              ><tp-select
                name="status"
                label="Task status"
                .items=${statuses}
                .defaultValue=${this.editing?.status ?? 'Backlog'}
              ></tp-select
            ></tp-field>
            <tp-field label="Assigned to"
              ><tp-select
                name="owner"
                label="Task assignee"
                searchable
                .items=${this.members}
                .defaultValue=${this.editing?.owner ?? 'Alex Morgan'}
              ></tp-select
            ></tp-field>
            <tp-field label="Priority"
              ><tp-native-select
                name="priority"
                label="Task priority"
                .defaultValue=${this.editing?.priority ?? 'Medium'}
                ><option>Low</option>
                <option>Medium</option>
                <option>High</option></tp-native-select
              ></tp-field
            >
            <tp-field label="Estimate"
              ><tp-input-group
                ><tp-input
                  name="hours"
                  type="number"
                  min="0"
                  max="200"
                  .defaultValue=${String(this.editing?.hours ?? 4)}
                ></tp-input
                ><span slot="suffix">hours</span></tp-input-group
              ></tp-field
            >
            <tp-field label="Due date"
              ><tp-popover
                label="Choose a due date"
                placement="bottom start"
                .initialFocus=${() => this.#dueCalendar.value ?? null}
                ><tp-button
                  slot="trigger"
                  variant="outline"
                  style="display: block"
                  .icon=${calendarIcon}
                  .partContracts=${datePickerTriggerContracts(!this.draftDue)}
                  ><tp-time
                    .datetime=${this.draftDue || undefined}
                    mode="absolute"
                    preset="date-long"
                    .tooltip=${false}
                    >Pick a date</tp-time
                  ></tp-button
                ><tp-calendar
                  ${ref(this.#dueCalendar)}
                  label="Due date"
                  .value=${this.draftDue}
                  default-displayed-month="2026-10-01"
                  @tp-value-change=${(e: TpValueChangeEvent<string>) =>
                    this.#value(e, (value) => {
                      this.draftDue = value;
                    })}
                ></tp-calendar></tp-popover
            ></tp-field>
            <div slot="actions">
              <tp-button type="submit">${this.editing ? 'Save task' : 'Create task'}</tp-button
              ><tp-button
                variant="outline"
                @click=${() => {
                  this.overlay = '';
                }}
                >Cancel</tp-button
              >
            </div>
          </tp-form>`,
        )}
      </tp-drawer>
      <tp-dialog
        label="Invite a teammate"
        description="Give someone access to this project."
        .open=${this.overlay === 'invite'}
        @tp-open-change=${this.#open('invite')}
        ${ref(this.#inviteDialog)}
      >
        <tp-form
          .onFormSubmit=${(values: Record<string, unknown>, details: { form: HTMLFormElement }) => {
            const name = String(values.name);
            if (!this.members.includes(name)) this.members = [...this.members, name];
            this.memberAccess = { ...this.memberAccess, [name]: String(values.access) };
            this.overlay = '';
            details.form.reset();
            this.#notify(`${name} added to this demo workspace`);
          }}
        >
          <tp-field label="Name"
            ><tp-input
              name="name"
              autocomplete="name"
              placeholder="Jamie Chen"
              required
            ></tp-input></tp-field
          ><tp-field label="Email"
            ><tp-input
              name="email"
              type="email"
              autocomplete="email"
              placeholder="jamie@studio.example"
              required
            ></tp-input></tp-field
          ><tp-field label="Access"
            ><tp-select
              name="access"
              label="Member access"
              .items=${['Can edit', 'Can view']}
              default-value="Can edit"
            ></tp-select
          ></tp-field>
          <p class="workspace-muted workspace-small">
            Demo only: adds a local member. No email is sent.
          </p>
          <div slot="actions">
            <tp-button type="submit">Add teammate</tp-button
            ><tp-button
              variant="outline"
              @click=${() => {
                this.overlay = '';
              }}
              >Cancel</tp-button
            >
          </div>
        </tp-form>
      </tp-dialog>
      <tp-dialog
        label="Verify workspace access"
        description="Enter the demo code 246810 to try the verification flow."
        .open=${this.overlay === 'verify'}
        @tp-open-change=${this.#open('verify')}
      >
        <div class="workspace-overlay">
          <tp-field label="Verification code"
            ><tp-otp-field
              length="6"
              .value=${this.code}
              @tp-value-change=${(e: TpValueChangeEvent<string>) =>
                this.#value(e, (value) => {
                  this.code = value;
                  this.notice = '';
                })}
            ></tp-otp-field
          ></tp-field>
          <p class="workspace-muted workspace-small">
            This preview does not authenticate an account.
          </p>
          <p role="status" class="workspace-status">${this.notice}</p>
        </div>
        <tp-button
          slot="footer"
          .disabled=${this.code.length !== 6}
          @click=${() => {
            if (this.code === '246810') {
              this.verified = true;
              this.overlay = '';
              this.#notify('Demo verification complete');
            } else this.notice = 'That code does not match. Use 246810.';
          }}
          >Verify code</tp-button
        >
        <tp-button slot="close" variant="outline">Cancel</tp-button>
      </tp-dialog>
      <tp-drawer
        label="Define the release"
        description="A short brief to keep the whole team focused."
        .open=${this.overlay === 'discovery'}
        @tp-open-change=${this.#open('discovery')}
      >
        <tp-questionnaire
          label="Release discovery"
          .questions=${questions}
          @tp-submit=${(e: CustomEvent<{ answers: Record<string, unknown> }>) => {
            e.preventDefault();
            this.goal = `Release goals recorded: ${Object.values(e.detail.answers).map(String).join(' · ')}`;
            this.overlay = '';
            this.#notify('Release goals saved');
          }}
        ></tp-questionnaire>
        <p slot="footer" class="workspace-muted workspace-small">
          Answers stay in this workspace session.
        </p>
        <tp-button slot="close" variant="outline">Close</tp-button>
      </tp-drawer>
      <tp-drawer
        edge="inline-end"
        swipe-enabled="false"
        label="Recent activity"
        description="The latest updates across your project."
        .open=${this.overlay === 'updates'}
        @tp-open-change=${this.#open('updates')}
      >
        <div class="workspace-stack">
          ${this.messages.map((message) => html`<tp-list-item .description=${message.text}><tp-avatar slot="leading" size="sm" .fallback=${initials(message.author)} .alt=${message.author}></tp-avatar>${message.author} · <tp-time .datetime=${message.time} mode="calendar"></tp-time></tp-list-item>`)}
        </div>
        <tp-button
          slot="footer"
          @click=${() => {
            this.overlay = '';
            this.#go('activity');
          }}
          >Open conversation</tp-button
        >
      </tp-drawer>
      <tp-alert-dialog
        label="Delete selected tasks?"
        .description=${`This removes ${this.selected.size} selected tasks from this preview. Export your work first if you need a copy.`}
        .open=${this.overlay === 'delete'}
        @tp-open-change=${this.#open('delete')}
      >
        <tp-button
          slot="cancel"
          variant="outline"
          @click=${() => {
            this.overlay = '';
          }}
          >Keep tasks</tp-button
        ><tp-button
          slot="confirm"
          variant="destructive"
          @click=${() => {
            this.tasks = this.tasks.filter((task) => !this.selected.has(task.id));
            this.selected = new Set();
            this.overlay = '';
            this.#notify('Selected tasks deleted');
          }}
          >Delete tasks</tp-button
        >
      </tp-alert-dialog>
    `;
  }
}
if (!customElements.get('catalog-workspace'))
  customElements.define('catalog-workspace', CatalogWorkspace);
