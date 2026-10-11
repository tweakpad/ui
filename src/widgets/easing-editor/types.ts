import type { EasingCurve, EasingKind, EasingPoint } from '../../foundation/easing/types.js';

export type EasingEditorLayout = 'extended' | 'compact';
export type EasingEditorSize = 'sm' | 'default' | 'lg';
/** The two categories of the header Tabs: springs, and every other kind as an ease. */
export type EasingCategory = 'ease' | 'spring';
export const EASING_CATEGORIES: readonly EasingCategory[] = ['ease', 'spring'];
/** What the background preview square animates; `none` hides the preview. */
export type EasingPreviewMode = 'none' | 'scale' | 'scale-x' | 'scale-y' | 'rotation';
export const EASING_PREVIEW_MODES: readonly EasingPreviewMode[] = [
  'none',
  'scale',
  'scale-x',
  'scale-y',
  'rotation',
];
/** The modes the header Button cycles through on each press. */
export const EASING_PREVIEW_CYCLE: readonly EasingPreviewMode[] = [
  'scale',
  'scale-x',
  'scale-y',
  'rotation',
];
export type EasingEditorSurface =
  'graph' | 'slider' | 'field' | 'preset' | 'tabs' | 'point' | 'expression';

/** One preset of the picker: a name and a canonical easing string. */
export interface EasingPreset {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}
export interface EasingPresetGroup {
  readonly id: string;
  readonly label: string;
  readonly presets: readonly EasingPreset[];
}

/** What an adapter receives beside the record. */
export interface EasingAdapterContext {
  /** The duration lane in seconds, or null when the editor shows no time control. */
  readonly duration: number | null;
  /** The CSS timing function of the record (`linear()` samples for non-CSS kinds). */
  readonly css: string;
  /** Evenly spaced samples of the progression. */
  readonly samples: (count: number) => readonly EasingPoint[];
}
/** A serializer offered by the export Select; `css` is built in. */
export interface EasingAdapter {
  readonly id: string;
  readonly label: string;
  format(curve: EasingCurve, context: EasingAdapterContext): string;
}

/** Metadata of a `tp-value-change` / `tp-value-commit` detail. */
export interface EasingEditorChangeMetadata extends Record<string, unknown> {
  readonly curve: EasingCurve | null;
  readonly kind: EasingKind | null;
  readonly surface?: EasingEditorSurface;
  readonly parameter?: string;
  readonly handle?: number;
  readonly point?: number;
  readonly presetId?: string;
  readonly conversion?: boolean;
}

/** Localizable names; every key is optional in the `strings` property. */
export interface EasingEditorStrings {
  readonly label: string;
  readonly graph: string;
  readonly categories: string;
  readonly kindEase: string;
  readonly kindSpring: string;
  readonly kindCustom: string;
  readonly time: string;
  readonly progression: string;
  readonly controlPoint: string;
  readonly point: string;
  readonly addPoint: string;
  readonly removePoint: string;
  readonly x1: string;
  readonly y1: string;
  readonly x2: string;
  readonly y2: string;
  readonly mass: string;
  readonly stiffness: string;
  readonly damping: string;
  readonly velocity: string;
  readonly settle: string;
  readonly exponent: string;
  readonly overshoot: string;
  readonly amplitude: string;
  readonly period: string;
  readonly count: string;
  readonly familySine: string;
  readonly familyPower: string;
  readonly familyExpo: string;
  readonly familyCirc: string;
  readonly familyBack: string;
  readonly familyElastic: string;
  readonly familyBounce: string;
  readonly familySteps: string;
  readonly directionIn: string;
  readonly directionOut: string;
  readonly directionInOut: string;
  readonly directionOutIn: string;
  readonly duration: string;
  readonly seconds: string;
  readonly presets: string;
  readonly showPresets: string;
  readonly play: string;
  readonly preview: string;
  readonly previewMode: string;
  readonly previewScale: string;
  readonly previewScaleX: string;
  readonly previewScaleY: string;
  readonly previewRotation: string;
  readonly frames: string;
  readonly export: string;
  readonly expression: string;
  readonly copy: string;
  readonly empty: string;
  readonly valueMissing: string;
  readonly presetBasic: string;
  readonly presetSpring: string;
  readonly presetLinear: string;
  readonly presetEase: string;
  readonly presetEaseIn: string;
  readonly presetEaseOut: string;
  readonly presetEaseInOut: string;
  readonly presetSteps: string;
  readonly presetSpringDefault: string;
  readonly presetSpringSnappy: string;
  readonly presetSpringBouncy: string;
  readonly presetSpringStrong: string;
}

export type { EasingCurve, EasingKind, EasingPoint };
