import { interactiveMarkupExample } from './documentation-examples.js';
import { setupEmptyStateExample } from './empty-state-example.js';
import setupSource from './empty-state-example.js?raw';

const icon = (name: string, slot = '') =>
  `<tp-icon data-icon="${name}"${slot ? ` slot="${slot}"` : ''}></tp-icon>`;
const feedback = (text: string, iconName = '', variant = 'outline') =>
  `<tp-button variant="${variant}" data-feedback="Demo: ${text}">${iconName ? icon(iconName, 'icon-start') : ''}${text}</tp-button>`;
const help = `<tp-button variant="link" href="#empty-state-help">Learn more${icon('external', 'icon-end')}</tp-button>`;
const actions = `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:var(--tp-space-2)">
  <tp-button href="#new-project">Create project</tp-button>
  ${feedback('Import project')}
</div>
${help}`;
const project = (
  media = '',
) => `<tp-empty-state title="No projects yet" description="You haven't created any projects yet. Get started by creating your first project."${media ? ' media-treatment="icon"' : ''}>
  ${media}
  ${actions}
</tp-empty-state>`;
const search = `<tp-input-group style="inline-size:100%;max-inline-size:calc(var(--tp-spacing) * 72)">
  <tp-input type="search" aria-label="Search pages" placeholder="Try searching for pages..."></tp-input>
  ${icon('search', 'prefix')}
  <tp-key-hint slot="suffix">/</tp-key-hint>
</tp-input-group>
<span style="color:var(--tp-muted-foreground)">Need help? <a href="#support" style="color:inherit;text-underline-offset:var(--tp-space-1)">Contact support</a></span>`;
const border = 'border:var(--tp-border-width) var(--tp-border-style) var(--tp-border)';
function example(title: string, id: string, markup: string, description?: string) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}" style="inline-size:100%;min-inline-size:0">${markup}<tp-toast></tp-toast></div>`,
    setupEmptyStateExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nconst cleanup = setupEmptyStateExample(document.getElementById('${id}'));\n// Call cleanup() when removing this example.`,
    description,
  );
}
export const emptyStateExamples = [
  example(
    'Creating the first project',
    'empty-project',
    project(),
    'Native links navigate; Import project demonstrates an application callback through Toast.',
  ),
  example(
    'With a muted background',
    'empty-muted',
    `<style>#empty-muted tp-empty-state::part(empty-state) { background:var(--tp-muted); }</style>
<tp-empty-state title="No results found" description="No results found for your search. Try adjusting your search terms.">
  ${feedback('Try again', '', 'default')}${help}
</tp-empty-state>`,
  ),
  example(
    'With a border and search',
    'empty-search',
    `<style>#empty-search tp-empty-state::part(empty-state) { ${border}; }</style>
<tp-empty-state title="404 — Not found" description="The page you're looking for doesn't exist. Try searching for what you need below.">${search}</tp-empty-state>`,
  ),
  example(
    'With an icon',
    'empty-icon',
    `<style>#empty-icon tp-empty-state::part(empty-state) { ${border}; }</style>
<tp-empty-state title="Nothing to see here" media-treatment="icon">
  ${icon('folder', 'media')}
  <span slot="description">No posts have been created yet. Get started by <a href="#new-post" style="color:inherit;text-underline-offset:var(--tp-space-1)">creating your first post</a>.</span>
  ${feedback('New post', 'plus')}
</tp-empty-state>`,
  ),
  example(
    'With a subdued background and search',
    'empty-subdued',
    `<style>#empty-subdued tp-empty-state::part(empty-state) { background:color-mix(in oklab, var(--tp-muted) 50%, transparent); }</style>
<tp-empty-state title="404 — Not found" description="The page you're looking for doesn't exist. Try searching for what you need below.">${search}</tp-empty-state>`,
  ),
  example(
    'In a card',
    'empty-card',
    `<tp-card><span slot="header">Projects</span>${project(icon('folder', 'media'))}</tp-card>`,
  ),
  example(
    'Offline user',
    'empty-avatar',
    `<tp-empty-state title="User offline" description="This user is currently offline. You can leave a message to notify them or try again later.">
  <tp-avatar slot="media" size="lg" src="https://github.com/shadcn.png" fallback="LR" alt="User profile" style="filter:grayscale(1)"></tp-avatar>
  ${feedback('Leave message', '', 'default')}
</tp-empty-state>`,
  ),
  example(
    'Invite a team',
    'empty-team',
    `<tp-empty-state title="No team members" description="Invite your team to collaborate on this project.">
  <tp-avatar-group slot="media" size="lg" style="filter:grayscale(1)">
    <tp-avatar src="https://github.com/shadcn.png" fallback="CN" alt="@shadcn"></tp-avatar>
    <tp-avatar src="https://github.com/maxleiter.png" fallback="LR" alt="@maxleiter"></tp-avatar>
    <tp-avatar src="https://github.com/evilrabbit.png" fallback="ER" alt="@evilrabbit"></tp-avatar>
  </tp-avatar-group>
  ${feedback('Invite members', 'plus', 'default')}
</tp-empty-state>`,
  ),
  example(
    'Notifications',
    'empty-notifications',
    `<style>#empty-notifications tp-empty-state::part(empty-state) { background:linear-gradient(to bottom, color-mix(in oklab, var(--tp-muted) 50%, transparent) 30%, var(--tp-background)); }</style>
<tp-empty-state title="No notifications" description="You're all caught up. New notifications will appear here." media-treatment="icon">
  ${icon('bell', 'media')}${feedback('Refresh', 'refresh')}
</tp-empty-state>`,
  ),
  example(
    'Cloud storage',
    'empty-cloud',
    `<style>#empty-cloud tp-empty-state::part(empty-state) { ${border};border-style:dashed; }</style>
<tp-empty-state title="Cloud storage empty" description="Upload files to your cloud storage to access them anywhere." media-treatment="icon">
  ${icon('cloud', 'media')}${feedback('Upload files')}
</tp-empty-state>`,
  ),
  example(
    'Without recovery actions',
    'empty-terminal',
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,calc(var(--tp-spacing) * 64)),1fr));gap:var(--tp-space-8)">${[
      ['inbox', 'No messages', 'Your inbox is empty. New messages will appear here.'],
      ['star', 'No favorites', 'Items you mark as favorites will appear here.'],
      ['heart', 'No likes yet', 'Content you like will be saved here for easy access.'],
      ['bookmark', 'No bookmarks', 'Save interesting content by bookmarking it.'],
    ]
      .map(
        ([name, title, description]) =>
          `<tp-empty-state title="${title}" description="${description}" media-treatment="icon">${icon(name!, 'media')}</tp-empty-state>`,
      )
      .join('\n')}</div>`,
    'Optional action regions collapse; decorative icons repeat the textual condition.',
  ),
];
