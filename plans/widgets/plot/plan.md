# Plot widget — proposed contract and implementation plan

Status: approved for implementation by the user on 2026-11-06. The live Plot amendment was committed as e2b945d3 (v0.56.15); implementation and verification are recorded in implementation-checklist.md. The user requested a comprehensive plan and confirmed **display and configuration only**, without dragging/editing data points.

## 1. Purpose and first release

`<tp-plot>` (`TpPlot`) displays one or more series of numeric 2D samples. It can be a bare waveform, a static line or area chart, or a bounded live monitor. Axes, labels, backgrounds, guides, legend and inspection are independent options. Configuration belongs to application controls; Plot does not ship an always-present settings panel.

Mandatory addition from the user: a scroll/push history renderer must reuse existing rasterized history and repaint only changed regions when eligible. Redrawing all retained geometry on every update does not satisfy this requirement.

The first release includes all four supplied reference cases:

| Case | Configuration and behavior |
| --- | --- |
| Image 1: single green area over time | One line with translucent fill to zero, time x axis, optional y labels and horizontal guides; static or scrolling |
| Image 2: overlapping monitors | Several independently colored lines and translucent fills, shared x/y scales, optional axes and legend; draw order follows series order; no stacking |
| Image 3: bare waveform | Line only; axes, grid, guides and legend absent; rounded surface optional; static data or scrolling history |
| Image 4: positive/negative monitor | One series with distinct stroke/fill above and below zero; exact line intersections at the baseline; optional zero guide |
| FPS/CPU/memory panels | External push or optional pull sampler, bounded storage, separate sample and paint limits, optional shared scheduling budget |

No data editing, chart engine dependency, arbitrary renderer plugin, stacked areas, multiple y axes, log scales, pan/zoom, selection/brush, export engine or synthetic smoothing animation in this release. These are explicit boundaries, not deferred parts of the four reference cases. The design leaves room for them without promising their APIs now.

## 2. Live authority and required amendments

Fresh direct Spec Blocks reads: UI Library project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, HEAD `4303a769`, version 0.56.14, zero issues at read. Read the complete Foundation, Component Library and Widgets document ASTs. No existing Plot contract was found.

Relevant anchors:

- Foundation `sec-122-scheduling-and-cleanup`: cancellation and correct owner environment.
- Foundation `sec-188-chart`: series metadata, responsive sizing, inspection, accessible alternatives and deterministic cleanup.
- Library `ucl21-chart`: renderer-adapter chart shell; series identity and non-color encodings.
- Widgets `uwg-sec-scope-and-relationships`: currently excludes series charting.
- Widgets `uwg-sec-shared-widget-contracts`: currently assumes an editable value lane; rendering/performance, accessibility and presentation requirements still apply.

Before implementation, propose and approve these precise amendments through direct MCP:

1. Extend Widgets scope to include **bounded numeric monitoring/plotting surfaces**. General chart engines and external renderer integration remain with Chart.
2. Add a display-only widget profile: data is application input or an explicitly attached bounded stream, not `value/defaultValue`, no editing proposals/commit events, no form participation, no required/invalid/dirty state. Configuration is reactive, not user-editable internal document state.
3. Add Plot's definition, anatomy, configuration tables, streaming ownership, scheduling, inspection, accessibility, presentation, reference and conformance sections.
4. State Plot's relationship to Chart explicitly: Plot owns a built-in numeric renderer; shared metadata, appearance resolution and inspection content have one owner. It does not duplicate the generic renderer-adapter root's control lifecycle.
5. Record no-point-editing semantics: read-only data; keyboard inspection never mutates it. Avoid exposing a misleading editable `readOnly` lane.
6. Specify hidden/offscreen scheduling and bounded retention separately; data collection is allowed to continue without painting.

This plan is reviewable before any spec mutation. Recording a gap here does not grant implementation clearance.

## 3. Data and ownership

One coordinate system per Plot; every visible series shares its x and y units. Series IDs are unique and stable. Reordering changes paint/legend order, not identity. Do not put MiB and percentages on one shared numeric axis without explicit application conversion.

```ts
type PlotPoint = readonly [x: number, y: number | null];
type PlotData = Readonly<Record<string, readonly PlotPoint[]>>;
type PlotDomain = readonly [minimum: number, maximum: number];

interface PlotSeries {
  id: string;
  label: string;
  color?: string;              // CSS color; default theme chart palette by stable ID
  negativeColor?: string;      // signed region below baseline; absent reuses color
  line?: boolean;              // true
  lineWidth?: number;          // 1.5 CSS px; finite nonnegative
  lineDash?: readonly number[];
  interpolation?: 'linear' | 'step-before' | 'step-after'; // linear
  fill?: false | { baseline: number; opacity?: number }; // false; opacity 0.2
  negativeFill?: { color?: string; opacity?: number };
  visible?: boolean;           // true
}
```

