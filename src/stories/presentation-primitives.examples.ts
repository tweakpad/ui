import { html } from 'lit';

export interface BubbleArgs {
  variant: 'default' | 'secondary' | 'subdued' | 'tinted' | 'outline' | 'ghost' | 'destructive';
  align: 'start' | 'end';
  reactionSide: 'block-start' | 'block-end';
  reactionsAlign: 'start' | 'end';
  label: string;
}
export const bubbleDefaults: BubbleArgs = {
  variant: 'secondary',
  align: 'end',
  reactionSide: 'block-end',
  reactionsAlign: 'end',
  label: 'Reply',
};
export function renderBubbleExample(args: BubbleArgs = bubbleDefaults) {
  return html`<tp-bubble-group>
    <tp-bubble label="Question">Can you send the updated design?</tp-bubble>
    <tp-bubble
      .variant=${args.variant}
      .align=${args.align}
      .reactionSide=${args.reactionSide}
      .reactionsAlign=${args.reactionsAlign}
      .label=${args.label}
    >
      The updated design is ready for review.
      <tp-button
        slot="reactions"
        size="xs"
        variant="secondary"
        aria-label="Like this message; 2 likes"
        >Like · 2</tp-button
      >
    </tp-bubble>
  </tp-bubble-group>`;
}
export interface EmptyStateArgs {
  title: string;
  description: string;
  mediaTreatment: 'plain' | 'icon';
}
export const emptyStateDefaults: EmptyStateArgs = {
  title: 'No results',
  description: 'Try a different query.',
  mediaTreatment: 'plain',
};
export function renderEmptyStateExample(args: EmptyStateArgs = emptyStateDefaults) {
  return html`<tp-empty-state
    .title=${args.title}
    .description=${args.description}
    .mediaTreatment=${args.mediaTreatment}
  >
    <tp-button slot="actions">Clear filters</tp-button>
  </tp-empty-state>`;
}
export interface AspectRatioArgs {
  ratio: number;
  fit: 'fill' | 'contain' | 'cover' | 'none';
}
export const aspectRatioDefaults: AspectRatioArgs = { ratio: 16 / 9, fit: 'cover' };
export function renderAspectRatioExample(args: AspectRatioArgs = aspectRatioDefaults) {
  return html`<tp-aspect-ratio .ratio=${args.ratio} .fit=${args.fit}>
    <div style="inline-size:100%;block-size:100%;background:var(--tp-muted)"></div>
  </tp-aspect-ratio>`;
}
