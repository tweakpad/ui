export type Side = 'top' | 'right' | 'bottom' | 'left';
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

export interface PositioningOptions {
  placement?: Placement;
  offset?: number | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number };
  strategy?: PositioningStrategy;
  automatic?: boolean;
  allowedPlacements?: Placement[];
  arrow?: HTMLElement | null;
  arrowPadding?: number;
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

function candidatePlacements(initial: Placement, policy: CollisionPolicy): Placement[] {
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
    if (policy.fallbackAxisSide === 'end') perpendicular.reverse();
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
    : candidatePlacements(initial, policy);
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
  const allowShift = sidePolicy === 'shift' || alignPolicy === 'shift' || firstFit < 0;
  if (allowShift) {
    x = Math.min(Math.max(x, usableLeft), Math.max(usableLeft, usableRight - surface.width));
    y = Math.min(Math.max(y, usableTop), Math.max(usableTop, usableBottom - surface.height));
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
  const availableWidth = Math.max(0, usableRight - usableLeft);
  const availableHeight = Math.max(
    0,
    side === 'top'
      ? anchor.top - usableTop
      : side === 'bottom'
        ? usableBottom - anchor.bottom
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
    shift: { x: x - beforeShift.x, y: y - beforeShift.y, mainAxis: true, crossAxis: true },
    hide: { strategy: 'reference-hidden', offsets: anchorOverflow, referenceHidden, escaped },
  };
  if (options.automatic)
    stageData.automaticPlacement = { index: selectedIndex, candidates: candidateData };
  else if (candidateData.length > 1)
    stageData.flip = { index: selectedIndex, candidates: candidateData };

  if (options.arrow) {
    const arrowRect = fromDomRect(options.arrow.getBoundingClientRect());
    const arrowPadding = options.arrowPadding ?? 0;
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

function overflowAncestors(element: Element): EventTarget[] {
  const result: EventTarget[] = [];
  let current = element.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    if (
      /(auto|scroll|overlay|hidden|clip)/.test(
        `${style.overflow}${style.overflowX}${style.overflowY}`,
      )
    )
      result.push(current);
    current = current.parentElement;
  }
  const ownerWindow = element.ownerDocument.defaultView;
  if (ownerWindow) result.push(ownerWindow);
  return result;
}

function roundToDevicePixel(value: number, ownerWindow: Window): number {
  const ratio = ownerWindow.devicePixelRatio || 1;
  return Math.round(value * ratio) / ratio;
}

function clearPosition(surface: HTMLElement): void {
  surface.removeAttribute('data-positioned');
  surface.removeAttribute('data-placement');
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
  reference: Element,
  surface: HTMLElement,
  options: PositioningOptions = {},
): PositioningHandle {
  let destroyed = false;
  let generation = 0;
  let current: PositioningResult | null = null;
  let scheduledFrame = 0;
  const ownerWindow = reference.ownerDocument.defaultView ?? window;

  const update = async (): Promise<PositioningResult | null> => {
    const pass = ++generation;
    if (destroyed || !reference.isConnected || !surface.isConnected) {
      current = null;
      clearPosition(surface);
      return null;
    }
    const anchorRect = fromDomRect(reference.getBoundingClientRect());
    const surfaceRect = fromDomRect(surface.getBoundingClientRect());
    const direction = getComputedStyle(reference).direction === 'rtl' ? 'rtl' : 'ltr';
    let result = computeSurfacePosition(
      anchorRect,
      surfaceRect,
      viewportRect(ownerWindow),
      options,
      direction,
    );
    if (pass !== generation || destroyed) return null;
    if (!result) {
      current = null;
      clearPosition(surface);
      surface.dataset.positioningDiagnostic = 'invalid-geometry';
      return null;
    }
    surface.removeAttribute('data-positioning-diagnostic');
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
      if (arrow.x !== undefined) options.arrow.style.left = `${arrow.x}px`;
      if (arrow.y !== undefined) options.arrow.style.top = `${arrow.y}px`;
      options.arrow.toggleAttribute('data-uncentered', arrow.centerOffset !== 0);
    }
    current = { ...result, x, y };
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
      for (const target of new Set([
        ...overflowAncestors(reference),
        ...overflowAncestors(surface),
      ])) {
        target.addEventListener('scroll', schedule, { passive: true });
        cleanups.push(() => target.removeEventListener('scroll', schedule));
      }
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
      observer.observe(reference);
      observer.observe(surface);
      cleanups.push(() => observer.disconnect());
    }
    if (
      (policy.anchorLayoutShift ?? 'IntersectionObserver' in ownerWindow) &&
      'IntersectionObserver' in ownerWindow
    ) {
      const observer = new ownerWindow.IntersectionObserver(schedule);
      observer.observe(reference);
      cleanups.push(() => observer.disconnect());
    }
    if (policy.frameSynchronized) {
      let frame = 0;
      const tick = (): void => {
        schedule();
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