Array input is the canonical first-release data API. Points use numeric x; timestamps are epoch milliseconds. Plot does not claim to measure machine CPU or process memory itself; the application supplies those metrics through the available environment APIs. `y: null` explicitly breaks a path; do not connect across missing intervals. Empty and single-point series are valid. Values may be negative. Non-finite coordinates are rejected with a bounded diagnostic, never serialized into canvas commands.

Static input preserves point order; monotonic-x series get binary-search windowing and decimation. Nonmonotonic paths remain supported, drawn in authored order without x-column decimation. This allows general 2D paths without silently sorting their geometry. Stream input requires nondecreasing x per series; equal x preserves order, decreasing x is rejected. Across series, timestamps may be independent.

`plot.data = { signal: [[0, 0], [1, 1], [2, 0]] }` replaces the external dataset. Data is property-only (no large JSON attribute). The caller retains ownership and must publish a new array/object to signal a change. Do not mutate caller data. The renderer may prepare private indices, but must not copy the complete dataset on every paint.

Two exclusive sources, fixed at connection until explicitly detached:

- External snapshot: `data`, default `{}`. No internal writes, polling or per-point events.
- Bounded stream: `stream`, default undefined. Plot subscribes to revisions and reads a stable snapshot for a paint. Assigning both a nonempty `data` and `stream` diagnoses ambiguity and retains the last coherent source. Empty data does not count as a conflicting source.

Removing `stream` returns to external-data mode. Replacing a stream releases subscriptions and clears stale inspection. Plot never destroys an application-owned shared stream. Use an internal readonly ring view for rendering (logical indices and revision), not the copying public snapshot method. Hold one coherent revision per synchronous paint; never retain a mutable view across asynchronous work.

Typed-array/interleaved views are a possible subsequent additive input format; do not claim zero-copy for tuple arrays or add several speculative input formats in v1.

## 4. Public element configuration

Booleans are ordinary presence attributes unless explicitly described otherwise. Numeric attributes require finite values in their documented domain. Structured records/callbacks are property-only. Invalid configuration keeps the last valid configuration and emits one actionable diagnostic per distinct fault, without logging per sample.

| Property / attribute | Default | Meaning |
| --- | --- | --- |
| `label` | `Plot` | Accessible name; examples use a meaningful application name |
| `description` | empty | Author-provided interpretation; supplied as description or a linked `table` slot for required information |
| `data`, `stream`, `series` | `{}`, none, `[]` | Source and explicit series metadata; no generated anonymous series |
| `mode` | `static` | `static` fits/configures the view; `scroll` advances a moving x window; `push` advances a uniformly spaced sample history with a mandatory incremental raster path |
| `renderStrategy` / `render-strategy` | `auto` | `auto` chooses incremental when eligible; `incremental` requires eligibility and diagnoses unsupported configuration; `full` explicitly chooses complete geometry redraw |
| `xDomain` / `yDomain` | `auto` / `auto` | Fixed finite increasing pair or `auto`; `x-domain`, `y-domain` accept `auto` or two whitespace-separated numbers |
| `window` | 10000 | Positive numeric x span in scrolling mode; milliseconds for time axes, sample units for index data |
| `follow` | `latest` | `latest` advances only with incoming x; `clock` advances while idle using an explicit `clock` function |
| `clock` | none | Property-only numeric clock; required for clock-follow; same units/origin as x |
| `autoRange` | `{ padding: 0.05, includeZero: false }` | Visible finite samples of visible series; include fill baselines; constant domains expand deterministically |
| `xAxis`, `yAxis` | `false` | False or axis record; enable independently, separate line/ticks/labels |
| `background` | `none` | `none`, `solid`, `dots`, `grid`; transparent is possible in every combination |
| `grid` | see below | Pattern origin, spacing and visibility, independently of axes |
| `guides` | `[]` | Horizontal/vertical lines and optional labels, in data coordinates |
| `legend` | `false` | Show series metadata and optional latest formatted values; property record for placement/format |
| `interaction` | `none` | `none` or `inspect`; inspection supports keyboard and pointer together |
| `inspectMode` / `inspect-mode` | `nearest-x` | `nearest-x` or `nearest-point`; no selection or data mutation |
| `maxFrameRate` / `max-frame-rate` | 10 | Positive maximum paints/s, or 0 for manual painting; not a sample rate |
| `scheduler` | shared default | Optional shared scheduler instance; custom implementations use the contract below |
| `maxPixelRatio` / `max-pixel-ratio` | 2 | Positive canvas DPR cap; actual DPR is min(device DPR, cap) |
| `decimation` | `auto` | `auto` preserves first/last/min/max in each pixel column; `none` draws raw visible points |
| `paused` | false | Freeze paint and displayed window; ingestion may continue; resume draws latest retained data |
| `offscreen` | `suspend` | `suspend` or `render`; IntersectionObserver suspension affects painting only |
| `size` | `default` | `sm`, `default`, `lg`; shared spacing/text density; container CSS owns width/height |

No built-in sampling occurs by default. No `disabled` behavior that mysteriously stops data collection: inherited disabled disables optional inspection; use `paused` for display and stream sampler pause for collection.

