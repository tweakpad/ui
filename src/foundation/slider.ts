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

export function sliderConfigurationError(
  minimum: number,
  maximum: number,
  step: number,
  largeStep: number,
  minStepsBetweenValues: number,
  valueCount: number,
): string | null {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum)
    return 'Slider minimum must be finite and less than maximum.';
  if (!Number.isFinite(step) || step <= 0) return 'Slider step must be a positive finite number.';
  if (!Number.isFinite(largeStep) || largeStep <= 0)
    return 'Slider largeStep must be a positive finite number.';
  if (!Number.isInteger(minStepsBetweenValues) || minStepsBetweenValues < 0)
    return 'Slider minStepsBetweenValues must be a non-negative integer.';
  if (valueCount < 1) return 'Slider requires a value or defaultValue.';
  if ((valueCount - 1) * minStepsBetweenValues * step > maximum - minimum)
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
