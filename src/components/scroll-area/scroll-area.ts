import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { renderScrollbar, scrollbarStyles } from '../shared/scrollbar.js';
import { ScrollAreaController } from './controller.js';
import {
  initialScrollAreaState,
  type OverflowEdgeThreshold,
  type ScrollAreaState,
  type ScrollbarOptions,
  type ScrollbarVisibility,
} from './types.js';
import { scrollAreaPresentation } from '../../presentation/families/scroll-area.js';

/**
 * A native scroll viewport with slim, theme-consistent scrollbars. Wheel, touch, keyboard, focus
 * and scroll anchoring stay the browser's own; only the visible tracks are replaced. Give the host
 * a constrained block or inline size; its content decides how far it scrolls.
 *
 * @slot - The scrolling content.
 */
export class TpScrollArea extends TpElement {
  static tagName = 'tp-scroll-area';
  static override presentation = scrollAreaPresentation;
  static override properties = {
    ...TpElement.properties,
    axis: { type: String, reflect: true },
    label: { type: String },
    scrollbarVisibility: { type: String, attribute: 'scrollbar-visibility' },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    scrollbars: { attribute: false },
    overflowEdgeThreshold: { attribute: false },
    showCorner: { type: Boolean, attribute: 'show-corner' },
  };
  static override styles = [
    TpElement.styles,
    scrollbarStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        min-block-size: 0;
      }

      .root {
        position: relative;
        inline-size: 100%;
        block-size: 100%;
        min-inline-size: 0;
        min-block-size: 0;
        border-radius: inherit;
      }

      .viewport {
        inline-size: 100%;
        block-size: 100%;
        overflow: auto;
        scrollbar-width: none;
        border-radius: inherit;
      }

      .viewport::-webkit-scrollbar {
        display: none;
      }

      :host([axis='x']) .viewport {
        overflow-y: hidden;
      }

      :host([axis='y']) .viewport {
        overflow-x: hidden;
      }

      .content {
        min-inline-size: 100%;
        display: flow-root;
      }

      .track {
        position: absolute;
        z-index: 1;
      }

      .track[data-orientation='vertical'] {
        inset-block: 0 var(--tp-scroll-area-corner-height, 0);
        inset-inline-end: 0;
      }

      .track[data-orientation='horizontal'] {
        inset-inline: 0 var(--tp-scroll-area-corner-width, 0);
        inset-block-end: 0;
      }

      :host(:dir(rtl)) .track[data-orientation='horizontal'] {
        left: var(--tp-scroll-area-corner-width, 0);
        right: 0;
      }

      :host(:dir(rtl)) .track[data-orientation='vertical'] {
        right: auto;
        left: 0;
      }

