import { interactiveMarkupExample } from './documentation-examples.js';
import { setupAttachmentExample } from './attachment-example.js';
import setupSource from './attachment-example.js?raw';

const stack = 'display:grid;gap:var(--tp-space-3);min-inline-size:0';
const workspace =
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80';
const desk =
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80';
const files = [
  { name: 'sales-dashboard.pdf', description: 'PDF · 2.4 MB', icon: 'file' },
  { name: 'customer-import.csv', description: 'CSV · 18 KB', icon: 'frame' },
  { name: 'message-renderer.ts', description: 'TypeScript · 12 KB', icon: 'terminal' },
  { name: 'source-assets.zip', description: 'ZIP · 4.2 MB', icon: 'folder' },
  { name: 'quarterly-review.key', description: 'Keynote · 9 MB', icon: 'chart' },
];
const states = [
  ['idle', 'Ready to upload'],
  ['uploading', 'Uploading · 64%'],
  ['processing', 'Processing document'],
  ['error', 'Upload failed. Try again.'],
  ['complete', 'Uploaded · 2.4 MB'],
] as const;
const images = [
  { name: 'workspace.png', description: 'PNG · 820 KB', image: workspace, alt: 'Workspace' },
  { name: 'desk-reference.jpg', description: 'JPG · 1.1 MB', image: desk, alt: 'Desk' },
];
interface Options {
  name?: string;
  description?: string;
  status?: string;
  orientation?: string;
  size?: string;
  icon?: string;
  image?: string;
  alt?: string;
  href?: string;
  removable?: boolean;
  actions?: string;
  attributes?: string;
}
function attachment({
  name = 'annual-report.pdf',
  description = 'PDF · 2.4 MB',
  status = 'complete',
  orientation = 'horizontal',
  size = 'default',
  icon = 'file',
  image,
  alt = '',
  href,
  removable = true,
  actions = '',
  attributes = '',
}: Options = {}) {
  const media = image
    ? `<img slot="media" src="${image}" alt="${alt}" />`
    : status === 'uploading' || !icon
      ? ''
      : `<tp-icon slot="media" data-icon="${icon}" aria-hidden="true"></tp-icon>`;
  const retry =
    status === 'error'
      ? `<tp-button slot="actions" variant="ghost" size="icon-xs" data-icon="retry" data-retry aria-label="Retry ${name}"></tp-button>`
      : '';
  return `<tp-attachment filename="${name}" description="${description}" status="${status}" orientation="${orientation}" size="${size}"${image ? ' media-treatment="image"' : ''}${href ? ` href="${href}" target="_blank"` : ''}${removable ? ' removable' : ''}${attributes ? ` ${attributes}` : ''}>
  ${media}${retry}${actions}
</tp-attachment>`;
}
const group = (label: string, content: string) =>
  `<tp-attachment-group aria-label="${label}">${content}</tp-attachment-group>`;
const section = (label: string, content: string) =>
  `<section style="${stack}"><h4 style="margin:0">${label}</h4>${content}</section>`;
