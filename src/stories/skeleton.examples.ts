import { html } from 'lit';
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
