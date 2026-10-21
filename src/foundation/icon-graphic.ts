import type { IconDefinition, IconPath } from '../icons/types.js';

/**
 * How an icon definition is drawn (`ucl22-icon-anatomy-r1-c1-p`, `ucl22-icon-q3`). tp-icon renders
 * these attributes and the element-free check mark encodes them as a mask image
 * (`dcp-roles-table-r5`), so a definition draws the same way in both.
 */

/** The root SVG's attributes: the definition's box, unfilled, stroked in the current text color. */
export type IconGraphicAttributes = {
  readonly viewBox: string;
  readonly fill: string;
  readonly stroke: string;
  readonly 'stroke-linecap': string;
  readonly 'stroke-linejoin': string;
};

/** A path's attributes; one whose member the path leaves out is `undefined` and is not written. */
export type IconPathAttributes = {
  readonly d: string;
  readonly fill: string | undefined;
  readonly stroke: string | undefined;
  readonly 'stroke-width': number | undefined;
  readonly 'fill-rule': IconPath['fillRule'] | undefined;
  readonly 'clip-rule': IconPath['clipRule'] | undefined;
};

export function iconGraphicAttributes(icon: IconDefinition): IconGraphicAttributes {
  return {
    viewBox: icon.viewBox,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
}

export function iconPathAttributes(path: IconPath): IconPathAttributes {
  return {
    d: path.d,
    fill: path.fill,
    stroke: path.stroke,
    'stroke-width': path.strokeWidth,
    'fill-rule': path.fillRule,
    'clip-rule': path.clipRule,
  };
}
