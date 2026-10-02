import { composedParent } from './focus.js';
export type Side = 'top' | 'right' | 'bottom' | 'left';
export type LogicalSide = Side | 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
export type Alignment = 'start' | 'center' | 'end';
export type Placement = Side | `${Side}-${Alignment}`;
export type PositioningStrategy = 'absolute' | 'fixed';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SideOverflow {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PositioningStageData {
  offset: { x: number; y: number; placement: Placement };
  shift: { x: number; y: number; mainAxis: boolean; crossAxis: boolean };
  flip?: { index: number; candidates: Array<{ placement: Placement; overflow: SideOverflow }> };
  automaticPlacement?: {
    index: number;
    candidates: Array<{ placement: Placement; overflow: SideOverflow }>;
  };
  arrow?: { x?: number; y?: number; centerOffset: number; alignmentCorrection: number };
  hide: {
    strategy: 'reference-hidden';
    offsets: SideOverflow;
    referenceHidden: boolean;
    escaped: boolean;
  };
}

export interface PositioningResult {
  x: number;
  y: number;
  placement: Placement;
  strategy: PositioningStrategy;
  availableWidth: number;
  availableHeight: number;
  anchorWidth: number;
  anchorHeight: number;
  transformOrigin: string;
  stageData: PositioningStageData;
}

export interface CollisionPolicy {
  side?: 'flip' | 'shift' | 'none';
  align?: 'flip' | 'shift' | 'none';
  fallbackAxisSide?: 'start' | 'end' | 'none';
}

export interface AutoUpdatePolicy {
  ancestorScroll?: boolean;
  ancestorResize?: boolean;
  elementResize?: boolean;
  anchorLayoutShift?: boolean;
  frameSynchronized?: boolean;
}

export interface VirtualAnchor {
  getBoundingRectangle(): Rect;
  contextElement?: Element;
}
export type AnchorGeometry = Element | VirtualAnchor;
export type CollisionBoundary = 'clipping-ancestors' | Element | Element[] | Rect;
export interface PositioningOptions {
  boundary?: CollisionBoundary;
  constrainSize?: boolean;
  sticky?: boolean;
  onPosition?: (result: PositioningResult) => void;
  onInvalid?: () => void;
  placement?: Placement;
  resolvePlacement?: () => Placement;
  offset?: number | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number };
  strategy?: PositioningStrategy;
  automatic?: boolean;
  allowedPlacements?: Placement[];
  arrow?: HTMLElement | null;
  arrowPadding?: number;
  arrowStaticOffset?: number | string;
  matchReferenceWidth?: boolean;
  collision?: CollisionPolicy;
  padding?: number | Partial<Record<Side, number>>;
  transformPositioning?: boolean;
  tracking?: AutoUpdatePolicy | false;
}

export interface PositioningHandle {
  readonly current: PositioningResult | null;
  update(): Promise<PositioningResult | null>;
  destroy(): void;
}

const allPlacements: Placement[] = [
  'top',
  'top-start',
  'top-end',
  'right',
  'right-start',
  'right-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
];

export function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height, top: y, right: x + width, bottom: y + height, left: x };
}

function finiteRect(value: Rect): boolean {
  return (
    [
      value.x,
      value.y,
      value.width,
      value.height,
      value.top,
      value.right,
      value.bottom,
      value.left,
    ].every(Number.isFinite) &&
    value.width >= 0 &&
    value.height >= 0
  );
}

function fromDomRect(value: DOMRectReadOnly): Rect {
  return rect(value.x, value.y, value.width, value.height);
}

function placementParts(placement: Placement): { side: Side; alignment: Alignment } {
  const [side, alignment = 'center'] = placement.split('-') as [Side, Alignment?];
  return { side, alignment };
}

function serializePlacement(side: Side, alignment: Alignment): Placement {
  return alignment === 'center' ? side : `${side}-${alignment}`;
}

