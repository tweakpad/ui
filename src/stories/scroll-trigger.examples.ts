import { markupExample } from './documentation-examples.js';

const photo = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?w=${width}&q=75&auto=format&fit=crop`;
const widths = (id: string) =>
  [480, 800, 1200].map((width) => `${photo(id, width)} ${width}w`).join(', ');
const rooms = [
  'photo-1497366754035-f200968a6e72',
  'photo-1497215728101-856f4ea42174',
  'photo-1548516173-3cabfa4607e9',
];

/**
 * Static Skeleton bars that stand in for surrounding page content, so the demo shows only the
 * subject: `sizes` are inline sizes; `block` adds a taller block such as an image.
 */
const placeholder = (sizes: readonly string[], style = '') =>
  `<div style="display: grid; gap: var(--tp-space-3); padding-block: var(--tp-space-6);${style}">
${sizes
  .map((size) =>
    size === 'block'
      ? '  <tp-skeleton motion="none" style="block-size: 6rem"></tp-skeleton>'
      : `  <tp-skeleton motion="none" style="block-size: 0.75rem; inline-size: ${size}"></tp-skeleton>`,
  )
  .join('\n')}
</div>`;

export const scrollTriggerDefaultSource = `<tp-scroll-trigger stagger="200">
  <h3 style="margin: 0 0 var(--tp-space-3); font-size: 2rem; line-height: 1.1">
    <tp-text-motion split="words lines" mask="lines" reveal="up">Quiet spaces, open light</tp-text-motion>
  </h3>
  <tp-image-group reveal="fade up" stagger="120">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--tp-space-3)">
${rooms
  .map(
    (id) =>
      `      <tp-image ratio="1" src="${photo(id, 800)}" srcset="${widths(id)}" sizes="(min-width: 48rem) 15rem, 33vw" alt=""></tp-image>`,
  )
  .join('\n')}
    </div>
  </tp-image-group>
  <p style="margin: var(--tp-space-3) 0 0; color: var(--tp-muted-foreground)">
    <tp-text-motion reveal="fade">Three rooms designed for focused work.</tp-text-motion>
  </p>
</tp-scroll-trigger>`;

export const scrollTriggerExamples = [
  markupExample(
    'Pinned scene revealed by the scroll',
    `${placeholder(['40%', '90%', '75%', 'block', '85%', '60%'], ' min-block-size: 100cqb; align-content: start; box-sizing: border-box')}
<tp-scroll-trigger scrub pin stagger="250" style="--tp-scroll-trigger-pin-length: 150cqb">
  <div style="block-size: 100%; display: grid; align-content: center; gap: var(--tp-space-4)">
    <h3 style="margin: 0; font-size: 1.75rem; line-height: 1.15">
      <tp-text-motion split="words" mask="words" reveal="up" stagger="80">Quiet spaces reveal as you scroll</tp-text-motion>
    </h3>
    <tp-image-group reveal="fade up" stagger="120">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--tp-space-3)">
${rooms
  .map(
    (id) =>
      `        <tp-image ratio="1.333" style="border-radius: var(--tp-radius-md)" src="${photo(id, 640)}" srcset="${widths(id)}" sizes="12rem" alt=""></tp-image>`,
  )
  .join('\n')}
      </div>
    </tp-image-group>
    <p style="margin: 0; color: var(--tp-muted-foreground)">
      <tp-text-motion split="words" reveal="fade" stagger="40">Three rooms designed for focused work.</tp-text-motion>
    </p>
  </div>
</tp-scroll-trigger>
${placeholder(['85%', '60%', 'block', '90%', '70%'], ' min-block-size: 100cqb; align-content: start; box-sizing: border-box')}`,
    'The example scrolls inside its own frame, a size container (`container-type: size`): the pinned stage fills it while the scroll advances through 150% of its height, and the scroll position plays the same choreography a timed reveal would. The words rise behind their masks, then the images, then the caption, and scrolling back plays it in reverse. Skeleton bars stand in for the surrounding content.',
    { viewport: '26rem' },
  ),
  markupExample(
    'Unpinned band scrubbed through its pass',
    `${placeholder(['45%', '90%', '80%', 'block', '70%', '85%'], ' min-block-size: 100cqb; align-content: end; box-sizing: border-box')}
<tp-scroll-trigger scrub scrub-range="cover" scrub-smoothing="0.8" stagger="150" reveal="fade left">
  <p style="margin: 0; font-size: 1.5rem"><tp-text-motion>The first line slides in with the scroll,</tp-text-motion></p>
  <p style="margin: 0; font-size: 1.5rem"><tp-text-motion>then the second,</tp-text-motion></p>
  <p style="margin: 0; font-size: 1.5rem"><tp-text-motion>and back out as you scroll up.</tp-text-motion></p>
</tp-scroll-trigger>
${placeholder(['80%', '60%', 'block', '90%', '50%'], ' min-block-size: 100cqb; align-content: start; box-sizing: border-box')}`,
    'An unpinned band scrubbed across its whole pass through the example’s scroll (`scrub-range="cover"`): the lines follow the scroll both ways, and `scrub-smoothing` makes them trail it slightly. Add `scrub-once` to keep revealed lines at rest when scrolling back.',
    { viewport: '20rem' },
  ),
  markupExample(
    'Custom scroll offsets',
    `${placeholder(['45%', '90%', '80%', 'block', '70%', '85%'], ' min-block-size: 100cqb; align-content: end; box-sizing: border-box')}
<tp-scroll-trigger scrub scrub-range="entry 25% contain 40%" stagger="200">
  <h3 style="margin: 0 0 var(--tp-space-3); font-size: 1.5rem; line-height: 1.15">
    <tp-text-motion split="words" mask="words" reveal="up" stagger="60">Settled before the middle</tp-text-motion>
  </h3>
  <tp-image-group reveal="fade up" stagger="120">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--tp-space-3)">
${rooms
  .map(
    (id) =>
      `      <tp-image ratio="1.5" style="border-radius: var(--tp-radius-md)" src="${photo(id, 480)}" srcset="${widths(id)}" sizes="10rem" alt=""></tp-image>`,
  )
  .join('\n')}
    </div>
  </tp-image-group>
</tp-scroll-trigger>
${placeholder(['80%', '60%', 'block', '90%', '50%'], ' min-block-size: 100cqb; align-content: start; box-sizing: border-box')}`,
    'An advanced range with offsets, as in CSS `animation-range`: `scrub-range="entry 25% contain 40%"` starts once a quarter of the section has entered and finishes 40% of the way through `contain`, so the reveal is complete before the section reaches the middle of the frame and stays at rest while it is read.',
    { viewport: '22rem' },
  ),
  markupExample(
    'Features from the center',
    `<tp-scroll-trigger stagger="120" stagger-from="center" reveal="fade up" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: var(--tp-space-4)">
${['Calm', 'Light', 'Focus', 'Space', 'Rest']
  .map(
    (word) =>
      `  <p style="margin: 0; font-size: 1.25rem; font-weight: 600"><tp-text-motion split="chars" stagger="20">${word}</tp-text-motion></p>`,
  )
  .join('\n')}
</tp-scroll-trigger>`,
    'Five texts reveal from the middle one outward, 120ms apart. Each takes the trigger’s default effect and plays its own character stagger after the delay it receives.',
  ),
];
