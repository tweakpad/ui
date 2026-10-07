import { navigationIcons } from '../../icons/navigation.js';
import { shieldAlertIcon } from '../../icons/shield-alert.js';
import type { CommandEntry } from '../../components/command-palette/index.js';
import type { QuestionnaireQuestion } from '../../foundation/questionnaire.js';
import type { Section, SettingsSection } from './host.js';

export type { Section, SettingsSection } from './host.js';
export const destinations: readonly (readonly [Section, string, keyof typeof navigationIcons])[] = [
  ['overview', 'Overview', 'chart'],
  ['work', 'Work', 'frame'],
  ['files', 'Files', 'folder'],
  ['brief', 'Brief', 'book'],
  ['activity', 'Activity', 'bell'],
  ['sites', 'Pilot sites', 'map'],
];
/** Settings dialog sections: id, label, icon and the one-line purpose shown under the title. */
export const settingsSections = [
  [
    'general',
    'General',
    navigationIcons.settings,
    'Name, schedule and visibility of this project.',
  ],
  ['notifications', 'Notifications', navigationIcons.bell, 'Choose what reaches you, and where.'],
  ['members', 'Members', navigationIcons.account, 'People with access and their roles.'],
  ['appearance', 'Appearance', navigationIcons.sparkle, 'Theme and density for this device.'],
  ['security', 'Security', shieldAlertIcon, 'Two-step verification and active sessions.'],
  ['shortcuts', 'Shortcuts', navigationIcons.terminal, 'Keyboard shortcuts across the workspace.'],
  ['danger', 'Danger zone', navigationIcons.trash, 'Archive or delete this project.'],
] as const satisfies readonly (readonly [SettingsSection, string, unknown, string])[];
export interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  owner: string;
  due: string;
  hours: number;
}
export const initialTasks: Task[] = [
  {
    id: 101,
    title: 'Redesign the onboarding journey',
    status: 'In progress',
    priority: 'High',
    owner: 'Alex Morgan',
    due: '2026-10-09',
    hours: 16,
  },
  {
    id: 102,
    title: 'Review the mobile checkout',
    status: 'In review',
    priority: 'High',
    owner: 'Sam Rivera',
    due: '2026-10-08',
    hours: 8,
  },
  {
    id: 103,
    title: 'Publish the component guidelines',
    status: 'Done',
    priority: 'Medium',
    owner: 'Jamie Chen',
    due: '2026-10-06',
    hours: 12,
  },
  {
    id: 104,
    title: 'Connect product analytics',
    status: 'In progress',
    priority: 'Medium',
    owner: 'Taylor Kim',
    due: '2026-10-12',
    hours: 10,
  },
  {
    id: 105,
    title: 'Resolve keyboard navigation audit',
    status: 'Blocked',
    priority: 'High',
    owner: 'Alex Morgan',
    due: '2026-10-07',
    hours: 6,
  },
  {
    id: 106,
    title: 'Prepare the launch announcement',
    status: 'Backlog',
    priority: 'Low',
    owner: 'Jamie Chen',
    due: '2026-10-14',
    hours: 4,
  },
  {
    id: 107,
    title: 'Finalize empty state illustrations',
    status: 'In review',
    priority: 'Medium',
    owner: 'Sam Rivera',
    due: '2026-10-10',
    hours: 8,
  },
  {
    id: 108,
    title: 'Update billing permissions',
    status: 'Done',
    priority: 'High',
    owner: 'Taylor Kim',
    due: '2026-10-05',
    hours: 6,
  },
  {
    id: 109,
    title: 'Run the performance review',
    status: 'Backlog',
    priority: 'Medium',
    owner: 'Alex Morgan',
    due: '2026-10-15',
    hours: 8,
  },
  {
    id: 110,
    title: 'Translate account settings',
    status: 'Backlog',
    priority: 'Low',
    owner: 'Jamie Chen',
    due: '2026-10-16',
    hours: 6,
  },
  {
    id: 111,
    title: 'Ship the new navigation',
    status: 'Done',
    priority: 'High',
    owner: 'Sam Rivera',
    due: '2026-10-03',
    hours: 14,
  },
  {
    id: 112,
    title: 'Review customer feedback',
    status: 'In progress',
    priority: 'Medium',
    owner: 'Taylor Kim',
    due: '2026-10-11',
    hours: 4,
  },
];
export const statuses = ['Backlog', 'In progress', 'In review', 'Blocked', 'Done'];
export const people = ['Alex Morgan', 'Sam Rivera', 'Jamie Chen', 'Taylor Kim'];
export const initials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('');
export const commands: readonly CommandEntry[] = [
  {
    type: 'group',
    label: 'Workspace',
    items: destinations.map(([value, label, icon]) => ({
      value,
      label: `Go to ${label.toLowerCase()}`,
      icon: navigationIcons[icon],
    })),
  },
  {
    type: 'group',
    label: 'Settings',
    items: settingsSections.map(([value, label, icon]) => ({
      value: `settings:${value}`,
      label: `${label} settings`,
      icon,
      keywords: ['preferences', 'settings'],
    })),
  },
  { type: 'separator' },
  {
    value: 'new-task',
    label: 'Create task',
    icon: navigationIcons.frame,
    keywords: ['add', 'work'],
  },
  { value: 'invite', label: 'Invite a teammate', icon: navigationIcons.account },
  { value: 'discovery', label: 'Define release goals', icon: navigationIcons.sparkle },
];
/** Notification channels in Settings › Notifications. */
export const notificationChannels = [
  [
    'mentions',
    'Mentions and replies',
    'When someone mentions you or replies to your thread.',
    true,
  ],
  [
    'assignments',
    'Task assignments',
    'When a task is assigned to you or its due date changes.',
    true,
  ],
  ['reviews', 'Review requests', 'When a teammate asks for your review.', true],
  ['digest', 'Weekly digest', 'A Monday summary of progress, blockers and upcoming dates.', false],
] as const;
/** Signed-in sessions in Settings › Security; `minutes` is how long ago each was active. */
export const sessions = [
  {
    id: 'mac',
    device: 'MacBook Pro · Chrome',
    place: 'Lisbon, Portugal',
    minutes: 0,
    current: true,
  },
  {
    id: 'iphone',
    device: 'iPhone 16 · Safari',
    place: 'Lisbon, Portugal',
    minutes: 95,
    current: false,
  },
  {
    id: 'pc',
    device: 'Windows 11 · Edge',
    place: 'Madrid, Spain',
    minutes: 60 * 26,
    current: false,
  },
];
export const pendingInvites = [
  { email: 'riley@studio.example', role: 'Can view', days: 2 },
  { email: 'morgan.lee@pilot.example', role: 'Can edit', days: 5 },
];
export const memberRoles = ['Owner', 'Can edit', 'Can view'];
/** Header notifications in the Recent activity drawer; `minutes` is how long ago. */
export const updates = [
  { author: 'Sam Rivera', text: 'Moved “Review the mobile checkout” to In review.', minutes: 12 },
  { author: 'Jamie Chen', text: 'Uploaded “Launch teaser v3.mp4” to Files.', minutes: 48 },
  { author: 'Taylor Kim', text: 'Marked Lisbon pilot site as ready for rollout.', minutes: 130 },
  { author: 'Alex Morgan', text: 'Updated the release brief success measures.', minutes: 60 * 20 },
];
export const questions: readonly QuestionnaireQuestion[] = [
  {
    name: 'goal',
    title: 'What should this release improve?',
    required: true,
    choices: [
      {
        value: 'activation',
        label: 'First-time experience',
        description: 'Help new customers reach their first useful result.',
      },
      {
        value: 'retention',
        label: 'Everyday workflows',
        description: 'Make repeated tasks faster and easier.',
      },
    ],
  },
  {
    name: 'audience',
    title: 'Who are we designing for?',
    required: true,
    choices: [
      { value: 'teams', label: 'Teams working together' },
      { value: 'individuals', label: 'Individual contributors' },
    ],
  },
  {
    name: 'success',
    title: 'How will we know it worked?',
    input: { label: 'Success measure', placeholder: 'For example, improve activation by 10%…' },
    required: true,
  },
];