function oppositeSide(side: Side): Side {
  return ({ top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const)[side];
}

function oppositeAlignment(alignment: Alignment): Alignment {
  return alignment === 'start' ? 'end' : alignment === 'end' ? 'start' : 'center';
}

function baseCoordinates(
  anchor: Rect,
  surface: Rect,
  placement: Placement,
  direction: 'ltr' | 'rtl',
): { x: number; y: number } {
  const { side, alignment } = placementParts(placement);
  let x = anchor.left + (anchor.width - surface.width) / 2;
  let y = anchor.top + (anchor.height - surface.height) / 2;
  if (side === 'top') y = anchor.top - surface.height;
  if (side === 'bottom') y = anchor.bottom;
  if (side === 'left') x = anchor.left - surface.width;
  if (side === 'right') x = anchor.right;

  if (side === 'top' || side === 'bottom') {
    const logicalAlignment = direction === 'rtl' ? oppositeAlignment(alignment) : alignment;
    if (logicalAlignment === 'start') x = anchor.left;
    if (logicalAlignment === 'end') x = anchor.right - surface.width;
  } else {
    if (alignment === 'start') y = anchor.top;
    if (alignment === 'end') y = anchor.bottom - surface.height;
  }
  return { x, y };
}

function paddingRecord(value: PositioningOptions['padding']): Record<Side, number> {
  if (typeof value === 'number') return { top: value, right: value, bottom: value, left: value };
  return {
    top: value?.top ?? 8,
    right: value?.right ?? 8,
    bottom: value?.bottom ?? 8,
    left: value?.left ?? 8,
  };
}

export function detectOverflow(
  subject: Rect,
  clipping: Rect,
  padding: PositioningOptions['padding'] = 0,
): SideOverflow {
  const inset = paddingRecord(padding);
  return {
    top: clipping.top + inset.top - subject.top,
    right: subject.right - (clipping.right - inset.right),
    bottom: subject.bottom - (clipping.bottom - inset.bottom),
    left: clipping.left + inset.left - subject.left,
  };
}

function overflowScore(overflow: SideOverflow): number {
  return Object.values(overflow).reduce((sum, value) => sum + Math.max(0, value), 0);
}

function applyOffset(
  coordinates: { x: number; y: number },
  placement: Placement,
  value: PositioningOptions['offset'],
  direction: 'ltr' | 'rtl',
): { x: number; y: number; dx: number; dy: number } {
  const { side, alignment } = placementParts(placement);
  const offset = typeof value === 'number' ? { mainAxis: value } : (value ?? {});
  const main = offset.mainAxis ?? 0;
  let cross = offset.crossAxis ?? 0;
  if (offset.alignmentAxis !== undefined && alignment !== 'center') {
    cross = alignment === 'end' ? -offset.alignmentAxis : offset.alignmentAxis;
  }
  let dx = 0;
  let dy = 0;
  if (side === 'top') dy -= main;
  if (side === 'bottom') dy += main;
  if (side === 'left') dx -= main;
  if (side === 'right') dx += main;
  if (side === 'top' || side === 'bottom') dx += direction === 'rtl' ? -cross : cross;
  else dy += cross;
  return { x: coordinates.x + dx, y: coordinates.y + dy, dx, dy };
}

function candidatePlacements(
  initial: Placement,
  policy: CollisionPolicy,
  direction: 'ltr' | 'rtl',
): Placement[] {
  const { side, alignment } = placementParts(initial);
  const result = [initial];
  if ((policy.align ?? 'flip') === 'flip' && alignment !== 'center') {
    result.push(serializePlacement(side, oppositeAlignment(alignment)));
  }
  if ((policy.side ?? 'flip') === 'flip') {
    const opposite = oppositeSide(side);
    result.push(serializePlacement(opposite, alignment));
    if ((policy.align ?? 'flip') === 'flip' && alignment !== 'center') {
      result.push(serializePlacement(opposite, oppositeAlignment(alignment)));
    }
  }
  if (policy.fallbackAxisSide && policy.fallbackAxisSide !== 'none') {
    const perpendicular: Side[] =
      side === 'top' || side === 'bottom' ? ['left', 'right'] : ['top', 'bottom'];
    if (
      (policy.fallbackAxisSide === 'end') !==
      (direction === 'rtl' && (side === 'top' || side === 'bottom'))
    )
      perpendicular.reverse();
    for (const fallback of perpendicular) result.push(serializePlacement(fallback, alignment));
  }
  return [...new Set(result)];
}

function transformOrigin(placement: Placement, anchor: Rect, x: number, y: number): string {
  const { side } = placementParts(placement);
  const originX = Math.max(
    0,
    Math.min(anchor.left + anchor.width / 2 - x, Number.MAX_SAFE_INTEGER),
  );
  const originY = Math.max(
    0,
    Math.min(anchor.top + anchor.height / 2 - y, Number.MAX_SAFE_INTEGER),
  );
  if (side === 'top') return `${originX}px bottom`;
  if (side === 'bottom') return `${originX}px top`;
  if (side === 'left') return `right ${originY}px`;
  return `left ${originY}px`;
}

export function computeSurfacePosition(
  anchor: Rect,
  surface: Rect,
  clipping: Rect,
  options: PositioningOptions = {},
  direction: 'ltr' | 'rtl' = 'ltr',
): PositioningResult | null {
  if (![anchor, surface, clipping].every(finiteRect)) return null;
  const initial = options.placement ?? 'bottom';
  const policy = options.collision ?? {};
  const candidates = options.automatic
    ? options.allowedPlacements?.length
      ? options.allowedPlacements
      : allPlacements
    : candidatePlacements(initial, policy, direction);
  const evaluated = candidates.map((placement) => {
    const base = baseCoordinates(anchor, surface, placement, direction);
    const offset = applyOffset(base, placement, options.offset ?? 8, direction);
    const candidateRect = rect(offset.x, offset.y, surface.width, surface.height);
    return {
      placement,
      coordinates: offset,
      overflow: detectOverflow(candidateRect, clipping, options.padding),
    };
  });
  const firstFit = evaluated.findIndex((candidate) => overflowScore(candidate.overflow) === 0);
  const selectedIndex =
    firstFit >= 0
      ? firstFit
      : evaluated.reduce(
          (best, candidate, index, list) =>
            overflowScore(candidate.overflow) < overflowScore(list[best]!.overflow) ? index : best,
          0,
        );
  const selected = evaluated[selectedIndex]!;
  let { x, y } = selected.coordinates;
  const beforeShift = { x, y };
  const padding = paddingRecord(options.padding);
  const usableLeft = clipping.left + padding.left;
  const usableTop = clipping.top + padding.top;
  const usableRight = clipping.right - padding.right;
  const usableBottom = clipping.bottom - padding.bottom;
  const sidePolicy = policy.side ?? 'flip';
  const alignPolicy = policy.align ?? 'flip';
  const vertical = ['top', 'bottom'].includes(placementParts(selected.placement).side);
  const shiftAlignment = alignPolicy === 'shift' || (alignPolicy === 'flip' && firstFit < 0);
  const shiftSide = sidePolicy === 'shift' || (options.sticky === true && alignPolicy !== 'none');
  if (vertical ? shiftAlignment : shiftSide)
    x = Math.min(Math.max(x, usableLeft), Math.max(usableLeft, usableRight - surface.width));
  if (vertical ? shiftSide : shiftAlignment)
    y = Math.min(Math.max(y, usableTop), Math.max(usableTop, usableBottom - surface.height));
  // Match the default anchored shift limiter: retain an overlap with the anchor.
  if (options.sticky === false && shiftAlignment) {
    const arrowLength = options.arrow
      ? vertical
        ? options.arrow.offsetWidth
        : options.arrow.offsetHeight
      : 0;
    const limit = arrowLength
      ? arrowLength / 2 +
        (vertical ? padding.left + padding.right : padding.top + padding.bottom) / 2
      : 0;
    if (vertical)
      x = Math.max(anchor.left - surface.width + limit, Math.min(x, anchor.right - limit));
    else y = Math.max(anchor.top - surface.height + limit, Math.min(y, anchor.bottom - limit));
  }
  const positionedSurface = rect(x, y, surface.width, surface.height);
  const anchorOverflow = detectOverflow(anchor, clipping, 0);
  const surfaceOverflow = detectOverflow(positionedSurface, clipping, 0);
  const referenceHidden =
    anchor.bottom <= clipping.top ||
    anchor.top >= clipping.bottom ||
    anchor.right <= clipping.left ||
    anchor.left >= clipping.right;
  const escaped =
    surfaceOverflow.top >= surface.height ||
    surfaceOverflow.bottom >= surface.height ||
    surfaceOverflow.left >= surface.width ||
    surfaceOverflow.right >= surface.width;
  const { side } = placementParts(selected.placement);
  const distance =
    typeof options.offset === 'number' ? options.offset : (options.offset?.mainAxis ?? 8);
  const availableWidth = Math.max(
    0,
    shiftSide && !vertical
      ? usableRight - usableLeft
      : side === 'left'
        ? anchor.left - usableLeft - distance
        : side === 'right'
          ? usableRight - anchor.right - distance
          : usableRight - usableLeft,
  );
  const availableHeight = Math.max(
    0,
    shiftSide && vertical
      ? usableBottom - usableTop
      : side === 'top'
        ? anchor.top - usableTop - distance
        : side === 'bottom'
          ? usableBottom - anchor.bottom - distance
          : usableBottom - usableTop,
  );
  const candidateData = evaluated.map((candidate) => ({
    placement: candidate.placement,
    overflow: candidate.overflow,
  }));
  const stageData: PositioningStageData = {
    offset: {
      x: selected.coordinates.dx,
      y: selected.coordinates.dy,
      placement: selected.placement,
    },
    shift: {
      x: x - beforeShift.x,
      y: y - beforeShift.y,
      mainAxis: shiftAlignment,
      crossAxis: shiftSide,
    },
    hide: { strategy: 'reference-hidden', offsets: anchorOverflow, referenceHidden, escaped },
  };
  if (options.automatic)
    stageData.automaticPlacement = { index: selectedIndex, candidates: candidateData };
  else if (candidateData.length > 1)
    stageData.flip = { index: selectedIndex, candidates: candidateData };

  if (options.arrow) {
    const measured = options.arrow.getBoundingClientRect();
    const arrowRect = rect(
      0,
      0,
      options.arrow.offsetWidth || measured.width,
      options.arrow.offsetHeight || measured.height,
    );
    const length = side === 'top' || side === 'bottom' ? surface.width : surface.height;
    const arrowLength = side === 'top' || side === 'bottom' ? arrowRect.width : arrowRect.height;
    const arrowPadding = Math.min(
      Math.max(0, options.arrowPadding ?? 0),
      Math.max(0, (length - arrowLength) / 2),
    );
    if (side === 'top' || side === 'bottom') {
      const ideal = anchor.left + anchor.width / 2 - x - arrowRect.width / 2;
      const arrowX = Math.max(
        arrowPadding,
        Math.min(ideal, surface.width - arrowRect.width - arrowPadding),
      );
      stageData.arrow = { x: arrowX, centerOffset: ideal - arrowX, alignmentCorrection: 0 };
    } else {
      const ideal = anchor.top + anchor.height / 2 - y - arrowRect.height / 2;
      const arrowY = Math.max(
        arrowPadding,
        Math.min(ideal, surface.height - arrowRect.height - arrowPadding),
      );
      stageData.arrow = { y: arrowY, centerOffset: ideal - arrowY, alignmentCorrection: 0 };
    }
  }

  return {
    x,
    y,
    placement: selected.placement,
    strategy: options.strategy ?? 'absolute',
    availableWidth,
    availableHeight,
    anchorWidth: anchor.width,
    anchorHeight: anchor.height,
    transformOrigin: transformOrigin(selected.placement, anchor, x, y),
    stageData,
  };
}

function viewportRect(ownerWindow: Window): Rect {
  const visual = ownerWindow.visualViewport;
  return rect(
    visual?.offsetLeft ?? 0,
    visual?.offsetTop ?? 0,
    visual?.width ?? ownerWindow.innerWidth,
    visual?.height ?? ownerWindow.innerHeight,
  );
}

export function resolveSide(side: LogicalSide, element: Element): Side {
  const style = element.ownerDocument.defaultView!.getComputedStyle(element);
  const vertical = style.writingMode.startsWith('vertical');
  const inlineStart: Side = vertical
    ? style.direction === 'rtl'
      ? 'bottom'
      : 'top'
    : style.direction === 'rtl'
      ? 'right'
      : 'left';
  const blockStart: Side = vertical
    ? style.writingMode === 'vertical-rl'
      ? 'right'
      : 'left'
    : 'top';
  if (side === 'inline-start') return inlineStart;
  if (side === 'inline-end') return oppositeSide(inlineStart);
  if (side === 'block-start') return blockStart;
  if (side === 'block-end') return oppositeSide(blockStart);
  return side;
}
function overflowAncestors(element: Element): Element[] {
  const result: Element[] = [];
  for (let current = composedParent(element); current; current = composedParent(current)) {
    if (!(current instanceof Element)) continue;
    const style = element.ownerDocument.defaultView!.getComputedStyle(current);
    if (
      /(auto|scroll|overlay|hidden|clip)/.test(
        `${style.overflow}${style.overflowX}${style.overflowY}`,
      )
    )
      result.push(current);
  }
  return result;
}
function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.left, b.left),
    y = Math.max(a.top, b.top);
  return rect(
    x,
    y,
    Math.max(0, Math.min(a.right, b.right) - x),
    Math.max(0, Math.min(a.bottom, b.bottom) - y),
  );
}
function innerRect(element: Element): Rect {
  const box = element.getBoundingClientRect();
  const html = element as HTMLElement;
  const scaleX = html.offsetWidth ? box.width / html.offsetWidth : 1;
  const scaleY = html.offsetHeight ? box.height / html.offsetHeight : 1;
  return rect(
    box.left + element.clientLeft * scaleX,
    box.top + element.clientTop * scaleY,
    element.clientWidth * scaleX,
    element.clientHeight * scaleY,
  );
}
function clippingRect(
  element: Element,
  root: Rect,
  boundary: CollisionBoundary = 'clipping-ancestors',
): Rect {
  if (typeof boundary === 'object' && !Array.isArray(boundary) && 'x' in boundary)
    return intersect(root, boundary);
  const elements =
    boundary === 'clipping-ancestors'
      ? overflowAncestors(element)
      : Array.isArray(boundary)
        ? boundary
        : [boundary];
  return elements.reduce((result, ancestor) => intersect(result, innerRect(ancestor)), root);
}

