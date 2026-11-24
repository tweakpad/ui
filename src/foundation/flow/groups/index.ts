/**
 * Enterable groups with boundary ports (Widgets §6.3): relations, flattening, the scope view and
 * the group commands.
 */
export {
  FLOW_GROUP_DEFINITION,
  FLOW_GROUP_TYPE,
  FLOW_TERMINAL_TYPES,
  flowEdgeLevel,
  flowEdgeRelation,
  flowPortFacing,
  flowTerminalId,
  isFlowGroup,
  parseFlowTerminalId,
} from './relations.js';
export {
  flattenFlowGroups,
  flowEdgeLeafPairs,
  flowLeafEnds,
  type FlowFlattenOptions,
  type FlowFlattenResult,
  type FlowLeafEnd,
  type FlowLeafPair,
  type FlowLeafPath,
} from './flatten.js';
export { FlowScopeView, type FlowGraphView, type FlowScopeViewOptions } from './view.js';
export {
  FLOW_GROUP_PADDING,
  expandParentChanges,
  exposeConnectionChanges,
  groupNodesChanges,
  groupPortChanges,
  groupResizeChanges,
  groupResizeSnapshot,
  reparentChanges,
  ungroupChanges,
  type FlowExposeResult,
  type FlowGroupCommandResult,
  type FlowGroupNodesResult,
  type FlowGroupPortAction,
  type FlowGroupPortResult,
  type FlowGroupResizeResult,
  type FlowGroupResizeSnapshot,
  type FlowIdFactory,
  type FlowReparentResult,
  type FlowUngroupResult,
} from './commands.js';
export { aggregateRunStatus } from '../run/state.js';
