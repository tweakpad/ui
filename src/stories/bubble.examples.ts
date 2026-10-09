import { markupExample, moduleExample } from './documentation-examples.js';
import { setupBubbleExample } from './bubble-example.js';
import setupSource from './bubble-example.js?raw';

const groupStyle =
  'display:grid;gap:var(--tp-space-8);max-inline-size:calc(var(--tp-spacing) * 140);min-inline-size:0';
const wrap = (markup: string) => `<div style="${groupStyle}">${markup}</div>`;
function interactive(title: string, id: string, markup: string, description: string) {
  return moduleExample({
    title,
    id,
    markup: `${markup}<tp-toast></tp-toast>`,
    description,
    wrapperStyle: `${groupStyle};padding-block-end:var(--tp-space-6)`,
    setup: setupBubbleExample,
    source: setupSource,
    call: `setupBubbleExample(document.getElementById('${id}'));`,
  });
}
const longMessage =
  'A longer message wraps across lines so the logical alignment and reaction offset are easier to inspect.';
const reaction = (
  side: string,
  align: string,
  body: string,
  emoji: string,
  name: string,
  sender = 'start',
  variant = 'secondary',
) =>
  `<tp-bubble variant="${variant}" align="${sender}" reaction-side="${side}" reactions-align="${align}">${body}<span slot="reactions" role="img" aria-label="${name}">${emoji}</span></tp-bubble>`;
