import type { FlowGroupTerminal } from '../../../foundation/flow/types.js';

/**
 * Internal group events (Widgets 6.3 Anatomy): non-composed, dispatched by a node host from its
 * own presses and heard by the flow on the hosts it renders and the authored ones it adopts.
 */

/** A press on the collapse or expand Button of a group's header. */
export const GROUP_TOGGLE = 'flow-group-toggle';
/** A press on the "+" Button of a group's boundary terminal. */
export const TERMINAL_ADD_PORT = 'flow-terminal-add-port';

export interface FlowGroupToggleDetail {
  /** The group whose collapsed state the press toggles. */
  nodeId: string;
  sourceEvent: Event;
}

export interface FlowTerminalAddPortDetail {
  /** The group the terminal belongs to. */
  groupId: string;
  /** Which terminal: `inputs` adds an input of the group, `outputs` an output. */
  kind: FlowGroupTerminal;
  sourceEvent: Event;
}
