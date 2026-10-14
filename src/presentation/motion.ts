import { unsafeCSS } from 'lit';
import { serializeDeclarations } from './resolver.js';
import type { PresentationDeclarations, PresentationRule } from './resolver.js';
import type {
  MotionDurationRole as MotionDuration,
  MotionEasingRole as MotionEasing,
} from '../foundation/motion.js';

export function motionDuration(timing: MotionDuration = 'normal', factor = '1') {
  return `calc(var(--tp-duration-${timing}) * var(--tp-motion-scale) * ${factor})`;
}

export function motionEasing(easing: MotionEasing = 'standard') {
  return `var(--tp-easing-${easing})`;
}

/** One timing policy for finite motion; state/lifecycle remain with Foundation. */
export function motionTransition(
  properties: readonly string[],
  timing: MotionDuration = 'normal',
  easing: MotionEasing = 'standard',
) {
  return properties
    .map((property) => `${property} ${motionDuration(timing)} ${motionEasing(easing)}`)
    .join(', ');
}

export function transitionCss(
  properties: readonly string[],
  timing: MotionDuration = 'normal',
  easing: MotionEasing = 'standard',
) {
  return unsafeCSS(motionTransition(properties, timing, easing));
}

/**
 * Presence motion: the surface arrives on the enter curve and leaves on the exit curve. A
 * transition takes its timing from the style it moves to, so the ending style selects the
 * exit curve for the whole departure. Place the pair before any rule that suppresses motion.
 */
export function presenceMotion(
  properties: readonly string[],
  timing: MotionDuration = 'normal',
  ending = '&[data-ending-style]',
): readonly PresentationRule[] {
  return [
    { declarations: { transition: motionTransition(properties, timing, 'enter') } },
    { selector: ending, declarations: { 'transition-timing-function': motionEasing('exit') } },
  ];
}

/**
 * Structure for state fills: a layer between a control's own fill and its content whose
 * opacity fades. Presentation supplies the layer color and when it shows. Background-color
 * itself is never transitioned: Chrome runs that on the compositor and can repaint the
 * start color for one frame when the transition ends (CompositeBGColorAnimation).
 */
export const fillLayerHost: PresentationDeclarations = {
  position: 'relative',
  isolation: 'isolate',
};

export function fillLayer(inset = '0'): PresentationDeclarations {
  return {
    content: "''",
    position: 'absolute',
    inset,
    'z-index': '-1',
    'border-radius': 'inherit',
    'pointer-events': 'none',
    opacity: '0',
    transition: motionTransition(['opacity'], 'fast'),
  };
}

export function fillLayerStyles(control: string, inset = '0') {
  return unsafeCSS(
    `${control}{${serializeDeclarations(fillLayerHost)}}` +
      `${control}::before{${serializeDeclarations(fillLayer(inset))}}`,
  );
}

/** Shared activity cadence: continuous indicators and slower loading placeholders. */
export function ambientPeriod(kind: 'continuous' | 'placeholder' = 'continuous') {
  return `calc(var(--tp-duration-normal) * ${kind === 'placeholder' ? 8 : 4})`;
}

export function ambientAnimation(
  name: string,
  kind: 'continuous' | 'placeholder' = 'continuous',
  easing = 'linear',
) {
  return `${name} ${ambientPeriod(kind)} ${easing} infinite`;
}

export function ambientCss(
  name: string,
  kind: 'continuous' | 'placeholder' = 'continuous',
  easing = 'linear',
) {
  return unsafeCSS(ambientAnimation(name, kind, easing));
}

const shimmerPaint: PresentationDeclarations = {
  '--_tp-shimmer-spread': 'var(--tp-shimmer-spread,calc(3ch + var(--tp-spacing) * 10))',
  // Light schemes fade the text inside the band; dark schemes brighten it.
  '--_tp-shimmer-highlight':
    'var(--tp-shimmer-color,light-dark(' +
    'oklch(from currentcolor l c h / calc(alpha * 0.2)),' +
    'oklch(from currentcolor max(0.8, calc(l + 0.4)) c h / calc(alpha + 0.4))))',
  '--_tp-shimmer-from': '100%',
  '--_tp-shimmer-to': '0%',
  'background-image':
    'linear-gradient(calc(90deg + var(--tp-shimmer-angle,20deg)) in oklab,' +
    'currentcolor calc(50% - var(--_tp-shimmer-spread)),' +
    'var(--_tp-shimmer-highlight) 50%,' +
    'currentcolor calc(50% + var(--_tp-shimmer-spread)))',
  'background-repeat': 'no-repeat',
  'background-size': 'calc(200% + var(--_tp-shimmer-spread) * 2) 100%',
  'background-position': 'var(--_tp-shimmer-to) 0',
  'background-clip': 'text',
  '-webkit-text-fill-color': 'transparent',
  animation:
    `tp-shimmer var(--tp-shimmer-duration,${ambientPeriod('placeholder')}) linear ` +
    'var(--tp-shimmer-iterations,infinite) var(--tp-shimmer-direction,normal)',
  'animation-play-state': 'var(--tp-motion-play-state,running)',
};

/**
 * Shimmer on a text part: the text is painted in its own color through `background-clip: text`
 * while a highlight band derived from that color sweeps across it in the reading direction, at
 * the loading-placeholder cadence. The `--tp-shimmer-*` hooks inherit, so a container can tune
 * every shimmer inside it. Under the reduced-motion policy the text renders normally. A claimed
 * motion driver replaces only the sweep; the paint stays for it to move.
 */
export function shimmerStyles(text: string) {
  return unsafeCSS(
    `${text}{${serializeDeclarations(shimmerPaint)}}` +
      `${text}:dir(rtl){--_tp-shimmer-from:0%;--_tp-shimmer-to:100%}` +
      `${text}[data-tp-motion-driven]{animation:none !important}` +
      '@container style(--tp-motion-play-state: paused){' +
      `${text}{animation:none;background-image:none;-webkit-text-fill-color:currentcolor}}` +
      '@keyframes tp-shimmer{' +
      'from{background-position:var(--_tp-shimmer-from) 0}' +
      'to{background-position:var(--_tp-shimmer-to) 0}}',
  );
}

/**
 * Structure of a measured disclosure region (Collapsible content, Tree view groups): the
 * block size follows the measured extent while open and collapses to zero otherwise.
 */
export function disclosurePanelStyles(
  panel: string,
  blockExtent = '--collapsible-panel-height',
  /** Custom property holding the closed extent, for a region that stays partly shown. */
  collapsedExtent?: string,
) {
  const closed = collapsedExtent ? `var(${collapsedExtent},0px)` : '0';
  return unsafeCSS(
    `${panel}{overflow:clip;block-size:${closed};transition:${motionTransition(['block-size'])}}` +
      `${panel}[data-open]:not([data-starting-style]){block-size:var(${blockExtent})}` +
      `${panel}[data-tp-motion-driven~='disclosure']{transition:none !important}` +
      `${panel}[hidden]:not([hidden='until-found']){display:none !important}`,
  );
}

/** Structure of the default disclosure indicator; its rotation is set by Foundation. */
export function disclosureIndicatorStyles(indicator: string) {
  return unsafeCSS(
    `${indicator}{rotate:0deg;transition:${motionTransition(['rotate'])}}` +
      `${indicator}[data-tp-motion-driven~='indicator']{transition:none !important}`,
  );
}
