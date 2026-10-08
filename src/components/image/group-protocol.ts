/**
 * The internal contract between `tp-image` and its nearest `tp-image-group` (Foundation §18.17
 * `img-group`). Both sides import only this module, so neither imports the other's class.
 */
import type { ImageLoadStatus } from '../../foundation/image-load.js';
import { composedParent } from '../../foundation/focus.js';

/** What an image offers its group. */
export interface ImageGroupMember {
  readonly element: HTMLElement;
  status(): ImageLoadStatus;
  /** Loaded and decoded, failed, or without a source. */
  settled(): boolean;
  /** The effective reveal effect (the image's own, or the group default). */
  revealing(): boolean;
  revealed(): boolean;
  held(): boolean;
  /** Fetch now instead of waiting for native lazy loading. */
  ensureLoading(): void;
  /** Plays the reveal after `delay` ms; resolves when it has settled. */
  reveal(delay: number): Promise<void>;
  /** Returns instantly to the start state. */
  reset(): void;
  /** Whether reveals are instant here (reduced motion or no intersection support). */
  revealsImmediately(): boolean;
}

/** What a group offers its images. */
export interface ImageGroupHost {
  register(member: ImageGroupMember): () => void;
  /** A member's status, effect, hold or decode readiness changed. */
  update(): void;
  /** The group's default reveal effect tokens. */
  readonly reveal: string;
}

export const imageGroupHost = Symbol('tp-image-group-host');

export type ImageGroupElement = HTMLElement & { [imageGroupHost]?: ImageGroupHost };

/** The nearest `tp-image-group` ancestor of `element` across shadow boundaries, if any. */
export function nearestImageGroup(element: Element): ImageGroupElement | null {
  for (let node = composedParent(element); node; node = composedParent(node))
    if (node.nodeType === 1 && (node as Element).localName === 'tp-image-group')
      return node as ImageGroupElement;
  return null;
}

/** Stagger offsets, in milliseconds, for `count` members revealed in order. */
export function staggerDelays(count: number, stagger: number): number[] {
  const step = Number.isFinite(stagger) ? Math.max(0, stagger) : 0;
  return Array.from({ length: count }, (_, index) => index * step);
}

/** Aggregate loading status of a group's members. */
export function groupLoadingStatus(statuses: readonly ImageLoadStatus[]): {
  status: 'idle' | 'loading' | 'loaded';
  loaded: number;
  failed: number;
  total: number;
} {
  const total = statuses.length;
  const loaded = statuses.filter((status) => status === 'loaded').length;
  const failed = statuses.filter((status) => status === 'error').length;
  const pending = statuses.some((status) => status === 'loading');
  return { status: total === 0 ? 'idle' : pending ? 'loading' : 'loaded', loaded, failed, total };
}

/** The longest `duration + delay` among an element's transitions, in milliseconds. */
export function transitionSpan(style: CSSStyleDeclaration): number {
  const times = (value: string) =>
    value.split(',').map((part) => {
      const text = part.trim();
      const number = Number.parseFloat(text);
      if (!Number.isFinite(number)) return 0;
      return text.endsWith('ms') ? number : number * 1000;
    });
  const durations = times(style.transitionDuration);
  const delays = times(style.transitionDelay);
  return Math.max(
    0,
    ...durations.map((duration, index) => duration + (delays[index % delays.length] ?? 0)),
  );
}
