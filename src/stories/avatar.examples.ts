import { html } from 'lit';
import { navigationIcons } from '../icons/navigation.js';
import { markupExample } from './documentation-examples.js';

const sizes = ['sm', 'default', 'lg'] as const;
const row = (content: string) =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--tp-space-4)">${content}</div>`;
const members = (
  size: string,
) => `<tp-avatar size="${size}" fallback="AM" alt="Alex Morgan"></tp-avatar>
  <tp-avatar size="${size}" fallback="JD" alt="Jordan Doe"></tp-avatar>
  <tp-avatar size="${size}" fallback="SK" alt="Sam Kim"></tp-avatar>`;
const groups = (omitted: number) =>
  row(
    sizes
      .map(
        (size) =>
          `<tp-avatar-group size="${size}" omitted="${omitted}">${members(size)}</tp-avatar-group>`,
      )
      .join('\n'),
  );
const badgeContract = {
  'avatar-badge': { hostProperties: { role: 'img', 'aria-label': 'Available' } },
};
const countContract = {
  'avatar-overflow-count': {
    content: html`<tp-icon .icon=${navigationIcons.more} size="var(--tp-icon-size-sm)"></tp-icon>`,
  },
};

export const avatarExamples = [
  markupExample(
    'Sizes',
    row(
      sizes
        .map((size) => `<tp-avatar size="${size}" fallback="AM" alt="Alex Morgan"></tp-avatar>`)
        .join('\n'),
    ),
  ),
  markupExample(
    'Images and fallback',
    row(
      sizes
        .map(
          (size) =>
            `<tp-avatar size="${size}" src="https://github.com/shadcn.png" fallback="CN" alt="shadcn"></tp-avatar>`,
        )
        .join('\n'),
    ),
  ),
  markupExample(
    'Status badge',
    row(
      sizes
        .map(
          (size) =>
            `<tp-avatar size="${size}" fallback="AM" alt="Alex Morgan"><span slot="badge" role="img" aria-label="Available"></span></tp-avatar>`,
        )
        .join('\n'),
    ),
  ),
  {
    title: 'Badge with an icon',
    language: 'javascript',
    code: `import { html } from 'lit';
import { navigationIcons } from '@tweakpad/ui/icons/navigation';
const status = { 'avatar-badge': { hostProperties: { role: 'img', 'aria-label': 'Available' } } };
html\`<tp-avatar fallback="AM" alt="Alex Morgan" .partContracts=\${status}>
  <tp-icon slot="badge" .icon=\${navigationIcons.sparkle}></tp-icon>
</tp-avatar>\`;`,
    render: () =>
      html`<div style="display:flex;align-items:center;gap:var(--tp-space-4)">
        ${sizes.map((size) => html`<tp-avatar .size=${size} fallback="AM" alt="Alex Morgan" .partContracts=${badgeContract}><tp-icon slot="badge" .icon=${navigationIcons.sparkle}></tp-icon></tp-avatar>`)}
      </div>`,
  },
  markupExample('Groups', groups(0)),
  markupExample('Groups with an omitted count', groups(3)),
  {
    title: 'Group with an icon count',
    description:
      'The count part still names the three omitted participants when its visible content is an icon.',
    language: 'javascript',
    code: `import { html } from 'lit';
import { navigationIcons } from '@tweakpad/ui/icons/navigation';
group.omitted = 3;
group.partContracts = {
  'avatar-overflow-count': { content: html\`<tp-icon .icon=\${navigationIcons.more} size="var(--tp-icon-size-sm)"></tp-icon>\` },
};`,
    render: () =>
      html`<div style="display:flex;align-items:center;gap:var(--tp-space-4)">
        ${sizes.map((size) => html`<tp-avatar-group .size=${size} omitted="3" .partContracts=${countContract}><tp-avatar .size=${size} fallback="AM" alt="Alex Morgan"></tp-avatar><tp-avatar .size=${size} fallback="JD" alt="Jordan Doe"></tp-avatar></tp-avatar-group>`)}
      </div>`,
  },
  markupExample(
    'In an empty state',
    `<tp-empty-state title="No team members" description="Invite your team to collaborate on this project.">
  <tp-avatar-group slot="media" size="lg" omitted="3">${members('lg')}</tp-avatar-group>
  <tp-button>Invite members</tp-button>
</tp-empty-state>`,
  ),
];