Empty auto domains use `[0, 1]`; empty fixed domains retain their bounds. Auto y-domain is computed from raw visible data before decimation. A fixed domain clips marks; it never changes input data. Scrolling/push x-domain is `[end-window, end]`, taking precedence over auto-fit; a fixed x-domain in scroll mode is invalid. In latest-follow, end is the greatest accepted sample x across configured series. An older append cannot rewind it. Clock-follow never invents interpolated samples; missing data stays missing. Clock regressions are clamped to the last displayed end and diagnosed once. Visual sample positions remain chronological in RTL; axis/legend placement follows logical layout.

For a stable CPU/FPS monitor prefer fixed y-domain. Auto range in v1 updates at the paint rate with no animated domain transitions; an optional hysteresis algorithm should be considered only after this baseline is measured.

## 5. Axes, backgrounds and guides

```ts
interface PlotAxis {
  type?: 'number' | 'time';      // number; time is a numeric epoch-ms scale
  position?: 'start' | 'end';    // x: bottom/top; y: logical start/end
  line?: boolean;               // true
  ticks?: boolean;              // true
  labels?: boolean;             // true
  tickCount?: number;           // target 5; layout may reduce it
  values?: readonly number[];   // explicit major ticks instead of generated ticks
  format?: (value: number) => string;
  title?: string;
}
interface PlotGrid {
  x?: boolean;                  // true
  y?: boolean;                  // true
  units?: 'css-px' | 'data';     // css-px
  spacing?: readonly [number, number]; // [16, 16], positive
  origin?: readonly [number, number];  // [0, 0]; data origin when units=data
  majorEvery?: number;          // 4; integer >=1
}
interface PlotGuide {
  id: string;
  axis: 'x' | 'y';
  value: number;
  label?: string;
  color?: string;
  width?: number;               // CSS px
  dash?: readonly number[];
  layer?: 'back' | 'front';      // back
}
```

Axes false means zero reserved axis space. An axis with labels false still draws configured ticks/line; those switches do not imply one another. Grid/guide counts are bounded independently of retained sample count. Numeric ticks use nice intervals; time ticks use calendar-aware formatting in the owner locale/time zone (explicit `locale` and `timeZone` properties). Explicit ticks outside the domain are clipped. Tick count is a hint, never an exact guarantee; hide colliding labels rather than overflowing the component. Time values remain epoch-ms; formatter output never changes scale geometry.

Background kind controls pattern only; surface color comes from presentation tokens and can be transparent. Dots sit at grid intersections; grid draws lines. A solid background draws no pattern. Guides exist independently of pattern or axes; off-domain guides are clipped, labels remain within the plot, and guide changes invalidate only cached decoration. Data-space patterns move with the domain; pixel-space patterns stay fixed to the plot box. Bound dot/line counts when spacing becomes subpixel.

Paint order: surface → pattern → back guides → series fills and strokes in series order → front guides → inspection. Overlapping fills use ordinary alpha compositing, not stacking. Signed areas close independently to their baseline and split at linear/step crossings without rounding the source data. Negative stroke coloring uses the same split geometry. Default linear interpolation avoids invented spline overshoot; a smooth sine comes from sufficiently sampled input.

## 6. Streaming API and rate limiting

```ts
interface PlotStreamOptions {
  seriesIds: readonly string[]; // unique, fixed for this stream lifetime
  capacity?: number;           // 1024 samples PER series
  maxBatchSize?: number;       // 4096 points across one batch
  xMode?: 'explicit' | 'index'; // explicit; index supports uniform push histories
}
interface PlotWrite { series: string; points: readonly PlotPoint[] }
interface PlotStream {
  append(series: string, point: PlotPoint): void;
  appendBatch(writes: readonly PlotWrite[]): void; // one revision/notification
  push(values: Readonly<Record<string, number | null>>): void;
  replaceLatest(series: string, y: number | null): void;
  clear(series?: string): void;
  snapshot(series?: string): PlotData;            // explicit copy, never during append
  subscribe(listener: () => void): () => void;   // no complete array payload
  dispose(): void;                              // application owner only
}
declare function createPlotStream(options?: PlotStreamOptions): PlotStream;
```

Each series uses a preallocated circular buffer: O(1) append, no `shift`, front splice or complete-buffer copy. Capacity is a positive safe integer. Overflow drops oldest samples and keeps latest; a window also clips by x without enlarging capacity. The two limits are independent: a 10-second window may contain fewer than 10 seconds if capacity is insufficient. Creating arbitrary series IDs without registering them must not grow memory without bounds: constructor requires `seriesIds`; unknown IDs reject. Series IDs are fixed for a stream lifetime. Changing capacity requires a new stream, avoiding silent lossy resize semantics.

