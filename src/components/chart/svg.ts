import type { TpTooltip } from '../tooltip/tooltip.js';
import type { ChartSeriesMap } from './types.js';

const SVG = 'http://www.w3.org/2000/svg';

/** An SVG element with its attributes set. */
export const node = <K extends keyof SVGElementTagNameMap>(
  owner: Document,
  name: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] => {
  const element = owner.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
};

/** A finite number, or null for anything else. */
export const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Measures text in the plot's font, for margins and label fitting. */
export function textMeasure(plot: HTMLElement): (text: string) => number {
  const owner = plot.ownerDocument;
  const context = owner.createElement('canvas').getContext('2d');
  return (text: string) => {
    if (!context) return text.length * 7;
    context.font = owner.defaultView?.getComputedStyle(plot).font || '12px sans-serif';
    return context.measureText(text).width;
  };
}

/** A tooltip anchor at a rectangle in the SVG's own coordinates, tracking where the SVG is. */
export function svgAnchor(
  svg: SVGSVGElement,
  x: number,
  y: number,
  width = 0,
  height = 0,
): NonNullable<TpTooltip['anchor']> {
  return {
    getBoundingRectangle: () => {
      const box = svg.getBoundingClientRect();
      const left = box.left + x,
        top = box.top + y;
      return {
        x: left,
        y: top,
        width,
        height,
        top,
        left,
        right: left + width,
        bottom: top + height,
      };
    },
    contextElement: svg,
  };
}

/** A series value as announcements read it: the series' format, or the locale's. */
export function valueWords(
  series: ChartSeriesMap,
  key: string,
  value: number | null,
  locale: string | undefined,
): string {
  if (value === null) return '—';
  return series[key]?.format?.(value) ?? value.toLocaleString(locale || undefined);
}

/**
 * The position a key moves keyboard inspection to among `count` positions: the next or previous
 * one, the first or the last; `null` for Escape and `undefined` for keys inspection ignores.
 */
export function stepKey(
  event: KeyboardEvent,
  index: number | null,
  count: number,
): number | null | undefined {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(count - 1, (index ?? -1) + 1);
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(0, (index ?? 1) - 1);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'Escape':
      return null;
    default:
      return undefined;
  }
}
