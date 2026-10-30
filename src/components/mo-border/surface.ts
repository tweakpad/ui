import { TpElement } from '../../foundation/element.js';
import { setPartComposition } from '../../presentation/controller.js';
import { surfaceMember } from '../shared/group-members.js';
import { parseCornerRadius, type RingBox } from './ring-path.js';

const HIDDEN_BORDER = { 'border-color': 'transparent' } as const;
const SEGMENT = 'tp-mo-border-segment';

/** The measured surface: its border box relative to the owner and the border it draws. */
export interface SurfaceGeometry {
  /**
   * Offset from the owner's inline-start edge, so a change of direction, which moves a child
   * to the other side along with that edge, keeps the ring on it.
   */
  readonly inlineStart: number;
  readonly y: number;
  readonly box: RingBox;
  /** The surface's widest border side, in pixels. */
  readonly borderWidth: number;
  /** The wrapped child lays out inline. */
  readonly inline: boolean;
}

/**
 * The surface a Border draws over (CL Border `mbd-surface`): the boundary part of the wrapped
 * library component, the wrapped element itself, or the owner's own box. Its border color is
 * hidden while it keeps its width, so nothing moves, and is given back on release.
 */
export class BorderSurface {
  #child: Element | null = null;
  #composed: TpElement | null = null;
  #styled: { element: HTMLElement | SVGElement; value: string; priority: string } | null = null;
  #boundary: Element | null = null;

  constructor(
    private readonly owner: HTMLElement,
    private readonly changed: () => void,
  ) {}

  /** The element whose border box is measured. */
  get boundary(): Element {
    return this.#boundary ?? this.owner;
  }

  /** Resolves the surface from the first element child; returns whether the boundary changed. */
  resolve(): boolean {
    // Segment children describe the drawing; the surface is the first other child.
    const child = [...this.owner.children].find((element) => !element.matches(SEGMENT)) ?? null;
    if (child !== this.#child) {
      this.release();
      this.#child = child;
    }
    let boundary: Element | null = null;
    if (child) {
      const member = surfaceMember(child);
      if (member) {
        if (this.#composed !== member.host) {
          setPartComposition(member.host, this, { [member.part]: { styleHook: HIDDEN_BORDER } });
          this.#composed = member.host;
        }
        boundary = member.element;
        // A library component renders its boundary on its first update.
        if (!boundary && !member.host.hasUpdated)
          void member.host.updateComplete.then(() => {
            if (this.#child === child) this.changed();
          });
      } else if (!(child instanceof TpElement) && 'style' in child) {
        const element = child as HTMLElement | SVGElement;
        if (this.#styled?.element !== element) {
          this.#styled = {
            element,
            value: element.style.getPropertyValue('border-color'),
            priority: element.style.getPropertyPriority('border-color'),
          };
          element.style.setProperty('border-color', 'transparent');
        }
        boundary = element;
      } else boundary = child;
    }
    const changed = boundary !== this.#boundary;
    this.#boundary = boundary;
    return changed;
  }

  /** Gives the surface its own border back. */
  release(): void {
    if (this.#composed) setPartComposition(this.#composed, this);
    this.#composed = null;
    if (this.#styled) {
      const { element, value, priority } = this.#styled;
      if (value) element.style.setProperty('border-color', value, priority);
      else element.style.removeProperty('border-color');
    }
    this.#styled = null;
    this.#child = null;
    this.#boundary = null;
  }

  /** Layout reads only: the boundary's border box relative to the owner, its radii and width. */
  measure(): SurfaceGeometry {
    const view = this.owner.ownerDocument.defaultView!;
    const boundary = this.boundary;
    const origin = this.owner.getBoundingClientRect();
    const rect = boundary.getBoundingClientRect();
    const style = view.getComputedStyle(boundary);
    const width = rect.width;
    const height = rect.height;
    const corner = (value: string) => parseCornerRadius(value, width, height);
    const child = this.#child;
    const rtl = view.getComputedStyle(this.owner).direction === 'rtl';
    return {
      inlineStart: rtl ? origin.right - rect.right : rect.left - origin.left,
      y: rect.top - origin.top,
      box: {
        width,
        height,
        radii: [
          corner(style.borderTopLeftRadius),
          corner(style.borderTopRightRadius),
          corner(style.borderBottomRightRadius),
          corner(style.borderBottomLeftRadius),
        ],
      },
      borderWidth:
        boundary === this.owner
          ? 0
          : Math.max(
              parseFloat(style.borderTopWidth) || 0,
              parseFloat(style.borderRightWidth) || 0,
              parseFloat(style.borderBottomWidth) || 0,
              parseFloat(style.borderLeftWidth) || 0,
            ),
      inline: child ? view.getComputedStyle(child).display.startsWith('inline') : false,
    };
  }
}