Atomic `appendBatch`: validate all IDs/coordinates/order first, then apply the whole batch and publish one revision. Reject an invalid batch without partial writes. Ingest cost is O(batch size); the caller must submit bounded batches, and the helper exposes `maxBatchSize` (default 4096 points total) to reject accidental huge synchronous work. Revision notifications are synchronous and small; Plot only marks dirty, never paints or runs Lit during append. Source arrays are copied into the ring before append returns; later application mutation has no effect.

Distinct limits:

1. **Sampling:** how often a producer observes a metric.
2. **Retention:** how many raw samples it stores.
3. **Painting:** how often visible graphs may redraw.
4. **Dashboard budget:** how much aggregate work graphs may use in one frame.

Provide optional `createPlotSampler(stream, { interval, read, clock?, scheduler? })` with `start()`, `pause()`, `resume()`, `dispose()`. `interval` is positive milliseconds, default 100; `read(now)` synchronously returns a bounded `PlotWrite[]`, or null to skip. Sampler does not run until start. No promises/async overlap in v1; applications push completed network measurements themselves. Exceptions skip the sample and use a throttled error callback. Delayed timers skip missed deadlines rather than replaying a catch-up burst. Pause while the document is hidden by default; collection while hidden requires explicit `sampleWhileHidden: true`. Each written point still carries explicit x; no implicit clock/unit mixing.

FPS: the application already has a frame loop. Push measured FPS/frame times there; do not attach a second frame loop to measure the first. CPU/memory: sample on an independent slower cadence. Paint rate never discards raw samples: decimation happens after retention, for display only.

### Shared render scheduling

`createPlotScheduler({ budgetMs: 2, maxPlotsPerFrame: 8 })` creates an optional dashboard scheduler. Default shared scheduler is per owner Window, budget 2 ms, at most 8 plots per frame. Budgets are soft: a synchronous paint cannot be interrupted; one expensive plot can exceed them and must be detected in measurements. Do not promise a hard main-thread deadline.

Internal operations: register a job with `paint(timestamp)`, mark dirty, set next eligible time, cancel/dispose. One earliest-deadline timer wakes one shared animation-frame callback only when work is due. No per-plot permanent rAF, no 60 Hz wakeups merely to enforce a 1 Hz graph. Shared queue uses round-robin fairness among due plots; coalesces repeated invalidations; stops after budget/count, carries remaining dirty jobs to a later frame; never drops the pending latest state. No priority starvation. Read geometry/styles in one measurement phase before painting.

A property-only custom scheduler implements the same cancellable registration contract; expose the minimal `PlotRenderScheduler` interface, not internal queue objects. Jobs declare their minimum interval and visibility; custom schedulers may defer further but must never bypass the element's rate cap. Scheduler instances cannot span owner windows; migration releases and re-registers. Isolate job exceptions so one graph cannot stop others.

`plot.invalidate()` marks dirty and schedules within the limit. `plot.renderNow()` explicitly bypasses its rate delay once, cancels duplicate pending paint, respects pause/hidden/disconnected states, and is intended for static/manual integration. `maxFrameRate=0` suppresses scheduled paints, including resize/theme paints until renderNow; record dirtiness and expose that fact. Initial auto-rendered plots draw once when ready. A manual plot draws only on renderNow after connection and nonzero layout. The custom scheduler API should be specified as follows before implementation:

```ts
interface PlotRenderJob {
  paint(timestamp: number): void;
  minimumInterval: number; // milliseconds; element's rate cap
}
interface PlotRenderHandle {
  invalidate(): void;
  configure(options: { minimumInterval: number; suspended: boolean }): void;
  dispose(): void;
}
interface PlotRenderScheduler {
  readonly owner: Window;
  register(job: PlotRenderJob): PlotRenderHandle;
}
```

`configure` updates eligibility without creating a second registration. Manual mode registers suspended until an explicit renderNow; renderNow is a direct element operation, not permission for the scheduler to paint. A disposed application scheduler cancels all its jobs; connected elements diagnose it and remain dirty until a replacement is assigned. Provide an application-owned `dispose()` on the factory return type in addition to this minimal integration interface. No normal render-complete event per frame.

### Required incremental history renderer

This is a first-release requirement, with observable correctness and performance tests. It is not an optional optimization to add after full redraws ship.

**Two distinct operations:**

- `replaceLatest(seriesId, y)` changes the existing final sample's y, retaining its x and sequence. It does not scroll. Clear and redraw the dirty tail, including the previous segment and any affected fill/baseline crossing, without replaying older history. Repeated latest updates between paints coalesce. Empty series rejects; no implicit append.
- `push(frame)` appends one uniformly spaced history frame and advances the right edge by one sample. Available on `xMode: 'index'` streams only. The stream assigns a shared increasing sample index starting at zero. All series advance together; omitted series write a null gap, so independently reported values cannot become misaligned. Validate the entire frame before writing. Explicit `append/appendBatch` are available only on explicit-x streams; mixing x ownership is rejected. `replaceLatest` is valid in either x mode.

