export type SliderCrossing = 'prevent' | 'swap';
export type SliderCollisionBehavior = 'push' | 'swap' | 'none';

export interface SliderMoveRequest {
  values: readonly number[];
  identities: readonly string[];
  index: number;
  proposedValue: number;
  minimum: number;
  maximum: number;
  step: number;
  minStepsBetweenValues: number;
  crossing?: SliderCrossing;
  collisionBehavior?: SliderCollisionBehavior;
  disabled?: readonly boolean[];
}

export interface SliderMoveResult {
  values: number[];
  identities: string[];
  activeIndex: number;
}

/** A non-semantic `[start, end]` range in slider value units, such as buffered media. */
export type SliderBufferedRange = readonly [start: number, end: number];

/** A non-semantic segment of the slider domain, such as a media chapter. */
export interface SliderSegment {
  readonly start: number;
  readonly end: number;
  readonly label?: string;
}

/** Normalized segment geometry and interaction state. Ratios are 0–1 of the slider domain. */
export interface SliderSegmentState {
  index: number;
  start: number;
  end: number;
  label: string | undefined;
  /** Segment start as a ratio of the slider domain. */
  startRatio: number;
  /** Segment size as a ratio of the slider domain. */
  widthRatio: number;
  /** Portion of this segment (0–1) below the current value. */
  fillRatio: number;
  /** Portion of this segment (0–1) below the buffer end. */
  bufferRatio: number;
  /** The current value lies inside this segment. */
  active: boolean;
  /** The hovered pointer value lies inside this segment. */
  highlighted: boolean;
}

/**
 * A non-finite or empty domain is a declared indeterminate state (for example media
 * before metadata), not a configuration error.
 */
export function sliderRangeIndeterminate(minimum: number, maximum: number): boolean {
  return !Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum;
}

/** Clamped 0–1 position of a value in the domain; 0 for an indeterminate domain. */
export function sliderRatio(value: number, minimum: number, maximum: number): number {
  if (sliderRangeIndeterminate(minimum, maximum) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)));
}

/**
 * Finite ranges clamped to the domain, ordered by start and merged where they
 * overlap or touch. Empty and inverted ranges are dropped.
 */
export function normalizeSliderBufferedRanges(
  ranges: readonly SliderBufferedRange[] | null | undefined,
  minimum: number,
  maximum: number,
): Array<[number, number]> {
  if (!ranges?.length || sliderRangeIndeterminate(minimum, maximum)) return [];
  const clamped = ranges
    .filter(
      (range): range is SliderBufferedRange =>
        Array.isArray(range) && Number.isFinite(range[0]) && Number.isFinite(range[1]),
    )
    .map(([start, end]): [number, number] => [
      Math.min(maximum, Math.max(minimum, start)),
      Math.min(maximum, Math.max(minimum, end)),
    ])
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0]);
  const merged: Array<[number, number]> = [];
  for (const range of clamped) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

/**
 * The end of the normalized range containing `value`, else the end of the last
 * range; `null` when nothing is buffered.
 */
export function sliderBufferEnd(
  ranges: readonly SliderBufferedRange[],
  value: number | undefined,
): number | null {
  if (!ranges.length) return null;
  const containing =
    value === undefined ? undefined : ranges.find(([start, end]) => value >= start && value <= end);
  return (containing ?? ranges.at(-1)!)[1];
}

/** Finite segments clamped to the domain, ordered by start; empty segments are dropped. */
export function normalizeSliderSegments(
  segments: readonly SliderSegment[] | null | undefined,
  minimum: number,
  maximum: number,
): SliderSegment[] {
  if (!segments?.length || sliderRangeIndeterminate(minimum, maximum)) return [];
  return segments
    .filter(
      (segment) => !!segment && Number.isFinite(segment.start) && Number.isFinite(segment.end),
    )
    .map((segment) => ({
      ...segment,
      start: Math.min(maximum, Math.max(minimum, segment.start)),
      end: Math.min(maximum, Math.max(minimum, segment.end)),
    }))
    .filter((segment) => segment.end > segment.start)
    .sort((left, right) => left.start - right.start);
}

