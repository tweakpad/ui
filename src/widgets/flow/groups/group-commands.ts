import { fillTemplate } from '../../../foundation/template.js';
import type { ChangeReason } from '../../../foundation/types.js';
import {
  groupNodesChanges,
  groupPortChanges,
  reparentChanges,
  ungroupChanges,
  type FlowGroupPortAction,
  type FlowIdFactory,
} from '../../../foundation/flow/groups/commands.js';
import type { FlowModel } from '../../../foundation/flow/model/model.js';
import type { FlowChange, FlowPortInstance } from '../../../foundation/flow/types.js';
import type { FlowChangeMetadata, FlowStrings } from '../types.js';

type GroupAction = NonNullable<FlowChangeMetadata['group']>['action'];

/** What the group commands need from the widget. */
export interface FlowGroupCommandHost {
  readonly model: FlowModel;
  /** Design mode, not read-only, disabled or locked. */
  readonly editable: boolean;
  readonly strings: FlowStrings;
  readonly idFactory: FlowIdFactory;
  /**
   * Proposes one change list on the document lane without cascade or clamping, as one history
   * entry, and commits it; false when it was refused.
   */
  apply(
    changes: readonly FlowChange[],
    options: {
      reason: ChangeReason;
      label: string;
      metadata: Partial<FlowChangeMetadata>;
      sourceEvent?: Event | undefined;
    },
  ): boolean;
  announce(message: string): void;
  nodeLabel(id: string): string;
  /** The name of the root level (the graph's name), for moves out to the root. */
  rootLabel(): string;
}

/** Options of `groupSelection`: the nodes (the selection by default), the group type and label. */
export interface FlowGroupSelectionOptions {
  ids?: readonly string[];
  type?: string;
  label?: string;
}

function run(
  host: FlowGroupCommandHost,
  changes: readonly FlowChange[],
  action: GroupAction,
  groupId: string,
  reason: ChangeReason,
  sourceEvent: Event | undefined,
  surface: FlowChangeMetadata['surface'] = 'api',
): boolean {
  if (!changes.length) return false;
  return host.apply(changes, {
    reason,
    label: action,
    metadata: { surface, group: { action, groupId } },
    ...(sourceEvent ? { sourceEvent } : {}),
  });
}

/** Whether `ids` can become one group: they exist and their top-level ones share one parent. */
export function canGroup(model: FlowModel, ids: readonly string[]): boolean {
  const wanted = new Set(ids.filter((id) => model.getNode(id)));
  if (!wanted.size) return false;
  let parent: string | undefined | null = null;
  for (const id of wanted) {
    if (model.ancestors(id).some((ancestor) => wanted.has(ancestor))) continue;
    const parentId = model.getNode(id)?.parentId;
    const own = parentId !== undefined && model.getNode(parentId) ? parentId : undefined;
    if (parent === null) parent = own;
    else if (parent !== own) return false;
  }
  return true;
}

/** Wraps nodes in a new group; returns its id, or `undefined` when refused. */
export function groupSelectionCommand(
  host: FlowGroupCommandHost,
  ids: readonly string[],
  options: FlowGroupSelectionOptions,
  reason: ChangeReason,
  sourceEvent?: Event,
): string | undefined {
  if (!host.editable) return undefined;
  const model = host.model;
  const result = groupNodesChanges(
    model,
    {
      ids,
      ...(options.type !== undefined ? { type: options.type } : {}),
      ...(options.label !== undefined ? { label: options.label } : {}),
      id: host.idFactory('node'),
    },
    host.idFactory,
  );
  if (!result) return undefined;
  if (!run(host, result.changes, 'group', result.groupId, reason, sourceEvent)) return undefined;
  host.announce(
    fillTemplate(host.strings.announceGrouped, {
      count: result.members.length,
      label: host.nodeLabel(result.groupId),
    }),
  );
  return result.groupId;
}

/** Dissolves a group; returns whether it did. */
export function ungroupCommand(
  host: FlowGroupCommandHost,
  id: string,
  reason: ChangeReason,
  sourceEvent?: Event,
): boolean {
  if (!host.editable || !host.model.isGroup(id)) return false;
  const label = host.nodeLabel(id);
  const result = ungroupChanges(host.model, { id }, host.idFactory);
  if (!result || !run(host, result.changes, 'ungroup', id, reason, sourceEvent)) return false;
  host.announce(fillTemplate(host.strings.announceUngrouped, { label }));
  return true;
}

