import { html, nothing, type PropertyValues } from 'lit';
import { resolveColorScheme } from '../../foundation/color-scheme.js';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import { resolveLocale } from '../../foundation/services.js';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';

import { domainConverter, jsonAxisOption } from '../../foundation/chart-axis.js';
import { ChartResponsiveViewport } from './viewport.js';
import { cartesianRenderer, type CartesianOptions } from './cartesian.js';
import { polarRenderer, type PolarCenter, type PolarOptions, type PolarType } from './polar.js';
import { chartIdentifier } from './payload.js';
import { chartLegendContent, chartTooltipContent, type ChartMetadataProvider } from './content.js';
import { chartStructure } from './styles.js';
import type {
  ChartAxis,
  ChartDomain,
  ChartType,
  ChartInspection,
  ChartInteraction,
  ChartLegendOptions,
  ChartPayload,
  ChartRenderer,
  ChartRendererInstance,
  ChartSeriesMap,
  ChartSnapshot,
  ChartTooltipOptions,
} from './types.js';
import { chartPresentation } from '../../presentation/families/chart.js';
import { TpTooltip } from '../tooltip/tooltip.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpIcon } from '../icon/icon.js';
import { TpSkeleton } from '../skeleton/skeleton.js';

/** Bar heights, in percent of the plot, of the loading placeholder. */
const PLACEHOLDER_HEIGHTS = [42, 64, 36, 78, 55, 88, 47, 70, 30, 60, 82, 50];

const POLAR: ReadonlySet<ChartType> = new Set(['pie', 'radar', 'radial']);

/** Two angles in degrees in an attribute, such as `-90 180`. */
const angleRangeConverter = {
  fromAttribute: (text: string | null): readonly [number, number] => {
    // Two numbers apart, or a JSON pair.
    const values = (text ?? '')
      .replace(/[[\]]/gu, ' ')
      .trim()
      .split(/[\s,]+/u)
      .map(Number);
    return values.length === 2 ? [values[0]!, values[1]!] : [0, 360];
  },
  toAttribute: (value: readonly [number, number]) => value.join(' '),
};

/**
 * A chart: lines, bars (grouped, stacked or below zero), lollipops, pies and donuts, radar shapes
 * or radial rings drawn from `data` and keyed `series`, with series colors from the theme, a
 * legend, a tooltip for the inspected values, a loading state and an accessible description. A
 * `renderer` of your own draws any other chart in the same frame.
 *
 * @slot center - Content in the middle of a pie, radar or radial chart, such as a total; it takes no pointer input.
 * @slot table - A Table with the complete dataset, the text equivalent of the chart.
 * @slot - Supplementary content below the chart.
 * @fires tp-resize - The plot was measured at a new size; `detail` holds its `width` and `height`.
 */
