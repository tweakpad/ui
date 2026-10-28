/**
 * The action gate of every engine adapter (Widgets `uwg-te-req-engine-5`, `uwg-te-tab-actions`,
 * `uwg-te-req-evt-1`).
 *
 * One rule for which actions `can` and `execute` accept and how `execute` routes a list, so that
 * both engines refuse and apply the same lists: an action must be valid, available with the
 * mount's capabilities (a changed block's kind included) and allowed in the current editability,
 * where read-only refuses every action that changes the document except `content.set`; a link
 * destination must pass the link protocols. A list is refused when it is empty, combines a history
 * action with another action, or holds a `content.set` with other actions; a sole `content.set`
 * goes to `setContent`, a sole undo or redo to the engine's history when a step is available, and
 * every other list to the engine's own application. `can` answers what `execute` would do, with
 * the content read as `setContent` reads it and the engine's dry run for everything else.
 */
import {
  actionCapabilities,
  combinesHistory,
  isMutatingAction,
  isValidTextEditorAction,
  type TextEditorAction,
  type TextEditorActionOf,
  type TextEditorBlockKindLookup,
} from '../../actions.js';
import { requirementsMet, type TextEditorCapability } from '../../capabilities.js';
import type { TextEditorPortableDocument } from '../../content/portable.js';
import type {
  TextEditorContentChange,
  TextEditorExecuteOptions,
  TextEditorSetContentOptions,
  TextEditorUrlPolicy,
} from '../../engine.js';
import { allowedUrl, linkProtocols } from '../../../markdown/url.js';
import { blockModel, findBlock } from './blocks.js';
import { readTextEditorContent, type TextEditorContentGlue } from './content.js';

/** What the gate reads from a mount. */
export interface TextEditorActionGate {
  /** The mount's capabilities: the engine's and those of the mount's custom nodes. */
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  /** Whether the mount is editable. */
  readonly editable: boolean;
  readonly urls: TextEditorUrlPolicy;
  /** The kind of a block of the current document, which `block.set-attrs` requires. */
  readonly kindOf: TextEditorBlockKindLookup;
  /** Whether the history holds a step to undo. */
  readonly canUndo: boolean;
  /** Whether the history holds a step to redo. */
  readonly canRedo: boolean;
}

/** Whether a link destination passes the link protocols of the URL policy. */
export function linkAllowed(href: string, urls: TextEditorUrlPolicy): boolean {
  return allowedUrl(href, linkProtocols(urls));
}

/** The kind lookup of a portable document: the kind of any block by identifier, or `null`. */
export function documentKinds(document: TextEditorPortableDocument): TextEditorBlockKindLookup {
  return (id) => {
    const block = findBlock(document.blocks, id);
    return block ? blockModel(block).kind : null;
  };
}

/**
 * Whether one action is allowed on the mount: valid (`isValidTextEditorAction`), available with
 * its required capabilities, allowed in the current editability (read-only refuses every action
 * that changes the document but `content.set`), and for `link.set` with a destination that the
 * link protocols allow. It reads `kindOf` only for `block.set-attrs`.
 */
export function actionAllowed(
  action: unknown,
  gate: Pick<TextEditorActionGate, 'capabilities' | 'editable' | 'urls' | 'kindOf'>,
): action is TextEditorAction {
  if (!isValidTextEditorAction(action)) return false;
  if (!gate.editable && isMutatingAction(action) && action.type !== 'content.set') return false;
  if (action.type === 'link.set' && !linkAllowed(action.href, gate.urls)) return false;
  return requirementsMet(actionCapabilities(action, gate.kindOf), gate.capabilities);
}

/** How `execute` applies a list. */
export type TextEditorExecutePlan =
  /** Nothing applies, and `execute` answers `false`. */
  | { readonly kind: 'refused' }
  /** A sole `content.set`, which the instance's `setContent` applies. */
  | { readonly kind: 'content'; readonly action: TextEditorActionOf<'content.set'> }
  /** A sole undo or redo with a step available, which the engine's history applies. */
  | {
      readonly kind: 'history';
      readonly action: TextEditorActionOf<'history.undo' | 'history.redo'>;
    }
  /** Every other list, which the engine applies as one change, all of it or none. */
  | { readonly kind: 'actions'; readonly actions: readonly TextEditorAction[] };

const REFUSED: TextEditorExecutePlan = Object.freeze({ kind: 'refused' });

/**
 * How `execute` applies a list on the mount: refused when the list is empty, when an action is not
 * allowed (`actionAllowed`), when it combines a history action with another action, when it holds
 * a `content.set` with other actions, or for an undo or redo without a step; a sole `content.set`
 * goes to `setContent`, a sole undo or redo to the history, and every other list to the engine.
 */
export function planExecute(
  actions: readonly unknown[],
  gate: TextEditorActionGate,
): TextEditorExecutePlan {
  if (actions.length === 0) return REFUSED;
  const allowed: TextEditorAction[] = [];
  for (const action of actions) {
    if (!actionAllowed(action, gate)) return REFUSED;
    allowed.push(action);
  }
  if (combinesHistory(allowed)) return REFUSED;
  const [first] = allowed;
  if (first?.type === 'content.set')
    return allowed.length === 1 ? { kind: 'content', action: first } : REFUSED;
  if (allowed.some((action) => action.type === 'content.set')) return REFUSED;
  if (first?.type === 'history.undo' || first?.type === 'history.redo') {
    const available = first.type === 'history.undo' ? gate.canUndo : gate.canRedo;
    return available ? { kind: 'history', action: first } : REFUSED;
  }
  return { kind: 'actions', actions: allowed };
}

/**
 * `can`: whether `execute` would apply the action alone. A refused plan answers `false`, an
 * available history step `true`, a `content.set` whether its content reads as `setContent` reads
 * it, and every other action the engine's dry run on the current state. It never throws: a read or
 * dry run that throws answers `false`.
 */
export function actionCan(
  action: unknown,
  gate: TextEditorActionGate,
  glue: TextEditorContentGlue,
  dryRun: (action: TextEditorAction) => boolean,
): boolean {
  try {
    const plan = planExecute([action], gate);
    switch (plan.kind) {
      case 'refused':
        return false;
      case 'history':
        return true;
      case 'content':
        readTextEditorContent(plan.action.content, plan.action.format, glue);
        return true;
      case 'actions':
        return plan.actions.every(dryRun);
    }
  } catch {
    return false;
  }
}

/**
 * The change record of a list that `execute` applies (`uwg-te-req-evt-1`): cause `action`, the
 * request's reason and source event, and the type of the first action that changes the document.
 */
export function actionChange(
  actions: readonly TextEditorAction[],
  options: Pick<TextEditorExecuteOptions, 'reason' | 'sourceEvent'>,
): TextEditorContentChange {
  return {
    cause: 'action',
    reason: options.reason,
    sourceEvent: options.sourceEvent,
    action: actions.find(isMutatingAction)?.type,
  };
}

/**
 * The change record of a content load that `setContent` applies (`uwg-te-req-evt-1`): cause
 * `content` with the request's reason, or `engine` for a load that no request made, such as a
 * form-state restore.
 */
export function contentChange(
  options: Pick<TextEditorSetContentOptions, 'reason'>,
): TextEditorContentChange {
  return { cause: 'content', reason: options.reason ?? 'engine' };
}
