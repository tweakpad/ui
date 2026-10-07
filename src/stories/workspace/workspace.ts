import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { applyColorSchemePreference } from '../../foundation/color-scheme.js';
import { navigationIcons } from '../../icons/navigation.js';
import { plusIcon } from '../../icons/plus.js';
import { calendarIcon } from '../../icons/calendar.js';
import { datePickerTriggerContracts } from '../date-picker-trigger.js';
import {
  destinations,
  initialTasks,
  statuses,
  people,
  initials,
  commands,
  questions,
  updates,
  type Task,
} from './data.js';
import {
  icon,
  type Overlay,
  type Section,
  type SettingsSection,
  type WorkspaceHost,
} from './host.js';
import { renderOverview } from './pages/overview.js';
import { renderWork } from './pages/work.js';
import { renderFiles } from './pages/files.js';
import { renderBrief } from './pages/brief.js';
import { renderActivity } from './pages/activity.js';
import { renderSites } from './pages/sites.js';
import { renderSettingsDialog } from './settings-dialog.js';
import type { TpToast } from '../../components/toast/index.js';
import type { TpDialog } from '../../components/dialog/index.js';
import type { TpNavigationPanel } from '../../components/navigation-panel/index.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
type WorkspaceOpenChange = CustomEvent<{ value: boolean }>;
import './styles.css';

const pages: Record<Section, (host: WorkspaceHost) => unknown> = {
  overview: renderOverview,
  work: renderWork,
  files: renderFiles,
  brief: renderBrief,
  activity: renderActivity,
  sites: renderSites,
};

/** The workspace shell: navigation, header, overlays and shared state; pages render below. */
export class CatalogWorkspace extends LitElement implements WorkspaceHost {
  static override properties = {
    section: { state: true },
    tasks: { state: true },
    overlay: { state: true },
    editing: { state: true },
    members: { state: true },
    memberAccess: { state: true },
    projectName: { state: true },
    projectSettings: { state: true },
    deadline: { state: true },
    draftDue: { state: true },
    goal: { state: true },
    mobile: { state: true },
    unread: { state: true },
    pendingDelete: { state: true },
    settingsSection: { state: true },
  };
  section: Section = 'overview';
  tasks = initialTasks.map((task) => ({ ...task }));
  overlay: Overlay = '';
  editing: Task | null = null;
  members: string[] = people.slice();
  memberAccess: Record<string, string> = { 'Alex Morgan': 'Owner' };
  projectName = 'Atlas launch';
  projectSettings = { timezone: 'paris', cadence: 'Weekly', visibility: 'team', capacity: 40 };
  deadline = '2026-10-16';
  draftDue = '2026-10-16';
  goal = '';
  mobile = false;
  unread = 3;
  pendingDelete: readonly number[] = [];
  settingsSection: SettingsSection = 'general';
  readonly #views = new Map<string, unknown>();
  readonly #retained = new Map<string, () => void>();
  #media: MediaQueryList | undefined;
  readonly #dueCalendar = createRef<HTMLElement>();
  readonly #inviteDialog = createRef<TpDialog>();

