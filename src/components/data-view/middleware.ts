import { html, nothing } from 'lit';
import { isContainedCss } from '../../foundation/contained-css.js';
import { circleAlertIcon } from '../../icons/circle-alert.js';
import { sortAscendingIcon, sortDescendingIcon, sortIcon } from '../../icons/sort.js';
import type {
  DataViewHook,
  DataViewMiddleware,
  DataViewNext,
  DataViewStateContext,
} from './types.js';

type HookContext<T, K extends DataViewHook> = Parameters<NonNullable<DataViewMiddleware<T>[K]>>[0];

/**
 * Runs one hook through the layers in order: each layer's hook receives the context and `next`, which
 * runs the remaining layers. Layers without the hook are skipped; past the last layer, nothing.
 */
export function runDataViewHook<T, K extends DataViewHook>(
  layers: readonly DataViewMiddleware<T>[],
  hook: K,
  context: HookContext<T, K>,
): unknown {
  const step = (from: number): unknown => {
    for (let index = from; index < layers.length; index++) {
      const layer = layers[index]!;
      const run = layer[hook] as
        ((context: HookContext<T, K>, next: DataViewNext) => unknown) | undefined;
      if (run) return run.call(layer, context, () => step(index + 1));
    }
    return nothing;
  };
  return step(0);
}

/** The scope the layers' styles nest under. */
const LAYER_SCOPE = '[part~="data-view"]';

/**
 * The CSS text of the layers' styles, each nested under the root part, in layer order; layers
 * without `css`, or with CSS that is not contained in one block, add nothing.
 */
export function dataViewLayerCss(layers: readonly DataViewMiddleware<unknown>[]): string {
  return layers
    .flatMap((layer) => {
      const css = typeof layer.css === 'string' ? layer.css.trim() : '';
      return css && isContainedCss(css) ? [`${LAYER_SCOPE} {\n${css}\n}`] : [];
    })
    .join('\n');
}

/** The columns' own renderers, just outside the defaults. */
const columnLayer: DataViewMiddleware<unknown> = {
  name: 'columns',
  cell: (context, next) =>
    context.column.render ? context.column.render(context.row, context) : next(),
  columnHeader: (context, next) =>
    context.column.renderHeader ? context.column.renderHeader(context) : next(),
};

/** The built-in content: cell text, header text with indicator and action, chevrons, states. */
const defaultLayer: DataViewMiddleware<unknown> = {
  name: 'defaults',
  cell: (context) => html`<span class="text">${context.renderText()}</span>`,
  text: (context) => context.text,
  tile: (context) => {
    const [title, subtitle] = context.columns;
    return html`${title ? html`<span class="tile-title">${context.renderCell(title)}</span>` : nothing}${
      subtitle ? html`<span class="tile-subtitle">${context.text(subtitle)}</span>` : nothing
    }`;
  },
  columnHeader: (context) =>
    html`<span class="label">${context.column.header}</span
      >${context.sortIndicator()}${context.action}`,
  sortIndicator: (context) =>
    html`<tp-icon
      aria-hidden="true"
      .icon=${
        context.direction === 'ascending'
          ? sortAscendingIcon
          : context.direction === 'descending'
            ? sortDescendingIcon
            : sortIcon
      }
    ></tp-icon>`,
  empty: (context: DataViewStateContext) =>
    html`<tp-empty-state
      .title=${context.messages.empty}
      .description=${context.message}
    ></tp-empty-state>`,
  error: (context: DataViewStateContext) =>
    html`<tp-empty-state
      .title=${context.messages.errorTitle}
      .description=${context.message}
      media-treatment="icon"
      ><tp-icon slot="media" .icon=${circleAlertIcon} aria-hidden="true"></tp-icon
      ><tp-button slot="actions" variant="outline" size="sm" @click=${() => context.retry()}
        >${context.messages.retry}</tp-button
      ></tp-empty-state
    >`,
};

/** The innermost layers every view ends with. */
export const DATA_VIEW_BUILT_IN_LAYERS: readonly DataViewMiddleware<unknown>[] = [
  columnLayer,
  defaultLayer,
];
