import { markupExample } from './documentation-examples.js';

const row = (content: string) =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--tp-space-4)">${content}</div>`;

export const spinnerExamples = [
  markupExample(
    'Sizes',
    row(
      ['sm', 'default', 'lg']
        .map((size) => `<tp-spinner size="${size}" label="Loading projects"></tp-spinner>`)
        .join('\n'),
    ),
  ),
  markupExample(
    'In buttons',
    row(`<tp-button loading-position="leading">Submit</tp-button>
<tp-button loading-position="leading" disabled>Disabled</tp-button>
<tp-button loading-position="leading" variant="outline" disabled>Outline</tp-button>
<tp-button loading-position="leading" variant="outline" size="icon" aria-label="Loading" disabled></tp-button>`),
  ),
  markupExample(
    'In badges',
    row(
      ['default', 'secondary', 'destructive', 'outline']
        .map(
          (variant) =>
            `<tp-badge variant="${variant}"><tp-spinner size="sm" label=""></tp-spinner> Processing</tp-badge>`,
        )
        .join('\n'),
    ),
  ),
  markupExample(
    'In an input group',
    `<tp-field label="Search" description="Searching available projects.">
  <tp-input-group>
    <tp-input type="search" name="search" placeholder="Search projects"></tp-input>
    <tp-spinner slot="prefix" size="sm" label="Searching"></tp-spinner>
  </tp-input-group>
</tp-field>`,
  ),
  markupExample(
    'In an empty state',
    `<tp-empty-state title="Loading projects" description="Your projects will appear here once loading finishes." media-treatment="icon">
  <tp-spinner slot="media" label=""></tp-spinner>
  <tp-button variant="outline">Cancel</tp-button>
</tp-empty-state>`,
  ),
];