/** Collapses or expands a group (`collapsed` absent toggles); returns whether it changed. */
export function toggleCollapsedCommand(
  host: FlowGroupCommandHost,
  id: string,
  collapsed: boolean | undefined,
  reason: ChangeReason,
  sourceEvent?: Event,
): boolean {
  const model = host.model;
  const node = model.getNode(id);
  if (!host.editable || !node || !model.isGroup(node)) return false;
  const next = collapsed ?? !node.collapsed;
  if (Boolean(node.collapsed) === next) return false;
  const action = next ? 'collapse' : 'expand';
  const changes: FlowChange[] = [
    { type: 'node-update', id, patch: { collapsed: next ? true : undefined } },
  ];
  if (!run(host, changes, action, id, reason, sourceEvent)) return false;
  host.announce(
    fillTemplate(next ? host.strings.announceCollapsed : host.strings.announceExpanded, {
      label: host.nodeLabel(id),
    }),
  );
  return true;
}

/** Moves nodes into a group (`null`: the root), keeping them in place; returns whether it did. */
export function moveToGroupCommand(
  host: FlowGroupCommandHost,
  ids: readonly string[],
  groupId: string | null,
  reason: ChangeReason,
  sourceEvent?: Event,
): boolean {
  const model = host.model;
  if (!host.editable) return false;
  if (groupId !== null && !model.isGroup(groupId)) return false;
  const parentId = groupId ?? undefined;
  const moving = ids.filter((id) => {
    const node = model.getNode(id);
    if (!node || id === groupId) return false;
    if (groupId !== null && model.ancestors(groupId).includes(id)) return false;
    return node.parentId !== parentId;
  });
  if (!moving.length) return false;
  const result = reparentChanges(model, { ids: moving, parentId }, host.idFactory);
  if (!result.moved.length) return false;
  const label = groupId === null ? host.rootLabel() : host.nodeLabel(groupId);
  const target = groupId ?? model.getNode(moving[0]!)?.parentId ?? '';
  if (!run(host, result.changes, 'reparent', target, reason, sourceEvent)) return false;
  host.announce(
    fillTemplate(host.strings.announceMovedToGroup, { count: result.moved.length, label }),
  );
  return true;
}

/** The new port of `addGroupPort`: a direction, optionally an id, a label and a data type. */
export type FlowGroupPortInput = Extract<FlowGroupPortAction, { action: 'add' }>['port'];

/**
 * A port label for a new group port: the direction's name, numbered after the ports the group
 * already has in that direction (`Input 2`).
 */
export function defaultGroupPortLabel(
  model: FlowModel,
  groupId: string,
  direction: 'input' | 'output',
  strings: FlowStrings,
  locale?: string,
): string {
  const name = direction === 'input' ? strings.input : strings.output;
  const word = name.charAt(0).toLocaleUpperCase(locale || undefined) + name.slice(1);
  const count = model.ports(groupId).filter((port) => port.direction === direction).length;
  return count ? `${word} ${count + 1}` : word;
}

/** Adds a port to a group; returns its id (unique in the group), or `undefined` when refused. */
export function addGroupPortCommand(
  host: FlowGroupCommandHost,
  groupId: string,
  port: FlowGroupPortInput,
  reason: ChangeReason,
  sourceEvent?: Event,
): string | undefined {
  if (!host.editable) return undefined;
  const result = groupPortChanges(host.model, { action: 'add', groupId, port });
  if (!result?.port) return undefined;
  if (!run(host, result.changes, 'port', groupId, reason, sourceEvent)) return undefined;
  return result.port.id;
}

/** Patches (renames) a group port; returns whether it changed. */
export function updateGroupPortCommand(
  host: FlowGroupCommandHost,
  groupId: string,
  portId: string,
  patch: Partial<Omit<FlowPortInstance, 'id' | 'direction'>>,
  reason: ChangeReason,
  sourceEvent?: Event,
): boolean {
  if (!host.editable) return false;
  const result = groupPortChanges(host.model, { action: 'update', groupId, portId, patch });
  return Boolean(result && run(host, result.changes, 'port', groupId, reason, sourceEvent));
}

/** Removes a group port with the edges on both of its sides; returns whether it did. */
export function removeGroupPortCommand(
  host: FlowGroupCommandHost,
  groupId: string,
  portId: string,
  reason: ChangeReason,
  sourceEvent?: Event,
): boolean {
  if (!host.editable) return false;
  const result = groupPortChanges(host.model, { action: 'remove', groupId, portId });
  return Boolean(result && run(host, result.changes, 'port', groupId, reason, sourceEvent));
}
