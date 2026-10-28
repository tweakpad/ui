/**
 * Action dispatch of the Tiptap adapter (Widgets `uwg-te-req-engine-5`, `uwg-te-tab-actions`).
 *
 * Each action type has one handler that appends its changes to the list's transaction and answers
 * whether it applied. An action applies only when the shared action gate allows it on the
 * transaction's current document (`actionAllowed`): valid, available with the mount's
 * capabilities, the kind of a block that `block.set-attrs` changes included, allowed in the
 * work's editability, and for `link.set` with a destination the link protocols allow.
 * `content.set` and the history actions are the instance's: they replace the state or step through
 * the history instead of appending to a transaction.
 */
import type {
  TextEditorAction,
  TextEditorActionOf,
  TextEditorActionType,
  TextEditorBlockKindLookup,
} from '../../actions.js';
import { actionAllowed } from '../shared/actions.js';
import { BLOCK_HANDLERS } from './blocks.js';
import { CONTENT_HANDLERS } from './content.js';
import { INLINE_HANDLERS } from './inline.js';
import { holderIndex, holderKind } from './mapping.js';
import { MARK_HANDLERS } from './marks.js';
import type { TiptapNodeLike } from './modules.js';
import { clearSelection, setSelection } from './selection.js';
import { TABLE_HANDLERS } from './tables.js';
import type { TiptapWork } from './work.js';

/** The handler of one action type. */
export type TiptapActionHandler<T extends TextEditorActionType> = (
  work: TiptapWork,
  action: TextEditorActionOf<T>,
) => boolean;

/** Handlers by action type. */
export type TiptapActionHandlers = {
  readonly [T in TextEditorActionType]?: TiptapActionHandler<T>;
};

const HANDLERS: TiptapActionHandlers = {
  ...MARK_HANDLERS,
  ...BLOCK_HANDLERS,
  ...INLINE_HANDLERS,
  ...CONTENT_HANDLERS,
  ...TABLE_HANDLERS,
  'selection.set': (work, action) =>
    action.selection.kind === 'none' ? clearSelection(work) : setSelection(work, action.selection),
};

/** The kind of a block of a document by identifier, as the block tree reports it, or `null`. */
export function kindLookup(doc: TiptapNodeLike): TextEditorBlockKindLookup {
  return (id) => {
    const holder = holderIndex(doc).byId.get(id);
    return holder ? holderKind(doc, holder) : null;
  };
}

/**
 * Whether an action acts on the selection: marks, links without a range, block attributes and
 * nesting without identifiers, and text and inline nodes without a range. While no selection is
 * placed, these do not apply (`uwg-te-req-blocks-1`).
 */
function actsOnSelection(action: TextEditorAction): boolean {
  switch (action.type) {
    case 'mark.toggle':
    case 'mark.color':
    case 'mark.clear':
      return true;
    case 'link.set':
    case 'link.unset':
    case 'text.insert':
    case 'inline.insert':
      return action.range === undefined;
    case 'block.set-type':
    case 'block.align':
    case 'block.indent':
    case 'block.outdent':
      return action.ids === undefined;
    default:
      return false;
  }
}

/** Appends one action to the work's transaction; whether it applied. */
export function applyAction(work: TiptapWork, action: TextEditorAction): boolean {
  const gate = {
    capabilities: work.env.capabilities,
    editable: work.editable,
    urls: work.env.urls,
    kindOf: kindLookup(work.doc),
  };
  if (!actionAllowed(action, gate)) return false;
  if (!work.placed && actsOnSelection(action)) return false;
  const handler = HANDLERS[action.type] as TiptapActionHandler<TextEditorActionType> | undefined;
  return handler ? handler(work, action as never) : false;
}
