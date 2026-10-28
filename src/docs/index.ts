/**
 * `@tweakpad/ui/docs`: the tooling behind the library's documentation pages, DOM-free so build
 * steps and tests run it in Node. The renderings (Storybook, the website) read the pages with
 * `parseDoc`, print API sections with `elementApi`, derive Related sections with `relatedPages`
 * and run previews with the preview runtime; `@tweakpad/ui/docs.json` is the built index of every
 * page, and `@tweakpad/ui/docs/vite` the plugin that keeps example indentation through MDX.
 */
export * from './parse.js';
export * from './api.js';
export * from './related.js';
export * from './preview-runtime.js';
export * from './token-catalog.js';

import type { ParsedDoc } from './parse.js';
import type { RelatedPages } from './related.js';
import type { TokenCatalogFamily } from './token-catalog.js';

/** A page of the built index: the parsed page and its derived relations. */
export interface DocPage extends ParsedDoc {
  readonly file: string;
  readonly related: RelatedPages;
}

/** `dist/docs.json`, written by the library build. */
export interface DocsIndex {
  readonly version: string;
  /** Components then widgets, in catalog order. */
  readonly pages: readonly DocPage[];
  readonly tokens: readonly TokenCatalogFamily[];
}
