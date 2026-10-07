import { html } from 'lit';
import { navigationIcons } from '../../icons/navigation.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { formatTime, resolveTime } from '../../foundation/time/index.js';
import type { Task } from './data.js';

/** Workspace pages reached from the sidebar. Settings is a dialog, not a page. */
export type Section = 'overview' | 'work' | 'files' | 'brief' | 'activity' | 'sites';
/** Sections of the Settings dialog. */
export type SettingsSection =
  'general' | 'notifications' | 'members' | 'appearance' | 'security' | 'shortcuts' | 'danger';
/** Overlays the shell owns; pages open them by name. */
export type Overlay =
  '' | 'commands' | 'task' | 'invite' | 'discovery' | 'updates' | 'delete' | 'settings';

/**
 * What a page or the Settings dialog may read and do. The `catalog-workspace` shell implements
 * it; pages stay stateless render functions and keep their own view state in `view()`.
 */
export interface WorkspaceHost extends HTMLElement {
  readonly section: Section;
  readonly mobile: boolean;
  readonly projectName: string;
  readonly deadline: string;
  /** Shared task list (Overview, Work table and board, task drawer). */
  tasks: Task[];
  /** Workspace members, in display order. */
  readonly members: readonly string[];
  /** Ids of the tasks the Delete alert dialog removes. */
  pendingDelete: readonly number[];
  go(section: Section): void;
  open(overlay: Overlay): void;
  openSettings(section?: SettingsSection): void;
  notify(title: string): void;
  newTask(): void;
  edit(task: Task): void;
  /** Accepts a controlled value proposal unless it was cancelled, then applies it. */
  accept<T>(event: TpValueChangeEvent<T>, apply: (value: T) => void): void;
  /** Page-local view state that survives page switches; `setView` re-renders. */
  view<T>(key: string, initial: T): T;
  setView<T>(key: string, value: T): void;
  /** Runs `setup` once per key and its returned cleanup when the workspace disconnects. */
  retain(key: string, setup: () => () => void): void;
}

export const icon = (name: keyof typeof navigationIcons) =>
  html`<tp-icon .icon=${navigationIcons[name]}></tp-icon>`;
const shortDate: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
/** Date-only value as an inline Time; the surrounding control owns any focus. */
export const date = (value: string) =>
  html`<tp-time
    datetime=${value}
    mode="absolute"
    .format=${shortDate}
    .tooltip=${false}
  ></tp-time>`;
/** The same presentation for string-only properties. */
export const dateText = (value: string) =>
  formatTime(resolveTime(value)!, Date.now(), { locale: 'en', mode: 'absolute', format: shortDate })
    .text;
/** Today, or a number of days earlier, at a local wall-clock time. */
export const at = (time: string, daysAgo = 0) => {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  value.setHours(hours, minutes, 0, 0);
  return value;
};
export const statusVariant = (status: string) =>
  status === 'Blocked'
    ? 'destructive'
    : status === 'Done'
      ? 'default'
      : status === 'Backlog'
        ? 'outline'
        : 'secondary';
