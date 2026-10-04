import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { shadowReferenceTarget } from './focus.js';
import { componentHandlingPrevented } from './part.js';
import { OwnedAttributes } from './owned-attributes.js';
import { createId } from './id.js';
import { PresenceController } from './presence.js';
import type { PresenceState } from './types.js';

export type CollapsibleRequestReason = 'trigger-press' | 'programmatic';

export interface CollapsibleControllerOptions {
  owner: HTMLElement;
  trigger: () => HTMLElement | null;
  /** Public rendered host; event hooks run here before component handling. */
  activation?: () => HTMLElement | null;
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
export class CollapsibleController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: CollapsibleControllerOptions;
  readonly #presence: PresenceController;
  readonly #triggerId = createId('tp-collapsible-trigger');
  readonly #contentId = createId('tp-collapsible-content');
  #trigger: HTMLElement | null = null;
  #activation: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #open = false;
  #disabled = false;
  #initialized = false;
  #destroyed = false;
  #restoreTrigger: (() => void) | undefined;
  #triggerAttributes: OwnedAttributes | undefined;
  #appliedControls: readonly Element[] | null = null;
  #appliedControlsAttribute: string | null = null;

  constructor(host: ReactiveControllerHost, options: CollapsibleControllerOptions) {
    this.#host = host;
    host.addController(this);
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
    this.#host.removeController(this);
  }

  hostDisconnected(): void {
    this.#unbindTrigger();
    this.#unbindContent();
  }

  readonly #handlePress = (event: Event): void => {
    if (componentHandlingPrevented(event)) return;
    event.preventDefault();
    if (this.#disabled) return;
    this.#options.onOpenRequest?.(!this.#open, 'trigger-press', event);
  };

  readonly #handleFocus = (): void => {
    this.#triggerAttributes?.set(
      'data-focus-visible',
      this.#trigger?.matches(':focus-visible') ? '' : null,
    );
  };

  readonly #handleBlur = (): void => {
    this.#triggerAttributes?.set('data-focus-visible', null);
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
      if (trigger) {
        this.#triggerAttributes = new OwnedAttributes(trigger);
        const controlsAttribute = trigger.getAttribute('aria-controls');
        const controls = trigger.ariaControlsElements;
        this.#restoreTrigger = () => {
          this.#triggerAttributes?.dispose();
          this.#triggerAttributes = undefined;
          const current = trigger.ariaControlsElements;
          if (
            trigger.getAttribute('aria-controls') !== this.#appliedControlsAttribute ||
            (current?.length ?? 0) !== (this.#appliedControls?.length ?? 0) ||
            current?.some((element, index) => element !== this.#appliedControls?.[index])
          )
            return;
          if (controlsAttribute === '' && controls?.length) trigger.ariaControlsElements = controls;
          else if (controlsAttribute === null) trigger.removeAttribute('aria-controls');
          else trigger.setAttribute('aria-controls', controlsAttribute);
        };
      }
      this.#trigger?.addEventListener('focus', this.#handleFocus);
      this.#trigger?.addEventListener('blur', this.#handleBlur);
    }
    const activation = trigger ? (this.#options.activation?.() ?? trigger) : null;
    // Part hooks are rebound during render. Keep their handlers before ours.
    this.#activation?.removeEventListener('click', this.#handlePress);
    this.#activation = activation;
    this.#activation?.addEventListener('click', this.#handlePress);

    const content = this.#options.content();
    if (content !== this.#content) {
      this.#unbindContent();
      this.#content = content;
      this.#content?.addEventListener('beforematch', this.#handleBeforeMatch);
    }
  }

  #unbindTrigger(): void {
    this.#activation?.removeEventListener('click', this.#handlePress);
    this.#activation = null;
    this.#trigger?.removeEventListener('focus', this.#handleFocus);
    this.#trigger?.removeEventListener('blur', this.#handleBlur);
    this.#restoreTrigger?.();
    this.#restoreTrigger = undefined;
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
      const attributes = this.#triggerAttributes!;
      attributes.set('id', trigger.id || this.#triggerId);
      attributes.set('aria-expanded', String(this.#open));
      attributes.set('aria-disabled', String(this.#disabled));
      attributes.set('tabindex', this.#disabled ? '-1' : '0');
      attributes.set('data-panel-open', this.#open ? '' : null);
      if (trigger.localName === 'button') attributes.set('disabled', this.#disabled ? '' : null);
      if (content) {
        content.id ||= this.#contentId;
        trigger.setAttribute('aria-controls', content.id);
        content.setAttribute('aria-labelledby', trigger.id);
        if (trigger.getRootNode() !== content.getRootNode()) {
          trigger.ariaControlsElements = [content];
          content.ariaLabelledByElements = [shadowReferenceTarget(trigger, content.getRootNode())];
        }
      } else {
        trigger.removeAttribute('aria-controls');
      }
    }

    for (const marker of this.#markers()) {
      for (const [name, active] of [
        ['data-open', this.#open],
        ['data-closed', !this.#open],
        ['data-disabled', this.#disabled],
      ] as const) {
        if (marker === trigger) this.#triggerAttributes?.set(name, active ? '' : null);
        else marker.toggleAttribute(name, active);
      }
    }
    this.#appliedControls = trigger?.ariaControlsElements ?? null;
    this.#appliedControlsAttribute = trigger?.getAttribute('aria-controls') ?? null;
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
