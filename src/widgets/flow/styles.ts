import { css } from 'lit';

/**
 * Structure only: layer stacking, containment, geometry and hit targets. Appearance is the
 * recipe (`src/presentation/recipes/flow.ts`). Node positions and the viewport transform are
 * written through the object model by the layer controllers, never through Lit bindings.
 */
export const flowStyles = css`
  :host {
    display: block;
    min-inline-size: 0;

    /* Fixed-position overlays (menus, panels) are contained by the widget box. */
    contain: layout paint;
  }

  :host([data-disabled]) {
    cursor: auto;
  }

  .root {
    --_tp-flow-inline-sign: 1;

    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    inline-size: 100%;
    block-size: 100%;
    min-block-size: inherit;
    overflow: clip;
  }

  .root:dir(rtl) {
    --_tp-flow-inline-sign: -1;
  }

  .canvas {
    position: relative;
    min-inline-size: 0;
    overflow: clip;
    touch-action: none;
    user-select: none;
  }

  .canvas:focus-visible {
    outline: none;
  }

  .pane {
    position: absolute;
    inset: 0;
  }

  .viewport {
    position: absolute;
    inset: 0;
    transform-origin: 0 0;
    pointer-events: none;
  }

  .layer {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
  }

  .layer.edges {
    z-index: 1;
  }

  .layer.nodes {
    z-index: 2;
  }

  .layer.labels {
    z-index: 3;
  }

  /* The selected edge's handles sit over its path, the sockets and the labels they edit. */
  .layer.editor {
    z-index: 4;
  }

  .overlay > svg {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .layer.edges > svg {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .layer.edges [part~='flow-edge-hit'] {
    pointer-events: stroke;
  }

  .overlay {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    overflow: visible;
  }

  .overlay > * {
    pointer-events: auto;
  }

  .marquee {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    pointer-events: none;
  }

  ::slotted(tp-flow-node),
  tp-flow-node {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: auto;
    transform-origin: 0 0;
  }

  .labels tp-flow-edge-label {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }

  /* Every panel spans the pane inside its margin, so built-in panels can cap their own extent and
     a percentage of the panel is the pane's free extent; only their children take pointer events.
     Positions are \`block-inline\` pairs. */
  .panel {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    gap: var(--tp-space-2);
    pointer-events: none;
  }

  .panel > *,
  .panel ::slotted(*) {
    pointer-events: auto;
  }

  .panel[data-position$='-end'] {
    flex-direction: row-reverse;
  }

  .panel[data-position$='-center'] {
    justify-content: center;
  }

  /* While the inspector is open, end panels move clear of it (its extent and the gap) and middle
     panels by half, centering in the space it leaves. */
  .root[data-inspector-open] .panel[data-position$='-end'] {
    translate: calc(
        var(--_tp-flow-inline-sign) * -1 *
          (min(var(--_tp-flow-inspector), 100%) + var(--_tp-flow-space))
      )
      0;
  }

  .root[data-inspector-open] .panel[data-position$='-center'] {
    translate: calc(
        var(--_tp-flow-inline-sign) * -0.5 *
          (min(var(--_tp-flow-inspector), 100%) + var(--_tp-flow-space))
      )
      0;
  }

  .panel[data-position^='top-'] {
    align-items: flex-start;
  }

  .panel[data-position^='center-'] {
    align-items: center;
  }

  .panel[data-position^='bottom-'] {
    align-items: flex-end;
  }

  .selection,
  .selection-bounds {
    position: absolute;
    left: 0;
    top: 0;
    box-sizing: border-box;
  }

  .focus-proxies {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .focus-proxies > [part~='flow-edge-focus'] {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .visually-hidden {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  /* Low detail: the node body is hidden without changing the host box. */
  .root[data-lod='low'] tp-flow-node::part(flow-node-body),
  .root[data-lod='low'] ::slotted(tp-flow-node)::part(flow-node-body) {
    visibility: hidden;
  }

  /* The inspector floats over the canvas at the inline end, inset by the panel margin; the canvas
     keeps its size, so opening it moves nothing under the pointer. */
  .root > tp-flow-inspector {
    position: absolute;
    inset-block: var(--_tp-flow-space);
    inset-inline-end: var(--_tp-flow-space);
    z-index: 7;
    inline-size: min(var(--_tp-flow-inspector), 100% - var(--_tp-flow-space) * 2);
  }

  .layer.editor > tp-flow-edge-editor {
    pointer-events: auto;
  }

  .node-toolbar {
    z-index: 6;
  }

  @keyframes tp-flow-dash {
    to {
      stroke-dashoffset: -20;
    }
  }

  @media (forced-colors: active) {
    [part~='flow-edge-path'] {
      stroke: CanvasText;
    }

    [part~='flow-edge'][data-selected] > [part~='flow-edge-path'] {
      stroke: Highlight;
    }

    .selection {
      border-color: Highlight;
    }
  }
`;

