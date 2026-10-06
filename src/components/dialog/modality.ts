import {
  resolvePortalContainer,
  type OwnedPortalContainer,
} from '../../foundation/owned-portal.js';
import type { OutsideInertScope } from '../../foundation/outside-inert.js';

/**
 * Dialog-family modality.
 *
 * - `modal`: document modality. Outside content is inert, focus is trapped, page scroll is locked
 *   and the surface renders in the native top layer.
 * - `container`: modality scoped to the `container` element. The surface renders inside that
 *   container; only the container's other content is inert; focus is trapped; page scroll is not
 *   locked and content outside the container stays interactive.
 * - `trap-focus-only`: focus is trapped without inertness, backdrop or scroll lock.
 * - `non-modal`: outside interaction and normal tab order are preserved.
 */
export type DialogModality = 'modal' | 'container' | 'trap-focus-only' | 'non-modal';
export const dialogModalities: readonly DialogModality[] = [
  'modal',
  'container',
  'trap-focus-only',
  'non-modal',
];

/** Normalize an authored value against the values a family member supports (fallback `modal`). */
export function normalizeDialogModality(
  value: unknown,
  supported: readonly DialogModality[] = dialogModalities,
): { modality: DialogModality; unsupported: boolean } {
  if (supported.includes(value as DialogModality))
    return { modality: value as DialogModality, unsupported: false };
  return {
    modality: 'modal',
    unsupported: dialogModalities.includes(value as DialogModality),
  };
}

export interface ResolvedDialogModality {
  /** The modality actually applied. */
  modality: DialogModality;
  /** The isolated boundary for `container` modality; null for document-wide policies. */
  scope: OutsideInertScope | null;
  /** Set when the requested modality cannot be applied and the document modality is used. */
  diagnostic?: string;
}

/**
 * Resolve the applied modality. Container modality needs a container in the dialog's owner
 * document that the surface is actually rendered into; otherwise it falls back to document
 * modality so the surface remains isolated rather than silently non-modal.
 */
export function resolveDialogModality(options: {
  requested: DialogModality;
  container: OwnedPortalContainer;
  ownerDocument: Document;
  /** The portal could not mount into the container and the surface uses the top layer. */
  portalFallback?: boolean;
}): ResolvedDialogModality {
  if (options.requested !== 'container') return { modality: options.requested, scope: null };
  const target = resolvePortalContainer(options.container);
  if (!target)
    return {
      modality: 'modal',
      scope: null,
      diagnostic: 'Container modality requires a container; using document modality.',
    };
  if (target.ownerDocument !== options.ownerDocument || options.portalFallback)
    return {
      modality: 'modal',
      scope: null,
      diagnostic:
        'Container modality requires a container in the owner document; using document modality.',
    };
  return { modality: 'container', scope: target };
}

/** Whether a modality isolates content (backdrop, inertness, no outside dismissal). */
export function isolatingModality(modality: DialogModality | undefined): boolean {
  return modality === 'modal' || modality === 'container';
}
