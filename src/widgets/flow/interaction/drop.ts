import { rectContainsPoint } from '../../../foundation/flow/geometry.js';
import {
  expandParentChanges,
  reparentChanges,
  type FlowIdFactory,
  type FlowReparentResult,
} from '../../../foundation/flow/groups/commands.js';
import type { FlowGraphView } from '../../../foundation/flow/groups/view.js';
import type { FlowModel, FlowTransaction } from '../../../foundation/flow/model/model.js';
import type {
  FlowChange,
  FlowGroupTerminals,
  FlowPoint,
  FlowSize,
} from '../../../foundation/flow/types.js';
import type { FlowChangeMetadata } from '../types.js';

/**
 * Where nodes dropped at `point` belong (Widgets §6.3 Properties, prop-16): the deepest expanded
 * group of the view whose frame holds the point, never one of the moved nodes or a node inside
 * them; else the level the view shows, `scope` (`undefined` at the root).
 */
export function resolveDropTarget(
  view: FlowGraphView,
  point: FlowPoint,
  moved: readonly string[],
  scope: string | undefined,
): string | undefined {
  const excluded = new Set(moved);
  for (const id of moved) for (const inner of view.descendants(id)) excluded.add(inner);
  let best: string | undefined;
  let bestDepth = -1;
  let bestZ = -Infinity;
  const probe = { x: point.x - 0.5, y: point.y - 0.5, width: 1, height: 1 };
  for (const id of view.nodesInRect(probe, true)) {
    if (excluded.has(id) || !view.isGroup(id)) continue;
    const node = view.getNode(id);
    if (!node || node.collapsed || node.hidden) continue;
    const rect = view.nodeRect(id);
    if (!rect || !rectContainsPoint(rect, point)) continue;
    const depth = view.ancestors(id).length;
    const z = view.nodeZ(id);
    if (depth > bestDepth || (depth === bestDepth && z > bestZ)) {
      best = id;
      bestDepth = depth;
      bestZ = z;
    }
  }
  return best ?? scope;
}

/** The parent a node is a member of, `undefined` at the root (or for a dangling parent id). */
function parentOf(model: FlowModel, id: string): string | undefined {
  const parentId = model.getNode(id)?.parentId;
  return parentId !== undefined && model.getNode(parentId) ? parentId : undefined;
}

/**
 * Whether a drop may move a node to another parent: a top-level node or a group member, never a
 * node held in by a parent that is not a group (that nesting keeps its own rules).
 */
export function reparentable(model: FlowModel, id: string): boolean {
  const node = model.getNode(id);
  if (!node) return false;
  const parent = parentOf(model, id);
  return parent === undefined || model.isGroup(parent);
}

/** What the drop tracking needs from the widget. */
export interface GroupDropHost {
  readonly model: FlowModel;
  readonly view: FlowGraphView;
  /** The group whose inside the view shows; `undefined` at the root. */
  readonly scope: string | undefined;
  readonly idFactory: FlowIdFactory;
  /** Applies changes in the drag's transaction, without cascade or clamping. */
  proposeIn(
    transaction: FlowTransaction,
    changes: readonly FlowChange[],
    metadata: Partial<FlowChangeMetadata>,
    sourceEvent: Event,
  ): void;
  /** Marks the group the nodes would move into (`undefined` clears the mark). */
  markTarget(id: string | undefined): void;
  /** Client point of a pointer event in flow coordinates. */
  toFlow(event: PointerEvent): FlowPoint;
}

interface FrameSnapshot {
  id: string;
  position: FlowPoint;
  size: FlowSize | undefined;
  children: ReadonlyMap<string, FlowPoint>;
  terminals: FlowGroupTerminals | undefined;
}

/**
 * Group membership during one node drag (Widgets §6.3 Properties, prop-16): each frame resolves
 * the drop target under the pointer; members still over their own group grow it live (the frames
 * return to their press-time state first, so the target is always judged against them and the
 * growth never outruns the pointer), and the drop moves nodes that left their parent into the
 * target with the rewiring of group selection, all in the drag's transaction.
 */