/** Node host structure: an absolutely positioned box whose content is the shape template. */
export const flowNodeStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
    outline: none;
  }

  :host([hidden]) {
    display: none;
  }

  .host {
    position: relative;
    display: block;
    min-inline-size: 0;
  }

  .ports {
    position: absolute;
    display: flex;
    gap: var(--tp-space-2);
    pointer-events: none;
  }

  .ports > * {
    pointer-events: auto;
  }

  .ports[data-side='left'],
  .ports[data-side='right'] {
    flex-direction: column;
    inset-block: 0;
    justify-content: center;
  }

  .ports[data-side='left'] {
    left: 0;
    transform: translateX(-50%);
  }

  .ports[data-side='right'] {
    right: 0;
    transform: translateX(50%);
  }

  .ports[data-side='top'],
  .ports[data-side='bottom'] {
    flex-direction: row;
    inset-inline: 0;
    justify-content: center;
  }

  .ports[data-side='top'] {
    inset-block-start: 0;
    transform: translateY(-50%);
  }

  .ports[data-side='bottom'] {
    inset-block-end: 0;
    transform: translateY(50%);
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--tp-space-2);
    min-inline-size: 0;
  }

  /* Low detail shell: fills the host box the layer sized; the title strip is its only content. */
  .shell {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    inline-size: 100%;
    block-size: 100%;
    min-inline-size: 0;
    padding-inline: var(--tp-space-3);
    overflow: hidden;
  }

  .icon {
    --_tp-icon-extent: var(--tp-icon-size-md);

    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    box-sizing: border-box;
  }

  .icon[data-size='lg'] {
    --_tp-icon-extent: var(--tp-icon-size-lg);
  }

  .titles {
    display: grid;
    min-inline-size: 0;
  }

  .title,
  .description {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .body {
    display: grid;
    gap: var(--tp-space-2);
  }

  .footer {
    display: flex;
    align-items: center;
    inline-size: 100%;
    min-inline-size: 0;
  }

  .status {
    display: flex;
    align-items: center;
    gap: var(--tp-space-2);
    inline-size: 100%;
    min-inline-size: 0;
  }

  .status-detail {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-pill {
    margin-inline-start: auto;
    flex: none;
  }

  .row-label {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-control {
    display: inline-flex;
    align-items: center;
    inline-size: calc(var(--_tp-flow-node-width, calc(var(--tp-spacing) * 60)) * 0.5);
  }

  .panel .row-control {
    inline-size: calc(var(--_tp-flow-node-width, calc(var(--tp-spacing) * 60)) * 0.55);
    max-inline-size: 100%;
  }

  /* The panel header tint is a recipe value bridged into the composed Card. */
  tp-card.panel::part(card-header) {
    background-color: var(--_tp-flow-node-header-fill, transparent);
  }

  .row-port {
    position: relative;
  }

  .row-port > tp-flow-port {
    position: absolute;
    inset-block-start: 50%;
    transform: translate(-50%, -50%);
  }

  .row-port[data-direction='input'] > tp-flow-port {
    left: calc(var(--_tp-flow-space, var(--tp-space-3)) * -1);
  }

  .row-port[data-direction='output'] > tp-flow-port {
    left: auto;
    right: calc(var(--_tp-flow-space, var(--tp-space-3)) * -1);
    transform: translate(50%, -50%);
  }

  .ports[data-rows] {
    display: block;
    inset-block: 0;
    inline-size: 0;
    transform: none;
    justify-content: normal;
  }

  .ports[data-rows] > tp-flow-port {
    position: absolute;
    left: 0;
    transform: translate(-50%, -50%);
  }

  .ports[data-rows][data-side='right'] > tp-flow-port {
    left: auto;
    right: 0;
    transform: translate(50%, -50%);
  }

  .row-control > * {
    inline-size: 100%;
  }

  .tile {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tile-status {
    position: absolute;
    inset-block-end: calc(var(--tp-space-1) * -1);
    left: 50%;
    transform: translate(-50%, 50%);
  }

  /* The compact Card's content: the icon tile above a centered caption. */
  .compact-body {
    display: grid;
    justify-items: center;
    gap: var(--tp-space-1);
    text-align: center;
  }

  .group {
    position: relative;
    box-sizing: border-box;
    inline-size: 100%;
    block-size: 100%;
    padding: var(--tp-space-2);
  }

  .group-label {
    font-size: var(--tp-text-xs);
    font-weight: var(--tp-font-medium);
  }
`;

/** Port structure: a native button sized by the recipe, with a coarse-pointer hit extension. */
export const flowPortStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: var(--tp-space-1);
    position: relative;
  }

  button {
    position: relative;
    display: block;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: inherit;
  }

  button::after {
    content: '';
    position: absolute;
    inset: min(calc(var(--tp-space-2) * -1), calc((100% - var(--_tp-coarse-target, 0px)) / 2));
  }

  .label {
    white-space: nowrap;
  }
`;
