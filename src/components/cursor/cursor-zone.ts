import { html, type PropertyValues } from 'lit';
import { numberOrNull } from '../../foundation/converters.js';
import { TpElement } from '../../foundation/element.js';
import { resolveOwner } from '../../foundation/portal-ownership.js';
import { CleanupScope } from '../../foundation/services.js';
import type { SpringInput } from '../../foundation/spring-follower.js';
import { cursorPresentation } from '../../presentation/families/cursor.js';
import { CursorDocument, type CursorParticipant, type CursorZoneLike } from './cursor-document.js';
import { cursorZoneStyles } from './styles.js';
import { mouseLikePointer } from './zone-resolution.js';

export type CursorStick = 'none' | 'center' | 'bounds';

const isCursor = (node: Node): node is Element =>
  node.nodeType === 1 && (node as Element).localName === 'tp-cursor';

/**
 * `tp-cursor-zone`: a layout-neutral wrapper that gives `tp-cursor` a state, content,
 * appearance, attraction, passthrough and physics while the pointer is inside it (Foundation
 * §18.22 `cc-zones`). Set `--tp-cursor-size`, `--tp-cursor-color`, `--tp-cursor-blend`,
 * `--tp-cursor-opacity` and `--tp-cursor-radius` on the zone to change the cursor's look; put a
 * `<template>` child in it to replace the cursor content.
 *
 * Markers: `data-hovered` while the pointer is inside.
 *
 * @slot - The wrapped content.
 * @csspart cursor-zone - The host.
 */
export class TpCursorZone extends TpElement implements CursorZoneLike {
  static tagName = 'tp-cursor-zone';
  static override presentation = cursorPresentation;
  static override properties = {
    ...TpElement.properties,
    state: { type: String, reflect: true },
    for: { type: String },
    native: { type: Boolean, reflect: true },
    stick: { type: String, reflect: true },
    stiffness: { converter: numberOrNull },
    damping: { converter: numberOrNull },
    mass: { converter: numberOrNull },
  };
  static override styles = [TpElement.styles, cursorZoneStyles];

  /** State name the cursor publishes while this zone is active. */
  state = '';
  /** Id of the one cursor this zone addresses; every cursor of the document when empty. */
  for = '';
  /** Restore the host pointer inside the zone. */
  native = false;
  /** Pull the cursor to the zone's center, or morph it to the zone's bounds. */
  stick: CursorStick = 'none';
  /** Physics while the zone is active; null keeps the cursor's value. */
  stiffness: number | null = null;
  damping: number | null = null;
  mass: number | null = null;

  #registry: CursorDocument | undefined;
  #release: (() => void) | undefined;
  #hovered = false;
  #scope: CleanupScope | undefined;

  get element(): HTMLElement {
    return this;
  }

  /** Whether the pointer is inside the zone. */
  get hovered(): boolean {
    return this.#hovered;
  }

  /** The first template child: content the cursor shows while the zone is active. */
  get template(): HTMLTemplateElement | null {
    return this.querySelector(':scope > template');
  }

  /** The cursor this zone addresses with `for`, or null when unresolved. */
  get cursor(): Element | null {
    return this.for ? resolveOwner(this, isCursor, this.for) : null;
  }

  physics(): SpringInput {
    return { stiffness: this.stiffness, damping: this.damping, mass: this.mass };
  }

  addresses(root: CursorParticipant): boolean {
    return !this.for || this.cursor === root.element;
  }

  hoveredChanged(hovered: boolean): void {
    this.#hovered = hovered;
    this.toggleAttribute('data-hovered', hovered);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const registry = (this.#registry = CursorDocument.for(this.ownerDocument));
    this.#release = registry.addZone(this);
    const scope = (this.#scope = new CleanupScope());
    scope.listen(this, 'pointerenter', (event) => {
      if (mouseLikePointer(event.pointerType)) registry.zoneEntered(this, event);
    });
    scope.listen(this, 'pointerleave', (event) => {
      if (mouseLikePointer(event.pointerType)) registry.zoneLeft(this, event);
    });
    void customElements.whenDefined('tp-cursor').then(() =>
      queueMicrotask(() => {
        if (this.isConnected && this.for && !this.cursor)
          this.diagnose(
            'cursor-zone-no-root',
            `No tp-cursor with id "${this.for}" exists; the zone addresses nothing.`,
            { severity: 'warning', once: true },
          );
      }),
    );
  }

  override disconnectedCallback(): void {
    if (this.#hovered) this.#registry?.zoneLeft(this, null);
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#release?.();
    this.#release = undefined;
    this.#registry = undefined;
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (
      changed.has('state') ||
      changed.has('for') ||
      changed.has('native') ||
      changed.has('stick') ||
      changed.has('stiffness') ||
      changed.has('damping') ||
      changed.has('mass') ||
      changed.has('disabled')
    )
      this.#registry?.zoneUpdated(this);
  }

  protected override render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-cursor-zone': TpCursorZone;
  }
}
