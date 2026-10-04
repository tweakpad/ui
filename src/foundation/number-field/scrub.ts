import { css, html } from 'lit';
import { CleanupScope } from '../services.js';
import { OwnedPortal } from '../owned-portal.js';
import { OwnedAttributes } from '../owned-attributes.js';
import { OwnedStyles } from '../owned-styles.js';
import { componentHandlingPrevented } from '../part.js';
import type { NumberFieldState } from './state.js';

export interface NumberFieldScrubOptions {
  direction?: 'horizontal' | 'vertical';
  pixelSensitivity?: number;
  teleportDistance?: number;
}
export interface NumberFieldCursorOptions {
  retain?: boolean;
}
interface Ports {
  state: NumberFieldState;
  disabled(): boolean;
  focus(): void;
  changed(): void;
}

/** Pointer geometry for NumberField; number proposals remain owned by NumberFieldState. */
export class NumberFieldScrub {
  readonly #scope = new CleanupScope();
  readonly #attributes: OwnedAttributes;
  readonly #styles: OwnedStyles;
  #gesture: CleanupScope | undefined;
  #pointer: number | undefined;
  #options: NumberFieldScrubOptions;
  #cursor:
    | {
        element: HTMLElement;
        retain: boolean;
        marker: Comment;
        portal: OwnedPortal;
        attributes: OwnedAttributes;
      }
    | undefined;
  #cursorPoint = { x: 0, y: 0 };
  #disposed = false;
  constructor(
    readonly element: HTMLElement,
    readonly ports: Ports,
    options: NumberFieldScrubOptions = {},
  ) {
    this.#validate(options);
    this.#options = { ...options };
    this.#attributes = new OwnedAttributes(element);
    this.#styles = new OwnedStyles(element);
    this.#attributes.set('role', 'presentation');
    for (const [property, value] of [
      ['touch-action', 'none'],
      ['user-select', 'none'],
    ] as const) {
      this.#styles.set(property, value);
    }
    this.#scope.listen(element, 'pointerdown', this.#down);
  }
  get active(): boolean {
    return this.#pointer !== undefined;
  }
  update(options: Partial<NumberFieldScrubOptions>): void {
    if (this.#disposed) return;
    const next = { ...this.#options, ...options };
    this.#validate(next);
    this.cancel();
    this.#options = next;
  }
  registerCursor(element: HTMLElement, options: NumberFieldCursorOptions = {}): () => void {
    if (this.#disposed || this.#cursor) throw new Error('ScrubArea supports one cursor.');
    if (element.parentNode !== this.element)
      throw new Error('Cursor must be a direct child of ScrubArea.');
    const marker = element.ownerDocument.createComment('NumberField scrub cursor');
    element.before(marker);
    const attributes = new OwnedAttributes(element);
    attributes.set('aria-hidden', 'true');
    attributes.set('role', 'presentation');
    const cursor = (this.#cursor = {
      element,
      marker,
      attributes,
      retain: !!options.retain,
      portal: new OwnedPortal(
        this.element,
        css`
          :host {
            position: fixed;
            inset: 0 auto auto 0;
            pointer-events: none;
            margin: 0;
            padding: 0;
            border: 0;
            background: transparent;
            overflow: visible;
          }
        `,
      ),
    });
    if (!cursor.retain) element.remove();
    if (this.active) this.#showCursor();
    return () => {
      if (this.#cursor !== cursor) return;
      cursor.portal.clear();
      cursor.marker.replaceWith(cursor.element);
      cursor.attributes.dispose();
      this.#cursor = undefined;
    };
  }
  cancel(): void {
    if (!this.active) return;
    const id = this.#pointer!;
    this.#pointer = undefined;
    this.#gesture?.dispose();
    this.#gesture = undefined;
    if (this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id);
    this.#attributes.set('data-scrubbing', null);
    this.#hideCursor();
    this.ports.changed();
  }
  dispose(): void {
    this.cancel();
    this.#disposed = true;
    this.#scope.dispose();
    if (this.#cursor) {
      this.#cursor.portal.clear();
      this.#cursor.marker.replaceWith(this.#cursor.element);
      this.#cursor.attributes.dispose();
      this.#cursor = undefined;
    }
    this.#attributes.dispose();
    this.#styles.dispose();
  }
  #validate(options: NumberFieldScrubOptions): void {
    if (options.direction !== undefined && !['horizontal', 'vertical'].includes(options.direction))
      throw new TypeError('Scrub direction must be horizontal or vertical.');
    if (
      options.pixelSensitivity !== undefined &&
      (!Number.isFinite(options.pixelSensitivity) || options.pixelSensitivity <= 0)
    )
      throw new RangeError('Scrub pixelSensitivity must be positive and finite.');
    if (
      options.teleportDistance !== undefined &&
      (!Number.isFinite(options.teleportDistance) || options.teleportDistance < 0)
    )
      throw new RangeError('Scrub teleportDistance must be nonnegative and finite.');
  }
  #showCursor(): void {
    const cursor = this.#cursor;
    if (!cursor) return;
    if (!cursor.portal.host) {
      cursor.marker.after(cursor.element);
      cursor.portal.update(this.element.ownerDocument.body, html`<slot></slot>`, {
        projectedNodes: [cursor.element],
      });
      const host = cursor.portal.host!;
      host.setAttribute('popover', 'manual');
      host.showPopover();
    }
    const host = cursor.portal.host;
    if (!host) return;
    const scale = this.element.ownerDocument.defaultView!.visualViewport?.scale ?? 1;
    host.style.transform = `translate3d(${this.#cursorPoint.x}px, ${this.#cursorPoint.y}px, 0) translate(-50%, -50%) scale(${1 / scale})`;
  }
  #hideCursor(): void {
    if (!this.#cursor) return;
    this.#cursor.portal.clear();
    if (!this.#cursor.retain) this.#cursor.element.remove();
  }
  #moveCursor(dx: number, dy: number): void {
    const win = this.element.ownerDocument.defaultView!;
    const viewport = win.visualViewport;
    const distance = this.#options.teleportDistance;
    const rect = this.element.getBoundingClientRect();
    const bounds =
      distance === undefined
        ? {
            left: viewport?.offsetLeft ?? 0,
            top: viewport?.offsetTop ?? 0,
            right: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? win.innerWidth),
            bottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? win.innerHeight),
          }
        : {
            left: rect.left - distance / 2,
            top: rect.top - distance / 2,
            right: rect.right + distance / 2,
            bottom: rect.bottom + distance / 2,
          };
    const wrap = (n: number, low: number, high: number) =>
      high > low ? low + ((((n - low) % (high - low)) + high - low) % (high - low)) : low;
    this.#cursorPoint.x = wrap(this.#cursorPoint.x + dx, bounds.left, bounds.right);
    this.#cursorPoint.y = wrap(this.#cursorPoint.y + dy, bounds.top, bounds.bottom);
    this.#showCursor();
  }
  #down = (event: PointerEvent): void => {
    if (
      this.#disposed ||
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      event.button !== 0 ||
      !event.isPrimary ||
      this.ports.disabled()
    )
      return;
    this.cancel();
    event.preventDefault();
    if (event.pointerType === 'mouse') this.ports.focus();
    this.#pointer = event.pointerId;
    try {
      this.element.setPointerCapture(event.pointerId);
    } catch {
      this.#pointer = undefined;
      return;
    }
    const scope = (this.#gesture = new CleanupScope());
    this.#attributes.set('data-scrubbing', '');
    this.#cursorPoint = { x: event.clientX, y: event.clientY };
    this.#showCursor();
    this.ports.changed();
    let lastX = event.clientX,
      lastY = event.clientY,
      remainder = 0,
      changed = false;
    scope.listen(this.element, 'pointermove', (move) => {
      if (move.pointerId !== this.#pointer) return;
      if (this.ports.disabled() || !this.element.isConnected) {
        this.cancel();
        return;
      }
      move.preventDefault();
      const dx = move.clientX - lastX,
        dy = move.clientY - lastY;
      lastX = move.clientX;
      lastY = move.clientY;
      this.#moveCursor(dx, dy);
      remainder += this.#options.direction === 'vertical' ? -dy : dx;
      const sensitivity = this.#options.pixelSensitivity ?? 2;
      const units = Math.trunc(remainder / sensitivity);
      if (units) {
        remainder -= units * sensitivity;
        changed =
          this.ports.state.step(units > 0 ? 1 : -1, 'scrub', move, Math.abs(units)) || changed;
      }
    });
    scope.listen(this.element, 'pointerup', (up) => {
      if (up.pointerId !== this.#pointer) return;
      this.cancel();
      if (changed) this.ports.state.commit('scrub', up);
    });
    scope.listen(this.element, 'pointercancel', (cancel) => {
      if (cancel.pointerId === this.#pointer) this.cancel();
    });
    scope.listen(this.element, 'lostpointercapture', () => this.cancel());
    scope.listen(this.element.ownerDocument.defaultView!, 'blur', () => this.cancel());
  };
}