`mode="push"` requires an index stream, fixed finite y-domain, and latest-follow; `window` is a positive integer number of sample intervals, default 10000 unless explicitly set (monitor examples set 120). No clock-follow or automatic y rescaling in push mode. Static and general scrolling remain available for arbitrary arrays and irregular timestamps. Push with incompatible configuration keeps the last coherent view and reports an actionable diagnostic. It must not silently run a full-history redraw each update.

**Eligible fast path:** monotonic append/latest-only changes, a constant linear x-to-pixel scale over a fixed-size window, fixed y transform, stable plot dimensions/DPR/series appearance, and supported linear/step strokes and baseline areas. This includes single and multiple series, signed colors/fills, missing-value gaps, and all four supplied styles when configured as fixed-domain histories. Optional axes, legends and guides do not automatically disable it; decorate outside the raster history as described below. `scroll` with explicit x can also use this path when the same conditions hold; irregular x is supported through actual domain displacement rather than being treated as one equally spaced push.

**Raster work on a due paint:**

1. Ingestion records a bounded revision delta: appended sequence ranges, revised latest samples, eviction and reset flags. Consumers keep revision cursors independently; a slow consumer that falls behind the delta log performs one rebase. Never infer append-only changes by scanning/comparing complete arrays.
2. Maintain a transparent Canvas history layer for series only. Shift the reusable history with `drawImage` by the eligible integer device-pixel displacement; clear the newly exposed strip and the dirty tail. Use overlap-safe self-blitting or a bounded scratch surface; do not copy pixels to JavaScript (`getImageData/putImageData`) each update. Clip writes so untouched history is not alpha-blended over itself.
3. Redraw all series intersecting each dirty strip in original paint order. Include the boundary predecessor, stroke half-width, antialias fringe, dash phase and baseline crossings; otherwise seams, fill wedges and overpaint appear. Updating one series must clear/recompose the overlapping tail of other series too. Preserve the x-relative dash phase when shifting.
4. New samples moving less than one device pixel accumulate fractional displacement instead of being rounded and discarded. Retain a fractional composition offset, advancing the backing raster only at integer pixels, and rebuild the affected edge columns from raw data. Never repeatedly resample the complete history by fractional pixels: that blurs older marks. Coalesced updates that revisit the same pixel column must preserve first/last/min/max, not simply overwrite spikes with the newest y.
5. `replaceLatest` clears only the previous-to-final segment's affected columns plus stroke margin; because a segment/area may span the full height, redraw the dirty x strip over the full height when needed. Retain predecessor/checkpoint information so replacing an extreme can remove its old pixels and recompute the column from surviving raw samples. Do not leave the old high spike ghosted beneath the replacement.
6. Fixed patterns and pixel-space grids/guides live on a separate cached background. Data-space vertical guides, ticks and labels translate/re-layout on their own layer, without becoming baked into scrolling history. Horizontal guides remain fixed with a fixed y scale. Inspection is a separate overlay. At most a small fixed set of canvases/layers per Plot, not a canvas per sample or per series.
7. Retention is consistent with the visible window. Keep a boundary predecessor for clipping. Fast-path eligibility requires sufficient retained samples for the visible window, or explicit damage clearing where eviction removes still-visible history; do not leave evicted points visible in old pixels. Gaps continue to break paths after wraparound.

The baseline design is a Canvas blit plus dirty-strip rasterization; a circular/tiled raster history is also acceptable if it demonstrably lowers copy bandwidth. Blitting still touches pixels and costs GPU/memory bandwidth proportional to the moved surface: this is a reduction in geometry work, not an O(1) or zero-cost rendering claim. Benchmark copy/composite and raster cost separately. Static backgrounds can remain CSS/Canvas cached decorations; no CSS transform loop at display refresh rate unless the requested paint rate actually requires it.

**Full redraw/rebase conditions:** initial paint, resize/DPR/theme/style changes, changed domains/window/series order/visibility/baseline/interpolation, source replacement/reset, unknown revision history, changed older samples, a jump at least one plot width, context restoration and reconnect. Automatic y rescale changes the mapping of every old pixel and therefore needs a full redraw. It is excluded from strict push, and reported as a fallback in auto scrolling. Smooth splines, arbitrary paint effects and nonmonotonic paths are outside the incremental eligibility contract in v1.

`renderStrategy="incremental"` reports ineligibility and retains the last coherent picture; one-time rebases for the listed invalidations are permitted and counted. `auto` may fall back to full rendering with a recorded reason. A continuously ineligible auto plot is not evidence for satisfying the required push path. `full` provides a correctness/benchmark baseline.

Expose inexpensive read-only `renderStats` on request: `{ strategy, fullRedraws, incrementalPaints, shiftedDevicePixels, redrawnColumns, fallbackReason }`. Do not dispatch these as continuous events. These counters make it possible to prove that a graph is using the intended path rather than merely appearing smooth.

