import type { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';

/**
 * What the editor shows or cuts, in image space: the frame (the crop region, or the whole
 * viewport without a crop) in natural pixels of the image rotated by `rotation`, measured from the
 * top-left corner of the rotated image's bounding box. `rotation` is in degrees clockwise, within
 * (−180, 180].
 */
export interface ImageEditorValue {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

/**
 * How small the image may get, measured against the frame: `contain` until the whole image fits
 * inside it, `cover` while the image still fills it, `none` down to `min-zoom`.
 */
export type ImageEditorFit = 'contain' | 'cover' | 'none';

/**
 * What a plain wheel does. `zoom`: a vertical wheel zooms toward the pointer and a horizontal or
 * Shift wheel pans. `pan`: the wheel pans. `none`: the page scrolls.
 */
export type ImageEditorWheel = 'zoom' | 'pan' | 'none';

/** The shape of the crop region; `none` makes the whole viewport the frame. */
export type ImageEditorCrop = 'none' | 'rect' | 'circle';

/** `fixed`: the region stays and the image moves under it; `adjustable`: handles and moving. */
export type ImageEditorRegionMode = 'fixed' | 'adjustable';

/** What a drag inside an adjustable region does: move it, or pan the image under it. */
export type ImageEditorRegionDrag = 'move' | 'pan';

/** The fill behind the image. */
export type ImageEditorBackground = 'checker' | 'none';

/** One entry of the `controls` list. */
export type ImageEditorControl =
  'zoom' | 'zoom-in' | 'zoom-out' | 'rotate' | 'rotation' | 'fit' | 'actual' | 'reset';

export const IMAGE_EDITOR_CONTROLS: readonly ImageEditorControl[] = [
  'zoom',
  'zoom-in',
  'zoom-out',
  'rotate',
  'rotation',
  'fit',
  'actual',
  'reset',
];

/** Where the bar of controls sits over the viewport. */
export type ImageEditorControlsPosition = 'bottom' | 'top';

/** The effective zoom range: `min` and `max`, and `fit`, the zoom `fit()` goes to. */
export interface ImageEditorZoomRange {
  readonly min: number;
  readonly max: number;
  readonly fit: number;
}

/** Options of `toCanvas`. */
export interface ImageEditorExportOptions {
  /** The longest side of the output in pixels; the region's natural size by default. */
  readonly maxSize?: number;
}

/** Options of `toBlob`. */
export interface ImageEditorBlobOptions extends ImageEditorExportOptions {
  /** The image type, `image/png` by default. */
  readonly type?: string;
  /** The quality of lossy types, 0–1. */
  readonly quality?: number;
}

/** User-facing text. */
export interface ImageEditorMessages {
  readonly label: string;
  readonly roleDescription: string;
  readonly region: string;
  readonly regionRoleDescription: string;
  readonly controls: string;
  readonly zoom: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly rotateLeft: string;
  readonly rotateRight: string;
  readonly rotation: string;
  readonly fit: string;
  readonly actual: string;
  readonly reset: string;
  readonly error: string;
  /** The editor's value text, for example "Zoom 150%, rotated 0°". */
  view(zoom: number, rotation: number): string;
  /** The region's value text, for example "320 × 320 at 120, 80". */
  regionValue(value: ImageEditorValue): string;
  /** How to operate the editor, read after its name. */
  instructions(adjustable: boolean): string;
}

/** Called with each `tp-value-change` proposal of a new value. */
export type ImageEditorValueChangeCallback = (event: TpValueChangeEvent<ImageEditorValue>) => void;
/** Called with each `tp-value-commit` when a change settles. */
export type ImageEditorValueCommitCallback = (event: TpValueCommitEvent<ImageEditorValue>) => void;

/** A point in the viewport, in CSS pixels from its top-left corner. */
export interface ImageEditorPoint {
  readonly x: number;
  readonly y: number;
}

/** A size in pixels. */
export interface ImageEditorSize {
  readonly width: number;
  readonly height: number;
}
