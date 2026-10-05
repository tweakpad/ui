import { interactiveMarkupExample } from './documentation-examples.js';
import { setupMessageExample } from './message-example.js';
import setupSource from './message-example.js?raw';

const avatar = (name: string, initials: string) =>
  `<tp-avatar slot="avatar" fallback="${initials}" alt="${name}"></tp-avatar>`;
const bubble = (text: string, align = 'start', extra = '') =>
  `<tp-bubble align="${align}" variant="${align === 'end' ? 'default' : 'secondary'}">${text}${extra}</tp-bubble>`;
const row = (name: string, content: string, align = 'start', media = '', extra = '') =>
  `<tp-message align="${align}" aria-label="${name}">${media}${content}${extra}</tp-message>`;
const icon = (name: string) => `<tp-icon data-icon="${name}"></tp-icon>`;
// Conversation width and distance between independent turns belong to the application.
const layout =
  'display:flex;flex-direction:column;gap:var(--tp-space-6);inline-size:100%;max-inline-size:24rem;margin-inline:auto';
function example(title: string, id: string, content: string, description: string) {
  return interactiveMarkupExample(
    title,
    `<div id="${id}" style="${layout}">${content}</div>`,
    setupMessageExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nsetupMessageExample(document.getElementById('${id}'));`,
    description,
  );
}

export const messageExamples = [
  example(
    'Conversation',
    'message-conversation',
    [
      row(
        'Alex Morgan',
        bubble('The pilot checklist is ready.', 'end'),
        'end',
        avatar('Alex Morgan', 'AM'),
      ),
      row(
        'Sam Rivera',
        bubble('Have you included the keyboard review?'),
        'start',
        avatar('Sam Rivera', 'SR'),
      ),
      row(
        'Alex Morgan',
        bubble('Yes, every finding now has an owner.', 'end'),
        'end',
        avatar('Alex Morgan', 'AM'),
        '<span slot="footer">Delivered</span>',
      ),
      row(
        'Sam Rivera',
        `<tp-bubble-group>${bubble('That gives us a clear release criterion.')}${bubble('I’ll review the final journey next.', 'start', '<span slot="reactions" role="img" aria-label="One thumbs-up reaction">👍</span>')}</tp-bubble-group>`,
        'start',
        avatar('Sam Rivera', 'SR'),
      ),
      '<tp-marker role="status">Sam is typing…</tp-marker>',
    ].join('\n'),
    'Alternating senders, grouped bubbles, delivery metadata, a reaction summary and a typing Marker match the reference conversation composition.',
  ),
  example(
    'Avatar',
    'message-avatar',
    [
      row(
        'Sam Rivera',
        bubble('The preview stopped while loading the workspace.'),
        'start',
        avatar('Sam Rivera', 'SR'),
      ),
      row(
        'Alex Morgan',
        bubble('Can you share what the error says?', 'end'),
        'end',
        avatar('Alex Morgan', 'AM'),
      ),
      row(
        'Sam Rivera',
        `<tp-bubble-group>${bubble('This is the message from the preview:')}${bubble('The workspace dependency could not be resolved. Check the package path and rebuild the preview.')}</tp-bubble-group>`,
        'start',
        avatar('Sam Rivera', 'SR'),
      ),
    ].join('\n'),
    'Avatars follow the logical sender side and align with the bottom of the message surface, including multiple bubbles.',
  ),
  example(
    'Group',
    'message-group',
    `<tp-message-group>
${row('Sam Rivera', bubble('I checked the release checklist.'), 'start', '<span slot="avatar" aria-hidden="true"></span>')}
${row('Sam Rivera', bubble('The remaining review items are now assigned to the team.'), 'start', avatar('Sam Rivera', 'SR'))}
</tp-message-group>`,
    'MessageGroup owns the spacing between consecutive rows. An empty avatar slot reserves the same column as the final sender avatar.',
  ),
  example(
    'Header and Footer',
    'message-header-footer',
    [
      row(
        'Sam Rivera',
        bubble('The review notes are ready.'),
        'start',
        '',
        '<span slot="header">Sam Rivera</span>',
      ),
      row(
        'Alex Morgan',
        bubble('Share them with the pilot team before the next session.', 'end'),
        'end',
        '',
        '<span slot="footer">Read <time datetime="2026-10-04">yesterday</time></span>',
      ),
    ].join('\n'),
    'The optional Header names the sender. Footer metadata follows the message side; absent regions collapse.',
  ),
  example(
    'Actions',
    'message-actions',
    [
      row(
        'Sam Rivera',
        bubble('The unresolved dependency is in the workspace package.'),
        'start',
        '',
        `<tp-button slot="footer" variant="ghost" size="icon" aria-label="Copy message" title="Copy message" data-action="copy">${icon('copy')}</tp-button><tp-toggle slot="footer" size="sm" aria-label="Helpful" title="Helpful" data-feedback="Helpful">${icon('like')}</tp-toggle><tp-toggle slot="footer" size="sm" aria-label="Not helpful" title="Not helpful" data-feedback="Not helpful">${icon('dislike')}</tp-toggle>`,
      ),
      row(
        'Alex Morgan',
        bubble('Send me the package path and I’ll take a look.', 'end'),
        'end',
        '',
        `<span slot="footer" data-delivery tabindex="-1" style="color:var(--tp-destructive)">Failed to send</span><tp-button slot="footer" variant="ghost" size="icon-xs" aria-label="Retry message" title="Retry message" data-action="retry">${icon('retry')}</tp-button>`,
      ),
      '<tp-marker role="status" data-action-status hidden></tp-marker>',
    ].join('\n'),
    'Copy writes the message text, feedback uses actual Toggles, and Retry updates application-owned delivery status locally. Each action remains independently focusable.',
  ),
  example(
    'Attachment',
    'message-attachment',
    [
      row(
        'Alex Morgan',
        `<tp-attachment orientation="vertical" media-treatment="image" status="complete"><img slot="media" src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80" alt="Bright workspace with shared desks"></tp-attachment>${bubble('Include this workspace reference with the launch notes.', 'end')}`,
        'end',
      ),
      row(
        'Sam Rivera',
        `${bubble('The launch notes are ready to download.')}<tp-attachment filename="pilot-launch-notes.md" description="Markdown · Launch checklist" status="complete"><tp-icon slot="media" data-icon="file"></tp-icon><tp-button slot="actions" variant="secondary" size="icon-sm" aria-label="Download pilot launch notes" title="Download pilot launch notes" download="pilot-launch-notes.md" data-download>${icon('download')}</tp-button></tp-attachment>`,
      ),
      row('Alex Morgan', bubble('Thanks. That is ready for the review.', 'end'), 'end'),
    ].join('\n'),
    'An image followed by a message, then a reply followed by a downloadable file. Message Content owns separation between attachments and bubbles; Attachment owns its media and actions.',
  ),
];