```ts
const history = createPlotStream({
  seriesIds: ['cpu'], xMode: 'index', capacity: 256,
});
plot.mode = 'push';
plot.window = 120;
plot.yDomain = [0, 100];
plot.renderStrategy = 'incremental';
plot.series = [{ id: 'cpu', label: 'CPU usage', fill: { baseline: 0 } }];
plot.stream = history;
history.push({ cpu: 32 });      // one new history frame; shift old pixels when due
history.replaceLatest('cpu', 35); // revise current frame; redraw tail only
```

## 7. Example API use

```html
<!-- Bare static curve; CSS controls dimensions. -->
<tp-plot id="wave" label="Oscillator waveform" style="height:8rem"></tp-plot>

<!-- Live monitor with optional axis, background and horizontal threshold. -->
<tp-plot id="fps" label="Rendering performance" mode="scroll" window="10000"
  y-domain="0 120" max-frame-rate="10" background="grid"
  style="height:9rem"></tp-plot>
```

```ts
import { createPlotStream, createPlotScheduler } from '@tweakpad/ui/widgets';
// Registration uses @tweakpad/ui/register/widgets, or the library's defineElement API.

wave.series = [{ id: 'wave', label: 'Amplitude' }];
wave.data = { wave: [[0, 0], [0.25, 1], [0.5, 0], [0.75, -1], [1, 0]] };
wave.yDomain = [-1.2, 1.2];

const stream = createPlotStream({ seriesIds: ['fps'], capacity: 2048 });
fps.series = [{ id: 'fps', label: 'FPS', fill: { baseline: 0 } }];
fps.stream = stream;
fps.xAxis = { type: 'number', labels: false, line: false, ticks: false };
fps.guides = [{ id: 'target', axis: 'y', value: 60, label: '60 FPS' }];

// Called by the application's EXISTING rendering loop, not by Plot.
function recordFrame(timestamp: number, frameDuration: number) {
  if (frameDuration > 0) stream.append('fps', [timestamp, 1000 / frameDuration]);
}

// Many independent graphs can share a stricter budget.
const dashboard = createPlotScheduler({ budgetMs: 1, maxPlotsPerFrame: 4 });
fps.scheduler = dashboard;
// On application teardown: detach plots, dispose samplers and scheduler, then stream.dispose().
```

For the signed reference: `fill: { baseline: 0 }, color: 'var(--tp-chart-1)', negativeColor: 'var(--tp-destructive)', negativeFill: { opacity: 0.25 }`, fixed y-domain spanning zero, axes false. For Image 2 define three series with fills, use a shared stream and appendBatch per observation; enable the legend and xAxis as needed. For historic timestamps set xAxis.type=time and pass epoch milliseconds. These are configuration examples, not final docs or invented named colors.

## 8. Inspection, accessibility and configuration UI

Default passive graph: figure with label and description, decorative canvas hidden from accessibility APIs, no tab stop or live announcements on samples. External `table` slot accepts the existing Table component; no point-per-DOM-node accessibility tree. Keep a usable empty state and an SSR caption/summary before canvas is available.

Optional inspection: one keyboard focus target for the plot, ArrowLeft/Right walk actual retained samples, Home/End select first/last visible sample, ArrowUp/Down choose series, Escape clears the cursor. Pointer moves select via cached geometry and coalesce at paint rate. No wheel capture, no data editing, no slider role on a read-only plot. Inspection exposes series label, actual x and y, unit/format and missing status, with a small throttled text output. Pointer departure clears pointer inspection; keyboard inspection remains while focused. If data eviction removes inspected points, clear inspection and announce that only on active keyboard inspection. Never announce continuous telemetry.

`tp-inspection-change`: only when inspected identity changes, includes `{ seriesId, x, y, source: 'pointer'|'keyboard' }` or null, not whole data arrays. Stable datum identity in streams is a private monotonically increasing sequence; do not identify it by a ring index. Legend is informational in v1; optional visibility controls are authored Toggle/Checkbox controls updating series configuration. No automatic data mutation or hidden selection lane.

Expose `getSummary()` (snapshot-on-request: counts, latest/min/max over retained samples and domains) and `stream.snapshot()` for application-authored accessible reports. Do not compute all statistics on every ingestion. Preserve original samples for inspection even when the drawing uses decimation; document nearest-x behavior between independently sampled series (nearest sample at or before cursor x; no implicit interpolation).

Controls to configure plots use existing Slider, Input, Select, Switch, Field group, Popover and Button. No native lookalike toolbar. Keep configuration outside the plot's default renderer so passive monitors do not import a full settings panel.

## 9. Architecture and shared ownership

