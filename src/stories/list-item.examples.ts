import { interactiveMarkupExample } from './documentation-examples.js';
import { setupListItemExample } from './list-item-example.js';
import setupSource from './list-item-example.js?raw';

const layout =
  'display:grid;gap:var(--tp-space-4);max-inline-size:calc(var(--tp-spacing) * 150);min-inline-size:0';
const ago = (milliseconds: number) => new Date(Date.now() - milliseconds).toISOString();
const icon = '<tp-icon slot="media" data-icon="folder"></tp-icon>';
const button = (label = 'Action', variant = 'outline', size = 'sm') =>
  `<tp-button slot="actions" variant="${variant}" size="${size}" data-feedback>${label}</tp-button>`;
function example(title: string, id: string, markup: string) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}" style="${layout}">${markup}<tp-toast></tp-toast></div>`,
    setupListItemExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nsetupListItemExample(document.getElementById('${id}'));`,
  );
}
const variants = ['ghost', 'outline', 'subdued'];
const people = ['shadcn', 'maxleiter', 'evilrabbit'];
const avatar = (person: string, slot = 'media', extra = '') =>
  `<tp-avatar slot="${slot}" size="sm" src="https://github.com/${person}.png" fallback="${person.slice(0, 2).toUpperCase()}" alt="${person}" ${extra}></tp-avatar>`;
const invite = (person: string) =>
  `<tp-button slot="actions" variant="outline" size="icon-sm" aria-label="Invite ${person}" data-round data-feedback><tp-icon slot="icon-start" data-icon="plus"></tp-icon></tp-button>`;
export const listItemExamples = [
  example(
    'Content and actions',
    'list-item-content-example',
    `
<tp-list-item>Title only</tp-list-item>
<tp-list-item>Title with action${button('Action', 'outline', 'default')}</tp-list-item>
<tp-list-item description="Additional context for this item.">Title and description</tp-list-item>
<tp-list-item description="The action stays separately operable.">Description and action${button('Action', 'outline', 'default')}</tp-list-item>
<tp-list-item media-treatment="icon">${icon}Media and title</tp-list-item>
<tp-list-item media-treatment="icon">${icon}Media and action${button('Action', 'default')}</tp-list-item>
<tp-list-item media-treatment="icon" description="Media aligns with the first line of content.">${icon}Media and description</tp-list-item>
<tp-list-item media-treatment="icon" description="A complete row with media, title, description and action.">${icon}Complete item${button('Action', 'default')}</tp-list-item>
<tp-list-item description="Choose an action for this item.">Multiple actions${button('Cancel')}${button('Confirm', 'default')}</tp-list-item>`,
  ),
  example(
    'Treatments and density',
    'list-item-treatments-example',
    variants
      .map(
        (variant) =>
          `<tp-list-item-group>${['default', 'sm', 'xs'].map((size) => `<tp-list-item variant="${variant}" size="${size}" media-treatment="icon" description="Shared theme spacing and typography.">${icon}${variant} / ${size}${button()}</tp-list-item>`).join('\n')}</tp-list-item-group>`,
      )
      .join('\n'),
  ),
  example(
    'Links',
    'list-item-links-example',
    variants
      .map(
        (variant) => `<tp-list-item-group>
  <tp-list-item variant="${variant}" data-link>Title only link</tp-list-item>
  <tp-list-item variant="${variant}" data-link description="A native link with supporting context.">Title and description link</tp-list-item>
  <tp-list-item variant="${variant}" data-link media-treatment="icon">${icon}Media and title link</tp-list-item>
  <tp-list-item variant="${variant}" data-link media-treatment="icon" description="A complete native link row.">${icon}Media and description link</tp-list-item>
  <tp-list-item variant="${variant}" data-link description="Share acts independently of this link.">Link with actions${button('Share')}</tp-list-item>
</tp-list-item-group>`,
      )
      .join('\n') + '<p id="list-item-destination">Linked destination</p>',
  ),
  example(
    'Grouped items',
    'list-item-groups-example',
    variants
      .map(
        (variant) =>
          `<tp-list-item-group aria-label="${variant} items">${[1, 2, 3].map((n) => `<tp-list-item variant="${variant}" ${variant === 'outline' ? 'media-treatment="icon"' : ''} description="Item ${n} in the group.">${variant === 'outline' ? icon : ''}Item ${n}${variant === 'subdued' ? button() : ''}</tp-list-item>`).join('\n')}</tp-list-item-group>`,
      )
      .join('\n'),
  ),
  example(
    'Separators',
    'list-item-separators-example',
    `<tp-list-item-group aria-label="Mail folders">${['Inbox', 'Sent', 'Drafts', 'Archive'].map((title) => `<tp-list-item variant="outline" media-treatment="icon" description="View ${title.toLowerCase()} messages.">${icon}${title}</tp-list-item>`).join('\n<tp-list-item-separator></tp-list-item-separator>\n')}</tp-list-item-group>`,
  ),
  example(
    'Headers and footers',
    'list-item-sections-example',
    variants
      .map(
        (
          variant,
        ) => `<tp-list-item variant="${variant}" description="Supporting rows are independently optional."><strong slot="header">Project</strong>Header only</tp-list-item>
