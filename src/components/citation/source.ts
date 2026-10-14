import { allowedUrl, DEFAULT_LINK_PROTOCOLS } from '../../foundation/markdown/url.js';

/** Whether an address renders a link: relative references, fragments and the link protocols. */
export function acceptedAddress(href: string | null | undefined): href is string {
  return typeof href === 'string' && href.trim() !== '' && allowedUrl(href, DEFAULT_LINK_PROTOCOLS);
}

/**
 * The host of an absolute web address without a leading `www.`, else an empty string: a relative
 * or fragment address names the current page, not a source.
 */
export function addressHost(href: string | null | undefined, base?: string): string {
  if (!acceptedAddress(href) || !/^\s*(?:https?:)?\/\//i.test(href)) return '';
  try {
    const url = new URL(href, base);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.hostname.replace(/^www\./, '')
      : '';
  } catch {
    return '';
  }
}

/** A citation as the source registry sees it. */
export interface SourceCitation extends Element {
  source: string;
  requestUpdate(): void;
}

const connected = new Set<SourceCitation>();
const listPositions = new WeakMap<Element, number>();

export function trackCitation(citation: SourceCitation): void {
  connected.add(citation);
}

export function untrackCitation(citation: SourceCitation): void {
  connected.delete(citation);
}

/**
 * Asks every citation whose `source` names this one, in the same root, to re-resolve. A removed
 * citation passes the root it was connected to.
 */
export function notifyReferrers(
  citation: Element,
  id = citation.id,
  root: Node = citation.getRootNode(),
): void {
  if (!id) return;
  for (const other of connected)
    if (other !== citation && other.source === id && other.getRootNode() === root)
      other.requestUpdate();
}

/** The position a Citation list assigned to an entry, if any. */
export function listPosition(citation: Element): number | undefined {
  return listPositions.get(citation);
}

export function setListPosition(citation: SourceCitation, position: number | undefined): void {
  if (listPositions.get(citation) === position) return;
  if (position === undefined) listPositions.delete(citation);
  else listPositions.set(citation, position);
  citation.requestUpdate();
}
