import { html } from 'lit';
import { markupExample, interactiveMarkupExample } from './documentation-examples.js';
import './message-scroller-streaming.js';
import streamingSource from './message-scroller-streaming.ts?raw';
import { setupMessageScrollerExample } from './message-scroller-example.js';
import setupSource from './message-scroller-example.js?raw';

const turns = [
  ['turn-1', 'First turn', 'Start with a small pilot and a clear review checklist.'],
  [
    'reply-1',
    'Alex',
    'Review the first ten minutes with someone who has not used the product. Notice where they hesitate and record the result.',
  ],
  ['turn-2', 'Second turn', 'What should we check before releasing?'],
  [
    'reply-2',
    'Alex',
    'Check keyboard navigation, clear names for actions, and how errors are explained. Keep each finding with its acceptance criteria.',
  ],
  ['turn-3', 'Third turn', 'The checklist is ready.'],
  [
    'reply-3',
    'Alex',
    'Invite the pilot group, collect feedback, and review the findings together.',
  ],
]
  .map(
    ([id, author, text]) =>
      `<tp-message-scroller-item message-id="${id}"${id?.startsWith('turn') ? ' scroll-anchor' : ''}><tp-message author="${author}"><tp-bubble>${text}</tp-bubble></tp-message></tp-message-scroller-item>`,
  )
  .join('\n');
const anatomy = (
  attributes = '',
  control = '<tp-message-scroller-return-control></tp-message-scroller-return-control>',
) => `<tp-message-scroller ${attributes} style="max-inline-size:40rem;--tp-message-scroller-height:18rem">
  <tp-message-scroller-viewport>
    <tp-message-scroller-content>${turns}</tp-message-scroller-content>
  </tp-message-scroller-viewport>
  ${control}
</tp-message-scroller>`;

export const messageScrollerExamples = [
  markupExample(
    'Turn anchors and previous context',
    anatomy('label="Turn anchors" initial-position="last-anchor" previous-item-peek="32"'),
    'Mark the start of each turn with scroll-anchor. A short last turn opens at the end; a long turn opens at its reading line. Newly appended turns reserve space while their replies grow.',
  ),
  {
    title: 'Streaming replies and earlier history',
    description:
      'Application-owned data and scripted replies. Send a prompt, scroll away while its reply arrives, or load earlier messages. Content is aria-busy during the reply; Stop reply cancels the demo timer.',
    code: `import '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\n${streamingSource.replace('../components/message-scroller/index.js', '@tweakpad/ui')}\n// Mount <message-scroller-demo></message-scroller-demo>`,
    render: () => html`<message-scroller-demo></message-scroller-demo>`,
  },
  interactiveMarkupExample(
    'External commands and a reading outline',
    `<div id="message-scroller-outline">
  <div style="display:flex;flex-wrap:wrap;gap:var(--tp-space-2);margin-block-end:var(--tp-space-3)">
    <tp-button variant="outline" size="sm" data-action="start">First message</tp-button>
    <tp-button variant="outline" size="sm" data-action="turn">Second turn</tp-button>
    <tp-button variant="outline" size="sm" data-action="end">Latest message</tp-button>
    <tp-button variant="ghost" size="sm" data-action="history">Load earlier</tp-button>
  </div>
  ${anatomy('label="Reading outline" initial-position="start"')}
  <output style="display:block;margin-block-start:var(--tp-space-3)">Waiting for visible rows…</output>
</div>`,
    setupMessageScrollerExample,
    `${setupSource}\nsetupMessageScrollerExample(document.getElementById('message-scroller-outline'));`,
    'Commands and lazy visibility subscriptions work outside the viewport. Unsubscribe when removing the surrounding UI. Prepending a stable row preserves the current reading position.',
  ),
  markupExample(
    'Return to the beginning',
    anatomy(
      'label="Return to beginning" initial-position="end"',
      '<tp-message-scroller-return-control return-direction="start" size="sm" style="inset-inline-start:50%">First message</tp-message-scroller-return-control>',
    ),
    'Return control is a real Button. Configure its direction, size, label, icon and behavior independently. Omit it entirely in explicit composition when external controls are sufficient.',
  ),
  markupExample(
    'Shorthand composition',
    `<tp-message-scroller label="Short conversation" style="--tp-message-scroller-height:12rem;max-inline-size:40rem">
  <tp-message-scroller-item message-id="hello"><tp-message author="Sam"><tp-bubble>Ready to review?</tp-bubble></tp-message></tp-message-scroller-item>
  <tp-message-scroller-item message-id="answer"><tp-message author="Alex"><tp-bubble>Yes, let’s begin.</tp-bubble></tp-message></tp-message-scroller-item>
</tp-message-scroller>`,
    'Direct Items remain supported. Root supplies the same public Viewport, Content and Return control used by explicit composition.',
  ),
];
