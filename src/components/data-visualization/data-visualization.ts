import { html, nothing, type PropertyValues } from 'lit';
import { resolveColorScheme } from '../../foundation/color-scheme.js';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';

import { VisualizationResponsiveViewport } from './viewport.js';
import { visualizationIdentifier } from './payload.js';
import {
  visualizationLegendContent,
  visualizationTooltipContent,
  type VisualizationMetadataProvider,
} from './content.js';
import { visualizationStructure } from './styles.js';
import type {
  VisualizationInspection,
  VisualizationInteraction,
  VisualizationLegendOptions,
  VisualizationPayload,
  VisualizationRenderer,
  VisualizationRendererInstance,
  VisualizationSeriesMap,
  VisualizationSnapshot,
  VisualizationTooltipOptions,
} from './types.js';
import { dataVisualizationPresentation } from '../../presentation/families/data-visualization.js';
import { TpTooltip } from '../tooltip/tooltip.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpIcon } from '../icon.js';

export class TpDataVisualization extends TpElement {
  static tagName = 'tp-data-visualization';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTooltip, TpIcon];
  }
  static override presentation = dataVisualizationPresentation;
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
  };
  static override styles = [TpElement.styles, visualizationStructure];
  label = 'Data visualization';
  description = '';
  interaction: VisualizationInteraction = 'none';
  data: readonly Record<string, unknown>[] = [];
  series: VisualizationSeriesMap = {};
  renderer: VisualizationRenderer | undefined;
  tooltipOptions: VisualizationTooltipOptions = {};
  legendOptions: VisualizationLegendOptions = {};
  #scope = '';
  #viewport = new VisualizationResponsiveViewport();
  #environment = new ComposedEnvironmentObserver(this, () => {
    this.#appearance();
    this.#updateEngine();
    this.requestUpdate();
  });
  #engine: VisualizationRendererInstance | undefined;
  #mountedRenderer: VisualizationRenderer | undefined;
  #plot: HTMLElement | undefined;
  #colors: Readonly<Record<string, string>> = {};
  #legend: readonly VisualizationPayload[] = [];
  #inspection: VisualizationInspection = { active: false, payload: [], source: 'pointer' };
  #releasePopup: (() => void) | undefined;
  #popup: HTMLElement | null = null;
  #generation = 0;
  #missingDescription = false;
  get dimensions() {
    return this.#viewport.dimensions;
  }
  get scopeIdentifier(): string {
    return this.#scope;
  }
  get metadataProvider(): VisualizationMetadataProvider {
    return { owner: this, series: this.series, colors: this.#colors };
  }
  get inspection(): VisualizationInspection {
    return this.#inspection;
  }
  get legendPayload(): readonly VisualizationPayload[] {
    return this.#legend;
  }
  override connectedCallback(): void {
    // Adopt a server-emitted identifier before generating a new client identity.
    this.#scope ||=
      this.getAttribute('data-chart') || visualizationIdentifier(this.id || createId('chart'));
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
  /** Engine callbacks retain the original inspection object and ordered payload. */
  setInspection(state: VisualizationInspection): void {
    if (state.active && this.interaction !== 'both' && this.interaction !== state.source) return;
    this.#inspection = state;
    this.#repaint();
  }
  setLegend(payload: readonly VisualizationPayload[]): void {
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
  protected override render() {
    const legend = visualizationLegendContent(
      this.metadataProvider,
      this.#legend,
      this.legendOptions,
    );
    const active =
      this.#inspection.active && this.#inspection.payload.some((item) => item.type !== 'none');
    return this.renderPart('data-visualization', Object.freeze({ interaction: this.interaction }), {
      tag: 'figure',
      properties: {
        part: 'data-visualization',
        'aria-label': this.label,
        'aria-describedby': this.description ? `${this.#scope}-description` : nothing,
      },
      content: html` ${this.legendOptions.placement === 'top' ? legend : nothing}
        ${this.renderPart('data-visualization-style-scope', Object.freeze({}), {
          tag: 'div',
          properties: { part: 'data-visualization-style-scope', class: 'style-scope' },
          content: this.renderPart('data-visualization-plot-region', Object.freeze({}), {
            tag: 'div',
            properties: { part: 'data-visualization-plot-region', class: 'plot' },
          }),
        })}
        ${this.legendOptions.placement !== 'top' ? legend : nothing}
        ${this.description ? html`<figcaption id=${`${this.#scope}-description`}>${this.description}</figcaption>` : nothing}
        <slot name="table" @slotchange=${this.#checkDescription}></slot>
        <slot></slot>
        <tp-tooltip
          .open=${active}
          .anchor=${this.#inspection.anchor}
          .showArrow=${false}
          .dismissible=${true}
          .partContracts=${this.partContracts['data-visualization-inspection-surface'] ? { 'tooltip-content': this.partContracts['data-visualization-inspection-surface'] } : {}}
          @tp-open-change=${this.#tooltipChange}
        >
          ${visualizationTooltipContent(this.metadataProvider, this.#inspection, this.tooltipOptions)}
        </tp-tooltip>`,
    });
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
        'data-visualization-inspection-surface',
        this.#popup,
      );
    });
    this.#checkDescription();
  }
  #syncEngine(changed: PropertyValues<this>): void {
    const plot = this.renderRoot.querySelector<HTMLElement>(
      '[part~="data-visualization-plot-region"]',
    );
    if (this.#mountedRenderer !== this.renderer || this.#plot !== plot) {
      this.#destroyEngine();
      if (this.renderer && plot) {
        this.#plot = plot;
        this.#mountedRenderer = this.renderer;
        const generation = ++this.#generation;
        this.#engine = this.renderer.mount(plot, {
          inspect: (state) => {
            if (generation === this.#generation && this.isConnected) this.setInspection(state);
          },
          legend: (payload) => {
            if (generation === this.#generation && this.isConnected) this.setLegend(payload);
          },
        });
        this.#viewport.connect(plot, (dimensions) => {
          this.#updateEngine();
          this.dispatchEvent(
            new CustomEvent('tp-resize', { detail: dimensions, bubbles: true, composed: true }),
          );
        });
        this.#updateEngine();
      }
    } else if (changed.has('data') || changed.has('series') || changed.has('interaction'))
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
      this.emit('tp-diagnostic', {
        code: 'missing-description',
        message:
          'Data Visualization requires a meaningful description or an equivalent data table in slot="table".',
      });
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
    this.#colors = Object.fromEntries(
      Object.entries(this.series).map(([key, series], index) => {
        const value =
          series.theme?.[dark ? 'dark' : 'light'] ??
          series.color ??
          `var(--tp-chart-${(index % 5) + 1})`;
        const resolved = value.replace(/var\((--tp-[\w-]+)\)/g, (_, token: string) =>
          styles.getPropertyValue(token).trim(),
        );
        return [key, resolved || value];
      }),
    );
  }
  #updateEngine(): void {
    const scope = this.renderRoot.querySelector<HTMLElement>('.style-scope');
    if (scope) {
      for (const property of Array.from(scope.style))
        if (property.startsWith('--color-v-')) scope.style.removeProperty(property);
      for (const [key, color] of Object.entries(this.#colors))
        scope.style.setProperty(`--color-${visualizationIdentifier(key)}`, color);
    }
    const snapshot: VisualizationSnapshot = {
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