  protected override createRenderRoot() {
    return this;
  }
  override connectedCallback() {
    super.connectedCallback();
    // Apply the saved Appearance theme now, not when Settings first renders its switcher.
    applyColorSchemePreference({ target: this, storageKey: 'tp-workspace-theme' });
    this.ownerDocument.addEventListener('keydown', this.#shortcut);
    this.#media = this.ownerDocument.defaultView?.matchMedia('(max-width: 40rem)');
    this.#responsive();
    this.#media?.addEventListener('change', this.#responsive);
  }
  override disconnectedCallback() {
    this.ownerDocument.removeEventListener('keydown', this.#shortcut);
    this.#media?.removeEventListener('change', this.#responsive);
    for (const cleanup of this.#retained.values()) cleanup();
    this.#retained.clear();
    super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    // Opening Activity reads the notifications, within the same render.
    if (changed.has('section') && this.section === 'activity') this.unread = 0;
  }

  // WorkspaceHost
  go = (section: Section) => {
    this.section = section;
    this.querySelector<TpNavigationPanel>(
      'tp-navigation-panel.catalog-workspace',
    )?.provider.setCompactOpen(false, 'programmatic');
  };
  open = (overlay: Overlay) => {
    this.overlay = overlay;
  };
  openSettings = (section: SettingsSection = this.settingsSection) => {
    this.settingsSection = section;
    this.overlay = 'settings';
  };
  notify(title: string) {
    this.querySelector<TpToast>('tp-toast')?.add({ title });
  }
  newTask = () => {
    this.editing = null;
    this.draftDue = this.deadline;
    this.overlay = 'task';
  };
  edit = (task: Task) => {
    this.editing = task;
    this.draftDue = task.due;
    this.overlay = 'task';
  };
  accept<T>(event: TpValueChangeEvent<T>, apply: (value: T) => void) {
    if (event.defaultPrevented || event.detail.cancelled) return;
    (event.target as HTMLElement & { value: T }).value = event.detail.value;
    apply(event.detail.value);
  }
  view<T>(key: string, initial: T): T {
    if (!this.#views.has(key)) this.#views.set(key, initial);
    return this.#views.get(key) as T;
  }
  setView<T>(key: string, value: T) {
    this.#views.set(key, value);
    this.requestUpdate();
  }
  retain(key: string, setup: () => () => void) {
    if (!this.#retained.has(key)) this.#retained.set(key, setup());
  }
  /** The Appearance theme applies to this workspace subtree. */
  get themeTarget(): HTMLElement {
    return this;
  }

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
  #open = (name: Overlay) => (event: WorkspaceOpenChange) => {
    if (event.target !== event.currentTarget || event.defaultPrevented) return;
    (event.target as HTMLElement & { open: boolean }).open = event.detail.value;
    this.overlay = event.detail.value ? name : '';
  };
  #link = (section: Section) => (event: Event) => {
    event.preventDefault();
    this.go(section);
  };
  #command(value: string) {
    if (destinations.some(([id]) => id === value)) this.go(value as Section);
    else if (value.startsWith('settings:'))
      this.openSettings(value.slice('settings:'.length) as SettingsSection);
    else if (value === 'new-task') this.newTask();
    else if (value === 'invite' || value === 'discovery') this.overlay = value;
  }

  protected override render() {
    const page = destinations.find(([id]) => id === this.section)!;
    return html`
      <tp-navigation-panel
        class="catalog-workspace"
        label="Atlas workspace"
        .compact=${this.mobile}
        collapse-mode="compact"
        wide-width="calc(var(--tp-spacing) * 64)"
      >
        ${this.#sidebar()}
        <header slot="trigger" class="workspace-topbar">
          <div class="workspace-row">
            <tp-navigation-panel-trigger
              .icon=${navigationIcons.panel}
            ></tp-navigation-panel-trigger>
            <tp-separator orientation="vertical" class="workspace-topbar-separator"></tp-separator>
            <tp-breadcrumb label="Workspace location"
              ><span>Studio North</span
              ><a href="#overview" @click=${this.#link('overview')}>${this.projectName}</a
              ><span>${page[1]}</span></tp-breadcrumb
            >
          </div>
          <div class="workspace-row">
            <tp-navigation-menu class="workspace-resources" aria-label="Project resources">
              <tp-navigation-menu-item value="resources"
                ><tp-button slot="trigger" variant="ghost" size="sm">Resources</tp-button>
                <div slot="content">
                  <a href="#brief" @click=${this.#link('brief')} close-on-click>Release brief</a>
                  <a href="#files" @click=${this.#link('files')} close-on-click>Launch media</a>
                  <a href="#sites" @click=${this.#link('sites')} close-on-click>Pilot sites</a>
                  <a
                    href="#settings"
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.openSettings('general');
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
                aria-label="Search workspace"
                @click=${() => this.open('commands')}
                .icon=${navigationIcons.search}
              ></tp-button
              >Search workspace · ⌘K / Ctrl K</tp-tooltip
            >
            <tp-tooltip
              ><tp-button
                slot="trigger"
                variant="ghost"
                size="icon"
                aria-label="Open recent activity"
                @click=${() => this.open('updates')}
                .icon=${navigationIcons.bell}
              ></tp-button
              >Recent activity</tp-tooltip
            >
          </div>
        </header>
        <tp-navigation-panel-inset>
          <section class="workspace-content" aria-label=${page[1]}>
            <div class="workspace-row workspace-between workspace-heading">
              <div class="workspace-stack-sm">
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
                  >${this.members.slice(0, 4).map((name) => html`<tp-avatar .fallback=${initials(name)} .alt=${name}></tp-avatar>`)}</tp-avatar-group
                >
                <tp-button variant="outline" size="sm" @click=${this.#invite}>Invite</tp-button>
                <tp-button size="sm" @click=${this.newTask}
                  ><tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon>New task</tp-button
                >
              </div>
            </div>
            <div class="workspace-page">${pages[this.section](this)}</div>
          </section>
        </tp-navigation-panel-inset>
      </tp-navigation-panel>
      ${this.#overlays()} ${renderSettingsDialog(this)}
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
                <tp-avatar slot="icon-start" fallback="N" alt="Studio North"></tp-avatar>
                <span>Studio North</span><br /><small>Product studio</small
                ><tp-icon slot="icon-end" .icon=${navigationIcons.selector}></tp-icon>
              </tp-navigation-panel-action>
              <span data-menu-label>Studio North</span>
              <tp-menu-item value="settings:general"
                >${icon('settings')}Workspace settings</tp-menu-item
              >
              <tp-menu-item value="settings:members">${icon('account')}Manage members</tp-menu-item>
              <tp-menu-item value="invite">${icon('share')}Invite people</tp-menu-item>
            </tp-menu>
          </tp-navigation-panel-item></tp-navigation-panel-menu
        >
      </tp-navigation-panel-header>
      <tp-navigation-panel-content>
        <tp-navigation-panel-group
          ><tp-navigation-panel-group-label>Project</tp-navigation-panel-group-label>
          <tp-navigation-panel-menu
            >${destinations.map(
              ([id, label, name]) =>
                html`<tp-navigation-panel-item
                  ><tp-navigation-panel-link
                    href=${`#${id}`}
                    .icon=${navigationIcons[name]}
                    .active=${this.section === id}
                    .tooltip=${label}
                    @click=${this.#link(id)}
                    >${label}</tp-navigation-panel-link
                  >${
                    id === 'activity' && this.unread
                      ? html`<tp-navigation-panel-badge aria-label=${`${this.unread} unread`}
                          >${this.unread}</tp-navigation-panel-badge
                        >`
                      : nothing
                  }</tp-navigation-panel-item
                >`,
            )}</tp-navigation-panel-menu
          >
        </tp-navigation-panel-group>
        <tp-navigation-panel-group
          ><tp-navigation-panel-group-label>Projects</tp-navigation-panel-group-label>
          <tp-navigation-panel-group-action
            aria-label="New project"
            .icon=${plusIcon}
            @click=${() => this.notify('Project templates are coming soon')}
          ></tp-navigation-panel-group-action>
          <tp-navigation-panel-menu
            ><tp-navigation-panel-item
              ><tp-collapsible default-open
                ><span slot="label">${this.projectName}</span
                ><tp-icon slot="leading" .icon=${navigationIcons.folder}></tp-icon
                ><tp-navigation-panel-submenu>
                  <tp-navigation-panel-subitem
                    ><tp-navigation-panel-sublink href="#work" @click=${this.#link('work')}
                      >Launch checklist</tp-navigation-panel-sublink
                    ></tp-navigation-panel-subitem
                  >
                  <tp-navigation-panel-subitem
                    ><tp-navigation-panel-sublink href="#brief" @click=${this.#link('brief')}
                      >Release brief</tp-navigation-panel-sublink
                    ></tp-navigation-panel-subitem
                  >
                  <tp-navigation-panel-subitem
                    ><tp-navigation-panel-sublink href="#sites" @click=${this.#link('sites')}
                      >Pilot rollout</tp-navigation-panel-sublink
                    ></tp-navigation-panel-subitem
                  >
                </tp-navigation-panel-submenu></tp-collapsible
              ></tp-navigation-panel-item
            ><tp-navigation-panel-item
              ><tp-navigation-panel-link
                href="#archive"
                .icon=${navigationIcons.folder}
                tooltip="Onboarding refresh"
                @click=${(e: Event) => {
                  e.preventDefault();
                  this.notify('Onboarding refresh is archived');
                }}
                >Onboarding refresh</tp-navigation-panel-link
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
              @click=${() => this.open('commands')}
              >Search workspace<tp-key-hint-group slot="icon-end" separator="none" platform="mac"
                ><tp-key-hint key="command"></tp-key-hint
                ><tp-key-hint
                  key="K"
                ></tp-key-hint></tp-key-hint-group></tp-navigation-panel-action></tp-navigation-panel-item
          ><tp-navigation-panel-item
            ><tp-navigation-panel-action
              .icon=${navigationIcons.settings}
              tooltip="Settings"
              @click=${() => this.openSettings()}
              >Settings</tp-navigation-panel-action
            ></tp-navigation-panel-item
          ></tp-navigation-panel-menu
        >
        <tp-navigation-panel-separator></tp-navigation-panel-separator>
        <tp-navigation-panel-menu
          ><tp-navigation-panel-item
            ><tp-navigation-panel-action
              size="lg"
              tooltip="Your settings"
              @click=${() => this.openSettings('notifications')}
              ><tp-avatar slot="icon-start" fallback="AM" alt="Alex Morgan"></tp-avatar>Alex
              Morgan<br /><small>alex@studio.example</small></tp-navigation-panel-action
            ></tp-navigation-panel-item
          ></tp-navigation-panel-menu
        >
      </tp-navigation-panel-footer>
    `;
  }
  #taskForm() {
    return html`<tp-form
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
        this.go('work');
        this.notify(this.editing ? 'Task updated' : 'Task created');
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
              this.accept(e, (value) => {
                this.draftDue = value;
              })}
          ></tp-calendar></tp-popover
      ></tp-field>
      <div slot="actions">
        <tp-button type="submit">${this.editing ? 'Save task' : 'Create task'}</tp-button
        ><tp-button variant="outline" @click=${() => this.open('')}>Cancel</tp-button>
      </div>
    </tp-form>`;
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
        ${keyed(`${this.editing?.id ?? 'new'}:${this.overlay === 'task'}`, this.#taskForm())}
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
            this.notify(`Invitation sent to ${name}`);
          }}
        >
          <tp-field label="Name"
            ><tp-input
              name="name"
              autocomplete="name"
              placeholder="Riley Park"
              required
            ></tp-input></tp-field
          ><tp-field label="Email"
            ><tp-input
              name="email"
              type="email"
              autocomplete="email"
              placeholder="riley@studio.example"
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
          <div slot="actions">
            <tp-button type="submit">Send invite</tp-button
            ><tp-button variant="outline" @click=${() => this.open('')}>Cancel</tp-button>
          </div>
        </tp-form>
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
            this.goal = Object.values(e.detail.answers).map(String).join(' · ');
            this.overlay = '';
            this.notify('Release goals saved');
          }}
        ></tp-questionnaire>
        <tp-button slot="close" variant="outline">Close</tp-button>
      </tp-drawer>
      <tp-drawer
        edge="inline-end"
        swipe-enabled="false"
        label="Recent activity"
        description="The latest updates across Atlas launch."
        .open=${this.overlay === 'updates'}
        @tp-open-change=${this.#open('updates')}
      >
        <div class="workspace-stack">
          ${updates.map(
            (update) =>
              html`<tp-list-item
                ><tp-avatar
                  slot="media"
                  .fallback=${initials(update.author)}
                  .alt=${update.author}
                ></tp-avatar
                >${update.author}<span slot="description"
                  >${update.text} ·
                  <tp-time
                    mode="relative"
                    .datetime=${new Date(Date.now() - update.minutes * 60_000)}
                  ></tp-time></span
              ></tp-list-item>`,
          )}
        </div>
        <tp-button
          slot="footer"
          @click=${() => {
            this.overlay = '';
            this.go('activity');
          }}
          >Open conversation</tp-button
        >
      </tp-drawer>
      <tp-alert-dialog
        label=${this.pendingDelete.length === 1 ? 'Delete this task?' : 'Delete selected tasks?'}
        .description=${`This permanently removes ${this.pendingDelete.length} ${this.pendingDelete.length === 1 ? 'task' : 'tasks'} from Atlas launch.`}
        .open=${this.overlay === 'delete'}
        @tp-open-change=${this.#open('delete')}
      >
        <tp-button slot="cancel" variant="outline" @click=${() => this.open('')}
          >Keep tasks</tp-button
        ><tp-button
          slot="confirm"
          variant="destructive"
          @click=${() => {
            const removed = new Set(this.pendingDelete);
            this.tasks = this.tasks.filter((task) => !removed.has(task.id));
            this.notify(`${removed.size} ${removed.size === 1 ? 'task' : 'tasks'} deleted`);
            this.pendingDelete = [];
            this.overlay = '';
          }}
          >Delete</tp-button
        >
      </tp-alert-dialog>
    `;
  }
}
if (!customElements.get('catalog-workspace'))
  customElements.define('catalog-workspace', CatalogWorkspace);
