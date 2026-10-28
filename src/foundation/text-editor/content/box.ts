/**
 * The content box of a block (Widgets `uwg-te-req-engine-10`, `uwg-te-req-pres-5`).
 *
 * The arithmetic that turns an element's border box and computed style into its content box, in
 * client coordinates: written once for the engine adapters' block geometry and for the widget's
 * placeholder over the preview before ready, so that both measure a block's first line the same
 * way. Pure: it reads only the rectangle and the style it is given, and touches no document.
 */

/** The edges of a box in client coordinates. */
export interface TextEditorEdges {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The computed lengths that lie between an element's border box and its content box. */
export type TextEditorBoxStyle = Pick<
  CSSStyleDeclaration,
  | 'borderTopWidth'
  | 'borderRightWidth'
  | 'borderBottomWidth'
  | 'borderLeftWidth'
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
>;

/** A computed length in CSS pixels; 0 for one that is not a number, such as `normal` or `auto`. */
export const cssPixels = (value: string | undefined): number => Number.parseFloat(value ?? '') || 0;

/**
 * The content box of an element: its border box inset by the border width and the padding of
 * each side, as its computed style gives them; the border box itself where no style is computed.
 */
export function contentBox(
  border: TextEditorEdges,
  style: TextEditorBoxStyle | null,
): TextEditorEdges {
  if (!style) return border;
  return {
    left: border.left + cssPixels(style.borderLeftWidth) + cssPixels(style.paddingLeft),
    top: border.top + cssPixels(style.borderTopWidth) + cssPixels(style.paddingTop),
    right: border.right - cssPixels(style.borderRightWidth) - cssPixels(style.paddingRight),
    bottom: border.bottom - cssPixels(style.borderBottomWidth) - cssPixels(style.paddingBottom),
  };
}
