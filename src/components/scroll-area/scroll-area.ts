import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { ScrollAreaController } from './controller.js';
import {
  initialScrollAreaState,
  type OverflowEdgeThreshold,
  type ScrollAreaState,
  type ScrollbarOptions,
  type ScrollbarVisibility,
} from './types.js';

export class TpScrollArea extends TpElement {
  static tagName = 'tp-scroll-area';
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
        touch-action: none;
        user-select: none;
        direction: ltr;
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

      .thumb {
        display: block;
        position: relative;
      }

      .track[data-orientation='vertical'] .thumb {
        inline-size: 100%;
      }

      .track[data-orientation='horizontal'] .thumb {
        block-size: 100%;
      }

      .track[data-visible='false'] {
        opacity: 0;
        pointer-events: none;
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
  axis: 'x' | 'y' | 'both' | undefined;
  label = '';
  scrollbarVisibility: ScrollbarVisibility = 'automatic';
  keepMounted = false;
  scrollbars: readonly ScrollbarOptions[] | undefined;
  overflowEdgeThreshold: OverflowEdgeThreshold = 0;
  showCorner = true;
  #state = { ...initialScrollAreaState };
  #hovering = false;
  readonly #controller = new ScrollAreaController(this);
  get viewportElement(): HTMLElement | null {
    return this.renderRoot?.querySelector('.viewport') ?? null;
  }
  get contentElement(): HTMLElement | null {
    return this.renderRoot?.querySelector('.content') ?? null;
  }
  /** Internal state publication does not replace the native viewport or its contents. */
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
    this.requestUpdate();
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#controller.connect();
    void this.updateComplete.then(() => {
      if (this.isConnected) {
        this.#hovering = this.matches(':hover');
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
    const visible =
      visibility === 'always' ||
      (overflow &&
        (visibility === 'while-scrolling'
          ? scrolling
          : visibility === 'on-hover'
            ? this.#hovering
            : true));
    const state = {
      orientation: bar.orientation,
      scrolling,
      hovering: this.#hovering,
      overflow,
      disabled: this.disabled,
      visibility,
    };
    return this.renderPart('scroll-area-scrollbar', state, {
      properties: {
        class: 'track',
        'data-orientation': bar.orientation,
        'data-scrolling': scrolling,
        'data-hovering': this.#hovering,
        'data-visible': String(visible),
        'data-disabled': this.disabled,
        'aria-hidden':
          this.partContracts['scroll-area-scrollbar']?.hostProperties?.['aria-hidden'] ?? 'true',
        '@pointerdown': this.#controller.pointerDown,
        '@pointermove': this.#controller.pointerMove,
        '@pointerup': this.#controller.pointerEnd,
        '@pointercancel': this.#controller.pointerEnd,
        '@lostpointercapture': this.#controller.pointerEnd,
        '@wheel': this.#controller.wheel,
      },
      content: this.renderPart('scroll-area-thumb', state, {
        properties: {
          class: 'thumb',
          'data-orientation': bar.orientation,
          'data-scrolling': scrolling,
          'aria-hidden': 'true',
        },
      }),
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
