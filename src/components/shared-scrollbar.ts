import { css } from 'lit';
import type { TpElement } from '../foundation/element.js';
import type { ScrollbarController } from '../foundation/scrollbar.js';
import type { PartState } from '../foundation/part.js';

/** Shared native scrollbar anatomy; policy and public part names come from its owner. */
export function renderScrollbar(
  host: TpElement,
  controller: ScrollbarController,
  state: PartState,
  options: {
    trackPart: string;
    thumbPart: string;
    properties?: Record<string, unknown>;
    thumbProperties?: Record<string, unknown>;
  },
): unknown {
  return host.renderPart(options.trackPart, state, {
    properties: {
      class: 'track tp-scrollbar',
      'data-orientation': state.orientation,
      'data-scrolling': controller.scrolling,
      'data-visible': String(controller.visible),
      'data-disabled': state.disabled,
      'aria-hidden': 'true',
      '@pointerdown': controller.pointerDown,
      '@focusin': () => controller.focus(true),
      '@focusout': () => controller.focus(false),
      ...options.properties,
    },
    content: host.renderPart(options.thumbPart, state, {
      properties: {
        class: 'thumb tp-scrollbar-thumb',
        'data-orientation': state.orientation,
        'data-scrolling': controller.scrolling,
        'aria-hidden': 'true',
        ...options.thumbProperties,
      },
    }),
  });
}
export const scrollbarStyles = css`
  .tp-scrollbar {
    position: relative;
    touch-action: none;
    user-select: none;
    direction: ltr;
  }
  .tp-scrollbar-thumb {
    display: block;
    position: relative;
  }
  .tp-scrollbar[data-orientation='vertical'] .tp-scrollbar-thumb {
    inline-size: 100%;
  }
  .tp-scrollbar[data-orientation='horizontal'] .tp-scrollbar-thumb {
    block-size: 100%;
  }
  .tp-scrollbar[data-visible='false'] {
    opacity: 0;
    pointer-events: none;
  }
`;