/** Per-segment geometry, fill, buffer and containment for already-normalized segments. */
export function sliderSegmentStates(
  segments: readonly SliderSegment[],
  options: {
    minimum: number;
    maximum: number;
    value: number | undefined;
    pointerValue: number | null;
    bufferEnd: number | null;
  },
): SliderSegmentState[] {
  const { minimum, maximum, value, pointerValue, bufferEnd } = options;
  if (sliderRangeIndeterminate(minimum, maximum)) return [];
  const domain = maximum - minimum;
  const portion = (point: number | null | undefined, start: number, end: number): number =>
    point === null || point === undefined || !Number.isFinite(point)
      ? 0
      : Math.min(1, Math.max(0, (point - start) / (end - start)));
  return segments.map((segment, index) => {
    const last = index === segments.length - 1;
    const contains = (point: number | null | undefined): boolean =>
      point !== null &&
      point !== undefined &&
      point >= segment.start &&
      (point < segment.end || (last && point === segment.end));
    return {
      index,
      start: segment.start,
      end: segment.end,
      label: segment.label,
      startRatio: (segment.start - minimum) / domain,
      widthRatio: (segment.end - segment.start) / domain,
      fillRatio: portion(value, segment.start, segment.end),
      bufferRatio: portion(bufferEnd, segment.start, segment.end),
      active: contains(value),
      highlighted: contains(pointerValue),
    };
  });
}

/**
 * Map a pointer coordinate to a 0–1 domain ratio along the slider axis. Horizontal
 * RTL mirrors the axis; vertical grows upward. `inset` is the CSS-pixel travel inset
 * at each end (edge thumb alignment). Returns `null` for an unmeasurable axis.
 */
export function sliderPointerRatio(input: {
  clientX: number;
  clientY: number;
  rect: { left: number; top: number; width: number; height: number };
  orientation: 'horizontal' | 'vertical';
  direction: 'ltr' | 'rtl';
  inset?: number;
}): number | null {
  const { clientX, clientY, rect, orientation, direction, inset = 0 } = input;
  const length = (orientation === 'horizontal' ? rect.width : rect.height) - inset * 2;
  if (!(length > 0)) return null;
  let ratio =
    orientation === 'horizontal'
      ? (clientX - rect.left - inset) / length
      : 1 - (clientY - rect.top - inset) / length;
  if (orientation === 'horizontal' && direction === 'rtl') ratio = 1 - ratio;
  return Math.min(1, Math.max(0, ratio));
}

export function sliderConfigurationError(
  minimum: number,
  maximum: number,
  step: number,
  largeStep: number,
  minStepsBetweenValues: number,
  valueCount: number,
): string | null {
  // An empty or non-finite domain is the declared indeterminate state, not an error.
  const indeterminate = sliderRangeIndeterminate(minimum, maximum);
  if (!Number.isFinite(step) || step <= 0) return 'Slider step must be a positive finite number.';
  if (!Number.isFinite(largeStep) || largeStep <= 0)
    return 'Slider largeStep must be a positive finite number.';
  if (!Number.isInteger(minStepsBetweenValues) || minStepsBetweenValues < 0)
    return 'Slider minStepsBetweenValues must be a non-negative integer.';
  if (valueCount < 1) return 'Slider requires a value or defaultValue.';
  if (!indeterminate && (valueCount - 1) * minStepsBetweenValues * step > maximum - minimum)
    return 'Slider bounds cannot contain the requested values and minimum separation.';
  return null;
}

export function snapSliderValue(
  value: number,
  minimum: number,
  maximum: number,
  step: number,
): number {
  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    minimum >= maximum ||
    !Number.isFinite(step) ||
    step <= 0
  ) {
    return Number.isFinite(value) ? value : 0;
  }
  const finite = Number.isFinite(value) ? value : minimum;
  const maximumStepIndex = Math.floor((maximum - minimum) / step);
  const stepIndex = Math.min(maximumStepIndex, Math.max(0, Math.round((finite - minimum) / step)));
  const snapped = minimum + stepIndex * step;
  const precision = Math.min(100, Math.max(decimalPlaces(minimum), decimalPlaces(step)));
  return Number(snapped.toFixed(precision));
}

export function normalizeSliderValues(
  values: readonly number[],
  minimum: number,
  maximum: number,
  step: number,
  minStepsBetweenValues: number,
): number[] {
  if (!values.length) return [];
  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    minimum >= maximum ||
    !Number.isFinite(step) ||
    step <= 0 ||
    !Number.isInteger(minStepsBetweenValues) ||
    minStepsBetweenValues < 0
  ) {
    return values.filter(Number.isFinite);
  }
  const gap = minStepsBetweenValues * step;
  const normalized = values
    .map((value) => snapSliderValue(value, minimum, maximum, step))
    .sort((a, b) => a - b);

  for (let index = 1; index < normalized.length; index += 1) {
    normalized[index] = snapSliderValue(
      Math.max(normalized[index]!, normalized[index - 1]! + gap),
      minimum,
      maximum,
      step,
    );
  }
  for (let index = normalized.length - 2; index >= 0; index -= 1) {
    normalized[index] = snapSliderValue(
      Math.min(normalized[index]!, normalized[index + 1]! - gap),
      minimum,
      maximum,
      step,
    );
  }
  return normalized;
}

