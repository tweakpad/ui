import type { TpDragDropList } from './drag-drop-list.js';
import type { UniqueIdentifier } from '../../foundation/drag-drop/sorting.js';
import type { SortableInput } from '../../foundation/drag-drop/sortable.js';

/**
 * An item's position and drag state, passed to `renderItem`, `renderOverlay` and `getItemOptions`
 * of a Drag and drop list.
 */
export interface DragDropItemContext<T> {
  readonly [key: string]: unknown;
  id: UniqueIdentifier;
  index: number;
  committedIndex: number;
  previewIndex: number;
  dragging: boolean;
  dropping: boolean;
  dropTarget: boolean;
  /** The row shows as selected, as `isItemSelected` decides. */
  selected: boolean;
  /** Drag participation is disabled; kept as the handle/drag lane alias of dragDisabled. */
  disabled: boolean;
  /** List, read-only, duplicate or item draggable lane disables dragging this item. */
  dragDisabled: boolean;
  /** List, read-only, duplicate or item droppable lane disables dropping onto this item. */
  dropDisabled: boolean;
  preview: boolean;
  list: TpDragDropList<T>;
}
/**
 * Per-item drag settings returned by `getItemOptions`, such as disabling dragging or dropping for
 * one item.
 */
export type DragDropItemOptions = Omit<
  SortableInput,
  'id' | 'index' | 'group' | 'element' | 'source' | 'target' | 'handle' | 'register'
>;
/** Where `moveItem` puts an item: an index in this list or in a connected list or group. */
export interface DragDropDestination<T = unknown> {
  list?: TpDragDropList<T>;
  group?: UniqueIdentifier;
  index: number;
}
/** The result of `moveItem`: the move was accepted, changed nothing, or was rejected. */
export type MoveItemOutcome = 'accepted' | 'no-op' | 'rejected';
