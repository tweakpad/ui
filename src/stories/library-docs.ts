import type { ComponentType } from 'react';
import { docId, parseDoc, type ParsedDoc } from '../docs/parse.js';

/**
 * The library's documentation pages (`docs/components/*.mdx`, `docs/motion/<group>/*.mdx`,
 * `docs/widgets/*.mdx`) as Storybook renders them: each page compiled to a component by
 * Storybook's MDX plugin, and read by the page parser from its source, so the Docs page knows the
 * hero, the headings and the tags.
 */
const compiled = import.meta.glob<{ default: ComponentType<{ components?: object }> }>(
  '../../docs/{components,motion/text,motion/surface,widgets}/*.mdx',
  { eager: true },
);
const sources = import.meta.glob<string>(
  '../../docs/{components,motion/text,motion/surface,widgets}/*.mdx',
  {
    eager: true,
    query: '?raw',
    import: 'default',
  },
);

export interface LibraryDoc {
  readonly page: ParsedDoc;
  readonly Content: ComponentType<{ components?: object }>;
}

const byId = new Map<string, LibraryDoc>();
for (const [file, source] of Object.entries(sources)) {
  const id = docId(file);
  byId.set(id, { page: parseDoc(source, id), Content: compiled[file]!.default });
}

/** Every page, in file order. */
export const libraryDocPages: readonly LibraryDoc[] = [...byId.values()];

/**
 * The `parameters.docs` of a story file whose Docs page is the library page `id`
 * (`components/badge`): the page itself for the Docs template, its description for the Title
 * block and its hero as the Default story's copyable source.
 */
export function libraryDocs(id: string) {
  const doc = byId.get(id);
  if (!doc) throw new Error(`no documentation page ${id} under docs/`);
  return {
    library: doc,
    description: { component: doc.page.description },
    source: { code: doc.page.hero?.code ?? '' },
  };
}
