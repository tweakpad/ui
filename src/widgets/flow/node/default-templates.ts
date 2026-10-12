import { html, nothing, type TemplateResult } from 'lit';
import type { IconDefinition } from '../../../icons/types.js';
import type {
  FlowNode,
  FlowNodeDefinition,
  FlowPropertyDefinition,
  FlowResolvedPort,
  FlowSide,
  FlowNodeShape,
} from '../../../foundation/flow/types.js';
import type { FlowNodeRunState } from '../../../foundation/flow/run/types.js';
import type { FlowLod, FlowStrings } from '../types.js';
import { format } from '../strings.js';

export interface ShapeContext {
  node: FlowNode;
  definition: FlowNodeDefinition | undefined;
  label: string;
  description: string | undefined;
  icon: IconDefinition | undefined;
  tone: string | undefined;
  lod: FlowLod;
  status: FlowNodeRunState | undefined;
  strings: FlowStrings;
  ports: readonly FlowResolvedPort[];
  properties: readonly FlowPropertyDefinition[];
  /** Renders the port element for one resolved port (with or without its label). */
  port: (
    port: FlowResolvedPort,
    options?: { label?: boolean; placement?: 'before' | 'after' },
  ) => TemplateResult;
  /** Renders the library control bound to a property key. */
  control: (key: string) => TemplateResult;
  /** The authored light-DOM content slot (`null` when the node has no authored content). */
  slot: TemplateResult | null;
}

const STATUS_LABEL: Record<string, keyof FlowStrings> = {
  idle: 'statusIdle',
  pending: 'statusPending',
  running: 'statusRunning',
  waiting: 'statusWaiting',
  success: 'statusSuccess',
  failed: 'statusFailed',
  skipped: 'statusSkipped',
  cancelled: 'statusCancelled',
};

const STATUS_VARIANT: Record<
  string,
  'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
> = {
  idle: 'outline',
  pending: 'warning',
  running: 'secondary',
  waiting: 'warning',
  success: 'success',
  failed: 'destructive',
  skipped: 'secondary',
  cancelled: 'secondary',
};

export function statusText(status: FlowNodeRunState | undefined, strings: FlowStrings): string {
  if (!status) return '';
  return strings[STATUS_LABEL[status.status] ?? 'statusIdle'];
}

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return '';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function sides(ports: readonly FlowResolvedPort[]): Map<FlowSide, FlowResolvedPort[]> {
  const result = new Map<FlowSide, FlowResolvedPort[]>();
  for (const port of ports) {
    if (port.hidden) continue;
    const side = port.geometry.side;
    const list = result.get(side);
    if (list) list.push(port);
    else result.set(side, [port]);
  }
  return result;
}

/** Port groups hugging the host's sides (card and compact shapes); `only` limits the sides. */
export function renderSidePorts(context: ShapeContext, only?: readonly string[]): TemplateResult {
  const groups = sides(context.ports);
  return html`${[...groups]
    .filter(([side]) => !only || only.includes(side))
    .map(
      ([side, ports]) =>
        html`<div class="ports" data-side=${side} part="flow-node-ports">
          ${ports.map((port) => context.port(port))}
        </div>`,
    )}`;
}

function iconTile(
  context: ShapeContext,
  size: 'default' | 'lg' = 'default',
): TemplateResult | typeof nothing {
  if (!context.icon) return nothing;
  return html`<span class="icon" part="flow-node-icon" data-size=${size} aria-hidden="true"
    ><tp-icon .icon=${context.icon}></tp-icon
  ></span>`;
}

function statusRow(context: ShapeContext): TemplateResult | typeof nothing {
  const status = context.status;
  if (!status) return nothing;
  const text = statusText(status, context.strings);
  const detail = status.message ?? formatDuration(status.durationMs);
  const tone =
    status.status === 'success'
      ? 'success'
      : status.status === 'failed'
        ? 'danger'
        : status.status === 'running' || status.status === 'waiting' || status.status === 'pending'
          ? 'accent'
          : 'neutral';
  return html`<span class="status" part="flow-node-status" data-status=${status.status}>
    ${
      status.status === 'running'
        ? html`<tp-spinner size="sm" label=${text}></tp-spinner>`
        : html`<tp-marker tone=${tone} variant="default"></tp-marker>`
    }
    <span class="status-detail">${detail || text}</span>
    <tp-badge class="status-pill" variant=${STATUS_VARIANT[status.status] ?? 'outline'}
      >${text}</tp-badge
    >
  </span>`;
}

function propertyRows(context: ShapeContext, options: { ports?: boolean } = {}): TemplateResult[] {
  const rows: TemplateResult[] = [];
  const portByControl = new Map<string, FlowResolvedPort>();
  for (const port of context.ports) if (port.control) portByControl.set(port.control, port);
  for (const property of context.properties) {
    const port = options.ports ? portByControl.get(property.key) : undefined;
    rows.push(
      html`<tp-list-item
        class="row"
        size="xs"
        variant="ghost"
        part="flow-node-row"
        data-port-id=${port?.id ?? nothing}
        data-port-direction=${port?.direction ?? nothing}
      >
        <span slot="title" class="row-label" part="flow-node-row-label">${property.label}</span>
        <span slot="trailing" class="row-control" part="flow-node-row-control"
          >${context.control(property.key)}</span
        >
      </tp-list-item>`,
    );
  }
  return rows;
}

