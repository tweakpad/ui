import type { TpDragDropList } from './drag-drop-list.js';
import type { UniqueIdentifier } from '../../foundation/drag-drop/sorting.js';
import type { SortableInput } from '../../foundation/drag-drop/sortable.js';

export interface DragDropItemContext<T> {
  readonly [key: string]: unknown;
  id: UniqueIdentifier;
  index: number;
  committedIndex: number;
  previewIndex: number;
  dragging: boolean;
  dropping: boolean;
  dropTarget: boolean;
  /** Drag participation is disabled; kept as the handle/drag lane alias of dragDisabled. */
  disabled: boolean;
  /** List, read-only, duplicate or item draggable lane disables dragging this item. */
  dragDisabled: boolean;
  /** List, read-only, duplicate or item droppable lane disables dropping onto this item. */
  dropDisabled: boolean;
  preview: boolean;
  list: TpDragDropList<T>;
}
export type DragDropItemOptions = Omit<
  SortableInput,
  'id' | 'index' | 'group' | 'element' | 'source' | 'target' | 'handle' | 'register'
>;
export interface DragDropDestination<T = unknown> {
  list?: TpDragDropList<T>;
  group?: UniqueIdentifier;
  index: number;
}
export type MoveItemOutcome = 'accepted' | 'no-op' | 'rejected';
