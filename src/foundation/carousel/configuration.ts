import type {
  CarouselOptions,
  CarouselRootOptions,
  CarouselBreakpoint,
  CarouselLayoutOptions,
  CarouselInteractionOptions,
  CarouselNavigationOptions,
  CarouselIndicatorOptions,
  CarouselScrollbarOptions,
  CarouselWheelOptions,
  CarouselKeyboardOptions,
  CarouselVirtualOptions,
  CarouselMessages,
  CarouselLoopOptions,
} from './types.js';

type Defaults<T, K extends keyof T = never> = Required<Omit<T, K>> & Pick<T, K>;
export interface CarouselConfiguration extends CarouselRootOptions {
  layout: Defaults<CarouselLayoutOptions, 'measurementOverride'>;
  interaction: Defaults<CarouselInteractionOptions, 'preventActivation'>;
  navigation: Defaults<CarouselNavigationOptions>;
  indicators: false | Defaults<CarouselIndicatorOptions, 'renderIndicator' | 'renderCustom'>;
  scrollbar: false | Defaults<CarouselScrollbarOptions>;
  mousewheel: false | Defaults<CarouselWheelOptions>;
  keyboard: false | Defaults<CarouselKeyboardOptions>;
  virtual: false | Defaults<CarouselVirtualOptions>;
  autoplayOptions: { reverse: boolean; stopAfterInteraction: boolean };
  loopOptions: Required<CarouselLoopOptions>;
  transport: 'transform' | 'scroll';
  loopMode: 'continuous' | 'rewind';
  breakpoints: Readonly<Record<string, CarouselBreakpoint>>;
  breakpointsBase: NonNullable<CarouselOptions['breakpointsBase']>;
  messages: Defaults<CarouselMessages, 'announce' | 'status'>;
  observation: Required<NonNullable<CarouselOptions['observation']>>;
  loading: Required<NonNullable<CarouselOptions['loading']>>;
}

const defaults: CarouselConfiguration = {
  orientation: 'horizontal',
  loop: false,
  itemsPerMovement: 1,
  autoplay: 0,
  transport: 'transform',
  loopMode: 'continuous',
  breakpoints: {},
  breakpointsBase: 'window',
  layout: {
    itemsPerView: 1,
    gap: 0,
    groupSkip: 0,
    groupAuto: false,
    centered: false,
    centeredBounds: false,
    centerInsufficient: false,
    offsetBefore: 0,
    offsetAfter: 0,
    snapToItemEdge: false,
    roundLengths: false,
    autoHeight: false,
    watchOverflow: true,
  },
  interaction: {
    enabled: true,
    target: 'track',
    simulateMouse: true,
    threshold: 5,
    angle: 45,
    ratio: 1,
    followPointer: true,
    shortSwipes: true,
    longSwipes: true,
    longSwipeRatio: 0.5,
    longSwipeMs: 300,
    allowPrevious: true,
    allowNext: true,
    oneWay: false,
    resistance: true,
    resistanceRatio: 0.85,
    releaseOnEdges: false,
    handle: null,
    noSwipe: true,
    noSwipeSelector: '[data-tp-no-swipe]',
    edgeSwipeDetection: false,
    edgeSwipeThreshold: 20,
    preventStartDefault: true,
    forcePreventStartDefault: false,
    stopMovePropagation: false,
    preventClicks: true,
    preventClickPropagation: true,
    navigateOnItemClick: false,
    grabCursor: false,
    preventInteractionOnTransition: false,
  },
  navigation: {
    enabled: true,
    previous: true,
    next: true,
    previousElement: null,
    nextElement: null,
    icons: true,
    placement: 'footer',
    hideOnClick: false,
  },
  indicators: {
    type: 'fraction',
    clickable: false,
    dynamic: false,
    dynamicCount: 1,
    hideOnClick: false,
    opposite: false,
    formatCurrent: String,
    formatTotal: String,
  },
  scrollbar: false,
  mousewheel: false,
  keyboard: { enabled: true, pageKeys: false, homeEnd: true },
  virtual: false,
  autoplayOptions: { reverse: false, stopAfterInteraction: false },
  loopOptions: { additionalItems: 0, fillGroups: true, preventDuringTransition: false },
  messages: {
    previous: 'Previous slide',
    next: 'Next slide',
    first: 'First slide',
    last: 'Last slide',
    slide: 'slide',
    position: (index, count) => `${index} of ${count}`,
    scrollbar: 'Slide position',
    pause: 'Pause automatic slides',
    resume: 'Resume automatic slides',
  },
  observation: {
    resizeObserver: true,
    windowResize: true,
    observeItemSubtree: false,
    observeParents: false,
  },
  loading: { preload: true, adjacent: 0 },
};
const serviceDefaults = {
  scrollbar: {
    enabled: true,
    draggable: false,
    thumbSize: 'auto',
    visibility: 'always',
    element: null,
    thumbElement: null,
  },
  mousewheel: {
    enabled: true,
    forceToAxis: false,
    releaseOnEdges: false,
    invert: false,
    sensitivity: 1,
    target: 'root',
    thresholdDelta: null,
    thresholdTime: null,
    ignoreSelector: '[data-tp-no-wheel]',
  },
  virtual: { enabled: true, cache: true, before: 0, after: 0, itemSize: 320 },
};
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  Object.prototype.toString.call(value) === '[object Object]';
const own = (value: object, key: string): unknown =>
  Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined;
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value: unknown) => finite(value) && value >= 0;
const positive = (value: unknown) => finite(value) && value > 0;
const integer = (value: unknown) => nonnegative(value) && Number.isInteger(value);
const target = (value: unknown) =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'function' ||
  (value !== null &&
    typeof value === 'object' &&
    (value as Node).nodeType === 1 &&
    typeof (value as EventTarget).addEventListener === 'function');
