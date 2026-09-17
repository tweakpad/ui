import type { ReactiveControllerHost } from 'lit';
import { createId } from './id.js';
import { PresenceController } from './presence.js';
import type { PresenceState } from './types.js';

export type CollapsibleRequestReason = 'trigger-press' | 'programmatic';

export interface CollapsibleControllerOptions {
  owner: HTMLElement;
  trigger: () => HTMLElement | null;
  content: () => HTMLElement | null;
  markers?: () => Iterable<HTMLElement | null>;
  keepMounted?: () => boolean;
  hiddenUntilFound?: () => boolean;
  onOpenRequest?: (open: boolean, reason: CollapsibleRequestReason, sourceEvent: Event) => void;
  onStateChange?: (state: PresenceState) => void;
  onComplete?: (open: boolean) => void;
}

/**
 * Shared disclosure behavior for Collapsible and controls that specialize it.
 *
 * The consumer remains the only owner of open state. This controller binds the
 * Trigger–Content relationship, activation, disabled state, presence, and
 * cleanup to that externally supplied state.
 */
export class CollapsibleController {
  readonly #options: CollapsibleControllerOptions;
  readonly #presence: PresenceController;
  readonly #triggerId = createId('tp-collapsible-trigger');
  readonly #contentId = createId('tp-collapsible-content');
  #trigger: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #open = false;
  #disabled = false;
  #initialized = false;
  #destroyed = false;

  constructor(host: ReactiveControllerHost, options: CollapsibleControllerOptions) {
    this.#options = options;
    this.#presence = new PresenceController(host, {
      surface: () => this.#content,
      keepMounted: () => this.#retainsContent(),
      onStateChange: (state) => {
        this.#applyPresenceState(state);
        this.#options.onStateChange?.(state);
      },
      onComplete: (open) => this.#options.onComplete?.(open),
    });
  }

  get open(): boolean {
    return this.#open;
  }

  get initialized(): boolean {
    return this.#initialized;
  }

  get state(): PresenceState {
    return this.#presence.state;
  }

  get mounted(): boolean {
    return this.#presence.mounted;
  }

  update(open: boolean, disabled = false): void {
    if (this.#destroyed) return;
    this.#open = open;
    this.#disabled = disabled;
    this.#initialized = true;
    this.#bindElements();
    this.#applyRelationship();
    this.#presence.setPresent(open);
    if (!open && this.#presence.state === 'retained' && !this.#retainsContent()) {
      this.#presence.completeExit();
    }
    this.#applyPresenceState(this.#presence.state);
  }

  trackCompletion(completion: PromiseLike<void>): void {
    this.#presence.trackCompletion(completion);
  }

  completeExit(): void {
    this.#presence.completeExit();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#unbindTrigger();
    this.#unbindContent();
    this.#presence.destroy();
  }

  readonly #handlePress = (event: Event): void => {
    event.preventDefault();
    if (this.#disabled) return;
    this.#options.onOpenRequest?.(!this.#open, 'trigger-press', event);
  };

  readonly #handleFocus = (): void => {
    this.#trigger?.toggleAttribute('data-focus-visible', this.#trigger.matches(':focus-visible'));
  };

  readonly #handleBlur = (): void => {
    this.#trigger?.removeAttribute('data-focus-visible');
  };

  readonly #handleBeforeMatch = (event: Event): void => {
    if (this.#disabled || this.#open) return;
    this.#options.onOpenRequest?.(true, 'programmatic', event);
  };

  #bindElements(): void {
    const trigger = this.#options.trigger();
    if (trigger !== this.#trigger) {
      this.#unbindTrigger();
      this.#trigger = trigger;
      this.#trigger?.addEventListener('click', this.#handlePress);
      this.#trigger?.addEventListener('focus', this.#handleFocus);
      this.#trigger?.addEventListener('blur', this.#handleBlur);
    }

    const content = this.#options.content();
    if (content !== this.#content) {
      this.#unbindContent();
      this.#content = content;
      this.#content?.addEventListener('beforematch', this.#handleBeforeMatch);
    }
  }

  #unbindTrigger(): void {
    this.#trigger?.removeEventListener('click', this.#handlePress);
    this.#trigger?.removeEventListener('focus', this.#handleFocus);
    this.#trigger?.removeEventListener('blur', this.#handleBlur);
    this.#trigger = null;
  }

  #unbindContent(): void {
    this.#content?.removeEventListener('beforematch', this.#handleBeforeMatch);
    this.#content = null;
  }

  #applyRelationship(): void {
    const trigger = this.#trigger;
    const content = this.#content;
    if (trigger) {
      trigger.id ||= this.#triggerId;
      trigger.setAttribute('aria-expanded', String(this.#open));
      trigger.setAttribute('aria-disabled', String(this.#disabled));
      trigger.tabIndex = this.#disabled ? -1 : 0;
      trigger.toggleAttribute('data-panel-open', this.#open);
      if (trigger instanceof HTMLButtonElement) trigger.disabled = this.#disabled;
      if (content) {
        content.id ||= this.#contentId;
        trigger.setAttribute('aria-controls', content.id);
        content.setAttribute('aria-labelledby', trigger.id);
      } else {
        trigger.removeAttribute('aria-controls');
      }
    }

    for (const marker of this.#markers()) {
      marker.toggleAttribute('data-open', this.#open);
      marker.toggleAttribute('data-closed', !this.#open);
      marker.toggleAttribute('data-disabled', this.#disabled);
    }
  }

  #applyPresenceState(state: PresenceState): void {
    const content = this.#content;
    if (!content) return;
    content.dataset.state = state;
    content.toggleAttribute('data-starting-style', state === 'starting');
    content.toggleAttribute('data-ending-style', state === 'ending');
    if (state === 'starting' || state === 'open' || state === 'ending') {
      content.removeAttribute('hidden');
      return;
    }
    if (state === 'retained' && this.#options.hiddenUntilFound?.()) {
      content.setAttribute('hidden', 'until-found');
      return;
    }
    content.hidden = true;
  }

  #markers(): HTMLElement[] {
    return [
      ...new Set([
        this.#options.owner,
        this.#trigger,
        this.#content,
        ...(this.#options.markers?.() ?? []),
      ]),
    ].filter((element): element is HTMLElement => element instanceof HTMLElement);
  }

  #retainsContent(): boolean {
    return Boolean(this.#options.keepMounted?.() || this.#options.hiddenUntilFound?.());
  }
}
