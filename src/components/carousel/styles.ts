import { css } from 'lit';
export const carouselStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .root {
    position: relative;
    min-inline-size: 0;
  }

  .viewport {
    overflow: hidden;
    min-inline-size: 0;
  }

  .track {
    display: flex;
    position: relative;
    min-inline-size: 0;
    gap: var(--tp-carousel-gap, 0);
  }

  .item {
    flex: 0 0 auto;
    min-inline-size: 0;
    position: relative;
  }

  .track[data-orientation='vertical'] {
    flex-direction: column;
  }

  .viewport[data-orientation='vertical'] {
    height: 100%;
  }

  :host([orientation='vertical']),
  :host([orientation='vertical']) .root {
    height: 100%;
  }

  :host([orientation='vertical']) .root {
    display: flex;
    flex-direction: column;
  }

  :host([orientation='vertical']) .viewport {
    flex: 1;
    min-block-size: 0;
  }

  .viewport[data-transport='scroll'] {
    overflow: auto;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
  }

  .viewport[data-transport='scroll'][data-orientation='vertical'] {
    scroll-snap-type: y mandatory;
  }

  .viewport::-webkit-scrollbar {
    display: none;
  }

  .item[data-snap] {
    scroll-snap-align: start;
  }

  .track[data-centered] .item[data-snap] {
    scroll-snap-align: center;
  }

  .track[data-draggable][data-orientation='horizontal'] {
    touch-action: pan-y;
  }

  .track[data-draggable][data-orientation='vertical'] {
    touch-action: pan-x;
  }

  .track[data-grab] {
    cursor: grab;
  }

  .track[data-dragging] {
    cursor: grabbing;
    user-select: none;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .indicators {
    display: flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 0;
  }

  .indicators[data-type='progress'] {
    flex: 1;
  }

  .indicators tp-progress {
    width: 100%;
  }

  .bullet-near {
    scale: 0.66;
  }

  .bullet-far {
    scale: 0.33;
  }

  .indicators tp-progress.progress-vertical {
    width: var(--tp-space-1);
    height: var(--tp-space-12);
  }

  .controls[data-placement='inside'],
  .controls[data-placement='outside'] {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .controls[data-placement='inside'] > *,
  .controls[data-placement='outside'] > * {
    pointer-events: auto;
  }

  .controls[data-placement='inside'] .indicators,
  .controls[data-placement='outside'] .indicators {
    align-self: end;
  }

  .controls[data-placement='outside'] .previous {
    translate: -120% 0;
  }

  .controls[data-placement='outside'] .next {
    translate: 120% 0;
  }

  .controls[data-orientation='vertical'][data-placement='inside'],
  .controls[data-orientation='vertical'][data-placement='outside'] {
    flex-direction: column;
  }

  .controls[data-orientation='vertical'][data-placement='outside'] .previous {
    translate: 0 -120%;
  }

  .controls[data-orientation='vertical'][data-placement='outside'] .next {
    translate: 0 120%;
  }

  .arrow {
    display: inline-flex;
  }

  .arrow[data-action='previous'] {
    rotate: 180deg;
  }

  .arrow[data-direction='rtl'][data-action='previous'] {
    rotate: 0deg;
  }

  .arrow[data-direction='rtl'][data-action='next'] {
    rotate: 180deg;
  }

  .arrow[data-orientation='vertical'][data-action='previous'] {
    rotate: -90deg;
  }

  .arrow[data-orientation='vertical'][data-action='next'] {
    rotate: 90deg;
  }

  .scrollbar[data-orientation='vertical'] {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    height: 100%;
  }

  .spacer {
    flex: 0 0 auto;
    pointer-events: none;
  }

  [hidden] {
    display: none !important;
  }
`;
