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
  disabled: boolean;
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