<tp-list-item variant="${variant}" description="Metadata can follow the main content.">Footer only<span slot="footer">Updated <tp-time datetime="${ago(2 * 3_600_000)}"></tp-time></span></tp-list-item>
<tp-list-item variant="${variant}" description="A complete project summary."><strong slot="header">Team project</strong>Website redesign<span slot="footer">Updated <tp-time datetime="${ago(5 * 60_000)}"></tp-time></span></tp-list-item>`,
      )
      .join('\n'),
  ),
  example(
    'Image media',
    'list-item-images-example',
    [
      ['ghost', 'default'],
      ['outline', 'default'],
      ['outline', 'sm'],
      ['outline', 'xs'],
      ['subdued', 'default'],
    ]
      .map(
        ([variant, size]) =>
          `<tp-list-item-group>${['Project', 'Document', 'File'].map((title, n) => `<tp-list-item variant="${variant}" size="${size}" media-treatment="image" description="${title} settings and metadata."><img slot="media" src="https://avatar.vercel.sh/${title}" alt="">${title}${n ? button(n === 1 ? 'View' : 'Download') : ''}</tp-list-item>`).join('\n')}</tp-list-item-group>`,
      )
      .join('\n'),
  ),
  example(
    'Rich content and avatars',
    'list-item-rich-example',
    `<tp-list-item variant="outline"><tp-avatar slot="media" fallback="AC" alt="Alex Chen" size="sm"></tp-avatar><span slot="title">Alex Chen <tp-badge variant="secondary">Owner</tp-badge></span><span slot="description">Manages the workspace. <a href="#list-item-destination">View profile</a></span>${button('Message')}</tp-list-item>`,
  ),
  example(
    'People and invitations',
    'list-item-people-example',
    `<tp-list-item variant="outline">${avatar('evilrabbit')}Evil Rabbit<span slot="description">Last seen <tp-time mode="relative" datetime="${ago(150 * 86_400_000)}"></tp-time></span>${invite('Evil Rabbit')}</tp-list-item>
<tp-list-item variant="outline" description="Invite your team to collaborate on this project."><tp-avatar-group slot="media" size="sm">${people.map((person, n) => avatar(person, '', n < 2 ? 'data-secondary-avatar' : '')).join('')}</tp-avatar-group>Project team${button('Invite')}</tp-list-item>
<tp-list-item-group aria-label="People">${people.map((person) => `<tp-list-item description="${person}@vercel.com">${avatar(person)}${person}${invite(person)}</tp-list-item>`).join('\n<tp-list-item-separator></tp-list-item-separator>\n')}</tp-list-item-group>`,
  ),
  example(
    'People menu',
    'list-item-menu-example',
    `<tp-menu label="People" placement="block-end start" data-people>
  <tp-button slot="trigger" variant="outline" size="sm" style="justify-self:start">Select person<tp-icon slot="icon-end" data-icon="chevronDown"></tp-icon></tp-button>
  ${people.map((person) => `<tp-menu-item value="${person}" label="${person}"><tp-list-item size="xs" description="${person}@vercel.com">${avatar(person)}${person}</tp-list-item></tp-menu-item>`).join('\n  ')}
</tp-menu>`,
  ),
  example(
    'Image headers',
    'list-item-headers-example',
    `<tp-list-item-group aria-label="Models" data-grid>${[
      [
        'v0-1.5-sm',
        'Everyday tasks and UI generation.',
        '1650804068570-7fb2e3dbf888',
        'Valeria Reverdo',
      ],
      [
        'v0-1.5-lg',
        'Advanced thinking or reasoning.',
        '1610280777472-54133d004c8c',
        'Michael Oeser',
      ],
      [
        'v0-2.0-mini',
        'Open Source model for everyone.',
        '1602146057681-08560aee8cde',
        'Cherry Laithang',
      ],
    ]
      .map(
        ([name, description, photo, credit]) =>
          `<tp-list-item variant="outline" description="${description}"><tp-aspect-ratio slot="header" ratio="1" fit="cover" style="inline-size:100%;border-radius:var(--tp-radius-sm)"><img src="https://images.unsplash.com/photo-${photo}?q=80&w=640&auto=format&fit=crop" alt="${name}" title="${credit} on Unsplash"></tp-aspect-ratio>${name}</tp-list-item>`,
      )
      .join('\n')}</tp-list-item-group>`,
  ),
  example(
    'Media links and metadata',
    'list-item-music-example',
    `<tp-list-item-group aria-label="Music">${(
      [
        ['Midnight City Lights', 'Neon Dreams', 'Electric Nights', '3:45'],
        ['Coffee Shop Conversations', 'The Morning Brew', 'Urban Stories', '4:05'],
        ['Digital Rain', 'Cyber Symphony', 'Binary Beats', '3:30'],
      ] as const
    )
      .map(
        ([title, artist, album, duration]) =>
          `<tp-list-item variant="outline" media-treatment="image" description="${artist}" data-link data-duration="${duration}"><img slot="media" src="https://avatar.vercel.sh/${encodeURIComponent(title)}" alt=""><span slot="title">${title} <span style="color:var(--tp-muted-foreground)">— ${album}</span></span></tp-list-item>`,
      )
      .join('\n')}</tp-list-item-group>`,
  ),
  example(
    'Navigation and external links',
    'list-item-navigation-example',
    `<tp-list-item data-link description="Learn how to get started with our components.">Visit our documentation<tp-icon slot="actions" data-icon="chevronRight"></tp-icon></tp-list-item>
<tp-list-item variant="outline" data-link="https://ui.shadcn.com/" data-external description="Opens in a new tab with security attributes.">External resource<tp-icon slot="actions" data-icon="external"></tp-icon></tp-list-item>
<tp-list-item variant="outline" size="sm" media-treatment="icon" data-link><tp-icon slot="media" data-icon="check"></tp-icon>Your profile has been verified.<tp-icon slot="actions" data-icon="chevronRight"></tp-icon></tp-list-item>`,
  ),
  example(
    'Security alert',
    'list-item-security-example',
    `<tp-list-item variant="outline" media-treatment="icon" description="New login detected from an unknown device."><tp-icon slot="media" data-icon="shield"></tp-icon>Security alert${button('Review')}</tp-list-item>`,
  ),
];