function example(title: string, id: string, markup: string, description?: string) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}" style="display:grid;gap:var(--tp-space-6);min-inline-size:0">${markup}</div>`,
    setupAttachmentExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nconst cleanup = setupAttachmentExample(document.getElementById('${id}'));\n// Call cleanup() when removing this composition.`,
    description,
  );
}
function stateExamples(image: boolean) {
  const items = (orientation: string) =>
    states
      .map(([status, description]) =>
        attachment({
          name: image ? 'workspace.png' : 'report.pdf',
          description:
            orientation === 'vertical'
              ? {
                  idle: 'Ready',
                  uploading: 'Uploading',
                  processing: 'Processing',
                  error: 'Retry upload',
                  complete: 'Uploaded',
                }[status]
              : image && status === 'processing'
                ? 'Processing image'
                : description,
          status,
          orientation,
          ...(image ? { image: workspace, alt: 'Workspace' } : {}),
        }),
      )
      .join('\n');
  return (
    section('Horizontal', `<div style="${stack}">${items('horizontal')}</div>`) +
    section('Vertical', group('Attachment states', items('vertical')))
  );
}
export const attachmentExamples = [
  example(
    'Files',
    'attachment-files',
    section(
      'Horizontal',
      `<div style="${stack}">${files
        .slice(0, 3)
        .map((file) => attachment(file))
        .join('\n')}</div>`,
    ) +
      section(
        'Vertical',
        group(
          'Attached files',
          files.map((file) => attachment({ ...file, orientation: 'vertical' })).join('\n'),
        ),
      ),
  ),
  example(
    'Content only',
    'attachment-content',
    section(
      'Title',
      attachment({ name: 'Reference documentation', description: '', icon: '' }) +
        attachment({
          name: 'shadcn/ui',
          description: '',
          icon: '',
          size: 'sm',
          href: 'https://ui.shadcn.com',
          removable: false,
        }),
    ) +
      section(
        'Title and description',
        attachment({
          name: 'Component API guide',
          description: 'Public controls and composition',
          icon: '',
        }) +
          attachment({
            name: 'Accessible components',
            description: 'ui.shadcn.com/docs',
            icon: '',
            href: 'https://ui.shadcn.com/docs',
            removable: false,
          }),
      ),
  ),
  example(
    'File states',
    'attachment-states',
    stateExamples(false),
    'Status and progress text belong to the application. Retry returns this example to Ready; no upload request is made.',
  ),
  example(
    'Images',
    'attachment-images',
    section(
      'Horizontal',
      `<div style="${stack}">${images.map((image) => attachment({ ...image, href: image.image })).join('\n')}</div>`,
    ) +
      section(
        'Vertical',
        group(
          'Attached images',
          images
            .map((image) => attachment({ ...image, orientation: 'vertical', href: image.image }))
            .join('\n'),
        ),
      ),
  ),
  example(
    'Image states',
    'attachment-image-states',
    stateExamples(true),
    'The supplied thumbnail stays visible in all five states. Retry is an independent Button.',
  ),
  example(
    'Density',
    'attachment-density',
    ['default', 'sm', 'xs']
      .map((size) =>
        attachment({
          name: `${size} attachment`,
          size,
          removable: false,
          description: size === 'xs' ? '' : 'PDF · 2.4 MB',
        }),
      )
      .join('\n'),
  ),
  example(
    'Scrollable group',
    'attachment-groups',
    `<div style="${stack};max-inline-size:calc(var(--tp-spacing) * 120)">${
      section(
        'Horizontal',
        group(
          'Files and images',
          [...files.slice(0, 3), ...images].map((item) => attachment(item)).join('\n'),
        ),
      ) +
      section(
        'Vertical',
        group(
          'File and image cards',
          [...files.slice(0, 3), ...images]
            .map((item) => attachment({ ...item, orientation: 'vertical' }))
            .join('\n'),
        ),
      )
    }</div>`,
  ),
  example(
    'Triggers and independent actions',
    'attachment-triggers',
    attachment({
      name: 'contract-review.txt',
      description: 'Text document · download or open',
      attributes: 'data-removable-example="contract"',
      actions: `
  <tp-button slot="trigger" data-file-link target="_blank" aria-label="Open contract-review.txt"></tp-button>
  <tp-button slot="actions" variant="ghost" size="sm" data-file-link download="contract-review.txt">Download</tp-button>`,
    }) +
      '<tp-button data-restore="contract" variant="outline" hidden>Restore contract attachment</tp-button>' +
      attachment({
        name: 'research-summary.pdf',
        description: 'Open preview dialog',
        attributes: 'data-removable-example="research"',
        actions: `
  <tp-button slot="trigger" data-open-preview="research" aria-label="Preview research summary"></tp-button>
  <tp-button slot="actions" variant="ghost" size="icon-xs" data-copy-link data-icon="share" aria-label="Copy preview link"></tp-button>`,
      }) +
      '<tp-button data-restore="research" variant="outline" hidden>Restore research attachment</tp-button><tp-marker data-copy-status hidden></tp-marker>' +
      `<tp-dialog data-preview="research" label="Research summary" description="Attachment preview">
  <p>The document is ready for review. Actions on the attachment remain independently reachable.</p>
</tp-dialog>`,
    'Open and preview triggers retain link or Button semantics. Download, Copy link, and Remove are separate actions; application code handles removal and restoration.',
  ),
];
