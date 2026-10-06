import type { CleanupScope, Diagnostic } from '../../services.js';
import type { ChangeReason } from '../../types.js';
import type { MediaAvailability } from '../availability.js';
import type { MediaPresentation } from '../presentation.js';
import type { MediaSourcePatch, MediaSourceState, MediaState, MediaStoreConfig } from '../state.js';
import type { MediaTarget, MediaTracksAdapter } from '../target.js';

/** What a feature slice receives while the store is attached to one target. */
export interface MediaFeatureContext {
  readonly media: MediaTarget;
  readonly container: HTMLElement | null;
  readonly adapter: MediaTracksAdapter | null;
  readonly document: Document | undefined;
  readonly window: Window | undefined;
  /** Released synchronously on detach. */
  readonly scope: CleanupScope;
  readonly presentation: MediaPresentation;
  /** Current source values (including internal fields). */
  source(): MediaSourceState;
  /** Current derived snapshot. */
  state(): MediaState;
  config(): MediaStoreConfig;
  /** Writes source values; element-originated writes default to reason `media`. */
  set(patch: MediaSourcePatch, reason?: ChangeReason): void;
  /** Adds a listener released with the scope; a missing target is ignored. */
  listen(
    target: EventTarget | null | undefined,
    type: string,
    listener: (event: Event) => void,
  ): void;
  diagnostic(diagnostic: Diagnostic): void;
  /** Volume probe: whether a written volume persists on this platform. */
  probeVolume(): MediaAvailability;
}

export interface MediaFeature {
  readonly name: string;
  attach(context: MediaFeatureContext): void;
}
