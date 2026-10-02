import type { ReactiveControllerHost } from 'lit';
import { PresenceController } from '../../foundation/presence.js';
import { OwnedAttributes } from './owned-attributes.js';

/** Owns a panel's mount location while retaining the exact consumer-authored node. */
export class TabsPanel {
  readonly anchor: Comment;
  readonly storage: DocumentFragment;
  readonly attributes: OwnedAttributes;
  readonly presence: PresenceController;
  selected = false;
  keepMounted = false;
  constructor(
    readonly element: HTMLElement,
    host: ReactiveControllerHost,
    changed: () => void,
  ) {
    this.anchor = element.ownerDocument.createComment('tp-tabs-panel');
    this.storage = element.ownerDocument.createDocumentFragment();
    this.attributes = new OwnedAttributes(element);
    element.before(this.anchor);
    this.presence = new PresenceController(host, {
      surface: () => element,
      keepMounted: () => this.keepMounted,
      onStateChange: () => {
        this.apply();
        changed();
      },
      onComplete: (open) =>
        element.dispatchEvent(
          new CustomEvent('tp-presence-complete', {
            bubbles: true,
            composed: true,
            detail: { present: open },
          }),
        ),
    });
  }
  update(selected: boolean, keepMounted: boolean): void {
    this.selected = selected;
    this.keepMounted = keepMounted;
    this.presence.setPresent(selected);
    this.apply();
    // Without rendered exit motion the absent/retained state is synchronous.
    if (
      !selected &&
      this.presence.state === 'ending' &&
      !this.element
        .getAnimations({ subtree: true })
        .some((a) => a.playState === 'running' || a.pending)
    ) {
      this.presence.completeExit();
    }
  }
  apply(): void {
    const state = this.presence.state;
    if (state === 'absent') {
      if (this.element.parentNode !== this.storage) this.storage.append(this.element);
    } else if (this.anchor.parentNode && this.element.previousSibling !== this.anchor) {
      this.anchor.after(this.element);
    }
    this.attributes.set('hidden', state === 'absent' || state === 'retained' ? '' : null);
    this.attributes.set('inert', this.selected ? null : '');
    this.attributes.set('aria-hidden', this.selected ? null : 'true');
    this.attributes.set('tabindex', this.selected ? '0' : '-1');
    this.attributes.set('data-selected', this.selected ? '' : null);
    this.attributes.set('data-hidden', this.selected ? null : '');
    this.attributes.set('data-starting-style', state === 'starting' ? '' : null);
    this.attributes.set('data-ending-style', state === 'ending' ? '' : null);
  }
  destroy(restore = true): void {
    this.presence.destroy();
    if (restore && this.anchor.parentNode && this.element.parentNode === this.storage)
      this.anchor.after(this.element);
    this.anchor.remove();
    this.attributes.restore();
  }
}
