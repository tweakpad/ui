import type {
  FlowChange,
  FlowConnection,
  FlowEdge,
  FlowEdgeKind,
  FlowEndpoint,
  FlowPoint,
  FlowRect,
  FlowSelection,
} from '../../../foundation/flow/types.js';
import type { FlowPortDirection } from '../../../foundation/flow/edges/endpoints.js';
import type {
  FlowApplyResult,
  FlowModel,
  FlowTransaction,
} from '../../../foundation/flow/model/model.js';
import type { ConnectionLineState } from '../../../foundation/flow/renderer.js';
import type { ChangeReason } from '../../../foundation/types.js';
import type { TpFlowNode, FlowPortState } from '../node/node.js';
import type { TpFlowPort } from '../node/port.js';
import type { FlowChangeMetadata, FlowSelectionMode, FlowStrings, FlowTool } from '../types.js';

export interface FlowConnectionVerdict {
  valid: boolean;
  reasons: readonly string[];
  message?: string | undefined;
}

/**
 * What the pointer and keyboard sessions need from the widget root (Widgets §6.3 Keyboard and
 * pointer). The root implements it with closures over its lanes and layers, so sessions never
 * reach into private state and stay testable against a fake host.
 */
export interface FlowInteractionHost {
  readonly model: FlowModel;
  readonly canvas: HTMLElement | null;
  /** Design mode, not read-only, not disabled. */
  readonly editable: boolean;
  readonly disabled: boolean;
  readonly tool: FlowTool;
  readonly zoom: number;
  readonly selection: FlowSelection;
  readonly snap: boolean;
  readonly snapGrid: number;
  readonly selectionMode: FlowSelectionMode;
  readonly connectionRadius: number;
  readonly connectionMode: 'strict' | 'loose';
  /** A port press released in place starts click-to-connect. */
  readonly connectOnClick: boolean;
  readonly strings: FlowStrings;
  screenToFlow(point: FlowPoint): FlowPoint;
  /** Pointer position relative to the pane, in screen pixels. */
  paneOffset(event: { clientX: number; clientY: number }): FlowPoint;
  propose(
    changes: readonly FlowChange[],
    reason: ChangeReason,
    metadata?: Partial<FlowChangeMetadata>,
    sourceEvent?: Event,
  ): FlowApplyResult;
  /** Proposes inside an open transaction (one history entry per gesture). */
  proposeIn(
    transaction: FlowTransaction,
    changes: readonly FlowChange[],
    reason: ChangeReason,
    metadata?: Partial<FlowChangeMetadata>,
    sourceEvent?: Event,
  ): FlowApplyResult;
  /** Rolls a transaction back, publishing the restore with the given reason. */
  rollback(transaction: FlowTransaction, reason: ChangeReason, sourceEvent?: Event | null): void;
  commit(
    reason: ChangeReason,
    sourceEvent?: Event,
    metadata?: Partial<FlowChangeMetadata>,
  ): boolean;
  transaction(label: string): FlowTransaction;
  setSelection(
    selection: FlowSelection,
    reason: ChangeReason,
    sourceEvent?: Event,
    metadata?: Record<string, unknown>,
  ): boolean;
  setDragging(ids: readonly string[], dragging: boolean): void;
  setPortState(nodeId: string, portId: string, state: FlowPortState | null): void;
  clearPortStates(): void;
  setConnectionLine(line: ConnectionLineState | null): void;
  /** Marquee rectangle in pane pixels; `null` ends the selection gesture. */
  setMarquee(rect: FlowRect | null): void;
  /** Pane point to auto-pan toward; `null` stops. */
  autoPan(point: FlowPoint | null): void;
  announce(message: string): void;
  nodeLabel(id: string): string;
  portLabel(nodeId: string, portId: string | undefined): string;
  connect(
    connection: FlowConnection,
    edge?: Partial<FlowEdge>,
    reason?: ChangeReason,
    sourceEvent?: Event,
  ): string | undefined;
  reconnect(
    edgeId: string,
    end: 'source' | 'target',
    connection: FlowConnection,
    sourceEvent?: Event,
  ): boolean;
  validateConnection(connection: FlowConnection, ignoreEdge?: string): FlowConnectionVerdict;
  portEndpoint(
    nodeId: string,
    portId: string | undefined,
    direction: FlowPortDirection,
  ): FlowEndpoint;
  /** Default edge kind for the connection line. */
  edgeKind(): FlowEdgeKind;
  nodeHostInPath(event: Event): TpFlowNode | undefined;
  portInPath(event: Event): TpFlowPort | undefined;
  edgeInPath(event: Event): string | undefined;
  interactiveInPath(event: Event, within: Element): boolean;
  setFocusedNode(id: string | undefined): void;
  /** A connection dropped on the pane with the palette enabled. */
  openPaletteAt?(
    point: FlowPoint,
    source: { nodeId: string; portId: string | undefined; direction: FlowPortDirection },
  ): void;
  /** A node drag settled: auto-layout modes pin the moved nodes and re-flow. */
  settleDrop(ids: readonly string[], sourceEvent: Event): void;
  /** Runs the listener after each viewport commit (auto-pan moves the canvas under the pointer). */
  onViewportTick(listener: () => void): () => void;
  schedule(): void;
}
