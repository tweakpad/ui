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

  /* Effect layers (surface, raised item layers) stack only within the viewport. */
  .viewport[data-effect] {
    position: relative;
    isolation: isolate;
  }

  /* Effect layer: above item media, below layers that effects raise; never hit-tested. */
  .effect-surface {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
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

  .controls[data-placement='inside'] {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .controls[data-placement='inside'] > *,
  .controls[data-placement='outside'] > * {
    pointer-events: auto;
  }

  .controls[data-placement='inside'] .indicators {
    align-self: end;
  }

  .controls[data-orientation='vertical'][data-placement='inside'] {
    flex-direction: column;
  }

  /* Share the viewport row with arrows; pagination owns a separate intrinsic row.
     Subgrid keeps arrow alignment independent of pagination height and presence. */
  .root:has(> .controls[data-placement='outside']) {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .root:has(> .controls[data-placement='outside']) > .viewport {
    grid-area: 1 / 1;
  }

  .controls[data-placement='outside'] {
    display: grid;
    grid-area: 1 / 1 / 3 / 2;
    grid-template-rows: subgrid;
    grid-template-columns: 1fr auto 1fr;
    row-gap: 0;
    pointer-events: none;
  }

  .controls[data-placement='outside'] > :is(.previous, slot[name='previous']) {
    grid-area: 1 / 1;
    place-self: center start;
    translate: -120% 0;
  }

  .controls[data-placement='outside'] > :is(.next, slot[name='next']) {
    grid-area: 1 / 3;
    place-self: center end;
    translate: 120% 0;
  }

  .controls:dir(rtl)[data-orientation='horizontal'][data-placement='outside']
    > :is(.previous, slot[name='previous']) {
    translate: 120% 0;
  }

  .controls:dir(rtl)[data-orientation='horizontal'][data-placement='outside']
    > :is(.next, slot[name='next']) {
    translate: -120% 0;
  }

  .controls[data-placement='outside'] > :is(.indicators, slot[name='indicators']) {
    grid-area: 2 / 1 / 3 / -1;
    place-self: start stretch;
  }

  .controls[data-placement='outside'] > slot {
    display: block;
  }

  :host([orientation='vertical']) .root:has(> .controls[data-placement='outside']) {
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .controls[data-orientation='vertical'][data-placement='outside'] {
    grid-area: 1 / 1 / 2 / 3;
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: subgrid;
    column-gap: 0;
  }

  .controls[data-orientation='vertical'][data-placement='outside']
    > :is(.indicators, slot[name='indicators']) {
    grid-area: 1 / 2;
    flex-direction: column;
    align-self: center;
  }

  .controls[data-orientation='vertical'][data-placement='outside']
    > :is(.previous, slot[name='previous']) {
    grid-area: 1 / 1;
    place-self: start center;
    translate: 0 -120%;
  }

  .controls[data-orientation='vertical'][data-placement='outside'] > :is(.next, slot[name='next']) {
    grid-area: 1 / 1;
    place-self: end center;
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
