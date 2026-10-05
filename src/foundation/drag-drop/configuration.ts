import type { ManagerOptions } from './types.js';
import { validateTransition } from './motion.js';

/** Pure validation precedes all listener, registry and style acquisition. */
export function validateConfiguration(options: ManagerOptions, owner?: Element): void {
  if (!options || typeof options !== 'object')
    throw new TypeError('Drag options must be an object.');
  for (const [key, method] of [
    ['sensors', 'bind'],
    ['modifiers', 'apply'],
  ] as const) {
    const input = options[key];
    if (input === undefined || typeof input === 'function') continue;
    if (
      !Array.isArray(input) ||
      input.some(
        (entry) => typeof entry !== 'function' && (!entry || typeof entry[method] !== 'function'),
      )
    )
      throw new TypeError(
        `${key} must be an array of instances/factories or a defaults transform.`,
      );
  }
  if (
    options.feedback !== undefined &&
    typeof options.feedback !== 'function' &&
    !['default', 'clone', 'move', 'none'].includes(options.feedback)
  )
    throw new TypeError('Unknown feedback mode.');
  if (
    options.overlayDisabled !== undefined &&
    !['boolean', 'function'].includes(typeof options.overlayDisabled)
  )
    throw new TypeError('overlayDisabled must be boolean or a predicate.');
  if (
    options.rootElement !== undefined &&
    typeof options.rootElement !== 'function' &&
    options.rootElement?.nodeType !== 1
  )
    throw new TypeError('rootElement must be an element or resolver.');
  const overlay = options.overlay;
  if (overlay != null) {
    const element = 'nodeType' in overlay ? overlay : (overlay as { element?: Element }).element;
    if (element?.nodeType !== 1)
      throw new TypeError('overlay must be an element, an overlay input or null.');
    if (element !== overlay) {
      const animation = (overlay as { dropAnimation?: unknown }).dropAnimation;
      if (animation != null && typeof animation !== 'object' && typeof animation !== 'function')
        throw new TypeError('Overlay drop animation must be an object, callback or null.');
      if (animation && typeof animation === 'object') validateTransition(animation, owner);
    }
  }
  for (const value of [
    options.keyboardTransition,
    typeof options.dropAnimation === 'function' ? undefined : options.dropAnimation,
  ]) {
    if (value != null && typeof value !== 'object')
      throw new TypeError('Transition must be an object or null.');
    validateTransition(value, owner);
  }
  const auto = options.autoScroll;
  if (auto !== undefined && typeof auto !== 'boolean' && (!auto || typeof auto !== 'object'))
    throw new TypeError('autoScroll must be boolean or options.');
  if (typeof auto === 'object') {
    if (
      auto.acceleration !== undefined &&
      (!Number.isFinite(auto.acceleration) || auto.acceleration < 0)
    )
      throw new RangeError('Scroll acceleration must be finite and nonnegative.');
    const threshold = auto.threshold;
    if (
      threshold !== undefined &&
      !(typeof threshold === 'number' ? [threshold] : [threshold?.x, threshold?.y]).every(
        (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1,
      )
    )
      throw new RangeError('Scroll thresholds must be finite in [0,1].');
  }
  const accessibility = options.accessibility;
  if (accessibility !== undefined && accessibility !== false) {
    if (!accessibility || typeof accessibility !== 'object')
      throw new TypeError('accessibility must be false or options.');
    if (
      accessibility.debounce !== undefined &&
      (!Number.isFinite(accessibility.debounce) || accessibility.debounce < 0)
    )
      throw new RangeError('Announcement debounce must be finite and nonnegative.');
    for (const value of [
      accessibility.id,
      accessibility.idPrefix?.description,
      accessibility.idPrefix?.announcement,
    ])
      if (value !== undefined && (typeof value !== 'string' || !value.trim() || /\s/.test(value)))
        throw new TypeError('Accessibility identifiers must be nonempty tokens.');
  }
  if (
    options.instructions !== undefined &&
    (!options.instructions || typeof options.instructions.draggable !== 'string')
  )
    throw new TypeError('Instructions require draggable text.');
  if (
    options.announcements !== undefined &&
    (!options.announcements ||
      typeof options.announcements !== 'object' ||
      Object.values(options.announcements).some(
        (entry) => entry !== undefined && typeof entry !== 'function',
      ))
  )
    throw new TypeError('Announcements must be callbacks.');
}

/** Only declared partial object options merge; arrays and factories replace. */
export function mergeConfiguration<T extends ManagerOptions>(base: T, override: Partial<T>): T {
  const result = {
    ...base,
    ...Object.fromEntries(Object.entries(override).filter(([, value]) => value !== undefined)),
  } as T;
  for (const key of [
    'keyboardTransition',
    'dropAnimation',
    'autoScroll',
    'accessibility',
    'instructions',
    'announcements',
  ] as const) {
    const a = base[key],
      b = override[key];
    if (a && b && typeof a === 'object' && typeof b === 'object')
      (result as Record<string, unknown>)[key] = { ...a, ...b };
  }
  if (
    base.accessibility &&
    override.accessibility &&
    base.accessibility.idPrefix &&
    override.accessibility.idPrefix
  )
    result.accessibility = {
      ...(result.accessibility as object),
      idPrefix: { ...base.accessibility.idPrefix, ...override.accessibility.idPrefix },
    };
  return result;
}
