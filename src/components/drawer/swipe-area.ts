import { css, html, type PropertyValues } from 'lit';
import { isDrawerHost } from '../../foundation/surface-brand.js';
import { TpElement } from '../../foundation/element.js';
import { nearestDrawerService } from './provider.js';
import { oppositeDirection, type DrawerDirection } from './types.js';
import type { TpDrawer } from './drawer.js';
/**
 * A region that opens a closed Drawer with a swipe, such as a strip along the screen edge. Size and
 * place it yourself; it shares the drawer's gesture.
 *
 * @slot - Optional content of the region.
 */
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
  /** The `id` of the drawer to open, when the area is not in that drawer's `swipe-area` slot. */
  for = '';
  /** The drawer to open, as a reference, in place of `for`. */
  owner: TpDrawer | null = null;
  /** The direction of the opening swipe; by default the opposite of the drawer's closing direction. */
  swipeDirection: DrawerDirection | undefined;
  /** The drawer the area opens, from `owner`, `for` or the nearest drawer. */
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
    if (!drawer || !isDrawerHost(drawer) || drawer.open || this.disabled) return;
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

declare global {
  interface HTMLElementTagNameMap {
    'tp-drawer-swipe-area': TpDrawerSwipeArea;
  }
}
