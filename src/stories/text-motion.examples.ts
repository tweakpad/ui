import { markupExample } from './documentation-examples.js';

export const textMotionDefaults = {
  text: 'Quiet spaces, open light, and rooms that breathe',
};

export const textMotionDefaultSource = `<h2>
  <tp-text-motion split="words lines" mask="lines" reveal="up">
    ${textMotionDefaults.text}
  </tp-text-motion>
</h2>`;

export const textMotionExamples = [
  markupExample(
    'Characters from the center',
    `<p style="margin: 0; font-size: 2.5rem; font-weight: 600; letter-spacing: -0.02em">
  <tp-text-motion split="chars" reveal="fade blur" stagger="25" stagger-from="center">Open light</tp-text-motion>
</p>`,
    'Characters fade in from a soft blur, starting in the middle of the phrase and spreading outward. Kerning is switched off from the first frame, so the text never re-wraps when it splits.',
  ),
  markupExample(
    'Words behind a mask',
    `<p style="margin: 0; font-size: 2rem; line-height: 1.1; font-weight: 600">
  <tp-text-motion split="words" mask="words" reveal="up" stagger="60">Gently jumping quaintly by</tp-text-motion>
</p>`,
    'Each word rises from behind its own clip. The mask extends a little over ascenders and descenders, so tight line heights never cut a glyph.',
  ),
  markupExample(
    'Rich text with a link',
    `<p style="margin: 0; max-inline-size: 32rem; font-size: 1.125rem; line-height: 1.6">
  <tp-text-motion split="words lines" reveal="fade up" stagger="15">Read the <a href="#">documentation for every component</a> and <em>its configurable options</em> before you ship, <code>tp-text-motion</code> included.</tp-text-motion>
</p>`,
    'Formatting is kept around the pieces and the link stays the original element, wrapping like ordinary text. Screen readers read the sentence once, with the link and its full name.',
  ),
  markupExample(
    'Every time it enters',
    `<p style="margin: 0; font-size: 2rem; font-weight: 600">
  <tp-text-motion split="words" reveal="fade zoom-in" stagger="80" reveal-repeat>Every time it enters</tp-text-motion>
</p>`,
    'With `reveal-repeat`, the words return to their start state once the text has left the viewport and reveal again when it comes back.',
  ),
];
