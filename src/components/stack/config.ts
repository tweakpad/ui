/** The fixed minimum Stack inline sizes, in rem. */
export const stackBreakpoints = { xs: 0, sm: 30, md: 48, lg: 64, xl: 80 } as const;
/**
 * A breakpoint name in a Stack's responsive values; each applies from its minimum inline size up.
 */
export type StackBreakpoint = keyof typeof stackBreakpoints;
/** A Stack layout value given once, or as a map from breakpoint name to value. */
export type ResponsiveValue<T> = T | Readonly<Partial<Record<StackBreakpoint, T>>>;
/** Whether a Stack lays its children out in a row or a column. */
export type StackDirection = 'row' | 'column';
/** How a Stack aligns its children on the cross axis. */
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
/** How a Stack distributes its children along the main axis. */
export type StackJustify =
  'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
/** Whether a Stack's children wrap onto new lines, and in which direction. */
export type StackWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
/** A spacing token number for the gap between a Stack's children. */
export type StackGap = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
/** A Stack gap as a number or its string form, as an attribute writes it. */
export type StackGapValue = StackGap | `${StackGap}`;
export const stackDefaults = {
  direction: 'column',
  gap: 0,
  align: 'stretch',
  justify: 'start',
  wrap: 'nowrap',
} as const;
export type StackProperty = keyof typeof stackDefaults;
const allowed: Record<StackProperty, readonly (string | number)[]> = {
  direction: ['row', 'column'],
  gap: [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16],
  align: ['start', 'center', 'end', 'stretch', 'baseline'],
  justify: ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'],
  wrap: ['nowrap', 'wrap', 'wrap-reverse'],
};
export const stackKeys = Object.keys(stackDefaults) as StackProperty[];
export function normalizeStackValue(
  key: StackProperty,
  value: unknown,
  report: (message: string) => void,
): unknown {
  const scalar = (input: unknown): string | number | undefined => {
    const candidate =
      key === 'gap' && typeof input === 'string' && input.trim() !== '' ? Number(input) : input;
    if (
      (typeof candidate === 'string' || typeof candidate === 'number') &&
      allowed[key].includes(candidate)
    )
      return candidate;
    report(`Invalid Stack ${key} value.`);
    return undefined;
  };
  if (value === null || value === undefined) return stackDefaults[key];
  if (typeof value === 'object' && !Array.isArray(value)) {
    const result: Partial<Record<StackBreakpoint, string | number>> = {};
    for (const name of Object.keys(value))
      if (!Object.hasOwn(stackBreakpoints, name)) report(`Unknown Stack breakpoint: ${name}.`);
    for (const name of Object.keys(stackBreakpoints) as StackBreakpoint[]) {
      if (!Object.hasOwn(value, name)) continue;
      const entry = scalar((value as Record<string, unknown>)[name]);
      if (entry !== undefined) result[name] = entry;
    }
    return Object.freeze(result);
  }
  return scalar(value) ?? stackDefaults[key];
}
export const stackAttributeConverter = {
  fromAttribute(value: string | null): unknown {
    if (value === null) return undefined;
    if (value.trim().startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  },
  toAttribute(value: unknown): string {
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  },
};
export function stackLayoutCss(values: Record<StackProperty, unknown>): string {
  const properties = {
    direction: 'flex-direction',
    gap: 'gap',
    align: 'align-items',
    justify: 'justify-content',
    wrap: 'flex-wrap',
  };
  const declaration = (key: StackProperty, value: unknown) => {
    const cssValue =
      key === 'gap'
        ? `var(--tp-space-${String(value).replace('.', '-')})`
        : key === 'align' || key === 'justify'
          ? value === 'start'
            ? 'flex-start'
            : value === 'end'
              ? 'flex-end'
              : value
          : value;
    return `${properties[key]}:${cssValue};`;
  };
  const base = stackKeys
    .map((key) =>
      declaration(key, typeof values[key] === 'object' ? stackDefaults[key] : values[key]),
    )
    .join('');
  const responsive = stackKeys.some((key) => typeof values[key] === 'object');
  let css = `${responsive ? ':host{container:tp-stack / inline-size;}' : ''}.root{${base}}`;
  for (const [name, min] of Object.entries(stackBreakpoints)) {
    const declarations = stackKeys
      .flatMap((key) => {
        const value = values[key];
        return value && typeof value === 'object' && Object.hasOwn(value, name)
          ? [declaration(key, (value as Record<string, unknown>)[name])]
          : [];
      })
      .join('');
    if (declarations)
      css += `@container tp-stack (inline-size >= ${min}rem){.root{${declarations}}}`;
  }
  return css;
}
