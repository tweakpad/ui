import { html } from 'lit';
import { navigationIcons } from '../icons/navigation.js';
import { markupExample } from './documentation-examples.js';

const actions = `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:var(--tp-space-2)">
  <tp-button href="#new-project">Create project</tp-button>
  <tp-button variant="outline">Import project</tp-button>
</div>
<tp-button variant="link" href="#project-help">Learn more</tp-button>`;
const project = `<tp-empty-state title="No projects yet" description="You haven't created any projects yet. Get started by creating your first project.">
  ${actions}
</tp-empty-state>`;
const search = `<tp-input-group>
  <tp-input type="search" aria-label="Search pages" placeholder="Try searching for pages..."></tp-input>
  <tp-key-hint slot="suffix">/</tp-key-hint>
</tp-input-group>
<tp-button variant="link" href="#support">Contact support</tp-button>`;

export const emptyStateExamples = [
  markupExample('Creating the first project', project),
  markupExample(
    'With a muted background',
    `<style>
  .empty-muted::part(empty-state) { background: var(--tp-muted); }
</style>
<tp-empty-state class="empty-muted" title="No results found" description="Try adjusting your search terms.">
  <tp-button>Try again</tp-button>
  <tp-button variant="link" href="#search-help">Learn more</tp-button>
</tp-empty-state>`,
  ),
  markupExample(
    'With a border and search',
    `<style>
  .empty-bordered::part(empty-state) { border: var(--tp-border-width) dashed var(--tp-border); }
</style>
<tp-empty-state class="empty-bordered" title="404 — Not found" description="The page you're looking for doesn't exist. Try searching below.">
  ${search}
</tp-empty-state>`,
  ),
  {
    title: 'With an icon',
    code: `<script type="module">
  import { navigationIcons } from '@tweakpad/ui/icons/navigation';
  document.querySelector('#empty-folder').icon = navigationIcons.folder;
</script>
<tp-empty-state title="Nothing to see here" description="Create your first post to get started." media-treatment="icon">
  <tp-icon id="empty-folder" slot="media"></tp-icon>
  <tp-button variant="outline">New post</tp-button>
</tp-empty-state>`,
    render: () =>
      html`<tp-empty-state
        title="Nothing to see here"
        description="Create your first post to get started."
        media-treatment="icon"
      >
        <tp-icon slot="media" .icon=${navigationIcons.folder}></tp-icon>
        <tp-button variant="outline">New post</tp-button>
      </tp-empty-state>`,
  },
  markupExample(
    'With a subdued background and search',
    `<style>
  .empty-subdued::part(empty-state) { background: color-mix(in srgb, var(--tp-muted) 50%, transparent); }
</style>
<tp-empty-state class="empty-subdued" title="404 — Not found" description="The page you're looking for doesn't exist. Try searching below.">
  ${search}
</tp-empty-state>`,
  ),
  markupExample(
    'In a card',
    `<tp-card>
  <span slot="header">Projects</span>
  ${project}
</tp-card>`,
  ),
];
