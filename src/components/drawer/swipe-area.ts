import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { nearestDrawerService } from './provider.js';
import { oppositeDirection, type DrawerDirection } from './types.js';
import type { TpDrawer } from './drawer.js';
/** Optional, consumer-sized opening region. It shares the owner's gesture state. */
export class TpDrawerSwipeArea extends TpElement {
  static tagName = 'tp-drawer-swipe-area';
  static override properties = {
    ...TpElement.properties,
    for: { type: String },
    owner: { attribute: false },
    swipeDirection: { type: String, attribute: 'swipe-direction' },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }
    `,
  ];
  for = '';
  owner: TpDrawer | null = null;
  swipeDirection: DrawerDirection | undefined;
  get drawer(): TpDrawer | null {
    return (
      this.owner ??
      (this.for
        ? (this.ownerDocument.getElementById(this.for) as TpDrawer | null)
        : nearestDrawerService<TpDrawer>(this, 'tp-drawer'))
    );
  }
  #subscribed: TpDrawer | null = null;
  #unsubscribe: (() => void) | undefined;
  #bindOwner(): void {
    const drawer = this.drawer;
    if (drawer === this.#subscribed) return;
    this.#subscribed?.gesture.cancel();
    this.#unsubscribe?.();
    this.#subscribed = drawer;
    this.#unsubscribe = drawer?.visualState.subscribe(({ value }) => {
      this.toggleAttribute('data-open', drawer.open);
      this.toggleAttribute('data-closed', !drawer.open);
      this.toggleAttribute('data-swiping', value.swiping);
      this.requestUpdate();
    }, true);
  }
  #start = (event: Event): void => {
    this.#bindOwner();
    const drawer = this.drawer;
    if (!drawer || drawer.localName !== 'tp-drawer' || drawer.open || this.disabled) return;
    drawer.startSwipe(
      event as PointerEvent | TouchEvent,
      this,
      true,
      this.swipeDirection ?? oppositeDirection[drawer.swipeDirection],
    );
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.part.add('drawer-swipe-area');
    this.addEventListener('pointerdown', this.#start);
    this.addEventListener('touchstart', this.#start, { passive: false });
  }
  override disconnectedCallback(): void {
    this.drawer?.gesture.cancel();
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#subscribed = null;
    this.removeEventListener('pointerdown', this.#start);
    this.removeEventListener('touchstart', this.#start);
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#bindOwner();
    this.toggleAttribute('data-disabled', this.disabled);
    this.dataset.swipeDirection =
      this.swipeDirection ?? (this.drawer ? oppositeDirection[this.drawer.swipeDirection] : 'up');
    if ((changed.has('disabled') && this.disabled) || changed.has('swipeDirection'))
      this.drawer?.gesture.cancel();
    this.style.touchAction = (
      this.swipeDirection ?? (this.drawer ? oppositeDirection[this.drawer.swipeDirection] : 'up')
    ).match(/left|right/)
      ? 'pan-y'
      : 'pan-x';
  }
  protected override render() {
    return html`<slot></slot>`;
  }
}