function portRows(
  context: ShapeContext,
  direction: 'input' | 'output',
  skip: ReadonlySet<string>,
): TemplateResult[] {
  return context.ports
    .filter((port) => port.direction === direction && !port.hidden && !skip.has(port.id))
    .map(
      (port) =>
        html`<tp-list-item
          class="row port-row"
          size="xs"
          variant="ghost"
          part="flow-node-row"
          data-direction=${direction}
          data-port-id=${port.id}
          data-port-direction=${direction}
        >
          <span
            slot=${direction === 'output' ? 'trailing' : 'title'}
            class="row-label"
            part="flow-node-row-label"
            >${port.label ?? port.id}</span
          >
        </tp-list-item>`,
    );
}

/** Port groups for the panel shape: absolutely positioned at the rows' centers (see node.ts). */
function renderRowPorts(context: ShapeContext): TemplateResult {
  const groups = sides(context.ports);
  return html`${[...groups].map(
    ([side, ports]) =>
      html`<div class="ports" data-side=${side} data-rows part="flow-node-ports">
        ${ports.map((port) => context.port(port, { label: false }))}
      </div>`,
  )}`;
}

/**
 * Low detail (Widgets 6.3 LOD): a title strip painted like the node's card. The host box comes
 * from the node layer (measured, declared or default size), so flipping detail never reflows.
 */
export function renderShellShape(context: ShapeContext, shape: FlowNodeShape): TemplateResult {
  return html`<div class="shell" part="flow-node-shell" data-shape=${shape}>
    <span class="title" part="flow-node-title">${context.label}</span>
  </div>`;
}

/** Card shape (image 28): Card with an icon tile, title, description and a status footer. */
export function renderCardShape(context: ShapeContext): TemplateResult {
  const body = context.lod === 'low' ? [] : propertyRows(context);
  return html`<tp-card class="card" size="sm" part="flow-node-card" data-shape="card">
      <span slot="header" class="header" part="flow-node-header">
        ${iconTile(context)}
        <span class="titles">
          <span class="title" part="flow-node-title">${context.label}</span>
          ${context.description ? html`<span class="description" part="flow-node-description">${context.description}</span>` : nothing}
        </span>
      </span>
      ${
        body.length || context.slot
          ? html`<div class="body" part="flow-node-body">${body}${context.slot ?? nothing}</div>`
          : nothing
      }
      ${context.status ? html`<span slot="footer" class="footer" part="flow-node-footer">${statusRow(context)}</span>` : nothing}
    </tp-card>
    ${renderSidePorts(context)}`;
}

/** Compact shape (image 31): an icon tile with the title and description as a caption. */
export function renderCompactShape(context: ShapeContext): TemplateResult {
  return html`<div class="compact" part="flow-node-card" data-shape="compact">
    <span class="tile">
      ${iconTile(context, 'lg')}
      ${
        context.status
          ? html`<span
              class="tile-status"
              part="flow-node-status"
              data-status=${context.status.status}
            >
              ${
                context.status.status === 'running'
                  ? html`<tp-spinner
                      size="sm"
                      label=${statusText(context.status, context.strings)}
                    ></tp-spinner>`
                  : html`<tp-marker
                      tone=${context.status.status === 'failed' ? 'danger' : context.status.status === 'success' ? 'success' : 'neutral'}
                    ></tp-marker>`
              }
            </span>`
          : nothing
      }
      ${renderSidePorts(context, ['top', 'left', 'right'])}
    </span>
    <span class="title" part="flow-node-title">${context.label}</span>
    ${
      context.description && context.lod === 'high'
        ? html`<span class="description" part="flow-node-description">${context.description}</span>`
        : nothing
    }
    ${context.slot ?? nothing}
    ${/* Bottom ports sit on the box edge below the caption so a downward edge clears the text. */ ''}
    ${renderSidePorts(context, ['bottom'])}
  </div>`;
}

/** Panel shape (image 29): toned header, output rows, input rows with inline controls. */
export function renderPanelShape(context: ShapeContext): TemplateResult {
  const controlled = new Set(context.ports.filter((port) => port.control).map((port) => port.id));
  const rows =
    context.lod === 'low'
      ? []
      : [
          ...portRows(context, 'output', controlled),
          ...propertyRows(context, { ports: true }),
          ...portRows(context, 'input', controlled),
        ];
  return html`<tp-card
      class="card panel"
      size="sm"
      borders="on"
      section-colors="off"
      part="flow-node-card"
      data-shape="panel"
    >
      <span slot="header" class="header" part="flow-node-header">
        ${iconTile(context)}
        <span class="title" part="flow-node-title">${context.label}</span>
      </span>
      <span slot="action" class="actions"><slot name="actions"></slot></span>
      <div class="body rows" part="flow-node-body">${rows}${context.slot ?? nothing}</div>
      ${context.status ? html`<span slot="footer" class="footer" part="flow-node-footer">${statusRow(context)}</span>` : nothing}
    </tp-card>
    ${renderRowPorts(context)}`;
}

/** Group shape: a resizable container whose children are separate nodes positioned relative to it. */
export function renderGroupShape(context: ShapeContext): TemplateResult {
  return html`<div class="group" part="flow-node-group" data-shape="group">
    <span class="group-label" part="flow-node-title">${context.label}</span>
    ${context.slot ?? nothing} ${renderSidePorts(context)}
  </div>`;
}

export function statusAnnouncement(context: ShapeContext): string {
  return context.status
    ? format(context.strings.announceStatus, {
        label: context.label,
        status: statusText(context.status, context.strings),
      })
    : '';
}
