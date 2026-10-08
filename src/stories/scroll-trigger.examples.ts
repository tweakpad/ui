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
    `<p style="margin: 0; padding-block: var(--tp-space-6); color: var(--tp-muted-foreground)">Scroll this example. The next section pins while the scroll plays its reveal.</p>
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
      <tp-text-motion split="words" reveal="fade" stagger="40">Scrolling back up leaves everything at rest.</tp-text-motion>
    </p>
  </div>
</tp-scroll-trigger>
<p style="margin: 0; padding-block: var(--tp-space-6); color: var(--tp-muted-foreground)">The section unpins and the content continues.</p>`,
    'The example scrolls inside its own frame, which is a size container (`container-type: size`): the pinned stage fills it while the scroll advances through 150% of its height, and the scroll position plays the same choreography a timed reveal would. The words rise behind their masks, then the images, then the caption. Progress only moves forward, so scrolling back leaves the scene revealed; add `reveal-repeat` to make it follow the scroll both ways.',
    { viewport: '26rem' },
  ),
  markupExample(
    'Scrubbed in both directions',
    `<div style="min-block-size: 100cqb; display: grid; align-content: end; gap: var(--tp-space-3); padding-block: var(--tp-space-6); color: var(--tp-muted-foreground)">
  <p style="margin: 0">Scroll this example. The band below enters from the bottom edge and leaves at the top; its lines follow the scroll both ways.</p>
  <p style="margin: 0">Each room is planned around daylight first: deep windows on the long side, pale floors that carry the light inward, and storage kept low so nothing blocks the view.</p>
  <p style="margin: 0">Quiet zones sit at the far end of every floor, away from the stairs and the kitchen, so focused work never shares a wall with a meeting.</p>
  <p style="margin: 0">Acoustic panels line the ceilings of the open areas, and every desk is within a few steps of a window, a plant and a place to make a call.</p>
  <p style="margin: 0">Materials stay honest and few: oak, linen, lime plaster and steel, chosen to age well and to keep the rooms calm through the day.</p>
</div>
<tp-scroll-trigger scrub scrub-range="cover" reveal-repeat scrub-smoothing="0.8" stagger="150" reveal="fade left">
  <p style="margin: 0; font-size: 1.5rem"><tp-text-motion>The first line slides in with the scroll,</tp-text-motion></p>
  <p style="margin: 0; font-size: 1.5rem"><tp-text-motion>then the second,</tp-text-motion></p>
  <p style="margin: 0; font-size: 1.5rem"><tp-text-motion>and back out as you scroll up.</tp-text-motion></p>
</tp-scroll-trigger>
<div style="min-block-size: 100cqb; display: grid; align-content: start; gap: var(--tp-space-3); padding-block: var(--tp-space-6); color: var(--tp-muted-foreground)">
  <p style="margin: 0">Shared tables fill the middle of the plan, close enough to the windows for daylight and far enough from the quiet zones to keep conversations easy.</p>
  <p style="margin: 0">Meeting rooms are glazed on one side only, so they borrow light from the floor without putting their occupants on display.</p>
  <p style="margin: 0">Kitchens open onto terraces where the building steps back, giving every floor somewhere to step outside between tasks.</p>
  <p style="margin: 0">Wayfinding stays quiet too: a single accent colour per floor, repeated on doors and signs, instead of arrows on every wall.</p>
  <p style="margin: 0">The band has left the top edge by now. Scroll back up to watch the lines reverse.</p>
</div>`,
    'An unpinned band scrubbed across its whole pass through the example’s scroll (`scrub-range="cover"`). With `reveal-repeat` the lines follow the scroll both ways, and `scrub-smoothing` makes them trail it slightly.',
    { viewport: '20rem' },
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
