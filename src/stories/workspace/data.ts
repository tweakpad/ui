import { navigationIcons } from '../../icons/navigation.js';
import type { CommandEntry } from '../../components/command-palette/index.js';
import type { QuestionnaireQuestion } from '../../foundation/questionnaire.js';

export type Section = 'overview' | 'work' | 'files' | 'brief' | 'activity' | 'settings';
export const destinations = [
  ['overview', 'Overview', 'chart'],
  ['work', 'Work', 'frame'],
  ['files', 'Files', 'folder'],
  ['brief', 'Brief', 'book'],
  ['activity', 'Activity', 'bell'],
  ['settings', 'Settings', 'settings'],
] as const;
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
  { type: 'separator' },
  {
    value: 'new-task',
    label: 'Create task',
    icon: navigationIcons.frame,
    keywords: ['add', 'work'],
  },
  { value: 'invite', label: 'Invite a teammate', icon: navigationIcons.account },
  { value: 'export', label: 'Export work as CSV', icon: navigationIcons.share },
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
