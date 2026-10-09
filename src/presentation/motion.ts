import { unsafeCSS } from 'lit';
import { serializeDeclarations } from './resolver.js';
import type { PresentationDeclarations } from './resolver.js';

export function motionDuration(timing: 'fast' | 'normal' = 'normal', factor = '1') {
  return `calc(var(--tp-duration-${timing}) * var(--tp-motion-scale) * ${factor})`;
}

/** One timing policy for finite motion; state/lifecycle remain with Foundation. */
export function motionTransition(
  properties: readonly string[],
  timing: 'fast' | 'normal' = 'normal',
) {
  return properties
    .map((property) => `${property} ${motionDuration(timing)} var(--tp-easing-standard)`)
    .join(', ');
}

export function transitionCss(properties: readonly string[], timing: 'fast' | 'normal' = 'normal') {
  return unsafeCSS(motionTransition(properties, timing));
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
export function ambientAnimation(
  name: string,
  kind: 'continuous' | 'placeholder' = 'continuous',
  easing = 'linear',
) {
  return `${name} calc(var(--tp-duration-normal) * ${kind === 'placeholder' ? 8 : 4}) ${easing} infinite`;
}

export function ambientCss(
  name: string,
  kind: 'continuous' | 'placeholder' = 'continuous',
  easing = 'linear',
) {
  return unsafeCSS(ambientAnimation(name, kind, easing));
}

/**
 * Structure of a measured disclosure region (Collapsible content, Tree view groups): the
 * block size follows the measured extent while open and collapses to zero otherwise.
 */
export function disclosurePanelStyles(panel: string, blockExtent = '--collapsible-panel-height') {
  return unsafeCSS(
    `${panel}{overflow:clip;block-size:0;transition:${motionTransition(['block-size'])}}` +
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
