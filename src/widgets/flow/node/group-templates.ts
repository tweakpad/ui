import { html, nothing, type TemplateResult } from 'lit';
import { chevronDownIcon } from '../../../icons/chevron-down.js';
import { chevronRightIcon } from '../../../icons/chevron-right.js';
import { plusIcon } from '../../../icons/plus.js';
import type { FlowGroupTerminal } from '../../../foundation/flow/types.js';
import { fillTemplate } from '../../../foundation/template.js';
import type { FlowStrings } from '../types.js';
import {
  iconTile,
  portRows,
  problemIndicator,
  renderRowPorts,
  renderSidePorts,
  statusRow,
  type ShapeContext,
} from './default-templates.js';

/** What the group shapes add to a shape's context: the group state and the header presses. */
export interface GroupShapeContext extends ShapeContext {
  /** The group shows as one node. */
  collapsed: boolean;
  /** The group's direct members. */
  memberCount: number;
  /** The document accepts edits: collapsing and adding ports change it. */
  editable: boolean;
  /** The boundary terminal the node stands for, inside a group's sub-view. */
  terminal: FlowGroupTerminal | undefined;
  /** A press on the header's collapse or expand Button. */
  toggle: (event: Event) => void;
  /** A press on a terminal's "+" Button. */
  addPort: (event: Event) => void;
}

const NO_PORTS: ReadonlySet<string> = new Set();

/**
 * The group a terminal belongs to, from the terminal's id (`<group id>#inputs` or `#outputs`).
 * Replaced by the engine export that parses terminal ids.
 */
export function terminalGroupId(terminalId: string, kind: FlowGroupTerminal): string {
  const suffix = `#${kind}`;
  return terminalId.endsWith(suffix) ? terminalId.slice(0, -suffix.length) : terminalId;
}
/** The four border strips of an expanded frame, each a press target along its edge. */
const EDGES = ['top', 'right', 'bottom', 'left'] as const;

/** The name a group adds to its node name: its expanded or collapsed state and member count. */
export function groupAccessibleName(
  name: string,
  collapsed: boolean,
  memberCount: number,
  strings: FlowStrings,
): string {
  return [
    name,
    collapsed ? strings.ariaGroupCollapsed : strings.ariaGroupExpanded,
    fillTemplate(strings.groupMembers, { count: memberCount }),
  ].join(', ');
}

/** The member count Badge of a group's header. */
function memberBadge(context: GroupShapeContext): TemplateResult {
  return html`<tp-badge
    class="group-count"
    part="flow-node-group-count"
    variant="secondary"
    title=${fillTemplate(context.strings.groupMembers, { count: context.memberCount })}
    >${context.memberCount}</tp-badge
  >`;
}

/**
 * The header's collapse or expand Button: a disclosure chevron, down while the members show and
 * toward the inline end while collapsed. It never starts a node drag.
 */
function toggleButton(context: GroupShapeContext): TemplateResult {
  const collapsed = context.collapsed;
  return html`<tp-button
    class="group-toggle"
    variant="ghost"
    size="icon-xs"
    data-no-drag
    ?data-collapsed=${collapsed}
    .icon=${collapsed ? chevronRightIcon : chevronDownIcon}
    .ariaLabel=${collapsed ? context.strings.expandGroup : context.strings.collapseGroup}
    ?disabled=${!context.editable}
    @click=${context.toggle}
  ></tp-button>`;
}

/** The port rows of an enclosed group card: outputs, then inputs, as the panel shape orders them. */
function rows(context: GroupShapeContext): TemplateResult[] {
  return context.lod === 'low'
    ? []
    : [...portRows(context, 'output', NO_PORTS), ...portRows(context, 'input', NO_PORTS)];
}

/**
 * The expanded group: a paint-only frame around its members with a header strip in its top
 * padding (label, member count, collapse Button), four border strips and its ports on the frame
 * edges. The frame interior takes no presses, so the edges, members and pane beneath stay
 * reachable; the header, the strips, the ports and the resizer take them.
 */
export function renderGroupFrame(context: GroupShapeContext): TemplateResult {
  return html`<div class="group" part="flow-node-group" data-shape="group">
      <div class="group-header" part="flow-node-group-header">
        <span class="title" part="flow-node-title">${context.label}</span>
        ${memberBadge(context)} ${toggleButton(context)}
      </div>
      ${EDGES.map(
        (edge) =>
          html`<div class="group-edge" part="flow-node-group-edge" data-edge=${edge}></div>`,
      )}
      ${context.slot ?? nothing}
    </div>
    ${renderSidePorts(context)}`;
}

/**
 * The collapsed group: an enclosed Card like the panel shape, with a header (label, member count,
 * expand Button), one List item row per group port with the port on the card edge, and the
 * aggregate run status of its members in the footer.
 */
export function renderCollapsedGroupShape(context: GroupShapeContext): TemplateResult {
  return html`<tp-card
      class="card panel"
      size="sm"
      borders="on"
      section-colors="off"
      part="flow-node-card"
      data-shape="group"
      data-collapsed
    >
      <span slot="header" class="header" part="flow-node-header flow-node-group-header">
        ${iconTile(context)}
        <span class="title" part="flow-node-title">${context.label}</span>
        ${memberBadge(context)}
      </span>
      <span slot="action" class="actions"
        >${problemIndicator(context)}${toggleButton(context)}</span
      >
      <div class="body rows" part="flow-node-body">${rows(context)}${context.slot ?? nothing}</div>
      ${context.status ? html`<span slot="footer" class="footer" part="flow-node-footer">${statusRow(context)}</span>` : nothing}
    </tp-card>
    ${renderRowPorts(context)}`;
}

/**
 * A group's boundary terminal inside its sub-view: an enclosed Card titled Inputs or Outputs that
 * lists the group's ports of that direction as rows whose ports face the members (the view hands
 * them over with their direction flipped), and a "+" Button that adds a port of that direction.
 */
export function renderTerminalShape(context: GroupShapeContext): TemplateResult {
  const kind = context.terminal ?? 'inputs';
  const add = kind === 'inputs' ? context.strings.addInput : context.strings.addOutput;
  return html`<tp-card
      class="card panel"
      size="sm"
      borders="on"
      section-colors="off"
      part="flow-node-card flow-node-terminal"
      data-shape="panel"
      data-terminal=${kind}
    >
      <span slot="header" class="header" part="flow-node-header">
        <span class="title" part="flow-node-title">${context.label}</span>
      </span>
      <span slot="action" class="actions"
        ><tp-button
          class="terminal-add"
          part="flow-node-terminal-add"
          variant="ghost"
          size="icon-xs"
          data-no-drag
          .icon=${plusIcon}
          .ariaLabel=${add}
          ?disabled=${!context.editable}
          @click=${context.addPort}
        ></tp-button
      ></span>
      <div class="body rows" part="flow-node-body">${rows(context)}</div>
    </tp-card>
    ${renderRowPorts(context)}`;
}
