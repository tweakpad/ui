import { LitElement, css, html } from 'lit';
import { ObservableStore } from '../../foundation/store.js';
import { observeScroll } from '../../foundation/observation.js';
import { composedParent, deepActiveElement } from '../../foundation/focus.js';
import { nearestDrawerService } from './provider.js';
import type { TpDrawer } from './drawer.js';
export interface DrawerKeyboardGeometry {
  inset: number;
  height: number;
  top: number;
}
/** Optional owner-document viewport observer, shared by every descendant Drawer. */
export class TpDrawerVirtualKeyboardProvider extends LitElement {
  static tagName = 'tp-drawer-virtual-keyboard-provider';
  static styles = css`
    :host {
      display: contents;
    }
  `;
  readonly geometry = new ObservableStore<DrawerKeyboardGeometry>({ inset: 0, height: 0, top: 0 });
  #frame = 0;
  #viewport: VisualViewport | null = null;
  #releaseScroll: (() => void) | null = null;
  override connectedCallback(): void {
    super.connectedCallback();
    this.#viewport = this.ownerDocument.defaultView?.visualViewport ?? null;
    this.#viewport?.addEventListener('resize', this.#schedule);
    // Shared scroll source: one listener on the visual viewport for every subscriber.
    this.#releaseScroll = this.#viewport
      ? observeScroll(
          this.#viewport,
          { scroll: this.#schedule, timing: { immediate: true } },
          this.ownerDocument.defaultView,
        )
      : null;
    this.ownerDocument.defaultView?.addEventListener('resize', this.#schedule);
    this.ownerDocument.addEventListener('focusin', this.#schedule);
    this.ownerDocument.addEventListener('focusout', this.#schedule);
    this.ownerDocument.addEventListener('pointerdown', this.#cancelFrame, true);
    this.#schedule();
  }
  #cancelFrame = (): void => {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  };
  #schedule = (): void => {
    if (!this.isConnected || this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      const win = this.ownerDocument.defaultView!;
      const viewport = this.#viewport;
      const active = deepActiveElement(this.ownerDocument);
      const drawer =
        active instanceof HTMLElement ? nearestDrawerService<TpDrawer>(active, 'tp-drawer') : null;
      const ownsFocus = drawer?.open && nearestDrawerService(drawer, this.localName) === this;
      const editable =
        ownsFocus &&
        active instanceof HTMLElement &&
        (active.isContentEditable ||
          active.matches(
            'textarea,input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])',
          ));
      const keyboard = Boolean(
        editable && viewport && viewport.scale === 1 && win.innerHeight - viewport.height > 60,
      );
      const top = keyboard ? Math.max(0, viewport!.offsetTop) : 0;
      const height = keyboard ? viewport!.height : win.innerHeight;
      const inset = keyboard ? Math.max(0, win.innerHeight - top - height) : 0;
      const old = this.geometry.value;
      if (old.top !== top || old.height !== height || old.inset !== inset)
        this.geometry.set({ top, height, inset });
      // Reveal only in the existing content scroller, without moving the page or
      // replacing native input focus/caret behavior.
      if (keyboard && active instanceof HTMLElement) {
        for (let node = composedParent(active); node; node = composedParent(node)) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches('[data-drawer-content]')) break;
          if (!/(auto|scroll)/.test(getComputedStyle(node).overflowY)) continue;
          const bounds = active.getBoundingClientRect(),
            region = node.getBoundingClientRect();
          const spacing = parseFloat(getComputedStyle(node).scrollPaddingBottom) || 0;
          const bottom = Math.min(top + height, region.bottom) - spacing;
          if (bounds.bottom > bottom) node.scrollTop += bounds.bottom - bottom;
          else if (bounds.top < Math.max(top, region.top))
            node.scrollTop -= Math.max(top, region.top) - bounds.top + spacing;
          break;
        }
      }
    });
  };
  override disconnectedCallback(): void {
    this.#cancelFrame();
    this.#viewport?.removeEventListener('resize', this.#schedule);
    this.#releaseScroll?.();
    this.#releaseScroll = null;
    this.ownerDocument.defaultView?.removeEventListener('resize', this.#schedule);
    this.ownerDocument.removeEventListener('focusin', this.#schedule);
    this.ownerDocument.removeEventListener('focusout', this.#schedule);
    this.ownerDocument.removeEventListener('pointerdown', this.#cancelFrame, true);
    this.geometry.set({ inset: 0, height: 0, top: 0 });
    this.#viewport = null;
    super.disconnectedCallback();
  }
  protected override render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-drawer-virtual-keyboard-provider': TpDrawerVirtualKeyboardProvider;
  }
}