export class GroupDragTracker {
  readonly #host: GroupDropHost;
  readonly #ids: readonly string[];
  readonly #eligible: readonly string[];
  readonly #parents = new Map<string, string | undefined>();
  readonly #snapshots: FrameSnapshot[] = [];
  #grown = false;
  #target: string | undefined;
  #resolved = false;

  constructor(host: GroupDropHost, ids: readonly string[]) {
    this.#host = host;
    this.#ids = [...ids];
    const model = host.model;
    for (const id of ids) this.#parents.set(id, parentOf(model, id));
    this.#eligible = this.#ids.filter((id) => reparentable(model, id));
    const seen = new Set<string>();
    for (const id of this.#eligible)
      for (const ancestor of model.ancestors(id)) {
        if (seen.has(ancestor) || !model.isGroup(ancestor)) continue;
        seen.add(ancestor);
        const node = model.getNode(ancestor);
        if (!node) continue;
        const children = new Map<string, FlowPoint>();
        for (const child of model.children(ancestor)) {
          const item = model.getNode(child);
          if (item) children.set(child, { ...item.position });
        }
        this.#snapshots.push({
          id: ancestor,
          position: { ...node.position },
          size: node.size ? { ...node.size } : undefined,
          children,
          terminals: node.terminals,
        });
      }
  }

  /** The group (or scope level) the nodes would move into, after the last frame. */
  get target(): string | undefined {
    return this.#target;
  }

  /** Changes that return the frames the previous frame grew to their press-time state. */
  before(): FlowChange[] {
    if (!this.#grown) return [];
    const changes: FlowChange[] = [];
    for (const snapshot of this.#snapshots) {
      changes.push({ type: 'node-position', id: snapshot.id, position: snapshot.position });
      changes.push({ type: 'node-size', id: snapshot.id, size: snapshot.size });
      for (const [child, position] of snapshot.children)
        changes.push({ type: 'node-position', id: child, position });
      changes.push({
        type: 'node-update',
        id: snapshot.id,
        patch: { terminals: snapshot.terminals },
      });
    }
    return changes;
  }

  /** After a frame's moves: resolves the target, grows the parent of staying members, marks. */
  after(transaction: FlowTransaction, event: PointerEvent): void {
    const host = this.#host;
    this.#grown = false;
    if (!this.#eligible.length) return;
    const target = resolveDropTarget(host.view, host.toFlow(event), this.#ids, host.scope);
    this.#target = target;
    this.#resolved = true;
    const staying = this.#eligible.filter((id) => this.#parents.get(id) === target);
    if (target !== undefined && staying.length) {
      const { changes } = expandParentChanges(host.model, { ids: staying });
      if (changes.length) {
        host.proposeIn(transaction, changes, { surface: 'node' }, event);
        this.#grown = true;
      }
    }
    const leaving = this.#eligible.some((id) => this.#parents.get(id) !== target);
    host.markTarget(leaving && target !== host.scope ? target : undefined);
  }

  /** On drop: moves the nodes whose parent is not the target into it; the move's result. */
  drop(transaction: FlowTransaction, event: PointerEvent): FlowReparentResult | undefined {
    const host = this.#host;
    if (!this.#resolved) return undefined;
    const target = this.#target;
    const moving = this.#eligible.filter((id) => this.#parents.get(id) !== target);
    if (!moving.length) return undefined;
    const result = reparentChanges(host.model, { ids: moving, parentId: target }, host.idFactory);
    if (!result.changes.length || !result.moved.length) return undefined;
    const groupId = target ?? this.#parents.get(moving[0]!) ?? '';
    host.proposeIn(
      transaction,
      result.changes,
      { surface: 'node', group: { action: 'reparent', groupId } },
      event,
    );
    return result;
  }

  /** Ends the tracking: the target mark goes. */
  clear(): void {
    this.#host.markTarget(undefined);
  }
}
