import { html } from 'lit';
import type { PartRenderContext } from '../foundation/part.js';

const groupStyle =
  'display:grid;gap:var(--tp-space-8);max-inline-size:calc(var(--tp-spacing) * 140)';
const buttonBody = {
  'bubble-content': {
    renderDelegate: ({ bind, content }: PartRenderContext) =>
      html`<button type="button" ${bind}>${content}</button>`,
  },
};
const linkBody = {
  'bubble-content': {
    renderDelegate: ({ bind, content }: PartRenderContext) =>
      html`<a href="#bubble-details" ${bind}>${content}</a>`,
  },
};
export const bubbleExamples = [
  {
    title: 'Treatments',
    code: `<tp-bubble variant="default">Primary message</tp-bubble>
<tp-bubble variant="secondary">Secondary message</tp-bubble>
<tp-bubble variant="subdued">Subdued message</tp-bubble>
<tp-bubble variant="tinted">Tinted message</tp-bubble>
<tp-bubble variant="outline">Outlined message</tp-bubble>
<tp-bubble variant="ghost">Unframed message</tp-bubble>
<tp-bubble variant="destructive">Something went wrong.</tp-bubble>`,
    render: () =>
      html`<div style=${groupStyle}>
        ${['default', 'secondary', 'subdued', 'tinted', 'outline', 'ghost', 'destructive'].map((variant) => html`<tp-bubble .variant=${variant}>${variant === 'destructive' ? 'Something went wrong. Please try again.' : `${variant} message treatment`}</tp-bubble>`)}
      </div>`,
  },
  {
    title: 'Content sizes',
    description:
      'Short and wrapping bodies size to their content; sizing comes from typography and layout, not a separate Bubble size API.',
    code: `<tp-bubble>Yes.</tp-bubble>
<tp-bubble>This longer message wraps naturally within the available space.</tp-bubble>`,
    render: () =>
      html`<div style=${groupStyle}>
        <tp-bubble>Yes.</tp-bubble
        ><tp-bubble
          >The review is complete. The longer message wraps naturally and keeps the same shared
          padding and typography as the short message.</tp-bubble
        >
      </div>`,
  },
  {
    title: 'Grouped messages',
    code: `<tp-bubble-group>
  <tp-bubble>I finished the review.</tp-bubble>
  <tp-bubble>There is one remaining question.</tp-bubble>
  <tp-bubble align="end" variant="tinted">Send it over.</tp-bubble>
</tp-bubble-group>`,
    render: () =>
      html`<tp-bubble-group style="max-inline-size:calc(var(--tp-spacing) * 140)"
        ><tp-bubble>I finished the review.</tp-bubble
        ><tp-bubble>There is one remaining question.</tp-bubble
        ><tp-bubble align="end" variant="tinted">Send it over.</tp-bubble
        ><tp-bubble align="end" variant="tinted">I can take a look now.</tp-bubble></tp-bubble-group
      >`,
  },
  {
    title: 'Expandable content',
    description: 'The existing Collapsible owns disclosure state and keyboard behavior.',
    code: `<tp-bubble variant="subdued">
  The review found two focus states to improve.
  <tp-collapsible><span slot="label">Read the full review</span>
    The menu, dialog and drawer were reviewed in both themes.
  </tp-collapsible>
</tp-bubble>`,
    render: () =>
      html`<div style=${groupStyle}>
        <tp-bubble variant="subdued"
          >The review found two focus states to improve.<tp-collapsible
            ><span slot="label">Read the full review</span>The menu, dialog and drawer were reviewed
            in both themes. Shared theme rules keep their focus indicators
            consistent.</tp-collapsible
          ></tp-bubble
        ><tp-bubble variant="ghost">Unframed content can fill the conversation width.</tp-bubble>
      </div>`,
  },
  {
    title: 'Reaction placement',
    code: `<tp-bubble reaction-side="block-start" reactions-align="start">
  Ready for review.<span slot="reactions">👍 2</span>
</tp-bubble>`,
    render: () =>
      html`<div style="display:grid;gap:var(--tp-space-12);padding-block:var(--tp-space-4)">
        ${(['block-start', 'block-end'] as const).flatMap((side) => (['start', 'end'] as const).map((align) => html`<tp-bubble .reactionSide=${side} .reactionsAlign=${align}>Ready for review.<span slot="reactions" aria-label="2 likes">👍 2</span></tp-bubble>`))}
      </div>`,
  },
  {
    title: 'Interactive reactions',
    description: 'Application-owned reaction state updates the existing named Button.',
    code: `<tp-bubble>Ready for review.
  <tp-button slot="reactions" size="xs" variant="secondary" aria-label="Like this message" aria-pressed="false">👍 2</tp-button>
</tp-bubble>
<script>
  const reaction = document.querySelector('tp-button');
  reaction.addEventListener('click', () => {
    const liked = reaction.getAttribute('aria-pressed') !== 'true';
    reaction.setAttribute('aria-pressed', String(liked));
    reaction.textContent = liked ? '👍 3' : '👍 2';
  });
</script>`,
    render: () =>
      html`<div style="padding-block-end:var(--tp-space-8)">
        <tp-bubble
          >Ready for review.<tp-button
            slot="reactions"
            size="xs"
            variant="secondary"
            aria-label="Like this message"
            aria-pressed="false"
            @click=${(e: Event) => {
              const b = e.currentTarget as HTMLElement;
              const liked = b.getAttribute('aria-pressed') !== 'true';
              b.setAttribute('aria-pressed', String(liked));
              b.textContent = liked ? '👍 3' : '👍 2';
            }}
            >👍 2</tp-button
          ></tp-bubble
        >
      </div>`,
  },
  {
    title: 'Sender alignment',
    code: `<tp-bubble>Can you share the update?</tp-bubble>
<tp-bubble align="end" variant="tinted">The update is ready.</tp-bubble>`,
    render: () =>
      html`<div style=${groupStyle}>
        <tp-bubble>Can you share the update?</tp-bubble
        ><tp-bubble align="end" variant="tinted">The update is ready.</tp-bubble>
      </div>`,
  },
  {
    title: 'Buttons and links',
    description:
      'The content render contract preserves the reference’s native link and button semantics. Bubble keeps the appearance; the application handles the action.',
    language: 'javascript',
    code: `import { html } from 'lit';
bubble.partContracts = {
  'bubble-content': {
    renderDelegate: ({ bind, content }) => html\`<button type="button" \${bind}>\${content}</button>\`,
  },
};`,
    render: () =>
      html`<div style=${groupStyle}>
        <tp-bubble .partContracts=${linkBody}>Open message details</tp-bubble
        ><tp-bubble
          variant="outline"
          .partContracts=${buttonBody}
          @click=${(e: Event) => {
            const b = e.currentTarget as HTMLElement;
            b.textContent = 'Suggestion selected.';
          }}
          >Summarize the changes</tp-bubble
        >
        <p id="bubble-details">Message details</p>
      </div>`,
  },
];
