import { html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { CanvasSurface } from '../../foundation/canvas-surface.js';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';
import { resolveLocale } from '../../foundation/services.js';
import { createId } from '../../foundation/id.js';
import {
  chartLegendContent,
  chartTooltipContent,
  type ChartMetadataProvider,
} from '../../components/chart/content.js';
import type { ChartSeriesMap } from '../../components/chart/types.js';
import { plotPresentation } from '../../presentation/families/plot.js';
import { plotStrings, type PlotStrings } from './strings.js';
import { plotStyles } from './styles.js';
import {
  arrayView,
  domainConverter,
  jsonOption,
  jsonAxisOption,
  crosshairOption,
  plotDomains,
  validatePlot,
  lowerBound,
  plotKeyIndex,
} from './geometry.js';
import { PlotDecorations, plotRect, axisFormat, crosshairFormat } from './decorations.js';
import { PlotHistoryRaster } from './history-raster.js';
import { drawnDomain, strokeReach } from './renderer.js';
import {
  plotFrameDeadline,
  plotSchedulerFor,
  type PlotRenderHandle,
  type PlotRenderScheduler,
} from './scheduler.js';
import type { PlotStream } from './stream.js';
import type {
  PlotAxis,
  PlotConfiguration,
  PlotData,
  PlotDomain,
  PlotDomainInput,
  PlotGrid,
  PlotCrosshair,
  PlotGuide,
  PlotInspection,
  PlotLegend,
  PlotMode,
  PlotPaint,
  PlotPoint,
  PlotRenderStats,
  PlotSamples,
  PlotSeries,
  PlotStrategy,
  PlotSummary,
} from './types.js';

/**
 * Numeric lines and areas, from static arrays or a bounded live history. Push mode reuses
 * rasterized history; incoming samples do not render the element's template. Every option except
 * the callbacks (`format`, `clock`) and `stream` also takes JSON in its attribute.
 * @slot table - An application supplied text or Table alternative to the graph.
 * @slot - Supplementary content below the graph.
 * @fires {PlotInspection | null} tp-inspection-change - The inspected sample changed or cleared.
 * @csspart plot-legend - The informational series legend.
 * @csspart plot-series - One series label and mark in the shared legend.
 * @cssprop --tp-plot-surface - Solid graph background color.
 * @cssprop --tp-plot-grid - Grid lines and dots.
 * @cssprop --tp-plot-guide - Default guide stroke and text.
 * @csspart plot-crosshair - The inspected x's vertical guide line, with `crosshair`.
 * @csspart plot-marker - A dot on an inspected sample, or on a series' latest sample.
 * @csspart plot-crosshair-label - The x axis chip with the inspected x, with `crosshair`.
 */
export class TpPlot extends TpElement {
  static tagName = 'tp-plot';
  static override presentation = plotPresentation;
  static override styles = [TpElement.styles, ...plotStyles];
  static override properties = {
    ...TpElement.properties,
    strings: { attribute: false },
    label: { type: String },
    description: { type: String },
    data: { converter: jsonOption({}) },
    series: { converter: jsonOption([]) },
    stream: { attribute: false },
    mode: { type: String, reflect: true },
    xDomain: { attribute: 'x-domain', converter: domainConverter },
    yDomain: { attribute: 'y-domain', converter: domainConverter },
    window: { type: Number },
    follow: { type: String },
    clock: { attribute: false },
    autoRange: { attribute: 'auto-range', converter: jsonOption({}) },
    xAxis: { attribute: 'x-axis', converter: jsonAxisOption },
    yAxis: { attribute: 'y-axis', converter: jsonAxisOption },
    background: { type: String, reflect: true },
    grid: { converter: jsonOption({}) },
    guides: { converter: jsonOption([]) },
    legend: { converter: jsonAxisOption },
    interaction: { type: String, reflect: true },
    inspectMode: { type: String, attribute: 'inspect-mode' },
    crosshair: { converter: crosshairOption },
    offscreen: { type: String },
    size: { type: String, reflect: true },
    paused: { type: Boolean, reflect: true },
    maxFrameRate: { type: Number, attribute: 'max-frame-rate' },
    maxPixelRatio: { type: Number, attribute: 'max-pixel-ratio' },
    renderStrategy: { type: String, attribute: 'render-strategy' },
    decimation: { type: String },
    locale: { type: String },
    timeZone: { type: String, attribute: 'time-zone' },
    scheduler: { attribute: false },
  };
  /** Short text overrides for empty data, gaps, inspection and legend. */
  strings: Partial<PlotStrings> = {};
  /** Accessible and visible name of the graph. */ label = 'Plot';
  /** Application supplied interpretation of the data. */ description = '';
  /** Immutable datasets by series ID, or JSON in its attribute; publish a new object to replace them. */ data: PlotData =
    {};
  /** Explicit stable IDs, labels, colors, strokes and optional signed fills, or JSON in its attribute. */ series: readonly PlotSeries[] =
    [];
  /** Application owned history; mutually exclusive with nonempty data. */ stream:
    PlotStream | undefined;
  /** Static domain, moving x window, or uniformly spaced incremental history. */ mode: PlotMode =
    'static';
  /** Increasing numeric domain or auto; scrolling requires auto. */ xDomain: PlotDomainInput =
    'auto';
  /** Increasing numeric domain or auto; push requires a fixed domain. */ yDomain: PlotDomainInput =
    'auto';
  /** Scrolling window in x units, or sample intervals in push mode. */ window = 10000;
  /** Advance on the latest sample or an explicit clock. */ follow: 'latest' | 'clock' = 'latest';
  /** Returns x in source units when follow is clock. */ clock: (() => number) | undefined;
  /** Padding and optional zero inclusion for automatic y ranges, or JSON in its attribute. */ autoRange: {
    padding?: number;
    includeZero?: boolean;
  } = {};
  /** Optional independent x axis, or JSON in its attribute; timestamps use epoch milliseconds. */ xAxis:
    false | PlotAxis = false;
  /** Optional independent y axis, or JSON in its attribute. */ yAxis: false | PlotAxis = false;
  /** No background, solid surface, dots or a grid. */ background:
    'none' | 'solid' | 'dots' | 'grid' = 'none';
  /** Grid directions, coordinate units, spacing, origin and major frequency, or JSON in its attribute. */ grid: PlotGrid =
    {};
  /** Application supplied horizontal or vertical guides, or JSON in its attribute. */ guides: readonly PlotGuide[] =
    [];
  /** Optional informational legend and value formatter, or JSON in its attribute. */ legend:
    false | PlotLegend = false;
  /** Optional keyboard and pointer inspection of original samples. */
  interaction: 'none' | 'inspect' = 'none';
  /** Inspect each series at or before x, or the nearest sample in screen space. */
  inspectMode: 'nearest-x' | 'nearest-point' = 'nearest-x';
  /**
   * While inspecting, a vertical guide at the inspected x, dots on its samples, an x axis chip and
   * a hint that follows them along the top or bottom edge; an object, or JSON in the attribute,
   * configures each.
   */
  crosshair: boolean | PlotCrosshair = false;
  /** Suspend offscreen painting by default; render keeps it eligible. */
  offscreen: 'suspend' | 'render' = 'suspend';
  /** Shared text and spacing density; CSS owns graph dimensions. */
  size: 'sm' | 'default' | 'lg' = 'default';
  /** Suspend paints while preserving bounded incoming samples. */ paused = false;
  /** Maximum paints per second; zero enables manual painting only. */ maxFrameRate = 10;
  /** Maximum backing pixel ratio, default two. */ maxPixelRatio = 2;
  /** Automatic eligibility, strict incremental history, or full redraw baseline. */ renderStrategy: PlotStrategy =
    'auto';
  /** Preserve extrema per device column, or draw every visible point. */ decimation:
    'auto' | 'none' = 'auto';
  /** Number and date formatting locale; empty inherits the environment. */ locale = '';
  /** Optional IANA time zone for time axes. */ timeZone = '';
  /** Optional shared owner-window scheduler with a dashboard paint budget. */ scheduler:
    PlotRenderScheduler | undefined;
  #surface: CanvasSurface | undefined;
  #history: PlotHistoryRaster | undefined;
  #decorations: PlotDecorations | undefined;
  #handle: PlotRenderHandle | undefined;
  #release: (() => void) | undefined;
  #releaseAppearance: (() => void) | undefined;
  #intersection: IntersectionObserver | undefined;
  #offscreen = false;
  #dirty = true;
  #lastPaint = -Infinity;
  #hasData = false;
  #config: PlotConfiguration | undefined;
  #views = new Map<string, PlotSamples>();
  #generation = 0;
  #configurationVersion = 0;
  #paint: PlotPaint | undefined;
  #end: number | undefined;
  #domains: { x: PlotDomain; y: PlotDomain } = { x: [0, 1], y: [0, 1] };
  /** The y domain painted and inspected: `#domains.y` widened so edge values keep their stroke. */
  #drawnY: PlotDomain = [0, 1];
  /** The plot rectangle of the last paint, in CSS pixels; absent before the first paint. */
  #overlay: { left: number; top: number; width: number; height: number } | undefined;
  #active: PlotInspection | null = null;
  #pendingPointer: readonly [number, number] | undefined;
  #activeKey: number | undefined;
  #publishedKey: number | undefined;
  #diagnostic = '';
  #id = createId('plot');
  #environment = new ComposedEnvironmentObserver(this, () => {
    this.#configure();
    this.#paint = undefined;
    this.#generation++;
    this.#queue();
  });
  /** Inexpensive counters for measuring full redraws and incremental work. */
  get renderStats(): PlotRenderStats {
    return (
      this.#history?.stats ?? {
        strategy: 'full' as const,
        fullRedraws: 0,
        incrementalPaints: 0,
        shiftedDevicePixels: 0,
        redrawnColumns: 0,
        fallbackReason: null,
      }
    );
  }
  /** Compute retained statistics on request, independently of ingestion and painting. */
  getSummary(): PlotSummary {
    const series: Record<string, PlotSummary['series'][string]> = Object.create(null);
    for (const [id, view] of this.#views) {
      let min = Infinity,
        max = -Infinity;
      for (let i = 0; i < view.length; i++) {
        const y = view.at(i)[1];
        if (y !== null) {
          min = Math.min(min, y);
          max = Math.max(max, y);
        }
      }
      series[id] = {
        count: view.length,
        latest: view.length ? view.at(view.length - 1) : null,
        minimum: Number.isFinite(min) ? min : null,
        maximum: Number.isFinite(max) ? max : null,
      };
    }
    return { xDomain: this.#domains.x, yDomain: this.#domains.y, series };
  }
  #queue(): void {
    this.#dirty = true;
    if (this.#config?.scheduler?.disposed) {
      this.diagnose(
        'plot-scheduler-disposed',
        'Assign a replacement for the disposed Plot scheduler.',
        { once: true },
      );
      return;
    }
    this.#handle?.invalidate();
  }
  /** Paint once now, including in manual mode, while respecting suspension and visibility. */
  renderNow(): void {
    if (
      !this.isConnected ||
      this.paused ||
      this.ownerDocument.hidden ||
      (this.#offscreen && this.offscreen === 'suspend')
    )
      return;
    this.#dirty = false;
    this.#lastPaint = this.ownerDocument.defaultView!.performance.now();
    this.#surface?.paint();
  }
  /** Request a paint after a callback's external dependencies change. */
  invalidate(): void {
    this.#paint = undefined;
    this.#generation++;
    this.#queue();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#environment.connect();
    if (this.hasUpdated) {
      this.#configure();
      this.#connect();
    }
  }
  override disconnectedCallback(): void {
    if (this.#pointerFrame)
      (this.ownerDocument.defaultView ?? window).cancelAnimationFrame(this.#pointerFrame);
    this.#pointerFrame = 0;
    this.#disconnect();
    this.#environment.disconnect();
    super.disconnectedCallback();
  }
  adoptedCallback(): void {
    this.#disconnect();
    if (this.isConnected) {
      this.#environment.connect();
      this.#configure();
      this.#connect();
    }
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#configure();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    for (const name of ['legend', 'crosshair'] as const)
      if (changed.has(name) && typeof this[name] === 'string')
        this.diagnose('plot-attribute', `Plot ${name} attribute is not valid JSON.`, {
          once: true,
        });
    this.#placeOverlay();
    if (changed.has('partPresentation') || changed.has('size')) this.invalidate();
    if (changed.has('legend')) this.#queue();
    if (changed.has('disabled') && this.disabled) this.#inspect(null);
    if (changed.has('interaction') && this.interaction === 'none') this.#inspect(null);
    if (!this.#surface && this.isConnected) this.#connect();
  }
  #configure(): void {
    const config: PlotConfiguration = {
      series: this.series,
      data: this.data,
      stream: this.stream,
      mode: this.mode,
      xDomain: this.xDomain,
      yDomain: this.yDomain,
      window: this.window,
      follow: this.follow,
      clock: this.clock,
      autoRange: this.autoRange,
      xAxis: this.xAxis,
      yAxis: this.yAxis,
      background: this.background,
      grid: this.grid,
      guides: this.guides,
      maxFrameRate: this.maxFrameRate,
      maxPixelRatio: this.maxPixelRatio,
      renderStrategy: this.renderStrategy,
      decimation: this.decimation,
      locale: this.locale || (this.ownerDocument ? resolveLocale(this) : undefined) || '',
      timeZone: this.timeZone,
      scheduler: this.scheduler,
    };
    try {
      validatePlot(config);
      if (
        !['none', 'inspect'].includes(this.interaction) ||
        !['nearest-x', 'nearest-point'].includes(this.inspectMode) ||
        !['suspend', 'render'].includes(this.offscreen) ||
        !['sm', 'default', 'lg'].includes(this.size)
      )
        throw new Error('Invalid Plot interaction, inspection mode, offscreen policy or size.');
      if (config.scheduler?.disposed)
        throw new Error('Plot scheduler is disposed; assign a replacement.');
      if (config.stream?.disposed) throw new Error('Cannot attach a disposed Plot stream.');
      if (config.scheduler && config.scheduler.owner !== this.ownerDocument?.defaultView)
        throw new Error('Plot scheduler must belong to the same Window.');
      const old = this.#config;
      // Internal inspection renders keep the renderer and subscriptions untouched.
      if (
        old &&
        Object.keys(config).every(
          (key) => old[key as keyof PlotConfiguration] === config[key as keyof PlotConfiguration],
        )
      ) {
        this.#suspend();
        return;
      }
      const views = new Map(
        config.series.map((s) => [
          s.id,
          config.stream ? config.stream.view(s.id) : arrayView(config.data, s.id),
        ]),
      );
      if (old && (old.stream !== config.stream || old.data !== config.data)) this.#inspect(null);
      this.#release?.();
      this.#release = config.stream?.subscribe(() => {
        this.#queue();
      });
      this.#views = views;
      if (
        !this.hasUpdated ||
        old?.data !== config.data ||
        old?.stream !== config.stream ||
        old?.series !== config.series
      )
        this.#hasData = [...views.values()].some((v) => v.length > 0);
      const empty = this.renderRoot?.querySelector<HTMLElement>('.empty');
      if (empty) empty.hidden = [...views.values()].some((v) => v.length > 0);
      this.#config = config;
      const historyKeys = [
        'series',
        'data',
        'stream',
        'mode',
        'xDomain',
        'yDomain',
        'window',
        'follow',
        'clock',
        'autoRange',
        'maxPixelRatio',
        'renderStrategy',
        'decimation',
        'xAxis',
        'yAxis',
      ] as const;
      if (!old || historyKeys.some((key) => old[key] !== config[key])) this.#generation++;
      this.#configurationVersion++;
      this.#paint = undefined;
      if (
        !old ||
        old.stream !== config.stream ||
        old.data !== config.data ||
        old.mode !== config.mode
      )
        this.#end = undefined;
      if (old?.scheduler !== config.scheduler && this.#surface) {
        this.#disconnect();
        this.#connect();
      }
      this.#suspend();
      if (old?.maxPixelRatio !== config.maxPixelRatio) this.#surface?.refresh();
      this.#queue();
      this.#diagnostic = '';
    } catch (error) {
      const message = String(error);
      if (message !== this.#diagnostic) {
        this.#diagnostic = message;
        this.diagnose('plot-configuration', message, { once: true, defer: true });
      }
    }
  }
  #connect(): void {
    const owner = this.ownerDocument.defaultView,
      canvas = this.renderRoot.querySelector('canvas');
    if (!owner || !canvas || !this.#config) return;
    if (
      this.#config.scheduler &&
      (this.#config.scheduler.owner !== owner || this.#config.scheduler.disposed)
    )
      return;
    this.#releaseAppearance = this.presentationController.subscribe(() => this.invalidate());
    this.#history = new PlotHistoryRaster(this.ownerDocument, true);
    this.#decorations = new PlotDecorations(this.ownerDocument);
    if (!this.#release) this.#release = this.#config.stream?.subscribe(() => this.#queue());
    this.#handle = (this.#config.scheduler ?? plotSchedulerFor(owner)).register({
      minimumInterval: this.#config?.maxFrameRate ? 1000 / this.#config.maxFrameRate : 0,
      paint: (timestamp) => {
        if (!this.#dirty || this.#config?.maxFrameRate === 0) return;
        if (this.#surface?.lost) {
          this.#suspend();
          return;
        }
        const now = timestamp,
          interval = this.#config!.maxFrameRate ? 1000 / this.#config!.maxFrameRate : Infinity;
        const deadline = plotFrameDeadline(this.#lastPaint, interval, now);
        if (deadline === undefined) {
          this.#queue();
          return;
        }
        this.#lastPaint = deadline;
        this.#dirty = false;
        this.#surface?.paint();
        if (this.#config?.follow === 'clock' && this.#config.mode !== 'static') this.#queue();
      },
    });
    this.#surface = new CanvasSurface({
      canvas,
      owner,
      maxPixelRatio: () => this.#config?.maxPixelRatio ?? 2,
      schedule: () => {
        this.#generation++;
        this.#paint = undefined;
        this.#suspend();
        this.#queue();
      },
      render: (ctx, w, h, r) => this.#draw(ctx, w, h, r),
    });
    this.#surface.connect();
    this.#intersection = new owner.IntersectionObserver((entries) => {
      this.#offscreen = !entries[0]?.isIntersecting;
      this.#suspend();
      if (!this.#offscreen) this.#queue();
    });
    this.#intersection.observe(this);
    this.#suspend();
  }
  #disconnect(): void {
    this.#releaseAppearance?.();
    this.#releaseAppearance = undefined;
    this.#release?.();
    this.#release = undefined;
    this.#surface?.disconnect();
    this.#surface = undefined;
    this.#handle?.dispose();
    this.#handle = undefined;
    this.#intersection?.disconnect();
    this.#intersection = undefined;
    this.#history?.dispose();
    this.#history = undefined;
    this.#decorations?.dispose();
    this.#decorations = undefined;
    this.#end = undefined;
    this.#lastPaint = -Infinity;
  }
  #suspend(): void {
    this.#handle?.configure({
      minimumInterval: this.#config?.maxFrameRate ? 1000 / this.#config.maxFrameRate : 0,
      suspended:
        this.paused ||
        this.#config?.maxFrameRate === 0 ||
        (this.#offscreen && this.offscreen === 'suspend') ||
        !!this.#surface?.lost ||
        (!!this.#surface && (!this.#surface.width || !this.#surface.height)),
    });
  }
  #appearance(): PlotPaint {
    const owner = this.ownerDocument.defaultView!,
      probe = this.renderRoot.querySelector<HTMLElement>('.probe')!,
      surface = this.renderRoot.querySelector('canvas')!;
    const css = owner.getComputedStyle(surface);
    const color = (value: string) => {
      probe.style.color = value;
      return owner.getComputedStyle(probe).color;
    };
    const colors: Record<string, string> = Object.create(null),
      negativeColors: Record<string, string> = Object.create(null),
      negativeFills: Record<string, string> = Object.create(null);
    for (const s of this.#config!.series) {
      let hash = 0;
      for (const c of s.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
      colors[s.id] = color(s.color ?? `var(--tp-chart-${(hash % 5) + 1})`);
      negativeColors[s.id] = s.negativeColor ? color(s.negativeColor) : colors[s.id]!;
      negativeFills[s.id] = s.negativeFill?.color
        ? color(s.negativeFill.color)
        : negativeColors[s.id]!;
    }
    return {
      direction: css.direction === 'rtl' ? 'rtl' : 'ltr',
      surface: color(css.getPropertyValue('--tp-plot-surface') || 'var(--tp-muted)'),
      foreground: color('var(--tp-foreground)'),
      muted: color('var(--tp-muted-foreground)'),
      grid: color(css.getPropertyValue('--tp-plot-grid') || 'currentColor'),
      guideColors: Object.fromEntries(
        this.#config!.guides.filter((g) => g.color).map((g) => [g.id, color(g.color!)]),
      ),
      guide: color(css.getPropertyValue('--tp-plot-guide') || 'var(--tp-muted-foreground)'),
      colors,
      negativeColors,
      negativeFills,
      font: css.font,
    };
  }
  #draw(ctx: CanvasRenderingContext2D, w: number, h: number, r: number): void {
    const c = this.#config;
    if (!c || !this.#history) return;
    try {
      const hasData = [...this.#views.values()].some((v) => v.length > 0);
      if (hasData !== this.#hasData) {
        this.#hasData = hasData;
        this.requestUpdate();
      }
      this.#reconcileInspection();
      this.#resolvePointer();
      let domainConfig = c;
      if (c.mode !== 'static' && c.follow === 'clock') {
        const now = c.clock!();
        if (!Number.isFinite(now)) throw new Error('Plot clock must return a finite x value.');
        if (this.#end !== undefined && now < this.#end)
          this.diagnose(
            'plot-clock-regressed',
            'Clock moved backwards; the displayed domain is held until it catches up.',
            { once: true },
          );
        domainConfig = { ...c, clock: () => now };
      }
      this.#domains = plotDomains(domainConfig, this.#views, this.#end);
      this.#end = this.#domains.x[1];
      const paint = this.#paint ?? (this.#paint = this.#appearance());
      const layout = this.#layoutConfig();
      const rect = plotRect(layout, w, h, r);
      this.#drawnY = drawnDomain(this.#domains.y, rect.height, strokeReach(c.series) * r);
      const fraction = this.#history.paint({
        config: c,
        views: this.#views,
        x: this.#domains.x,
        y: this.#drawnY,
        width: rect.width,
        height: rect.height,
        ratio: r,
        paint,
        generation: this.#generation,
      });
      this.#updateLegend();
      ctx.clearRect(0, 0, w, h);
      this.#decorations?.paint(
        ctx,
        layout,
        this.#domains.x,
        this.#drawnY,
        rect,
        w,
        h,
        r,
        paint,
        this.#generation + this.#configurationVersion,
        'back',
      );
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.left, rect.top, rect.width, rect.height);
      ctx.clip();
      this.#history.composite(ctx, rect.left, rect.top, fraction);
      ctx.restore();
      this.#decorations?.paint(
        ctx,
        layout,
        this.#domains.x,
        this.#drawnY,
        rect,
        w,
        h,
        r,
        paint,
        this.#generation + this.#configurationVersion,
        'front',
      );
      // The overlay geometry only matters to inspection and latest-sample dots; plots without
      // them pay nothing for it after a paint.
      if (this.interaction === 'inspect' || c.series.some((s) => s.marker === 'latest')) {
        const o = (this.#overlay ??= { left: 0, top: 0, width: 0, height: 0 });
        o.left = rect.left / r;
        o.top = rect.top / r;
        o.width = rect.width / r;
        o.height = rect.height / r;
        this.#placeOverlay();
      }
    } catch (error) {
      const message = String(error);
      if (message !== this.#diagnostic) {
        this.diagnose('plot-render', message, { once: true, defer: true });
        this.#diagnostic = message;
      }
    }
  }
  #updateLegend(): void {
    if (!this.#legendOptions) return;
    for (const entry of this.renderRoot.querySelectorAll<HTMLElement>(
      '.series-entry[data-series]',
    )) {
      const mark = entry.querySelector<HTMLElement>('.encoding');
      const color = this.#paint?.colors[entry.dataset.series!];
      if (mark && color && mark.style.getPropertyValue('--_tp-series-color') !== color)
        mark.style.setProperty('--_tp-series-color', color);
    }
    if (!this.#legendOptions.format) return;
    for (const node of this.renderRoot.querySelectorAll<HTMLElement>('[data-latest]')) {
      const id = node.dataset.latest!,
        view = this.#views.get(id),
        series = this.#config?.series.find((s) => s.id === id);
      if (!series) continue;
      const text = this.#legendOptions.format(
        view?.length ? view.at(view.length - 1)[1] : null,
        series,
      );
      if (node.textContent !== text) node.textContent = text;
    }
  }
  /** The legend's options; text that was not JSON shows no legend (and reports a diagnostic). */
  get #legendOptions(): false | PlotLegend {
    return typeof this.legend === 'object' ? this.legend : false;
  }
  #layoutConfig(): PlotConfiguration {
    const c = this.#config!;
    return this.#paint?.direction === 'rtl' && c.yAxis
      ? { ...c, yAxis: { ...c.yAxis, position: c.yAxis.position === 'end' ? 'start' : 'end' } }
      : c;
  }
  #metadata(): ChartMetadataProvider {
    const series: Record<string, ChartSeriesMap[string]> = Object.create(null);
    for (const s of this.#config?.series ?? [])
      series[s.id] = { label: s.label, ...(s.color ? { color: s.color } : {}) };
    return {
      owner: this,
      series,
      colors: this.#paint?.colors ?? {},
      legendPart: 'plot-legend',
      seriesPart: 'plot-series',
    };
  }
  #inspectionRows(active: PlotInspection) {
    const selected =
      this.inspectMode === 'nearest-point'
        ? (this.#config?.series ?? []).filter((s) => s.id === active.seriesId)
        : (this.#config?.series ?? []).filter((s) => s.visible !== false);
    return selected.flatMap((s) => {
      if (s.id === active.seriesId) return [{ dataKey: s.id, name: s.id, value: active.y }];
      const view = this.#views.get(s.id);
      if (!view?.length) return [];
      let i = view.monotonic
        ? Math.max(0, Math.min(view.length - 1, lowerBound(view, active.x)))
        : 0;
      while (i > 0 && view.at(i)[0] > active.x) i--;
      while (i + 1 < view.length && view.at(i + 1)[0] <= active.x) i++;
      const p = view.at(i);
      if (p[0] > active.x) return [];
      return [{ dataKey: s.id, name: s.id, value: p[1] }];
    });
  }
  #reconcileInspection(): void {
    const active = this.#active;
    if (!active) return;
    if (!this.#config?.series.some((s) => s.id === active.seriesId && s.visible !== false)) {
      this.#inspect(null);
      return;
    }
    const view = this.#views.get(active.seriesId);
    if (!view?.length) {
      this.#inspect(null);
      return;
    }
    let index = view.monotonic ? Math.min(view.length - 1, lowerBound(view, active.x)) : 0;
    if (view.key && this.#activeKey !== undefined) {
      index = plotKeyIndex(view, this.#activeKey);
    }
    if (
      index >= view.length ||
      view.at(index)[0] !== active.x ||
      (view.key && this.#activeKey !== undefined && view.key(index) !== this.#activeKey)
    ) {
      this.#inspect(null);
      return;
    }
    // Live sample replacements never announce continuous telemetry.
    const point = view.at(index);
    if (point[1] !== active.y) {
      this.#active = null;
      this.#activeKey = undefined;
      this.requestUpdate();
    }
  }
  #inspect(value: PlotInspection | null): void {
    if (
      JSON.stringify(value) === JSON.stringify(this.#active) &&
      this.#publishedKey === this.#activeKey
    )
      return;
    this.#active = value;
    if (!value) this.#activeKey = undefined;
    this.#publishedKey = this.#activeKey;
    if (!this.isUpdatePending) this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<PlotInspection | null>('tp-inspection-change', {
        detail: value,
        bubbles: true,
        composed: true,
      }),
    );
  }
  #key = (event: KeyboardEvent): void => {
    if (this.disabled || this.interaction !== 'inspect') return;
    const series = (this.#config?.series ?? []).filter((s) => s.visible !== false);
    if (!series.length) return;
    let si = Math.max(
      0,
      series.findIndex((s) => s.id === this.#active?.seriesId),
    );
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#inspect(null);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
      return;
    event.preventDefault();
    if (event.key === 'ArrowUp') si = (si + series.length - 1) % series.length;
    if (event.key === 'ArrowDown') si = (si + 1) % series.length;
    const id = series[si]!.id,
      view = this.#views.get(id);
    if (!view?.length) return;
    const first = view.monotonic
      ? Math.min(view.length - 1, lowerBound(view, this.#domains.x[0]))
      : 0;
    let end = view.length - 1;
    if (view.monotonic) {
      let boundary = lowerBound(view, this.#domains.x[1]);
      while (boundary < view.length && view.at(boundary)[0] === this.#domains.x[1]) boundary++;
      end = Math.max(first, boundary - 1);
    }
    let index = this.#active
      ? view.monotonic
        ? lowerBound(view, this.#active.x)
        : (this.#activeKey ?? 0)
      : end;
    if (this.#active?.seriesId === id && this.#activeKey !== undefined)
      index = plotKeyIndex(view, this.#activeKey);
    if (event.key === 'Home') index = first;
    if (event.key === 'End') index = end;
    if (event.key === 'ArrowLeft') index--;
    if (event.key === 'ArrowRight') index++;
    index = Math.max(first, Math.min(end, index));
    const point = view.at(index);
    this.#activeKey = view.key?.(index);
    this.#inspect({ seriesId: id, x: point[0], y: point[1], source: 'keyboard' });
  };
  /**
   * Hovering resolves the sample once per animation frame against the last painted domains and
   * moves the overlay; it never repaints the canvas, so a hover costs no series raster.
   */
  #pointerFrame = 0;
  #pointer = (event: PointerEvent): void => {
    if (this.disabled || this.interaction !== 'inspect') return;
    this.#pendingPointer = [event.clientX, event.clientY];
    if (!this.#overlay) {
      // Nothing painted yet: the first paint resolves the pointer.
      this.#queue();
      return;
    }
    if (this.#pointerFrame) return;
    const view = this.ownerDocument.defaultView ?? window;
    this.#pointerFrame = view.requestAnimationFrame(() => {
      this.#pointerFrame = 0;
      this.#resolvePointer();
    });
  };
  #resolvePointer(): void {
    const position = this.#pendingPointer;
    this.#pendingPointer = undefined;
    if (!position) return;
    const canvas = this.renderRoot.querySelector('canvas');
    if (!canvas || !this.#config) return;
    const bounds = canvas.getBoundingClientRect(),
      r = canvas.width / bounds.width,
      rect = plotRect(this.#layoutConfig(), canvas.width, canvas.height, r);
    const fraction = Math.max(
      0,
      Math.min(1, ((position[0] - bounds.left) * r - rect.left) / rect.width),
    );
    const x = this.#domains.x[0] + fraction * (this.#domains.x[1] - this.#domains.x[0]);
    let nearest: PlotInspection | null = null,
      distance = Infinity;
    for (const series of this.#config.series) {
      if (series.visible === false) continue;
      const view = this.#views.get(series.id);
      if (!view?.length) continue;
      let index = 0;
      if (view.monotonic) {
        index = Math.max(0, Math.min(view.length - 1, lowerBound(view, x) - 1));
        while (index + 1 < view.length && view.at(index + 1)[0] <= x) index++;
      } else {
        let best = -Infinity;
        for (let i = 0; i < view.length; i++) {
          const px = view.at(i)[0];
          if (px <= x && px > best) {
            best = px;
            index = i;
          }
        }
      }
      if (this.inspectMode === 'nearest-point') {
        let best = Infinity;
        const start = view.monotonic ? Math.max(0, lowerBound(view, this.#domains.x[0]) - 1) : 0;
        for (let i = start; i < view.length; i++) {
          const p = view.at(i);
          if (view.monotonic && p[0] > this.#domains.x[1]) break;
          if (p[1] === null) continue;
          const px =
            bounds.left +
            (rect.left +
              ((p[0] - this.#domains.x[0]) / (this.#domains.x[1] - this.#domains.x[0])) *
                rect.width) /
              r;
          const py =
            bounds.top +
            (rect.top +
              rect.height -
              ((p[1] - this.#drawnY[0]) / (this.#drawnY[1] - this.#drawnY[0])) * rect.height) /
              r;
          const d = Math.hypot(px - position[0], py - position[1]);
          if (d < best) {
            best = d;
            index = i;
          }
        }
      }
      const p = view.at(index),
        pixelY =
          bounds.top +
          (rect.top +
            rect.height -
            (p[1] === null
              ? rect.height / 2
              : ((p[1] - this.#drawnY[0]) / (this.#drawnY[1] - this.#drawnY[0])) * rect.height)) /
            r;
      const pixelX =
        bounds.left +
        (rect.left +
          ((p[0] - this.#domains.x[0]) / (this.#domains.x[1] - this.#domains.x[0])) * rect.width) /
          r;
      const d =
        this.inspectMode === 'nearest-point'
          ? Math.hypot(pixelX - position[0], pixelY - position[1])
          : Math.abs(pixelY - position[1]);
      if (d < distance) {
        distance = d;
        nearest = { seriesId: series.id, x: p[0], y: p[1], source: 'pointer' };
        this.#activeKey = view.key?.(index);
      }
    }
    this.#inspect(nearest);
  }
  /** The crosshair's options, or null when it is off. */
  #crosshair():
    | (Required<Pick<PlotCrosshair, 'line' | 'marker' | 'label' | 'hint'>> &
        Pick<PlotCrosshair, 'format' | 'dash'>)
    | null {
    if (!this.crosshair || this.interaction !== 'inspect' || typeof this.crosshair === 'string')
      return null;
    const options = this.crosshair === true ? {} : this.crosshair;
    return {
      line: options.line ?? true,
      marker: options.marker ?? true,
      label: options.label ?? true,
      hint: options.hint ?? 'top',
      ...(options.format ? { format: options.format } : {}),
      ...(options.dash ? { dash: options.dash } : {}),
    };
  }
  /** Samples at the inspected x: one per inspected series that has one there. */
  #rows(): { id: string; x: number; y: number | null }[] {
    const active = this.#active;
    if (!active) return [];
    return this.#inspectionRows(active).map((row) => ({
      id: String(row.dataKey),
      x: active.x,
      y: row.value,
    }));
  }
  /** The CSS-pixel position of a data point inside the viewport. */
  #at(x: number, y: number): [number, number] {
    const o = this.#overlay!,
      dx = this.#domains.x,
      dy = this.#drawnY;
    return [
      o.left + ((x - dx[0]) / (dx[1] - dx[0])) * o.width,
      o.top + o.height - ((y - dy[0]) / (dy[1] - dy[0])) * o.height,
    ];
  }
  /**
   * Moves the crosshair, the sample dots, the x chip, the hint and the latest-sample dots to the
   * last painted geometry with transform writes; runs after each paint and each render.
   */
  #placeOverlay(): void {
    const o = this.#overlay;
    if (!o || (!this.#active && !this.#config?.series.some((s) => s.marker === 'latest'))) return;
    const root = this.renderRoot;
    // Dots take their series color from the resolved paint, which the first paint produces.
    for (const dot of root.querySelectorAll<HTMLElement>('.marker')) {
      const color = this.#paint?.colors[dot.dataset.latest ?? dot.dataset.series ?? ''];
      if (color && dot.style.getPropertyValue('--_tp-series-color') !== color)
        dot.style.setProperty('--_tp-series-color', color);
    }
    for (const dot of root.querySelectorAll<HTMLElement>('.marker[data-latest]')) {
      const view = this.#views.get(dot.dataset.latest!);
      let point: PlotPoint | undefined;
      for (let i = (view?.length ?? 0) - 1; i >= 0 && view; i--) {
        const p = view.at(i);
        if (p[1] !== null) {
          point = p;
          break;
        }
      }
      const shown = !!point && point[0] >= this.#domains.x[0] && point[0] <= this.#domains.x[1];
      dot.hidden = !shown;
      if (shown) {
        const [left, top] = this.#at(point![0], point![1]!);
        dot.style.transform = `translate(${left}px, ${top}px)`;
      }
    }
    const active = this.#active;
    if (!active) return;
    const [lineX] = this.#at(active.x, this.#domains.y[0]);
    const line = root.querySelector<HTMLElement>('.crosshair');
    if (line) {
      line.style.transform = `translate(${lineX}px, ${o.top}px)`;
      line.style.blockSize = `${o.height}px`;
    }
    const rows = root.querySelector('.marker[data-series]') ? this.#rows() : [];
    for (const dot of root.querySelectorAll<HTMLElement>('.marker[data-series]')) {
      const row = rows.find((r) => r.id === dot.dataset.series);
      const shown = !!row && row.y !== null;
      dot.hidden = !shown;
      if (shown) {
        const [left, top] = this.#at(row!.x, row!.y!);
        dot.style.transform = `translate(${left}px, ${top}px)`;
      }
    }
    const chip = root.querySelector<HTMLElement>('.crosshair-label');
    if (chip) {
      const width = chip.offsetWidth;
      const left = Math.max(o.left, Math.min(o.left + o.width - width, lineX - width / 2));
      chip.style.transform = `translate(${left}px, ${o.top + o.height}px)`;
    }
    const hint = root.querySelector<HTMLElement>('.inspection[data-edge]');
    if (hint) {
      const width = hint.offsetWidth,
        height = hint.offsetHeight,
        gap = 8;
      // Beside the line on its trailing side, or its leading side when the trailing one runs out.
      const rtl = this.#paint?.direction === 'rtl';
      const after = rtl ? lineX - gap - width : lineX + gap;
      const before = rtl ? lineX + gap : lineX - gap - width;
      const fits = (left: number) => left >= o.left && left + width <= o.left + o.width;
      const left = Math.max(
        o.left,
        Math.min(o.left + o.width - width, fits(after) ? after : before),
      );
      const top = hint.dataset.edge === 'bottom' ? o.top + o.height - height - 4 : o.top + 4;
      hint.style.transform = `translate(${left}px, ${top}px)`;
    }
  }
  protected override render(): unknown {
    const provider = this.#metadata(),
      active = this.#active;
    const crosshair = this.#crosshair();
    const chip = crosshair?.label && this.xAxis ? crosshair : null;
    const chipText = (x: number) =>
      chip?.format ? chip.format(x) : crosshairFormat(this.#config!, this.xAxis || {}, x);
    const valueText = (value: unknown, id: string) => {
      if (value === null) return this.strings.missing ?? plotStrings.missing;
      if (typeof value !== 'number') return value;
      const series = this.#config?.series.find((s) => s.id === id);
      return series?.format
        ? series.format(value, active?.x ?? 0)
        : axisFormat(this.#config!, this.yAxis || {}, value);
    };
    const latest = (this.#config?.series ?? []).filter(
      (s) => s.marker === 'latest' && s.visible !== false,
    );
    const dash = crosshair?.dash
      ? `--_tp-crosshair-dash: ${crosshair.dash[0] ?? 0}px; --_tp-crosshair-gap: ${crosshair.dash[1] ?? crosshair.dash[0] ?? 0}px`
      : undefined;
    const overlay = html`${latest.map(
      (s) =>
        html`<span
          class="marker"
          part="plot-marker"
          data-latest=${s.id}
          aria-hidden="true"
          hidden
        ></span>`,
    )}${
      active && crosshair
        ? html`${
            crosshair.line
              ? html`<span
                  class="crosshair"
                  part="plot-crosshair"
                  style=${dash ?? nothing}
                  aria-hidden="true"
                ></span>`
              : nothing
          }${
            crosshair.marker
              ? this.#rows().map(
                  (row) =>
                    html`<span
                      class="marker"
                      part="plot-marker"
                      data-series=${row.id}
                      aria-hidden="true"
                      hidden
                    ></span>`,
                )
              : nothing
          }${
            chip
              ? html`<span class="crosshair-label" part="plot-crosshair-label" aria-hidden="true"
                  >${chipText(active.x)}</span
                >`
              : nothing
          }`
        : nothing
    }`;

    const legend = this.#legendOptions
      ? chartLegendContent(
          provider,
          (this.#config?.series ?? [])
            .filter((s) => s.visible !== false)
            .map((s) => ({ dataKey: s.id, name: s.id, value: s.label })),
          {
            placement: this.#legendOptions.placement ?? 'bottom',
            formatter: (label, item) =>
              html`<span>${label}</span>
                ${this.#legendOptions && this.#legendOptions.format ? html`<span class="series-value" data-latest=${String(item.dataKey)}></span>` : nothing}`,
          },
        )
      : nothing;
    const keyboard = !this.disabled && this.interaction === 'inspect';
    return this.renderPart('plot', Object.freeze({ mode: this.mode, size: this.size }), {
      tag: 'figure',
      properties: {
        class: 'root',
        part: 'plot',
        'aria-label': this.label,
        'aria-describedby': this.description ? `${this.#id}-description` : nothing,
      },
      content: html`
        ${this.label ? this.renderPart('plot-label', Object.freeze({}), { tag: 'div', properties: { part: 'plot-label' }, content: this.label }) : nothing}
        ${this.#legendOptions && this.#legendOptions.placement === 'top' ? legend : nothing}
        <div
          class="viewport"
          tabindex=${keyboard ? '0' : nothing}
          role=${keyboard ? 'group' : nothing}
          aria-label=${keyboard ? `${this.label}, ${this.strings.inspection ?? plotStrings.inspection}` : nothing}
          @keydown=${this.#key}
          @pointermove=${this.#pointer}
          @pointerleave=${() => {
            this.#pendingPointer = undefined;
            if (this.#active?.source === 'pointer') this.#inspect(null);
          }}
        >
          ${this.renderPart('plot-surface', Object.freeze({}), { tag: 'canvas', properties: { part: 'plot-surface', 'aria-hidden': 'true' }, content: html`<span class="probe" aria-hidden="true"></span>` })}
          ${!this.#hasData ? this.renderPart('plot-empty', Object.freeze({}), { tag: 'span', properties: { part: 'plot-empty', class: 'empty' }, content: this.strings.empty ?? plotStrings.empty }) : nothing}
          ${overlay}
          ${active ? this.renderPart('plot-inspection', Object.freeze({ source: active.source }), { tag: 'div', properties: { part: 'plot-inspection', class: 'inspection', 'data-edge': crosshair ? crosshair.hint : nothing, 'aria-live': active.source === 'keyboard' ? 'polite' : 'off' }, content: chartTooltipContent(provider, { active: true, label: chip ? chipText(active.x) : axisFormat(this.#config!, this.xAxis || {}, active.x), payload: this.#inspectionRows(active), source: active.source === 'keyboard' ? 'focus' : 'pointer' }, { hideLabel: !!chip && active.source === 'pointer', formatter: (value, name, item) => html`<span>${name}</span><span class="series-value">${valueText(value, String(item.dataKey))}</span>` }) }) : nothing}
        </div>
        ${this.#legendOptions && this.#legendOptions.placement !== 'top' ? legend : nothing}
        ${this.description ? this.renderPart('plot-description', Object.freeze({}), { tag: 'figcaption', properties: { part: 'plot-description', id: `${this.#id}-description` }, content: this.description }) : nothing}
        <slot name="table"></slot><slot></slot>
      `,
    });
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'tp-plot': TpPlot;
  }
}
