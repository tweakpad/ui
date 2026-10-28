import { html, nothing, type TemplateResult } from 'lit';
import type { IconDefinition } from '../../../icons/types.js';
import { circleXIcon } from '../../../icons/circle-x.js';
import { triangleAlertIcon } from '../../../icons/triangle-alert.js';
import type {
  FlowIssue,
  FlowNode,
  FlowNodeDefinition,
  FlowPropertyDefinition,
  FlowResolvedPort,
  FlowSide,
  FlowNodeShape,
} from '../../../foundation/flow/types.js';
import type { FlowNodeRunState } from '../../../foundation/flow/run/types.js';
import type { FlowLod, FlowStrings } from '../types.js';
import { fillTemplate } from '../../../foundation/template.js';

export interface ShapeContext {
  node: FlowNode;
  definition: FlowNodeDefinition | undefined;
  label: string;
  description: string | undefined;
  icon: IconDefinition | undefined;
  tone: string | undefined;
  lod: FlowLod;
  status: FlowNodeRunState | undefined;
  /** Problems the widget shows on the node (validation issues and supplied ones). */
  issues: readonly FlowIssue[];
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
  /** Whether authored content is assigned to the slot. */
  slotted: boolean;
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

/** The icon tile; beside a title and a description (`lines` 2) it spans both lines. */
function iconTile(
  context: ShapeContext,
  size: 'default' | 'lg' = 'default',
  lines: 1 | 2 = 1,
): TemplateResult | typeof nothing {
  if (!context.icon) return nothing;
  return html`<span
    class="icon"
    part="flow-node-icon"
    data-size=${size}
    data-lines=${lines}
    aria-hidden="true"
    ><tp-icon .icon=${context.icon}></tp-icon
  ></span>`;
}

/** The worst severity of a node's problems: its issues and the warnings of its run. */
export function problemSeverity(
  issues: readonly FlowIssue[],
  status: FlowNodeRunState | undefined,
): 'error' | 'warning' | undefined {
  if (issues.some((issue) => issue.severity === 'error')) return 'error';
  return issues.length || status?.warnings?.length ? 'warning' : undefined;
}

/**
 * The node's problems behind one icon in their tone: a Tooltip lists the validation issues and
 * the run's warnings (the run's error reads in the status row).
 */
function problemIndicator(context: ShapeContext): TemplateResult | typeof nothing {
  const severity = problemSeverity(context.issues, context.status);
  if (!severity || context.lod === 'low') return nothing;
  const messages = [
    ...context.issues.map((issue) => issue.message),
    ...(context.status?.warnings ?? []),
  ];
  return html`<tp-tooltip class="problem-tip" side="top">
    <tp-button
      slot="trigger"
      class="problem"
      part="flow-node-problem"
      data-severity=${severity}
      variant="ghost"
      size="icon-xs"
      .icon=${severity === 'error' ? circleXIcon : triangleAlertIcon}
      .ariaLabel=${`${context.strings.problems}: ${messages.join('; ')}`}
    ></tp-button>
    ${messages.map((message) => html`<div>${message}</div>`)}
  </tp-tooltip>`;
}

/** Progress of a running node as a percentage (`node_progress` reports a fraction, 0 to 1). */
function progressPercent(status: FlowNodeRunState): number | undefined {
  if (status.status !== 'running' || status.progress === undefined) return undefined;
  return Math.round(Math.min(1, Math.max(0, status.progress)) * 100);
}

/**
 * The status row: an activity marker, the detail (the error of a failed node, what a waiting node
 * waits for, the progress of a running one, else its message or duration), the warning count and
 * the status pill.
 */
function statusRow(context: ShapeContext): TemplateResult | typeof nothing {
  const status = context.status;
  if (!status) return nothing;
  const strings = context.strings;
  const text = statusText(status, strings);
  const detail =
    status.status === 'failed' && status.error
      ? status.error
      : status.status === 'waiting' && status.waiting?.reason
        ? `${strings.waitingFor}: ${status.waiting.reason}`
        : (status.message ?? formatDuration(status.durationMs));
  const percent = progressPercent(status);
  const warnings = status.warnings?.length ?? 0;
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
    ${
      percent !== undefined
        ? html`<tp-progress
            class="status-progress"
            .value=${percent}
            label=${strings.progress}
            title=${status.message ?? `${percent}%`}
          ></tp-progress>`
        : html`<span class="status-detail" title=${detail || text}>${detail || text}</span>`
    }
    ${
      warnings
        ? html`<tp-badge class="status-warnings" variant="warning" title=${strings.warnings}
            ><tp-icon .icon=${triangleAlertIcon} aria-hidden="true"></tp-icon>${warnings}</tp-badge
          >`
        : nothing
    }
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
  // Without rows or authored content the card has no body section; the slot stays rendered
  // (hidden) so authored content assigned later still announces itself.
  const hasBody = body.length > 0 || context.slotted;
  return html`<tp-card class="card" size="sm" part="flow-node-card" data-shape="card">
      <span slot="header" class="header" part="flow-node-header">
        ${iconTile(context, 'default', context.description ? 2 : 1)}
        <span class="titles">
          <span class="title" part="flow-node-title">${context.label}</span>
          ${context.description ? html`<span class="description" part="flow-node-description">${context.description}</span>` : nothing}
        </span>
      </span>
      ${(() => {
        const problem = problemIndicator(context);
        return problem === nothing
          ? nothing
          : html`<span slot="action" class="actions">${problem}</span>`;
      })()}
      ${
        hasBody
          ? html`<div class="body" part="flow-node-body">${body}${context.slot ?? nothing}</div>`
          : nothing
      }
      ${context.status ? html`<span slot="footer" class="footer" part="flow-node-footer">${statusRow(context)}</span>` : nothing}
    </tp-card>
    ${hasBody || !context.slot ? nothing : html`<span hidden>${context.slot}</span>`}
    ${renderSidePorts(context)}`;
}

/**
 * Compact shape (image 31): a small Card enclosing the icon tile with the title and description
 * as a caption. Like every shape it is one container, and its ports sit on the container's edges,
 * clear of the caption.
 */
export function renderCompactShape(context: ShapeContext): TemplateResult {
  return html`<tp-card class="card compact" size="sm" part="flow-node-card" data-shape="compact">
      <div class="compact-body">
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
          ${(() => {
            const problem = problemIndicator(context);
            return problem === nothing
              ? nothing
              : html`<span class="tile-problem">${problem}</span>`;
          })()}
        </span>
        <span class="title" part="flow-node-title">${context.label}</span>
        ${
          context.description && context.lod === 'high'
            ? html`<span class="description" part="flow-node-description"
                >${context.description}</span
              >`
            : nothing
        }
        ${context.slot ?? nothing}
      </div>
    </tp-card>
    ${renderSidePorts(context)}`;
}

/** Panel shape (image 29): toned header, output rows, input rows with inline controls. */
export function renderPanelShape(context: ShapeContext): TemplateResult {
  // A port whose control is shown on the node shares that row; any other port gets its own.
  const shown = new Set(context.properties.map((property) => property.key));
  const controlled = new Set(
    context.ports
      .filter((port) => port.control !== undefined && shown.has(port.control))
      .map((port) => port.id),
  );
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
      <span slot="action" class="actions"
        >${problemIndicator(context)}<slot name="actions"></slot
      ></span>
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
    ? fillTemplate(context.strings.announceStatus, {
        label: context.label,
        status: statusText(context.status, context.strings),
      })
    : '';
}
