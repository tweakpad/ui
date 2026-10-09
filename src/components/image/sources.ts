/** Authored `<source>` children of Image, mirrored into its `<picture>` (Foundation §18.17). */

export const SOURCE_ATTRIBUTES = ['media', 'type', 'srcset', 'sizes', 'width', 'height'] as const;

export type ImageSourceRecord = Readonly<
  Record<(typeof SOURCE_ATTRIBUTES)[number], string | undefined>
>;

/** The host's `<source>` children in order, by their request attributes. */
export function readSources(host: Element): ImageSourceRecord[] {
  const records: ImageSourceRecord[] = [];
  for (const child of host.children) {
    if (child.localName !== 'source') continue;
    const record = {} as Record<(typeof SOURCE_ATTRIBUTES)[number], string | undefined>;
    for (const name of SOURCE_ATTRIBUTES) record[name] = child.getAttribute(name) ?? undefined;
    records.push(record);
  }
  return records;
}

/** Whether a srcset lists width (`w`) descriptors, whose selection depends on `sizes`. */
export function hasWidthDescriptors(srcset: string | null | undefined): boolean {
  return Boolean(srcset?.split(',').some((candidate) => /\s\d+w$/.test(candidate.trim())));
}