function roundToDevicePixel(value: number, ownerWindow: Window): number {
  const ratio = ownerWindow.devicePixelRatio || 1;
  return Math.round(value * ratio) / ratio;
}

function clearPosition(surface: HTMLElement): void {
  surface.removeAttribute('data-positioned');
  surface.removeAttribute('data-placement');
  surface.removeAttribute('data-side');
  surface.removeAttribute('data-align');
  surface.removeAttribute('data-anchor-hidden');
  surface.removeAttribute('data-reference-hidden');
  surface.removeAttribute('data-escaped');
  surface.style.removeProperty('translate');
  surface.style.removeProperty('left');
  surface.style.removeProperty('top');
  for (const property of [
    '--tp-anchor-width',
    '--tp-anchor-height',
    '--tp-available-width',
    '--tp-available-height',
    '--tp-transform-origin',
  ]) {
    surface.style.removeProperty(property);
  }
}

export function positionSurface(
  reference: AnchorGeometry,
  surface: HTMLElement,
  options: PositioningOptions = {},
): PositioningHandle {
  let destroyed = false;
  let generation = 0;
  let current: PositioningResult | null = null;
  let scheduledFrame = 0;
  const context =
    'getBoundingRectangle' in reference ? (reference.contextElement ?? surface) : reference;
  const ownerWindow = context.ownerDocument.defaultView ?? window;

  const update = async (): Promise<PositioningResult | null> => {
    const pass = ++generation;
    if (destroyed || !context.isConnected || !surface.isConnected) {
      current = null;
      clearPosition(surface);
      options.onInvalid?.();
      return null;
    }
    const anchorRect =
      'getBoundingRectangle' in reference
        ? reference.getBoundingRectangle()
        : fromDomRect(reference.getBoundingClientRect());
    const root = viewportRect(ownerWindow);
    const topLayer = surface.matches(':popover-open, :modal');
    const clipping =
      topLayer && (!options.boundary || options.boundary === 'clipping-ancestors')
        ? root
        : clippingRect(surface, root, options.boundary);
    if (options.constrainSize) {
      const padding = paddingRecord(options.padding);
      surface.style.setProperty(
        '--tp-available-width',
        `${Math.max(0, clipping.width - padding.left - padding.right)}px`,
      );
      surface.style.setProperty(
        '--tp-available-height',
        `${Math.max(0, clipping.height - padding.top - padding.bottom)}px`,
      );
    }
    const surfaceRect = rect(0, 0, surface.offsetWidth, surface.offsetHeight);
    const currentOptions = options.resolvePlacement
      ? { ...options, placement: options.resolvePlacement() }
      : options;
    const direction = ownerWindow.getComputedStyle(context).direction === 'rtl' ? 'rtl' : 'ltr';
    let result = computeSurfacePosition(
      anchorRect,
      surfaceRect,
      clipping,
      currentOptions,
      direction,
    );
    if (pass !== generation || destroyed) return null;
    if (!result) {
      current = null;
      clearPosition(surface);
      surface.dataset.positioningDiagnostic = 'invalid-geometry';
      options.onInvalid?.();
      return null;
    }
    surface.removeAttribute('data-positioning-diagnostic');
    const anchorClip = clippingRect(context, root);
    result.stageData.hide.referenceHidden =
      anchorRect.bottom <= anchorClip.top ||
      anchorRect.top >= anchorClip.bottom ||
      anchorRect.right <= anchorClip.left ||
      anchorRect.left >= anchorClip.right;
    if (options.constrainSize) {
      surface.style.setProperty('--tp-available-width', `${result.availableWidth}px`);
      surface.style.setProperty('--tp-available-height', `${result.availableHeight}px`);
      if (
        surface.offsetWidth !== surfaceRect.width ||
        surface.offsetHeight !== surfaceRect.height
      ) {
        const resized = computeSurfacePosition(
          anchorRect,
          rect(0, 0, surface.offsetWidth, surface.offsetHeight),
          clipping,
          { ...options, placement: result.placement, collision: { side: 'none', align: 'shift' } },
          direction,
        );
        if (resized)
          result = {
            ...resized,
            stageData: {
              ...resized.stageData,
              hide: result.stageData.hide,
              ...(result.stageData.flip ? { flip: result.stageData.flip } : {}),
            },
          };
      }
    }
    if (options.strategy !== 'fixed') {
      const offsetParent = surface.offsetParent;
      if (offsetParent instanceof HTMLElement) {
        const parentRect = offsetParent.getBoundingClientRect();
        result = {
          ...result,
          x: result.x - parentRect.left + offsetParent.scrollLeft - offsetParent.clientLeft,
          y: result.y - parentRect.top + offsetParent.scrollTop - offsetParent.clientTop,
        };
      }
    }
    const x = roundToDevicePixel(result.x, ownerWindow);
    const y = roundToDevicePixel(result.y, ownerWindow);
    surface.style.position = result.strategy;
    if (options.transformPositioning ?? true) {
      surface.style.left = '0px';
      surface.style.top = '0px';
      surface.style.translate = `${x}px ${y}px`;
    } else {
      surface.style.removeProperty('translate');
      surface.style.left = `${x}px`;
      surface.style.top = `${y}px`;
    }
    surface.dataset.positioned = '';
    surface.dataset.placement = result.placement;
    const resolved = placementParts(result.placement);
    surface.dataset.side = resolved.side;
    surface.dataset.align = resolved.alignment;
    surface.toggleAttribute('data-anchor-hidden', result.stageData.hide.referenceHidden);
    surface.toggleAttribute('data-reference-hidden', result.stageData.hide.referenceHidden);
    surface.toggleAttribute('data-escaped', result.stageData.hide.escaped);
    surface.style.setProperty('--tp-anchor-width', `${result.anchorWidth}px`);
    surface.style.setProperty('--tp-anchor-height', `${result.anchorHeight}px`);
    surface.style.setProperty('--tp-available-width', `${result.availableWidth}px`);
    surface.style.setProperty('--tp-available-height', `${result.availableHeight}px`);
    surface.style.setProperty('--tp-transform-origin', result.transformOrigin);
    if (options.matchReferenceWidth) surface.style.minWidth = `${result.anchorWidth}px`;
    if (options.arrow && result.stageData.arrow) {
      const arrow = result.stageData.arrow;
      options.arrow.style.removeProperty('left');
      options.arrow.style.removeProperty('top');
      const vertical = resolved.side === 'top' || resolved.side === 'bottom';
      const shifted = vertical ? result.stageData.shift.x !== 0 : result.stageData.shift.y !== 0;
      const staticOffset = !shifted ? options.arrowStaticOffset : undefined;
      const offset =
        staticOffset === undefined
          ? undefined
          : typeof staticOffset === 'number'
            ? `${staticOffset}px`
            : /^-?\d+(?:\.\d+)?(?:%|px)$/.test(staticOffset)
              ? staticOffset
              : undefined;
      if (arrow.x !== undefined) options.arrow.style.left = offset ?? `${arrow.x}px`;
      if (arrow.y !== undefined) options.arrow.style.top = offset ?? `${arrow.y}px`;
      options.arrow.toggleAttribute('data-uncentered', Math.abs(arrow.centerOffset) > 0.5);
      options.arrow.dataset.side = resolved.side;
      options.arrow.dataset.align = resolved.alignment;
    }
    current = { ...result, x, y };
    options.onPosition?.(current);
    return current;
  };

  const schedule = (): void => {
    if (destroyed || scheduledFrame) return;
    scheduledFrame = ownerWindow.requestAnimationFrame(() => {
      scheduledFrame = 0;
      void update();
    });
  };

  const policy = options.tracking === false ? false : (options.tracking ?? {});
  const cleanups: Array<() => void> = [];
  if (policy) {
    if (policy.ancestorScroll ?? true) {
      let targets = new Set<EventTarget>();
      const bind = () => {
        const next = new Set<EventTarget>([
          ...overflowAncestors(context),
          ...overflowAncestors(surface),
          ownerWindow,
          ...(ownerWindow.visualViewport ? [ownerWindow.visualViewport] : []),
        ]);
        for (const target of targets)
          if (!next.has(target)) target.removeEventListener('scroll', schedule);
        for (const target of next)
          if (!targets.has(target)) target.addEventListener('scroll', schedule, { passive: true });
        targets = next;
      };
      bind();
      const observer = new ownerWindow.MutationObserver(() => {
        bind();
        schedule();
      });
      observer.observe(context.ownerDocument, { childList: true, subtree: true });
      cleanups.push(() => {
        observer.disconnect();
        for (const target of targets) target.removeEventListener('scroll', schedule);
        targets.clear();
      });
    }
    if (policy.ancestorResize ?? true) {
      ownerWindow.addEventListener('resize', schedule, { passive: true });
      ownerWindow.visualViewport?.addEventListener('resize', schedule, { passive: true });
      cleanups.push(() => ownerWindow.removeEventListener('resize', schedule));
      cleanups.push(() => ownerWindow.visualViewport?.removeEventListener('resize', schedule));
    }
    if (
      (policy.elementResize ?? 'ResizeObserver' in ownerWindow) &&
      'ResizeObserver' in ownerWindow
    ) {
      const observer = new ownerWindow.ResizeObserver(schedule);
      observer.observe(context);
      observer.observe(surface);
      cleanups.push(() => observer.disconnect());
    }
    if (
      (policy.anchorLayoutShift ?? 'IntersectionObserver' in ownerWindow) &&
      'IntersectionObserver' in ownerWindow
    ) {
      const observer = new ownerWindow.IntersectionObserver(schedule);
      observer.observe(context);
      cleanups.push(() => observer.disconnect());
    }
    if (policy.frameSynchronized || (policy.anchorLayoutShift ?? true)) {
      let frame = 0;
      let previous = '';
      const tick = (): void => {
        const b = context.getBoundingClientRect();
        const sample = [
          context.isConnected,
          b.x,
          b.y,
          b.width,
          b.height,
          ownerWindow.getComputedStyle(context).direction,
          ownerWindow.getComputedStyle(context).writingMode,
        ].join(',');
        if (sample !== previous || policy.frameSynchronized) schedule();
        previous = sample;
        frame = ownerWindow.requestAnimationFrame(tick);
      };
      frame = ownerWindow.requestAnimationFrame(tick);
      cleanups.push(() => ownerWindow.cancelAnimationFrame(frame));
    }
  }
  void update();

  return {
    get current() {
      return current;
    },
    update,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation += 1;
      if (scheduledFrame) ownerWindow.cancelAnimationFrame(scheduledFrame);
      for (const cleanup of cleanups.splice(0)) cleanup();
      clearPosition(surface);
      if (options.arrow) {
        options.arrow.style.removeProperty('left');
        options.arrow.style.removeProperty('top');
        options.arrow.removeAttribute('data-uncentered');
      }
      if (options.matchReferenceWidth) surface.style.removeProperty('min-width');
      current = null;
    },
  };
}
