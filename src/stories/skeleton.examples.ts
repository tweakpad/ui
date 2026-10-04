import { html } from 'lit';
import { markupExample } from './documentation-examples.js';
export interface SkeletonArgs {
  motion: 'pulse' | 'sweep' | 'none';
  animated: boolean;
  motionPolicy: 'inherit' | 'normal' | 'reduce';
}
const defaults: SkeletonArgs = { motion: 'pulse', animated: true, motionPolicy: 'inherit' };
export function skeletonProfile(args: SkeletonArgs = defaults) {
  return html`<div
    aria-busy="true"
    aria-label="Loading profile"
    style="display:flex;align-items:center;gap:var(--tp-space-4)"
  >
    <tp-skeleton
      .motion=${args.motion}
      .animated=${args.animated}
      .motionPolicy=${args.motionPolicy}
      style="inline-size:var(--tp-space-10);block-size:var(--tp-space-10);border-radius:var(--tp-radius-full);flex:none"
    ></tp-skeleton>
    <div style="display:grid;gap:var(--tp-space-2)">
      <tp-skeleton
        .motion=${args.motion}
        .animated=${args.animated}
        .motionPolicy=${args.motionPolicy}
        style="inline-size:calc(var(--tp-spacing) * 38);block-size:var(--tp-space-4)"
      ></tp-skeleton>
      <tp-skeleton
        .motion=${args.motion}
        .animated=${args.animated}
        .motionPolicy=${args.motionPolicy}
        style="inline-size:calc(var(--tp-spacing) * 25);block-size:var(--tp-space-4)"
      ></tp-skeleton>
    </div>
  </div>`;
}
export const skeletonSource = `<div aria-busy="true" aria-label="Loading profile" style="display:flex;align-items:center;gap:var(--tp-space-4)">
  <tp-skeleton style="inline-size:var(--tp-space-10);block-size:var(--tp-space-10);border-radius:var(--tp-radius-full);flex:none"></tp-skeleton>
  <div style="display:grid;gap:var(--tp-space-2)">
    <tp-skeleton style="inline-size:calc(var(--tp-spacing) * 38);block-size:var(--tp-space-4)"></tp-skeleton>
    <tp-skeleton style="inline-size:calc(var(--tp-spacing) * 25);block-size:var(--tp-space-4)"></tp-skeleton>
  </div>
</div>`;
const line = (width: string) =>
  `<tp-skeleton style="inline-size:${width};block-size:var(--tp-space-4)"></tp-skeleton>`;
const field = (width: number) => `<div style="display:grid;gap:var(--tp-space-3)">
  ${line(`calc(var(--tp-spacing) * ${width})`)}
  <tp-skeleton style="block-size:var(--tp-control-height-md)"></tp-skeleton>
</div>`;
const row = `<div style="display:flex;gap:var(--tp-space-4)">
  <tp-skeleton style="flex:1;block-size:var(--tp-space-4)"></tp-skeleton>
  ${line('calc(var(--tp-spacing) * 24)')}
  ${line('calc(var(--tp-spacing) * 20)')}
</div>`;
export const skeletonExamples = [
  markupExample(
    'Media preview',
    `<div aria-busy="true" style="display:grid;gap:var(--tp-space-3);max-inline-size:calc(var(--tp-spacing) * 64)">
  <tp-aspect-ratio ratio="2" style="border-radius:var(--tp-radius-xl)">
    <tp-skeleton style="border-radius:inherit"></tp-skeleton>
  </tp-aspect-ratio>
  <div style="display:grid;gap:var(--tp-space-2)">
    ${line('100%')}
    ${line('80%')}
  </div>
</div>`,
    'Reserve a two-to-one media region and its captions while content loads.',
  ),
  markupExample(
    'Card',
    `<tp-card aria-busy="true" style="max-inline-size:calc(var(--tp-spacing) * 80)">
  <div slot="header" style="display:grid;gap:var(--tp-space-2)">
    ${line('66%')}
    ${line('50%')}
  </div>
  <tp-skeleton style="aspect-ratio:1;inline-size:100%"></tp-skeleton>
</tp-card>`,
  ),
  markupExample(
    'Text',
    `<div aria-busy="true" style="display:grid;gap:var(--tp-space-2);max-inline-size:calc(var(--tp-spacing) * 100)">
  ${line('100%')}
  ${line('100%')}
  ${line('75%')}
</div>`,
  ),
  markupExample(
    'Form',
    `<div aria-busy="true" style="display:grid;gap:calc(var(--tp-spacing) * 7);max-inline-size:calc(var(--tp-spacing) * 100)">
  ${field(20)}
  ${field(24)}
  <tp-skeleton style="inline-size:calc(var(--tp-spacing) * 24);block-size:var(--tp-control-height-md)"></tp-skeleton>
</div>`,
    'Reserve the labels, inputs and submit action while form data loads.',
  ),
  markupExample(
    'Table',
    `<div aria-busy="true" style="display:grid;gap:var(--tp-space-2);max-inline-size:calc(var(--tp-spacing) * 120)">
  ${[row, row, row].join('\n  ')}
</div>`,
    'Reserve repeated row geometry without exposing fake data or focusable controls.',
  ),
];