export function moveSliderThumb(request: SliderMoveRequest): SliderMoveResult {
  const {
    values,
    identities,
    index,
    proposedValue,
    minimum,
    maximum,
    step,
    minStepsBetweenValues,
  } = request;
  if (index < 0 || index >= values.length || identities.length !== values.length) {
    return { values: [...values], identities: [...identities], activeIndex: -1 };
  }

  if (request.disabled?.[index])
    return { values: [...values], identities: [...identities], activeIndex: index };
  const collision = request.collisionBehavior ?? (request.crossing === 'swap' ? 'swap' : 'none');
  const gap = minStepsBetweenValues * step;
  const snapped = snapSliderValue(proposedValue, minimum, maximum, step);
  if (collision === 'push') {
    const result = [...values];
    let first = index,
      last = index;
    while (first > 0 && !request.disabled?.[first - 1]) first--;
    while (last < values.length - 1 && !request.disabled?.[last + 1]) last++;
    const lower = first === 0 ? minimum : values[first - 1]! + gap;
    const upper = last === values.length - 1 ? maximum : values[last + 1]! - gap;
    result[index] = snapSliderValue(
      Math.min(upper - (last - index) * gap, Math.max(lower + (index - first) * gap, snapped)),
      minimum,
      maximum,
      step,
    );
    for (let cursor = index + 1; cursor <= last; cursor++)
      result[cursor] = snapSliderValue(
        Math.max(result[cursor]!, result[cursor - 1]! + gap),
        minimum,
        maximum,
        step,
      );
    for (let cursor = index - 1; cursor >= first; cursor--)
      result[cursor] = snapSliderValue(
        Math.min(result[cursor]!, result[cursor + 1]! - gap),
        minimum,
        maximum,
        step,
      );
    return { values: result, identities: [...identities], activeIndex: index };
  }
  if (collision === 'none') {
    const previous = index === 0 ? minimum : values[index - 1]! + gap;
    const next = index === values.length - 1 ? maximum : values[index + 1]! - gap;
    const result = [...values];
    result[index] = snapSliderValue(
      Math.min(next, Math.max(previous, snapped)),
      minimum,
      maximum,
      step,
    );
    return { values: result, identities: [...identities], activeIndex: index };
  }

  const activeIdentity = identities[index]!;
  const items = values.map((value, itemIndex) => ({
    value,
    identity: identities[itemIndex]!,
  }));
  // Disabled members are barriers: crossing cannot exchange their logical identity.
  let first = index,
    last = index;
  while (first > 0 && !request.disabled?.[first - 1]) first--;
  while (last < values.length - 1 && !request.disabled?.[last + 1]) last++;
  const lowerBarrier = first === 0 ? minimum : values[first - 1]! + gap;
  const upperBarrier = last === values.length - 1 ? maximum : values[last + 1]! - gap;
  items[index]!.value = Math.min(upperBarrier, Math.max(lowerBarrier, snapped));
  items.sort((a, b) => a.value - b.value);
  let activeIndex = items.findIndex((item) => item.identity === activeIdentity);
  const activeItem = items[activeIndex]!;
  const lower = activeIndex === 0 ? minimum : items[activeIndex - 1]!.value + gap;
  const upper = activeIndex === items.length - 1 ? maximum : items[activeIndex + 1]!.value - gap;
  activeItem.value = snapSliderValue(
    Math.min(upper, Math.max(lower, activeItem.value)),
    minimum,
    maximum,
    step,
  );
  items.sort((a, b) => a.value - b.value);
  activeIndex = items.findIndex((item) => item.identity === activeIdentity);
  return {
    values: items.map((item) => item.value),
    identities: items.map((item) => item.identity),
    activeIndex,
  };
}

/** Unsnapped domain value at a 0–1 ratio; used for hover pointer publication. */
export function sliderRawValueFromRatio(ratio: number, minimum: number, maximum: number): number {
  if (sliderRangeIndeterminate(minimum, maximum)) return Number.NaN;
  return minimum + Math.min(1, Math.max(0, ratio)) * (maximum - minimum);
}

export function sliderValueFromRatio(
  ratio: number,
  minimum: number,
  maximum: number,
  step: number,
): number {
  return snapSliderValue(
    minimum + Math.min(1, Math.max(0, ratio)) * (maximum - minimum),
    minimum,
    maximum,
    step,
  );
}

export function sameSliderValues(left: readonly number[], right: readonly number[]): boolean {
  return (
    left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  );
}

function decimalPlaces(value: number): number {
  const text = String(value).toLowerCase();
  if (text.includes('e-')) {
    const [coefficient, exponent] = text.split('e-');
    return Number(exponent ?? 0) + ((coefficient ?? '').split('.')[1]?.length ?? 0);
  }
  return text.split('.')[1]?.length ?? 0;
}
