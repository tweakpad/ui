import type { MarkdownUrlPolicy } from './types.js';

export const DEFAULT_LINK_PROTOCOLS: readonly string[] = ['http:', 'https:', 'mailto:', 'tel:'];
export const DEFAULT_IMAGE_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/**
 * Whether a destination passes a protocol list. Relative references and fragments always pass.
 * Control characters and spaces are ignored when reading the scheme, as browsers do.
 */
export function allowedUrl(url: string, protocols: readonly string[]): boolean {
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url.replace(/[\p{Cc} ]/gu, ''));
  return !scheme || protocols.includes(`${scheme[1]!.toLowerCase()}:`);
}

export function linkProtocols(policy: MarkdownUrlPolicy | null | undefined): readonly string[] {
  return policy?.links ?? DEFAULT_LINK_PROTOCOLS;
}
export function imageProtocols(policy: MarkdownUrlPolicy | null | undefined): readonly string[] {
  return policy?.images ?? DEFAULT_IMAGE_PROTOCOLS;
}