const percent = /^(?:\d+(?:\.\d*)?|\.\d+)%$/;
const extraKeys: Record<string, readonly string[]> = {
  layout: ['measurementOverride'],
  interaction: ['preventActivation'],
  indicators: ['renderIndicator', 'renderCustom'],
  messages: ['announce', 'status'],
};
const responsive = new Set([
  'orientation',
  'itemsPerMovement',
  'layout',
  'loop',
  'loopMode',
  'loopOptions',
  'navigation',
  'indicators',
  'scrollbar',
  'mousewheel',
  'keyboard',
  'interaction',
]);

function validField(group: string, key: string, value: unknown, fallback: unknown): boolean {
  if (
    ['previousElement', 'nextElement', 'element', 'thumbElement', 'handle', 'target'].includes(key)
  )
    return target(value);
  if (
    [
      'preventActivation',
      'renderIndicator',
      'renderCustom',
      'announce',
      'status',
      'position',
      'formatCurrent',
      'formatTotal',
    ].includes(key)
  )
    return typeof value === 'function';
  if (key === 'measurementOverride')
    return (
      object(value) &&
      Object.keys(value).length > 0 &&
      Object.keys(value).every((k) => ['width', 'height'].includes(k) && positive(value[k]))
    );
  if (key === 'itemsPerView') return value === 'auto' || positive(value);
  if (key === 'gap')
    return (
      nonnegative(value) ||
      (typeof value === 'string' && percent.test(value) && Number.isFinite(parseFloat(value)))
    );
  if (key === 'offsetBefore' || key === 'offsetAfter')
    return nonnegative(value) || typeof value === 'function';
  if (key === 'thumbSize') return value === 'auto' || positive(value);
  if (['groupSkip', 'additionalItems', 'before', 'after', 'adjacent'].includes(key))
    return integer(value);
  if (key === 'dynamicCount') return integer(value) && Number(value) > 0;
  if (['ratio', 'sensitivity', 'itemSize'].includes(key)) return positive(value);
  if (['longSwipeRatio', 'resistanceRatio'].includes(key))
    return nonnegative(value) && Number(value) <= 1;
  if (key === 'angle') return nonnegative(value) && Number(value) <= 90;
  if (key === 'thresholdDelta' || key === 'thresholdTime')
    return value === null || nonnegative(value);
  if (key === 'edgeSwipeDetection') return value === false || value === true || value === 'prevent';
  if (key === 'placement') return ['footer', 'inside', 'outside'].includes(String(value));
  if (key === 'visibility')
    return ['always', 'automatic', 'while-scrolling', 'on-hover'].includes(String(value));
  if (group === 'indicators' && key === 'type')
    return ['bullets', 'fraction', 'progress', 'custom'].includes(String(value));
  if (typeof fallback === 'number') return nonnegative(value);
  return typeof value === typeof fallback;
}

