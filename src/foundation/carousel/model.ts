import type { CarouselId, CarouselItem, CarouselItemOptions } from './types.js';

export function isCarouselId(value: unknown): value is CarouselId {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}
export interface CarouselItemResolvers<T> {
  getItemId?: (item: T, index: number) => CarouselId;
  getItemLabel?: (item: T, index: number) => string;
  getItemOptions?: (item: T, index: number) => CarouselItemOptions;
}

/** Logical membership is independent of the mounted virtual/projection collection. */
export function carouselItems<T>(
  items: readonly T[],
  resolvers: CarouselItemResolvers<T> = {},
  diagnose: (message: string) => void = () => {},
): readonly CarouselItem<T>[] {
  const identities = new Set<CarouselId>();
  const records: CarouselItem<T>[] = [];
  items.forEach((value, index) => {
    const object =
      value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    const id = resolvers.getItemId
      ? resolvers.getItemId(value, index)
      : isCarouselId(value)
        ? value
        : object && Object.hasOwn(object, 'id')
          ? object.id
          : undefined;
    if (!isCarouselId(id)) {
      diagnose(`Carousel item ${index} needs a string or finite numeric ID.`);
      return;
    }
    if (identities.has(id)) {
      diagnose(`Duplicate Carousel item ID at source index ${index}.`);
      return;
    }
    identities.add(id);
    const options = resolvers.getItemOptions?.(value, index) ?? {};
    const label =
      resolvers.getItemLabel?.(value, index) ??
      options.label ??
      (object && Object.hasOwn(object, 'label') ? String(object.label) : String(id));
    const delay = options.autoplayDelay;
    if (delay !== undefined && (!Number.isFinite(delay) || delay <= 0))
      diagnose(`Invalid Carousel autoplay delay at source index ${index}.`);
    records.push(
      Object.freeze({
        id,
        index,
        value,
        label,
        disabled: options.disabled === true,
        hidden: false,
        ...(delay !== undefined && Number.isFinite(delay) && delay > 0
          ? { autoplayDelay: delay }
          : {}),
      }),
    );
  });
  return Object.freeze(records);
}

export function nearestCarouselItem(
  items: readonly CarouselItem[],
  index: number,
): CarouselItem | null {
  let nearest: CarouselItem | null = null;
  for (const item of items)
    if (
      !item.disabled &&
      !item.hidden &&
      (!nearest || Math.abs(item.index - index) < Math.abs(nearest.index - index))
    )
      nearest = item;
  return nearest;
}
