import type { Manifest } from './api.js';
import { elementDeclaration } from './api.js';

export interface RelatedPages {
  /** Pages of the components this one renders. */
  readonly renders: readonly string[];
  /** Pages of the components that render this one. */
  readonly renderedBy: readonly string[];
}

/** A page's identity as far as relations go: its id and the tags it documents. */
export interface RelatablePage {
  readonly id: string;
  readonly tag: string;
  readonly parts: readonly string[];
}

/**
 * The Related section of every page, derived from the manifest's `renders` field (each element's
 * `elementDependencies`, up its class chain) and never written by hand. A page relates to the
 * pages that own the tags its elements render, whether those tags are main tags or constituent
 * parts; relations inside one page (a table rendering its own rows) are not listed. Lists keep
 * the order of `pages`.
 */
export function relatedPages(
  manifest: Manifest,
  pages: readonly RelatablePage[],
): Map<string, RelatedPages> {
  const owner = new Map<string, string>();
  for (const page of pages)
    for (const tag of [page.tag, ...page.parts]) if (!owner.has(tag)) owner.set(tag, page.id);
  const order = new Map(pages.map((page, index) => [page.id, index]));
  const sorted = (ids: Iterable<string>) =>
    [...new Set(ids)].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  const renders = new Map<string, string[]>();
  for (const page of pages) {
    const targets = new Set<string>();
    for (const tag of [page.tag, ...page.parts])
      for (const rendered of elementDeclaration(manifest, tag)?.renders ?? []) {
        const id = owner.get(rendered);
        if (id && id !== page.id) targets.add(id);
      }
    renders.set(page.id, sorted(targets));
  }
  const renderedBy = new Map<string, string[]>(pages.map((page) => [page.id, []]));
  for (const [id, targets] of renders)
    for (const target of targets) renderedBy.get(target)?.push(id);

  return new Map(
    pages.map((page) => [
      page.id,
      { renders: renders.get(page.id) ?? [], renderedBy: sorted(renderedBy.get(page.id) ?? []) },
    ]),
  );
}