| Responsibility | Existing owner / evidence | Decision |
| --- | --- | --- |
| Element lifecycle, presentation | TpElement, presentation families/recipes | Plot is display-only TpElement, not TpFormElement |
| Canvas sizing, DPR, context loss | src/foundation/canvas-surface.ts, existing color surfaces | Reuse CanvasSurface; add an optional external scheduling hook and DPR cap with existing defaults preserved; never create a parallel surface lifecycle |
| Shared frames | src/foundation/frame-loop.ts | Reuse owner-window frame source/cancellation; a deadline queue gates wakeups, rather than subscribing idle plots forever |
| Low-frequency deadline pattern | src/foundation/time/scheduler.ts | Design evidence for one earliest timer; do not couple numeric monitors to Time's locale-refresh owner |
| Appearance environment | ComposedEnvironmentObserver, Chart color-scheme resolution | One shared theme/scoped-token observer strategy; canvas reads computed paint only on invalidation, never per sample |
| Metadata/legend/inspection | chart/payload.ts, content.ts, types.ts | Extract/reuse renderer-independent metadata resolution and content, preserving existing Chart consumers; do not mount its record-array update path for every sample |
| Read-only numeric buffer/monitor | local external common/model/buffered-value.ts, monitor-binding/number/* | Behavior evidence only; implement bounded O(1) storage instead of array copying and SVG points-string replacement per update |
| Graph appearance | local reference _graph-log.scss, existing chart roles, supplied images | Existing theme chart colors/surface/border/text; surface structure stays separate from replaceable paint |
| Actions and settings | Public library controls | Compose only in authored examples; no new parallel controls |

Reference checkout investigated: sibling specification/external/tweakpane, HEAD 50a18c3d, clean at read. Trace: monitor-binding/number/plugin.ts → controller/graph-log.ts → view/graph-log.ts → lib/sass/view/_graph-log.scss; monitor value → common/model/buffered-value.ts and common/binding/value/monitor-binding.ts. The reference provides bounded history, range mapping and cursor inspection, but not the proposed multiseries Canvas renderer, signed fills, deadline budget or pixel decimation. Those are user-requested additions requiring the new contract, not inferred parity.

Proposed files:

- `src/widgets/plot/`: plot.ts, types.ts, stream.ts, sampler.ts, scheduler.ts, geometry.ts, decimation.ts, renderer.ts, history-raster.ts, strings.ts, styles.ts, index.ts. Split by actual responsibility; keep private helpers private.
- `src/presentation/families/plot.ts`, `src/presentation/recipes/plot.ts`; list in widgets presentation aggregate.
- Widget catalog and `src/widgets/index.ts`; `src/register/widgets.ts` only. No main index or main register additions.
- Public exports from `@tweakpad/ui/widgets`; bindings generated for React/Vue and tag types for all supported frameworks, through widgets framework entries only.
- `docs/widgets/plot.mdx`, paired `src/stories/widgets/plot.stories.ts`, source examples and docs ledger; capability fixtures under tests/fixtures/widgets/plot; durable work/evidence record under plans/widgets/plot.

Public DOM parts: plot root, plot-surface, plot-label, plot-description, plot-legend, plot-inspection, plot-empty. Axis/grid/guide/series paint inside Canvas is configured by records and semantic paint roles; never advertise CSS parts for nonexistent canvas sub-elements. `partPresentation` hooks remain meaningful on actual DOM parts. CSS variables control canvas palette, grid/guide strokes and plot surface; record values override resolved defaults. Clip and pixel-snap in CSS/device coordinates consistently.

## 10. Performance design and acceptance targets

These are proposed targets to benchmark, not measured guarantees. Record device/browser/viewport/DPR and application workload before claiming success. No absolute claim of zero impact: every monitor consumes time and memory, including its producer.

- No Lit render, attributes, layout reads, path generation, statistics scan or complete-buffer clone on append. Append only validates/writes ring cells and marks subscribers dirty.
- One paint per eligible interval, no unbounded pending sample/render queues, no catch-up bursts after suspension. Disconnected/hidden passive plots have zero scheduled paints and no recurring callbacks; offscreen observers are released on detach.
- Reuse cached axes/grid/guides. Recompute text layout only for relevant configuration/domain/size/locale changes. Build visible data geometry only after windowing and min/max reduction. Preserve extrema and gap boundaries; bound fragmented paths too, do not bridge gaps to hit a target vertex count.
- Monotonic streams maintain rolling extent metadata; no full history scans per append. Auto-range computation may use visible bounded scans on paint initially, then benchmark before adding complex queues. Static nonmonotonic paths are intentionally a higher-cost case.
- Canvas 2D first: bounded DPR, cached decoration, required eligible history blit/dirty-strip rendering, no required worker/WebGL context per monitor. Only introduce optional worker/offscreen acceleration if measurements justify its data-transfer and lifecycle costs.
- Measure total dashboard cost including paint/raster/compositing and GC, not just callback duration. A scheduler budget does not cap browser raster work.

Benchmark matrix, run one bounded scenario at a time:

| Scenario | Proposed acceptance |
| --- | --- |
| Passive static plot after initial render | No further plot scheduling while unchanged |
| 1 monitor, 1 series, 1024 samples, 320×100 CSS px, DPR≤2, 10 Hz | Main-thread plot paint/update p95 ≤0.5 ms on the recorded reference machine |
| 32 monitors, same geometry, 10 Hz, 60 Hz unrelated animation | Aggregate plot main-thread work mean ≤3 ms/frame; p95 target ≤4 ms/frame; compare dropped frames with baseline and report raster/GC |
| Push history, fixed domain, linear/step line and area, single/multiseries | After warmup, push updates shift raster history and paint dirty strips; latest-only updates do not shift; fullRedraws stays unchanged during ordinary ingestion |
| Latest sample revised repeatedly, including new/retracted peak and signed crossing | Old tail pixels removed, overlapping series recomposed, older history untouched; compare with full renderer within a documented antialias tolerance |
| Subpixel pushes and multiple samples in one device column | No long-run drift/blur; extrema and null gaps preserved; test DPR 1/1.25/2 and accumulated fractional shifts |
| Equal visible window at 256 vs 16384 retained samples | Incremental ordinary-update geometry work follows incoming points/dirty columns, not full retained history; compare actual CPU/GPU and blit cost against full rendering |
| Incremental invalidation matrix | Exactly one coherent rebase for resize/theme/domain/reset/jump; strategy and fallback reason reported; no silent permanent fallback in push mode |
| Shared scheduler budget 1 ms/count 4 | Due jobs deferred fairly, per-element rate caps respected; soft overruns visible, no lost latest state |
| 8 series × 100000 static samples, 800px wide | Visible monotonic geometry bounded to roughly four extrema/endpoints per occupied x column per series, plus required gap boundaries; no raw SVG/DOM expansion |
| Stream 60 samples/s painted 10 Hz for 60 s | Peaks retained, exactly bounded histories, no growth after warmup; highest expected raw count capped by capacity |
| Hidden/offscreen 30 s then visible | No hidden scheduled paints, bounded ingestion retained as configured, one coherent latest paint on resume |
| Disconnect/reconnect and window adoption | No stale observer/subscriber/timer/canvas contexts; correct new owner clock and DPR |

Performance evidence uses Chrome DevTools MCP only. Keep runs short, one at a time, stop when the host is affected; unit tests one capped low-priority worker. Avoid tests importing `.test.ts` helpers, repeated whole-library source scans or huge timing suites in the normal unit loop. Numeric correctness tests use deterministic clocks and tiny fixtures; browser benchmark is opt-in.

## 11. Verification and delivery sequence

1. Review this API proposal; settle namespace/scope and display-only exceptions in the live specifications. Confirm format/default/part vocabulary and constituent ownership. Validate candidate and dependent reviews before committing.
2. Create implementation checklist with stable capability/scenario IDs and source revisions. Pass source, capability and reuse gates. Read documentation skill before authoring its page.
3. Implement pure domain/geometry/buffer/decimation owners and deadline scheduler with deterministic tests. Include tiny counterexamples: narrow spikes, null gaps, equal x, signed crossings, step interpolation, rejected batches, wraparound and sampler missed deadlines.
4. Implement one representative static waveform plus one scrolling signed area using the required incremental raster path. Demonstrate push versus replaceLatest, subpixel accumulation, no historical geometry replay and no persistent full-redraw fallback before advancing. Early integration check: real shared CanvasSurface lifecycle, existing theme paint, optional decorations absent, data is not rerendering Lit per sample. Do not expand demos until this checkpoint passes.
5. Complete axes, pattern/grid, explicit guides, multiseries, inspection and accessibility against the predeclared matrix, including all four supplied visual cases static and scrolling.
6. Test public customization, dark/light scoped themes, DPR 1/2/high cap, RTL, narrow and zero-size containers, theme/resize/context restore, disconnect, visibility, form nonparticipation and no required engine/framework dependency. Inspect real keyboard/pointer and accessibility tree separately from programmatic assertions.
7. Verify package boundaries, registration, generated binding drift, targeted framework type tests and React/Vue source and built-package smoke. Verify stream identity survives framework rerenders; no child-DOM rewrites.
8. Run the short explicit performance matrix and publish actual values, baselines and gaps. If a target fails, optimize the measured owner; do not silently raise the budget or discard samples.
9. Author/verify docs with four focused reference cases, not a configuration dump. Defaults and optional controls must be visible in examples. Run record/docs checkers and appropriate package/type/size checks sequentially with resource limits. Full required release checks run in CI or an agreed idle window; no claim of complete verification before those results.

Success: each image is expressible through this API, passive monitors remain inert between due paints, many monitors share limits, retained data and displayed data are clearly distinct, and the component introduces no parallel scheduling/canvas/metadata owner.

## 12. Review decisions

Confirmed: incremental raster scroll/push rendering with tail-only latest-value updates is mandatory; display/configuration only; all four image cases; static and scrolling; axes and decorations optional; custom horizontal/vertical guides; configurable sampling and rendering limits; many simultaneous monitors.

Proposed defaults to approve together: no decorations, linear stroke without fill, static mode, 10 Hz paint cap, 1024 samples per stream series, no implicit sampler, shared scheduler soft budget 2 ms/count 8, max DPR 2, optional accessible inspection. These defaults are choices in this proposal, not already normative behavior.
