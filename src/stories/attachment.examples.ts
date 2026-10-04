import { html, nothing } from 'lit';
import { navigationIcons } from '../icons/navigation.js';
import type { AttachmentStatus } from '../components/attachment/index.js';
import landscape from './assets/ratio-landscape.svg';
const layout = 'display:flex;flex-wrap:wrap;align-items:start;gap:var(--tp-space-4)';
const states: AttachmentStatus[] = ['idle', 'uploading', 'processing', 'error', 'complete'];
const descriptions = {
  idle: 'Ready to upload',
  uploading: 'Uploading · 64%',
  processing: 'Processing document',
  error: 'Choose a file under 10 MB.',
  complete: 'PDF · 2.4 MB',
};
function attachment({
  status = 'complete',
  size = 'default',
  orientation = 'horizontal',
  image = false,
  contentOnly = false,
  name = 'annual-report.pdf',
}: {
  status?: AttachmentStatus;
  size?: string;
  orientation?: string;
  image?: boolean;
  contentOnly?: boolean;
  name?: string;
} = {}) {
  return html`<tp-attachment
    .filename=${name}
    .description=${descriptions[status]}
    .errorMessage=${descriptions.error}
    .status=${status}
    .size=${size}
    .orientation=${orientation}
    .mediaTreatment=${image ? 'image' : 'mark'}
    removable
  >
    ${contentOnly || (!image && status === 'uploading') ? nothing : image ? html`<img slot="media" src=${landscape} alt="Landscape reference" />` : html`<tp-icon slot="media" .icon=${navigationIcons.folder} size="var(--tp-icon-size-sm)" aria-hidden="true"></tp-icon>`}
  </tp-attachment>`;
}
const fileCode = `<tp-attachment filename="annual-report.pdf" description="PDF · 2.4 MB" status="complete" removable>
  <!-- An existing tp-icon may fill the media slot. -->
</tp-attachment>`;
export const attachmentExamples = [
  {
    title: 'Files',
    code: fileCode,
    render: () =>
      html`<div style=${layout}>${attachment()}${attachment({ orientation: 'vertical' })}</div>`,
  },
  {
    title: 'Content only',
    code: `<tp-attachment filename="Reference documentation" status="complete" removable></tp-attachment>
<tp-attachment filename="Reference documentation" description="Component API guide" status="complete" removable></tp-attachment>
<tp-attachment filename="Reference documentation" description="Open component API guide" href="#attachment-reference" status="complete"></tp-attachment>`,
    render: () =>
      html`<div style="display:grid;gap:var(--tp-space-3)">
        <tp-attachment
          filename="Reference documentation"
          status="complete"
          removable
        ></tp-attachment>
        <tp-attachment
          filename="Reference documentation"
          description="Component API guide"
          status="complete"
          removable
        ></tp-attachment>
        <tp-attachment
          filename="Reference documentation"
          description="Open component API guide"
          href="#attachment-reference"
          status="complete"
        ></tp-attachment>
        <p id="attachment-reference">Component API guide</p>
      </div>`,
  },
  {
    title: 'File states',
    description:
      'The application supplies status and progress text. Attachment does not run an upload state machine.',
    code: states
      .map(
        (status) =>
          `<tp-attachment filename="report.pdf" status="${status}" description="${descriptions[status]}" removable></tp-attachment>`,
      )
      .join('\n'),
    render: () =>
      html`<div style="display:grid;gap:var(--tp-space-4)">
        ${states.map((status) => attachment({ status, name: status === 'error' ? 'failed.pdf' : 'report.pdf' }))}
      </div>`,
  },
  {
    title: 'Images',
    code: `<tp-attachment filename="landscape.jpg" media-treatment="image" orientation="vertical" status="complete" removable>
  <img slot="media" src="/landscape.jpg" alt="Landscape reference" />
</tp-attachment>`,
    render: () =>
      html`<div style=${layout}>
        ${attachment({ image: true, name: 'landscape.jpg' })}${attachment({ image: true, name: 'landscape.jpg', orientation: 'vertical' })}
      </div>`,
  },
  {
    title: 'Image states',
    description:
      'The supplied thumbnail stays visible while uploading, processing, or reporting an error.',
    code: `<tp-attachment filename="landscape.jpg" media-treatment="image" status="uploading" description="Uploading · 64%" removable>
  <img slot="media" src="/landscape.jpg" alt="Landscape reference" />
</tp-attachment>`,
    render: () =>
      html`<div style=${layout}>
        ${states.map((status) => attachment({ status, image: true, name: 'landscape.jpg', orientation: 'vertical' }))}
      </div>`,
  },
  {
    title: 'Density',
    code: ['default', 'sm', 'xs']
      .map(
        (size) =>
          `<tp-attachment filename="report.pdf" size="${size}" status="complete" removable></tp-attachment>`,
      )
      .join('\n'),
    render: () =>
      html`<div style="display:grid;gap:var(--tp-space-3)">
        ${['default', 'sm', 'xs'].map((size) => attachment({ size }))}
      </div>`,
  },
  {
    title: 'Scrollable group',
    code: `<tp-attachment-group aria-label="Attached files">
  <tp-attachment filename="report.pdf" status="complete" removable></tp-attachment>
  <tp-attachment filename="notes.txt" status="complete" removable></tp-attachment>
</tp-attachment-group>`,
    render: () =>
      html`<tp-attachment-group
        aria-label="Attached files"
        style="max-inline-size:calc(var(--tp-spacing) * 120)"
        >${Array.from({ length: 6 }, (_, i) => attachment({ image: true, orientation: 'vertical', name: `reference-${i + 1}.jpg` }))}</tp-attachment-group
      >`,
  },
];
