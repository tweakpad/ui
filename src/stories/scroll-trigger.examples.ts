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
