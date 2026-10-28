import { LitElement, css, html } from 'lit';
import { isDrawerHost } from '../../foundation/surface-brand.js';
import { clamp } from '../../foundation/converters.js';
import { ObservableStore } from '../../foundation/store.js';
import { nearestOwner } from '../../foundation/portal-ownership.js';
import type { DrawerVisualState } from './types.js';
export const inactiveDrawerState = (): DrawerVisualState => ({
  active: false,
  count: 0,
  progress: 0,
  height: 0,
  swiping: false,
});
/** Nearest Drawer-family service element through the Foundation portal-aware owner walk. */
export function nearestDrawerService<T extends HTMLElement>(
  element: HTMLElement,
  tag: string,
): T | null {
  return nearestOwner(
    element,
    (node): node is T =>
      node instanceof HTMLElement &&
      (node.localName === tag || (tag === 'tp-drawer' && isDrawerHost(node))),
  );
}
/**
 * An optional common ancestor that tracks the open Drawers inside it, so Drawer Indent regions can
 * follow them. It renders no box of its own.
 *
 * @slot - The page content and the Drawers it tracks.
 */
export class TpDrawerProvider extends LitElement {
  static tagName = 'tp-drawer-provider';
  static styles = css`
    :host {
      display: contents;
    }
  `;
  /** The state of the front drawer: whether any is open, how many, swipe progress and height. */
  readonly state = new ObservableStore<DrawerVisualState>(inactiveDrawerState());
  readonly #drawers = new Map<HTMLElement, DrawerVisualState>();
  /** @internal Records a drawer's state. */
  updateDrawer(drawer: HTMLElement, state: DrawerVisualState): void {
    if (state.active) this.#drawers.set(drawer, state);
    else this.#drawers.delete(drawer);
    this.#publish();
  }
  /** @internal Forgets a drawer. */
  removeDrawer(drawer: HTMLElement): void {
    this.#drawers.delete(drawer);
    this.#publish();
  }
  #publish(): void {
    const front = [...this.#drawers.values()].at(-1);
    const next = {
      ...(front ?? inactiveDrawerState()),
      active: this.#drawers.size > 0,
      count: this.#drawers.size,
    };
    if (
      Object.keys(next).some(
        (key) =>
          next[key as keyof DrawerVisualState] !== this.state.value[key as keyof DrawerVisualState],
      )
    )
      this.state.set(next);
  }
  override disconnectedCallback(): void {
    this.#drawers.clear();
    this.state.set(inactiveDrawerState());
    super.disconnectedCallback();
  }
  protected override render() {
    return html`<slot></slot>`;
  }
}
/**
 * A layout region inside a Drawer Provider that follows the open drawers, for pushing the page
 * back while a sheet is open. It is marked `data-active` while a drawer is open and receives
 * `--drawer-swipe-progress`, `--nested-drawers` and `--drawer-height` to style against.
 *
 * @slot - The content of the region.
 */
export class TpDrawerIndent extends LitElement {
  static tagName = 'tp-drawer-indent';
  static styles = css`
    :host {
      display: block;
    }
  `;
  #unsubscribe: (() => void) | undefined;
  override connectedCallback(): void {
    super.connectedCallback();
    this.part.add(this.localName.slice(3));
    this.#unsubscribe = nearestDrawerService<TpDrawerProvider>(
      this,
      'tp-drawer-provider',
    )?.state.subscribe(({ value }) => this.#sync(value), true);
    if (!this.#unsubscribe) this.#sync(inactiveDrawerState());
  }
  #sync(state: DrawerVisualState): void {
    this.toggleAttribute('data-active', state.active);
    this.toggleAttribute('data-inactive', !state.active);
    this.style.setProperty(
      '--drawer-swipe-progress',
      String(clamp(Number.isFinite(state.progress) ? state.progress : 0, 0, 1)),
    );
    this.style.setProperty('--nested-drawers', String(state.count));
    if (state.height > 0) this.style.setProperty('--drawer-height', `${state.height}px`);
    else this.style.removeProperty('--drawer-height');
  }
  override disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#sync(inactiveDrawerState());
    super.disconnectedCallback();
  }
  protected override render() {
    return html`<slot></slot>`;
  }
}
/** A Drawer Indent for the background behind the indented page, styled from the same state. */
export class TpDrawerIndentBackground extends TpDrawerIndent {
  static override tagName = 'tp-drawer-indent-background';
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-drawer-provider': TpDrawerProvider;
    'tp-drawer-indent': TpDrawerIndent;
    'tp-drawer-indent-background': TpDrawerIndentBackground;
  }
}