      .corner {
        position: absolute;
        inset-inline-end: 0;
        inset-block-end: 0;
        inline-size: var(--tp-scroll-area-corner-width, 0);
        block-size: var(--tp-scroll-area-corner-height, 0);
      }
    `,
  ];
  override orientation: 'horizontal' | 'vertical' = 'vertical';
  /** Restricts scrolling to one axis, or shows both tracks for content that overflows both ways; takes precedence over `orientation`. */
  axis: 'x' | 'y' | 'both' | undefined;
  /** Names the viewport as a region, which helps when it holds a lot of content. */
  label = '';
  /** When the tracks appear: on overflow, always, only while scrolling or only on hover. */
  scrollbarVisibility: ScrollbarVisibility = 'automatic';
  /** Keeps a track rendered when its axis does not overflow; it stays hidden unless visibility is `always`. */
  keepMounted = false;
  /** Configures each track on its own (orientation, visibility, keep-mounted), replacing `axis` and `orientation`; an empty list keeps native scrolling with no custom tracks. */
  scrollbars: readonly ScrollbarOptions[] | undefined;
  /** How far, in pixels, content must be hidden past an edge before that edge counts as overflowing; one number or one per edge. */
  overflowEdgeThreshold: OverflowEdgeThreshold = 0;
  /** Renders the corner where visible horizontal and vertical tracks meet. */
  showCorner = true;
  #state = { ...initialScrollAreaState };
  #hovering = false;
  readonly #controller = new ScrollAreaController(this);
  /** The native scrolling element, for `scrollTo`, `scrollTop` and `scroll` events; null before the first render. */
  get viewportElement(): HTMLElement | null {
    return this.renderRoot?.querySelector('.viewport') ?? null;
  }
  /** The element wrapping the slotted content inside the viewport; null before the first render. */
  get contentElement(): HTMLElement | null {
    return this.renderRoot?.querySelector('.content') ?? null;
  }
  /** @internal Publishes the measured scroll state; does not replace the native viewport or its contents. */
  setScrollState(state: ScrollAreaState): void {
    if (
      Object.keys(state).every(
        (key) => state[key as keyof ScrollAreaState] === this.#state[key as keyof ScrollAreaState],
      )
    )
      return;
    this.#state = { ...state };
    const attrs = this.#markers;
    for (const [key, value] of Object.entries(attrs)) this.toggleAttribute(key, value);
    this.requestUpdate();
  }
  get #markers(): Record<string, boolean> {
    const state = this.#state;
    return {
      'data-has-overflow-x': state.x,
      'data-has-overflow-y': state.y,
      'data-overflow-x-start': state.xStart,
      'data-overflow-x-end': state.xEnd,
      'data-overflow-y-start': state.yStart,
      'data-overflow-y-end': state.yEnd,
      'data-scrolling': state.scrollingX || state.scrollingY,
    };
  }
  get #bars(): ScrollbarOptions[] {
    const bars =
      this.scrollbars ??
      (this.axis === 'both'
        ? [{ orientation: 'horizontal' as const }, { orientation: 'vertical' as const }]
        : [
            {
              orientation:
                this.axis === 'x'
                  ? ('horizontal' as const)
                  : this.axis === 'y'
                    ? ('vertical' as const)
                    : this.orientation,
            },
          ]);
    return bars.filter(
      (bar, i) =>
        ['horizontal', 'vertical'].includes(bar.orientation) &&
        bars.findIndex((candidate) => candidate.orientation === bar.orientation) === i,
    );
  }
  #hover = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    this.#hovering = event.type === 'pointerenter';
    this.#controller.hover(this.#hovering);
    this.requestUpdate();
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#controller.connect();
    void this.updateComplete.then(() => {
      if (this.isConnected) {
        this.#hovering = this.matches(':hover');
        this.#controller.hover(this.#hovering);
        this.#controller.sync();
        this.requestUpdate();
      }
    });
  }
  override disconnectedCallback(): void {
    this.#controller.disconnect();
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#controller.sync();
  }
  #renderBar(bar: ScrollbarOptions): unknown {
    const horizontal = bar.orientation === 'horizontal';
    const overflow = horizontal ? this.#state.x : this.#state.y;
    const scrolling = horizontal ? this.#state.scrollingX : this.#state.scrollingY;
    const visibility = bar.visibility ?? this.scrollbarVisibility;
    const state = {
      orientation: bar.orientation,
      scrolling,
      hovering: this.#hovering,
      overflow,
      disabled: this.disabled,
      visibility,
    };
    return renderScrollbar(this, this.#controller.scrollbar(horizontal ? 'x' : 'y'), state, {
      trackPart: 'scroll-area-scrollbar',
      thumbPart: 'scroll-area-thumb',
      properties: {
        'data-hovering': this.#hovering,
        'aria-hidden':
          this.partContracts['scroll-area-scrollbar']?.hostProperties?.['aria-hidden'] ?? 'true',
        '@wheel': this.#controller.wheel,
      },
    });
  }
  protected override render() {
    const markers = this.#markers,
      state = { ...this.#state, disabled: this.disabled };
    const bars = this.#bars.filter(
      (bar) =>
        (bar.orientation === 'horizontal' ? this.#state.x : this.#state.y) ||
        (bar.keepMounted ?? this.keepMounted),
    );
    return this.renderPart('scroll-area', state, {
      properties: {
        class: 'root',
        ...markers,
        '@pointerenter': this.#hover,
        '@pointerleave': this.#hover,
      },
      content: html`${this.renderPart('scroll-area-viewport', state, {
        properties: {
          class: 'viewport',
          ...markers,
          tabindex: 0,
          role: this.label ? 'region' : undefined,
          'aria-label': this.label || undefined,
        },
        content: this.renderPart('scroll-area-content', state, {
          properties: { class: 'content', ...markers },
          content: html`<slot @slotchange=${this.#controller.schedule}></slot>`,
        }),
      })}${repeat(
        bars,
        (bar) => bar.orientation,
        (bar) => this.#renderBar(bar),
      )}${this.showCorner ? this.renderPart('scroll-area-corner', {}, { properties: { class: 'corner', 'aria-hidden': 'true' } }) : nothing}`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-scroll-area': TpScrollArea;
  }
}