/** Closed, owner-independent merger. References and callbacks are never recursively cloned. */
export function resolveCarouselConfiguration(
  options: CarouselOptions = {},
  root: Partial<CarouselRootOptions> = {},
  breakpoint: string | null = null,
  previous?: CarouselConfiguration,
  diagnose: (message: string) => void = () => {},
  validateEnvironment: (group: string, value: unknown) => boolean = () => true,
): CarouselConfiguration {
  let invalid = false;
  const report = (message: string) => {
    invalid = true;
    diagnose(message);
  };
  const environmentValid = (group: string, value: unknown) => {
    try {
      return validateEnvironment(group, value);
    } catch {
      return false;
    }
  };
  const result = { ...defaults } as unknown as Record<string, unknown>;
  const input = object(options) ? options : {};
  const rootKeys = ['orientation', 'loop', 'itemsPerMovement', 'autoplay'];
  if (!object(options)) report('Carousel options must be an object.');
  for (const key of Object.keys(input))
    if (
      (!Object.hasOwn(defaults, key) || rootKeys.includes(key)) &&
      !['__proto__', 'constructor', 'prototype'].includes(key)
    )
      report(`Unknown Carousel option: ${key}.`);
  const rawBreakpoints = own(input, 'breakpoints');
  const breakpoints = object(rawBreakpoints) ? rawBreakpoints : {};
  if (rawBreakpoints !== undefined && !object(rawBreakpoints))
    report('Invalid Carousel breakpoints.');
  let override: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(breakpoints)) {
    if (
      !validBreakpoint(key) ||
      !object(value) ||
      Object.keys(value).some((field) => !responsive.has(field))
    ) {
      report(`Invalid Carousel breakpoint: ${key}.`);
      continue;
    }
    if (key === breakpoint) override = value;
  }
  for (const [group, fallback] of Object.entries(defaults)) {
    if (
      [
        'orientation',
        'loop',
        'itemsPerMovement',
        'autoplay',
        'breakpoints',
        'breakpointsBase',
        'transport',
        'loopMode',
      ].includes(group)
    )
      continue;
    const base =
      fallback === false ? serviceDefaults[group as keyof typeof serviceDefaults] : fallback;
    const current = object(base) ? { ...base } : {};
    let disabled = fallback === false;
    let bad = false;
    for (const layer of [own(input, group), own(override, group)]) {
      if (layer === undefined) continue;
      if (
        layer === false &&
        ['navigation', 'indicators', 'scrollbar', 'mousewheel', 'keyboard', 'virtual'].includes(
          group,
        )
      ) {
        disabled = true;
        continue;
      }
      if (!object(layer)) {
        bad = true;
        break;
      }
      disabled = false;
      for (const [key, value] of Object.entries(layer)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key) || value === undefined)
          continue;
        if (
          (!Object.hasOwn(current, key) && !extraKeys[group]?.includes(key)) ||
          !validField(group, key, value, current[key])
        ) {
          bad = true;
          break;
        }
        current[key] = value;
      }
    }
    if (bad) {
      report(`Invalid Carousel ${group} group; retaining its coherent defaults.`);
      result[group] = fallback;
    } else if (group === 'navigation')
      result[group] = { ...current, enabled: disabled ? false : current.enabled };
    else
      result[group] =
        disabled || (group === 'virtual' && current.enabled === false)
          ? false
          : Object.freeze(current);
    if (!environmentValid(group, result[group])) {
      report(`Invalid Carousel ${group} environment; retaining coherent configuration.`);
      result[group] = fallback;
    }
  }
  const scalar = (key: string, validate: (v: unknown) => boolean) => {
    let value = rootKeys.includes(key) ? result[key] : (own(input, key) ?? result[key]);
    if (Object.hasOwn(root, key) && own(root, key) !== undefined) value = own(root, key);
    if (own(override, key) !== undefined) value = own(override, key);
    if (!validate(value) || !environmentValid(key, value)) report(`Invalid Carousel ${key}.`);
    else result[key] = value;
  };
  scalar('orientation', (value) => value === 'horizontal' || value === 'vertical');
  scalar('loop', (value) => typeof value === 'boolean');
  scalar('itemsPerMovement', (value) => integer(value) && Number(value) > 0);
  scalar('autoplay', nonnegative);
  scalar('transport', (value) => value === 'transform' || value === 'scroll');
  scalar('loopMode', (value) => value === 'continuous' || value === 'rewind');
  scalar(
    'breakpointsBase',
    (value) => value === 'window' || value === 'container' || (value !== null && target(value)),
  );
  result.breakpoints = Object.freeze({ ...breakpoints });
  const config = result as unknown as CarouselConfiguration;
  if (config.transport === 'scroll') {
    const transformOnly = new Set([
      'target',
      'simulateMouse',
      'threshold',
      'angle',
      'ratio',
      'followPointer',
      'shortSwipes',
      'longSwipes',
      'longSwipeRatio',
      'longSwipeMs',
      'oneWay',
      'resistance',
      'resistanceRatio',
      'releaseOnEdges',
      'handle',
      'noSwipe',
      'noSwipeSelector',
      'edgeSwipeDetection',
      'edgeSwipeThreshold',
      'preventStartDefault',
      'forcePreventStartDefault',
      'stopMovePropagation',
      'preventClicks',
      'preventClickPropagation',
      'grabCursor',
      'preventActivation',
    ]);
    const inactive = new Set<string>();
    for (const layer of [own(input, 'interaction'), own(override, 'interaction')])
      if (object(layer))
        for (const key of Object.keys(layer))
          if (transformOnly.has(key) && layer[key] !== undefined) inactive.add(key);
    if (inactive.size)
      diagnose(
        `Carousel native scroll transport does not use explicit transform interaction options: ${[...inactive].join(', ')}.`,
      );
  }
  if (
    (config.layout.groupAuto &&
      (config.layout.itemsPerView !== 'auto' || config.itemsPerMovement !== 1)) ||
    (config.layout.centeredBounds &&
      (!config.layout.centered || config.loop || config.indicators !== false)) ||
    (config.layout.centerInsufficient && config.loop) ||
    (config.layout.autoHeight && config.orientation === 'vertical')
  ) {
    report('Incompatible Carousel layout options.');
    config.layout = defaults.layout;
  }
  if (config.indicators && config.indicators.type === 'custom' && !config.indicators.renderCustom) {
    report('Custom Carousel indicators require renderCustom.');
    config.indicators = defaults.indicators;
  }
  if (
    config.indicators &&
    ((config.indicators.type !== 'bullets' &&
      (config.indicators.dynamic || config.indicators.clickable)) ||
      (config.indicators.type !== 'progress' && config.indicators.opposite))
  ) {
    diagnose('Carousel indicator options are inactive for the chosen type.');
  }
  if (
    config.navigation.previousElement !== null &&
    config.navigation.previousElement === config.navigation.nextElement
  ) {
    report('One Carousel element cannot be both previous and next.');
    config.navigation = defaults.navigation;
  }
  return invalid && previous ? previous : Object.freeze(config);
}

function validBreakpoint(key: string): boolean {
  return key.startsWith('@')
    ? /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(key.slice(1)) && positive(Number(key.slice(1)))
    : /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(key) && nonnegative(Number(key));
}
export function matchCarouselBreakpoint(
  breakpoints: Readonly<Record<string, unknown>>,
  width: number,
  height: number,
): string | null {
  let match: string | null = null;
  let highest = -1;
  if (!nonnegative(width) || !nonnegative(height)) return null;
  for (const key of Object.keys(breakpoints)) {
    if (!validBreakpoint(key)) continue;
    const threshold = key.startsWith('@') ? Number(key.slice(1)) * height : Number(key);
    if (threshold <= width && threshold >= highest) {
      highest = threshold;
      match = key;
    }
  }
  return match;
}
