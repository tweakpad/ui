import { markupExample, moduleExample } from './documentation-examples.js';
import { setupAvatarExample } from './avatar-example.js';
import setupSource from './avatar-example.js?raw';
import { ines, mara, ravi, samplePeople } from './avatars.js';

const sizes = ['sm', 'default', 'lg'] as const;
const row = (content: string) =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--tp-space-2)">${content}</div>`;
const people = samplePeople.slice(0, 3);
const members = (size: string, grayscale = false) =>
  people
    .map(
      (person) =>
        `<tp-avatar size="${size}" src="${person.src}" fallback="${person.initials}" alt="${person.name}"${grayscale ? ' data-grayscale' : ''}></tp-avatar>`,
    )
    .join('\n');
const groups = (omitted: number, icon = false) =>
  row(
    sizes
      .map(
        (size) =>
          `<tp-avatar-group size="${size}" omitted="${omitted}"${icon ? ' data-icon-count' : ''}>${members(size, icon && size === 'lg')}</tp-avatar-group>`,
      )
      .join('\n'),
  );
function example(title: string, id: string, markup: string, description?: string) {
  return moduleExample({
    title,
    id,
    markup,
    description,
    wrapperStyle: 'display:grid;gap:var(--tp-space-4)',
    setup: setupAvatarExample,
    source: setupSource,
    call: `setupAvatarExample(document.getElementById('${id}'));`,
  });
}
function statuses(images: boolean, icon = false) {
  return row(
    sizes
      .map(
        (
          size,
        ) => `<tp-avatar size="${size}" fallback="${ravi.initials}" alt="${ravi.name}" data-status="Available"${images ? ` src="${ravi.src}"` : ''}>
  ${icon ? `<tp-icon slot="badge" data-icon="${images ? 'plus' : 'check'}"></tp-icon>` : '<span slot="badge"></span>'}
</tp-avatar>`,
      )
      .join('\n'),
  );
}

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
            `<tp-avatar size="${size}" src="${mara.src}" fallback="${mara.initials}" alt="${mara.name}"></tp-avatar>`,
        )
        .join('\n'),
    ),
  ),
  example('Status badge', 'avatar-status', statuses(true) + statuses(false)),
  example(
    'Badge with an icon',
    'avatar-status-icons',
    statuses(true, true) + statuses(false, true),
  ),
  markupExample('Groups', groups(0)),
  markupExample('Groups with an omitted count', groups(3)),
  example(
    'Group with an icon count',
    'avatar-icon-counts',
    groups(3, true),
    'The count part still names the three omitted participants when its visible content is an icon.',
  ),
  example(
    'In an empty state',
    'avatar-empty',
    `<tp-empty-state data-bordered title="No team members" description="Invite your team to collaborate on this project.">
  <tp-avatar-group slot="media" size="lg" omitted="3" data-icon-count>${members('lg', true)}</tp-avatar-group>
  <tp-button href="#invite-members"><tp-icon slot="icon-start" data-icon="plus"></tp-icon>Invite members</tp-button>
</tp-empty-state>`,
  ),
  example(
    'Custom shape and grayscale images',
    'avatar-custom-shape',
    row(`<tp-avatar src="${mara.src}" fallback="${mara.initials}" alt="${mara.name}"></tp-avatar>
<tp-avatar src="${ines.src}" fallback="${ines.initials}" alt="${ines.name}" style="border-radius:var(--tp-radius-lg)"></tp-avatar>
<tp-avatar-group>${members('default', true)}</tp-avatar-group>`),
    'A shared radius token customizes the viewport; the public image part applies grayscale without affecting status or fallback colors.',
  ),
];
