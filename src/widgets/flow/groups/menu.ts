import { html, nothing, type TemplateResult } from 'lit';
import { chevronDownIcon } from '../../../icons/chevron-down.js';
import { chevronLeftIcon } from '../../../icons/chevron-left.js';
import { chevronRightIcon } from '../../../icons/chevron-right.js';
import { folderIcon } from '../../../icons/folder.js';
import { folderOpenIcon } from '../../../icons/folder-open.js';
import { rotateCcwIcon } from '../../../icons/rotate-ccw.js';
import type { IconDefinition } from '../../../icons/types.js';
import { parseFlowTerminalId } from '../../../foundation/flow/groups/relations.js';
import type { FlowModel } from '../../../foundation/flow/model/model.js';
import {
  COLLAPSE_KEYS,
  ENTER_GROUP_KEYS,
  EXIT_GROUP_KEYS,
  GROUP_KEYS,
  UNGROUP_KEYS,
} from '../shortcuts.js';
import type { FlowContextSubject, FlowStrings } from '../types.js';
import { canGroup } from './group-commands.js';

/** Renders one menu command the way the flow's context menu does (icon, label, shortcut). */
export type FlowMenuItem = (
  value: string,
  icon: IconDefinition | undefined,
  label: string,
  options?: { disabled?: boolean; keys?: string; destructive?: boolean },
) => TemplateResult;

/** What the group items of the context menu read. */
export interface FlowGroupMenuContext {
  subject: FlowContextSubject;
  model: FlowModel;
  /** The group whose inside the view shows; `undefined` at the root. */
  scope: string | undefined;
  /** The selected nodes the selection commands act on. */
  nodes: readonly string[];
  editable: boolean;
  strings: FlowStrings;
  item: FlowMenuItem;
}

/** The menu values of the group commands. */
export const GROUP_MENU_VALUES = [
  'enter-group',
  'exit-group',
  'toggle-collapsed',
  'ungroup',
  'move-out-of-group',
  'group-selection',
  'reset-terminal',
] as const;
export type FlowGroupMenuValue = (typeof GROUP_MENU_VALUES)[number];

const SEPARATOR = html`<tp-separator></tp-separator>`;

/**
 * The context menu's group commands (Widgets §6.3 Keyboard and pointer, key-9), rendered before
 * the other commands of the subject: Enter group, Collapse or Expand and Ungroup on a group, Move
 * out of group on a member, Group selection on a selection, Exit group on the pane inside a group
 * and Reset position on a moved terminal.
 */
export function renderGroupMenuItems(
  context: FlowGroupMenuContext,
): TemplateResult | typeof nothing {
  const { subject, model, strings, editable, item } = context;
  if (subject.kind === 'pane')
    return context.scope === undefined
      ? nothing
      : html`${item('exit-group', chevronLeftIcon, strings.exitGroup, {
          keys: EXIT_GROUP_KEYS,
        })}${SEPARATOR}`;
  if (subject.kind !== 'node') return nothing;
  const terminal = parseFlowTerminalId(subject.nodeId);
  if (terminal && !model.getNode(subject.nodeId)) {
    const placed = model.getNode(terminal.groupId)?.terminals?.[terminal.kind] !== undefined;
    return item('reset-terminal', rotateCcwIcon, strings.resetPosition, {
      disabled: !editable || !placed,
    });
  }
  const node = model.getNode(subject.nodeId);
  if (!node) return nothing;
  const items: TemplateResult[] = [];
  if (model.isGroup(node)) {
    items.push(item('enter-group', folderOpenIcon, strings.enterGroup, { keys: ENTER_GROUP_KEYS }));
    items.push(
      item(
        'toggle-collapsed',
        node.collapsed ? chevronRightIcon : chevronDownIcon,
        node.collapsed ? strings.expandGroup : strings.collapseGroup,
        { disabled: !editable, keys: COLLAPSE_KEYS },
      ),
    );
    items.push(
      item('ungroup', undefined, strings.ungroup, { disabled: !editable, keys: UNGROUP_KEYS }),
    );
  }
  const parentId = node.parentId;
  if (parentId !== undefined && model.isGroup(parentId))
    items.push(
      item('move-out-of-group', undefined, strings.moveOutOfGroup, { disabled: !editable }),
    );
  const selection = context.nodes.length ? context.nodes : [node.id];
  items.push(
    item('group-selection', folderIcon, strings.groupSelection, {
      disabled: !editable || !canGroup(model, selection),
      keys: GROUP_KEYS,
    }),
  );
  return html`${items}${SEPARATOR}`;
}

/** The group a member leaves to with Move out of group: its group's parent (`null`: the root). */
export function moveOutTarget(model: FlowModel, id: string): string | null | undefined {
  const parentId = model.getNode(id)?.parentId;
  if (parentId === undefined || !model.isGroup(parentId)) return undefined;
  const grand = model.getNode(parentId)?.parentId;
  return grand !== undefined && model.getNode(grand) ? grand : null;
}