export const bubbleExamples = [
  markupExample(
    'Treatments',
    wrap(
      ['default', 'secondary', 'subdued', 'tinted', 'outline', 'ghost', 'destructive']
        .map(
          (variant) =>
            `<tp-bubble variant="${variant}">${variant === 'destructive' ? 'Something went wrong. Please try again.' : `${variant} message treatment`}</tp-bubble>`,
        )
        .join('\n'),
    ),
  ),
  markupExample(
    'Content sizes',
    wrap(`<tp-bubble variant="default">This is a one line bubble.</tp-bubble>
<tp-bubble variant="default">This longer message wraps naturally within the available space and retains the shared padding and typography.</tp-bubble>
<tp-bubble variant="default">
  <p>This bubble has multiple paragraphs.</p>
  <p>Each paragraph wraps within the same message body, including at narrow conversation widths.</p>
  <p>Here is some more text to show how it wraps.</p>
</tp-bubble>`),
    'Short, wrapping and multiparagraph bodies use content layout, without a separate size API.',
  ),
  markupExample(
    'Grouped messages',
    wrap(`<tp-bubble-group>
  <tp-bubble>I finished the review.</tp-bubble>
  <tp-bubble>The registry output looks clean, but I found one stale route.</tp-bubble>
  <tp-bubble>Want me to remove it now?</tp-bubble>
</tp-bubble-group>
<tp-bubble-group>
  <tp-bubble align="end" variant="tinted">Yes, clean that up.</tp-bubble>
  <tp-bubble align="end" variant="tinted">Then rerun the registry build.</tp-bubble>
</tp-bubble-group>`),
  ),
  interactive(
    'Expandable content',
    'bubble-disclosure-example',
    `<tp-collapsible>The accessibility review found two focus states that were visually too subtle in dark mode.

I checked the dialog, menu, and drawer paths because each one renders focusable controls inside a layered surface.

The dialog and drawer are fine. The menu needs the hover and focus tokens split so keyboard focus stays visible when the pointer is not involved.

Keep the change in the shared style owner so themes can choose their own focus treatment.</tp-collapsible>
<tp-bubble variant="ghost">
  <p>Ghost bubbles work for assistant text and other content that should not be framed.</p>
  <p>They can take the full width of the conversation.</p>
  <p>Use this for content that needs the whole row.</p>
</tp-bubble>`,
    'Collapsible owns expansion and panel presence. Its public parts compose the existing Bubble and Button; preview text is replaced by the full body.',
  ),
  markupExample(
    'Reaction placement',
    `<div style="${groupStyle};gap:var(--tp-space-12);padding-block:var(--tp-space-4)">
<tp-marker variant="separator">Block end · inline end</tp-marker>
${reaction('block-end', 'end', 'This is a one line message.', '👍', 'Reaction: thumbs up', 'start', 'default')}
${reaction('block-end', 'start', longMessage, '👍 😮', 'Reactions: thumbs up and surprised', 'end')}
${reaction('block-end', 'end', longMessage, '👍 😮 🔥 👀 +8', 'Reactions: thumbs up, surprised, fire, eyes, and 8 more', 'start', 'tinted')}
<tp-marker variant="separator">Block end · inline start</tp-marker>
${reaction('block-end', 'start', 'This is a one line message.', '🔥', 'Reaction: fire')}
${reaction('block-end', 'start', longMessage, '👍 😮 🔥 👀', 'Reactions: thumbs up, surprised, fire and eyes')}
<tp-marker variant="separator">Block start · inline start</tp-marker>
${reaction('block-start', 'start', 'This is a one line message.', '🔥', 'Reaction: fire')}
${reaction('block-start', 'start', longMessage, '👍 😮 🔥 👀', 'Reactions: thumbs up, surprised, fire and eyes')}
<tp-marker variant="separator">Block start · inline end</tp-marker>
${reaction('block-start', 'end', 'This is a one line message.', '👍', 'Reaction: thumbs up', 'start', 'subdued')}
${reaction('block-start', 'end', longMessage, '👍 😮 🔥 👀', 'Reactions: thumbs up, surprised, fire and eyes', 'start', 'subdued')}
</div>`,
  ),
  interactive(
    'Interactive reactions',
    'bubble-reactions-example',
    `<tp-bubble variant="default">This is a one line message.
  <tp-button slot="reactions" size="xs" variant="outline" data-feedback="Reaction button activated.">React</tp-button>
</tp-bubble>
<tp-bubble variant="default" align="end" reactions-align="start">This is a one line message.
  <tp-button slot="reactions" size="icon-xs" variant="ghost" aria-label="Celebrate this message" data-feedback="Confetti!"><span slot="icon-start" aria-hidden="true">🎉</span></tp-button>
</tp-bubble>
<tp-bubble variant="tinted">We are going to the movies first, then dinner. Are you in?
  <tp-button slot="reactions" size="icon-xs" variant="secondary" aria-label="Agree" data-feedback="You agree!"><tp-icon slot="icon-start" data-reaction="agree"></tp-icon></tp-button>
  <tp-button slot="reactions" size="icon-xs" variant="secondary" aria-label="Disagree" data-feedback="You disagree!"><tp-icon slot="icon-start" data-reaction="disagree"></tp-icon></tp-button>
</tp-bubble>`,
    'Named Buttons activate the shared Toast. The application owns reaction actions.',
  ),
  markupExample(
    'Sender alignment',
    wrap(`<tp-bubble variant="subdued">This bubble is aligned to the start.</tp-bubble>
<tp-bubble align="end" variant="default">This bubble is aligned to the end.</tp-bubble>
<tp-bubble variant="subdued">This multiline bubble is aligned to the start. Longer content wraps within the same conversation width.</tp-bubble>
<tp-bubble align="end" variant="default">This multiline bubble is aligned to the end. Its logical alignment follows writing direction.</tp-bubble>`),
  ),
  interactive(
    'Buttons and links',
    'bubble-actions-example',
    `<tp-bubble variant="default" data-body="link">Open message details</tp-bubble>
<tp-bubble data-body="button" data-feedback="Message action activated.">This bubble is a button you can click.</tp-bubble>
<tp-bubble variant="subdued" data-body="button" data-feedback="Long message action activated.">Native button bodies also support longer messages that wrap across multiple lines.</tp-bubble>
<tp-marker variant="separator">Chat suggestions</tp-marker>
<tp-bubble variant="default">How can I help you today?</tp-bubble>
<tp-bubble-group>
  <tp-bubble variant="outline" align="end" data-body="button" data-reply data-feedback="I need help with my account.">I need help with my account.</tp-bubble>
  <tp-bubble variant="outline" align="end" data-body="button" data-reply data-feedback="I forgot my password.">I forgot my password.</tp-bubble>
  <tp-bubble variant="outline" align="end" data-body="button" data-reply data-feedback="I have another question.">I have another question. I'd like to talk to a human. Can you help me?</tp-bubble>
</tp-bubble-group>
<p id="bubble-details" style="margin:0">Message details</p>`,
    'The public content render contract supplies native links and buttons. Quick replies use public part styling and Toast feedback.',
  ),
];