export class TpChart extends TpElement {
  static tagName = 'tp-chart';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTooltip, TpIcon, TpSkeleton];
  }
  static override presentation = chartPresentation;
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    description: { type: String },
    interaction: { type: String, reflect: true },
    data: { attribute: false },
    series: { attribute: false },
    renderer: { attribute: false },
    tooltipOptions: { attribute: false },
    legendOptions: { attribute: false },
    type: { type: String, reflect: true },
    stacked: { type: Boolean, reflect: true },
    xAxis: { attribute: 'x-axis', converter: jsonAxisOption },
    yAxis: { attribute: 'y-axis', converter: jsonAxisOption },
    xDomain: { attribute: 'x-domain', converter: domainConverter },
    yDomain: { attribute: 'y-domain', converter: domainConverter },
    loading: { type: Boolean, reflect: true },
    angleRange: { attribute: 'angle-range', converter: angleRangeConverter },
    innerRadius: { attribute: 'inner-radius', type: Number },
  };
  static override styles = [TpElement.styles, chartStructure];
  /** The chart's accessible name. */
  label = 'Chart';
  /** The chart's takeaway in words, shown as its caption; a chart needs it or a `table`. */
  description = '';
  /** How people inspect values: by pointer, by keyboard focus, both, or not at all. */
  interaction: ChartInteraction = 'none';
  /** The records the renderer draws, in order. */
  data: readonly Record<string, unknown>[] = [];
  /** The series by key, each with its label, icon and color; colors default to the theme's chart palette. */
  series: ChartSeriesMap = {};
  /** The chart engine: an object whose `mount(plot, { inspect, legend })` returns `{ update(snapshot), destroy() }`. */
  renderer: ChartRenderer | undefined;
  /** How the tooltip presents an inspected datum, such as its indicator and formatters. */
  tooltipOptions: ChartTooltipOptions = {};
  /** How the legend presents the series, such as its placement, the value beside each series and its formatter; `false` hides it. */
  legendOptions: ChartLegendOptions | false = {};
  /** The marks the chart draws itself from `data`; a `renderer`, when set, draws instead. */
  type: ChartType | undefined;
  /** Bars stack per x position, positive values upward and negative values downward. */
  stacked = false;
  /** The x axis, or JSON in its attribute: its scale (`category` by default), the data field `key` that names each row, ticks, labels and title; `false` hides it. */
  xAxis: ChartAxis | false = {};
  /** The y axis, or JSON in its attribute: its ticks, labels and title; `false` hides it. */
  yAxis: ChartAxis | false = {};
  /** The x range of number and time axes: `[minimum, maximum]`, or `auto` to fit the data. */
  xDomain: ChartDomain = 'auto';
  /** The y range: `[minimum, maximum]`, or `auto` to fit the data on whole ticks, with zero for bars and lollipops. */
  yDomain: ChartDomain = 'auto';
  /** The data is loading: placeholder marks shimmer, values and the tooltip hide, and the chart reports itself busy. */
  loading = false;
  /** Where pie, radar and radial marks start and end, in degrees clockwise from the top: `[-90, 90]` draws a half circle. */
  angleRange: readonly [number, number] = [0, 360];
  /** The hole in the middle of pie, radar and radial marks, as a fraction of their radius: 0 for pie and radar, 0.35 for radial unless set. */
  innerRadius: number | undefined;
  readonly #builtin = cartesianRenderer(() => this.#cartesianOptions());
  readonly #polar = polarRenderer(() => this.#polarOptions());
  #center: PolarCenter | null = null;
  #negativeColors: Readonly<Record<string, string>> = {};
  #scope = '';
  #viewport = new ChartResponsiveViewport();
  #environment = new ComposedEnvironmentObserver(this, () => {
    this.#appearance();
    this.#updateEngine();
    this.requestUpdate();
  });
  #engine: ChartRendererInstance | undefined;
  #mountedRenderer: ChartRenderer | undefined;
  #plot: HTMLElement | undefined;
  #colors: Readonly<Record<string, string>> = {};
  #legend: readonly ChartPayload[] = [];
  #inspection: ChartInspection = { active: false, payload: [], source: 'pointer' };
  #releasePopup: (() => void) | undefined;
  #popup: HTMLElement | null = null;
  #generation = 0;
  #missingDescription = false;
  /** The plot's current width and height in pixels. */
  get dimensions() {
    return this.#viewport.dimensions;
  }
  /** The chart's stable scope, which prefixes its series color properties. */
  get scopeIdentifier(): string {
    return this.#scope;
  }
  /** The series and resolved colors, for building tooltip or legend content of your own. */
  get metadataProvider(): ChartMetadataProvider {
    return {
      owner: this,
      series: this.series,
      colors: this.#colors,
      ...(this.legendOptions && this.legendOptions.value && !this.loading
        ? { values: this.#legendValues() }
        : {}),
    };
  }
  /** Each series' latest value or total over the rows, as `legendOptions.value` asks. */
  #legendValues(): Readonly<Record<string, number | null>> {
    const sum = this.legendOptions !== false && this.legendOptions.value === 'sum';
    return Object.fromEntries(
      Object.keys(this.series).map((key) => {
        let result: number | null = null;
        for (const row of this.data) {
          const value = row[key];
          if (typeof value !== 'number' || !Number.isFinite(value)) continue;
          result = sum ? (result ?? 0) + value : value;
        }
        return [key, result];
      }),
    );
  }
  /** The datum currently inspected, as the renderer last reported it. */
  get inspection(): ChartInspection {
    return this.#inspection;
  }
  /** The legend entries the renderer last reported. */
  get legendPayload(): readonly ChartPayload[] {
    return this.#legend;
  }
  override connectedCallback(): void {
    // Adopt a server-emitted identifier before generating a new client identity.
    this.#scope ||=
      this.getAttribute('data-chart') || chartIdentifier(this.id || createId('chart'));
    this.setAttribute('data-chart', this.#scope);
    super.connectedCallback();
    this.#environment.connect();
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#destroyEngine();
    this.#environment.disconnect();
    this.#releasePopup?.();
    this.#releasePopup = undefined;
    this.#popup = null;
    super.disconnectedCallback();
  }
  /** Reports the inspected datum, as the renderer's `inspect` callback does; the tooltip shows it. */
  setInspection(state: ChartInspection): void {
    if (state.active && this.interaction !== 'both' && this.interaction !== state.source) return;
    this.#inspection = state;
    this.#repaint();
  }
  /** Reports the legend entries in the engine's order, as the renderer's `legend` callback does. */
  setLegend(payload: readonly ChartPayload[]): void {
    const current = this.#legend;
    // Renderers republish their legend on every update; only a different one repaints.
    if (
      payload.length === current.length &&
      payload.every((item, index) => {
        const previous = current[index]!;
        const keys = Object.keys(item);
        return (
          keys.length === Object.keys(previous).length &&
          keys.every((key) => Object.is(item[key], previous[key]))
        );
      })
    )
      return;
    this.#legend = payload;
    this.#repaint();
  }
  #engineUpdating = false;
  /** A renderer driven from updated() publishes after this render committed. */
  #repaint(): void {
    if (this.#engineUpdating) this.requestCommittedUpdate();
    else this.requestUpdate();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (
      changed.has('interaction') &&
      this.#inspection.active &&
      this.interaction !== 'both' &&
      this.interaction !== this.#inspection.source
    )
      this.#inspection = { ...this.#inspection, active: false };
    this.#appearance();
  }
  /** Where the legend stands; `inline` falls back to below the plot where marks can't carry it. */
  get #placement(): NonNullable<ChartLegendOptions['placement']> {
    const placement = (this.legendOptions && this.legendOptions.placement) || 'bottom';
    if (placement !== 'inline') return placement;
    return !this.renderer && (this.type === 'line' || this.type === 'radial') ? 'inline' : 'bottom';
  }
  /** The text that labels a series on the marks: its label, and its legend value when set. */
  #inlineText = (key: string): string => {
    const label = this.series[key]?.label ?? key;
    if (!this.legendOptions || !this.legendOptions.value || this.loading) return label;
    const value = this.#legendValues()[key] ?? null;
    if (value === null) return label;
    const format = this.series[key]?.format;
    return `${label} ${format ? format(value) : value.toLocaleString(resolveLocale(this) || undefined)}`;
  };
  protected override render() {
    const options = this.legendOptions;
    const placement = this.#placement;
    const legend =
      options && placement !== 'inline'
        ? chartLegendContent(this.metadataProvider, this.#legend, { ...options, placement })
        : nothing;
    const top = placement === 'top';
    const side = placement === 'start' || placement === 'end';
    const center = this.#center;
    const scope = this.renderPart('chart-style-scope', Object.freeze({}), {
      tag: 'div',
      properties: { part: 'chart-style-scope', class: 'style-scope' },
      content: html`${this.renderPart('chart-plot-region', Object.freeze({}), {
          tag: 'div',
          properties: { part: 'chart-plot-region', class: 'plot' },
        })}
        <div
          class="center"
          data-room=${center?.room ?? 'both'}
          style=${
            center
              ? `--_tp-center-x:${center.x}px;--_tp-center-y:${center.y}px;--_tp-center-size:${Math.round(center.radius * 1.5)}px`
              : nothing
          }
        >
          <slot name="center"></slot>
        </div>
        ${this.loading ? this.#placeholder() : nothing}`,
    });
    const active =
      !this.loading &&
      this.#inspection.active &&
      this.#inspection.payload.some((item) => item.type !== 'none');
    return this.renderPart('chart', Object.freeze({ interaction: this.interaction }), {
      tag: 'figure',
      properties: {
        part: 'chart',
        'aria-label': this.label,
        'aria-describedby': this.description ? `${this.#scope}-description` : nothing,
        'aria-busy': this.loading ? 'true' : nothing,
      },
      content: html` ${top ? legend : nothing}
        ${
          side
            ? html`<div class="body" data-legend=${placement}>
                ${placement === 'start' ? legend : nothing}${scope}${placement === 'end' ? legend : nothing}
              </div>`
            : scope
        }
        ${top || side ? nothing : legend}
        ${this.description ? html`<figcaption id=${`${this.#scope}-description`}>${this.description}</figcaption>` : nothing}
        <slot name="table" @slotchange=${this.#checkDescription}></slot>
        <slot></slot>
        <tp-tooltip
          .open=${active}
          .anchor=${this.#inspection.anchor}
          .showArrow=${false}
          .side=${this.#mountedRenderer === this.#builtin || this.#mountedRenderer === this.#polar ? 'inline-end' : 'block-start'}
          .dismissible=${true}
          .partContracts=${this.partContracts['chart-inspection-surface'] ? { 'tooltip-content': this.partContracts['chart-inspection-surface'] } : {}}
          @tp-open-change=${this.#tooltipChange}
        >
          ${chartTooltipContent(this.metadataProvider, this.#inspection, this.tooltipOptions)}
        </tp-tooltip>`,
    });
  }
  /** Placeholder marks shaped like the chart type, in the Skeleton's shimmer, while loading. */
  #placeholder(): unknown {
    const shape =
      this.renderer || !this.type
        ? 'block'
        : this.type === 'line'
          ? 'line'
          : this.type === 'radial'
            ? 'ring'
            : this.type === 'pie' || this.type === 'radar'
              ? 'disc'
              : 'bar';
    return this.renderPart('chart-skeleton', Object.freeze({ type: shape }), {
      tag: 'div',
      properties: {
        part: 'chart-skeleton',
        class: 'loading',
        'aria-hidden': 'true',
        'data-type': shape,
      },
      content:
        shape === 'block' || shape === 'disc' || shape === 'ring'
          ? html`<tp-skeleton class=${shape} animated></tp-skeleton>`
          : shape === 'line'
            ? html`<tp-skeleton class="wave" animated></tp-skeleton>`
            : PLACEHOLDER_HEIGHTS.map(
                (height) =>
                  html`<tp-skeleton
                    class="bar"
                    animated
                    style=${`block-size:${height}%`}
                  ></tp-skeleton>`,
              ),
    });
  }
  #polarOptions(): PolarOptions {
    const locale = resolveLocale(this);
    return {
      type: (POLAR.has(this.type!) ? this.type : 'pie') as PolarType,
      xAxis: this.xAxis,
      yAxis: this.yAxis,
      yDomain: this.yDomain,
      angleRange: this.angleRange,
      innerRadius: this.innerRadius,
      label: this.label,
      ...(locale ? { locale } : {}),
      ...(this.#placement === 'inline' ? { inline: this.#inlineText } : {}),
      center: (center) => {
        const same =
          center === this.#center ||
          (center &&
            this.#center &&
            center.x === this.#center.x &&
            center.y === this.#center.y &&
            center.radius === this.#center.radius &&
            center.room === this.#center.room);
        if (same) return;
        this.#center = center;
        this.#repaint();
      },
    };
  }
  #cartesianOptions(): CartesianOptions {
    const locale = resolveLocale(this);
    return {
      ...(this.#placement === 'inline' ? { inline: this.#inlineText } : {}),
      type: this.type ?? 'bar',
      stacked: this.stacked,
      xAxis: this.xAxis,
      yAxis: this.yAxis,
      xDomain: this.xDomain,
      yDomain: this.yDomain,
      negativeColors: this.#negativeColors,
      label: this.label,
      ...(locale ? { locale } : {}),
    };
  }
  /** The engine that draws: a renderer of your own, or the built-in marks of `type`. */
  get #activeRenderer(): ChartRenderer | undefined {
    if (this.renderer) return this.renderer;
    if (!this.type) return undefined;
    return POLAR.has(this.type) ? this.#polar : this.#builtin;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.isConnected) return;
    this.#engineUpdating = true;
    try {
      this.#syncEngine(changed);
    } finally {
      this.#engineUpdating = false;
    }
    const tooltip = this.renderRoot.querySelector<TpTooltip>('tp-tooltip');
    void tooltip?.updateComplete.then(() => {
      if (!this.isConnected || !tooltip.popupElement || this.#popup === tooltip.popupElement)
        return;
      this.#releasePopup?.();
      this.#popup = tooltip.popupElement;
      this.#releasePopup = this.presentationController.registerPart(
        'chart-inspection-surface',
        this.#popup,
      );
    });
    this.#checkDescription();
  }
  #syncEngine(changed: PropertyValues<this>): void {
    const plot = this.renderRoot.querySelector<HTMLElement>('[part~="chart-plot-region"]');
    const renderer = this.#activeRenderer;
    if (this.#mountedRenderer !== renderer || this.#plot !== plot) {
      this.#destroyEngine();
      if (renderer && plot) {
        this.#plot = plot;
        this.#mountedRenderer = renderer;
        const generation = ++this.#generation;
        this.#engine = renderer.mount(plot, {
          inspect: (state) => {
            if (generation === this.#generation && this.isConnected) this.setInspection(state);
          },
          legend: (payload) => {
            if (generation === this.#generation && this.isConnected) this.setLegend(payload);
          },
        });
        this.#viewport.connect(plot, (dimensions) => {
          this.#updateEngine();
          this.emit('tp-resize', dimensions);
        });
        this.#updateEngine();
      }
    } else if (
      (
        [
          'data',
          'series',
          'interaction',
          'type',
          'stacked',
          'xAxis',
          'yAxis',
          'xDomain',
          'yDomain',
          'label',
          'lang',
          'angleRange',
          'innerRadius',
          'legendOptions',
        ] as const
      ).some((key) => changed.has(key))
    )
      this.#updateEngine();
  }
  #tooltipChange = (event: CustomEvent<{ value: boolean }>): void => {
    if (!event.detail.value) {
      (event.currentTarget as TpTooltip).open = false;
      this.setInspection({ ...this.#inspection, active: false });
    }
  };
  #checkDescription = (): void => {
    const missing = !this.description.trim() && !this.querySelector('[slot="table"]');
    if (missing && !this.#missingDescription)
      this.diagnose(
        'missing-description',
        'Chart requires a meaningful description or an equivalent data table in slot="table".',
      );
    this.#missingDescription = missing;
  };
  #appearance(): void {
    if (!this.isConnected) return;
    const styles = this.ownerDocument.defaultView!.getComputedStyle(this);
    const dark =
      resolveColorScheme(
        styles.colorScheme,
        this.ownerDocument.defaultView!.matchMedia('(prefers-color-scheme: dark)').matches,
      ) === 'dark';
    const resolve = (value: string) =>
      value.replace(/var\((--tp-[\w-]+)\)/g, (_, token: string) =>
        styles.getPropertyValue(token).trim(),
      ) || value;
    this.#colors = Object.fromEntries(
      Object.entries(this.series).map(([key, series], index) => [
        key,
        resolve(
          series.theme?.[dark ? 'dark' : 'light'] ??
            series.color ??
            `var(--tp-chart-${(index % 5) + 1})`,
        ),
      ]),
    );
    this.#negativeColors = Object.fromEntries(
      Object.entries(this.series)
        .filter(([, series]) => series.negativeColor)
        .map(([key, series]) => [key, resolve(series.negativeColor!)]),
    );
  }
  #updateEngine(): void {
    const scope = this.renderRoot.querySelector<HTMLElement>('.style-scope');
    if (scope) {
      for (const property of Array.from(scope.style))
        if (property.startsWith('--color-v-')) scope.style.removeProperty(property);
      for (const [key, color] of Object.entries(this.#colors))
        scope.style.setProperty(`--color-${chartIdentifier(key)}`, color);
    }
    const snapshot: ChartSnapshot = {
      ...this.dimensions,
      id: this.#scope,
      data: this.data,
      series: this.series,
      interaction: this.interaction,
      colors: this.#colors,
    };
    this.#engine?.update(snapshot);
  }
  #destroyEngine(): void {
    ++this.#generation;
    this.#viewport.disconnect();
    this.#engine?.destroy();
    this.#engine = undefined;
    this.#mountedRenderer = undefined;
    this.#plot = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-chart': TpChart;
  }
}
