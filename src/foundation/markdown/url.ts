import type { MarkdownUrlPolicy } from './types.js';

/**
 * The URL policy (Foundation §18.16), shared with every contract that sanitizes imported HTML.
 * The lists are frozen: a consumer reads them and cannot change what the resolve step allows.
 */
export const DEFAULT_LINK_PROTOCOLS: readonly string[] = Object.freeze([
  'http:',
  'https:',
  'mailto:',
  'tel:',
]);
export const DEFAULT_IMAGE_PROTOCOLS: readonly string[] = Object.freeze(['http:', 'https:']);

/**
 * Whether a destination passes a protocol list. Relative references and fragments always pass.
 * Control characters and spaces are ignored when reading the scheme, as browsers do.
 */
export function allowedUrl(url: string, protocols: readonly string[]): boolean {
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url.replace(/[\p{Cc} ]/gu, ''));
  return !scheme || protocols.includes(`${scheme[1]!.toLowerCase()}:`);
}

/** The link protocols of a URL policy: its `links`, else the default link protocols. */
export function linkProtocols(policy: MarkdownUrlPolicy | null | undefined): readonly string[] {
  return policy?.links ?? DEFAULT_LINK_PROTOCOLS;
}
/** The image protocols of a URL policy: its `images`, else the default image protocols. */
export function imageProtocols(policy: MarkdownUrlPolicy | null | undefined): readonly string[] {
  return policy?.images ?? DEFAULT_IMAGE_PROTOCOLS;
}
