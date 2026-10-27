/**
 * The adapter's extension: the engine's dependencies and the adapter's registrations, each list in
 * one place (Widgets `uwg-te-req-engine-1`, `uwg-te-req-engine-9`, `uwg-te-req-engine-11`).
 *
 * Dependencies: rich text; the live-region extension with a detached owner, which silences every
 * engine announcer; history with a 500 ms delay and 100 steps, enabled explicitly because the
 * engine disables it where no `window` exists; lists without the check-list extension; links
 * without the clickable-link and autolink extensions and without paste handling; code; the
 * horizontal rule; tables without the Tab handler, with the scroll wrapper and merging, without
 * literal backgrounds or nested tables; and the DOM render overrides of `render.ts`.
 *
 * Registrations run while the editor is built, before its initial state, so the identifier
 * transforms see the initial content. Their order is the order of listeners that share a command
 * priority: the guards (critical), the input rules' autolink before a break, then code, lists and
 * the quote, Backspace and normalization rules (high), before the engine's own (low and editor).
 */
import type { TextEditorEngineContext } from '../../engine.js';
import { registerCaretMarks } from './caret.js';
import { registerClipboard } from './clipboard.js';
import { registerCodeKeys } from './code.js';
import { registerBlockCursor } from './cursor.js';
import { registerGuards } from './guards.js';
import { $splitAtStart, registerIdRepair } from './ids.js';
import { registerUndoGrouping } from './history.js';
import { registerInputRules } from './input-rules.js';
import { registerListKeys } from './lists.js';
import { registerTextStyles } from './marks.js';
import { bindEditorRuntime, registerNodeNormalization } from './nodes.js';
import { registerCellKeys, registerCellRangeCaret, registerCellRangeDeletion } from './tables.js';
import { registerRangeEdits } from './text.js';
import type {
  LexicalExtensionArgumentLike,
  LexicalExtensionInitLike,
  LexicalExtensionLike,
} from './modules.js';
import { notifyState, registerNotifications } from './notify.js';
import { lexicalRenderExtension, registerTablePaint } from './render.js';
import type { LexicalRuntime } from './runtime.js';
import { lexicalTheme } from './theme.js';

/** What the adapter's extension needs from the mount. */
export interface LexicalMountInput {
  readonly rt: LexicalRuntime;
  readonly context: Pick<
    TextEditorEngineContext,
    'editable' | 'labels' | 'state' | 'content' | 'error' | 'diagnostic' | 'signal'
  >;
  /** The detached element that owns the engine's live region; `null` without a document. */
  readonly announcer: HTMLElement | null;
  /** Called with the editor's errors; the adapter's own aborts are filtered by the caller. */
  readonly onError: (error: Error) => void;
  /** Writes the root's editability, if a root exists. */
  readonly onEditable: (editable: boolean) => void;
}

/** The engine extensions the adapter depends on. */
export function lexicalDependencies(input: LexicalMountInput): LexicalExtensionArgumentLike[] {
  const { rt } = input;
  const { modules } = rt;
  const configure = (extension: LexicalExtensionLike, config: Readonly<Record<string, unknown>>) =>
    modules.lexical.configExtension(extension, config);
  return [
    modules.richText.RichTextExtension,
    configure(modules.a11y.AriaLiveRegionExtension, { owner: input.announcer }),
    configure(modules.history.HistoryExtension, {
      delay: 500,
      maxDepth: 100,
      disabled: false,
      // The runtime's history, whose entries tell what an undo or redo restores.
      createInitialHistoryState: () => rt.history,
    }),
    modules.list.ListExtension,
    modules.link.LinkExtension,
    modules.code.CodeExtension,
    modules.extension.HorizontalRuleExtension,
    ...(modules.table
      ? [
          configure(modules.table.TableExtension, {
            hasTabHandler: false,
            hasHorizontalScroll: true,
            hasCellMerge: true,
            hasCellBackgroundColor: false,
            hasNestedTables: false,
          }),
        ]
      : []),
    lexicalRenderExtension(rt, input.context.labels),
  ];
}

/** A registration of the adapter: called with the built editor, returns its cleanup. */
export type LexicalRegistration = (input: LexicalMountInput) => () => void;

/** The adapter's registrations, in order. */
export const LEXICAL_REGISTRATIONS: readonly LexicalRegistration[] = Object.freeze([
  // Block identifiers (`uwg-te-req-content-7`).
  ({ rt }) => registerIdRepair(rt),
  // Colors typed after a caret color settle into NodeState.
  ({ rt }) => registerTextStyles(rt),
  // Escape, reserved chords, formats, select-all and input over it (`uwg-te-req-engine-11`).
  ({ rt }) => registerGuards(rt),
  // A caret the engine places from the DOM takes the adapter's caret marks, and controlled text
  // input takes the caret colors (`uwg-te-lis-up-i2`).
  ({ rt }) => registerCaretMarks(rt),
  // Editing input over a range across blocks: the shared range deletion.
  ({ rt }) => registerRangeEdits(rt),
  // The shared input rules as Markdown shortcuts; autolinks before a break (`uwg-te-req-key-7`).
  ({ rt }) => registerInputRules(rt),
  // Code block keys, then list keys (`uwg-te-req-parity-1`).
  ({ rt }) => registerCodeKeys(rt),
  ({ rt }) => registerListKeys(rt),
  // Normalization: code text, the trailing paragraph, quote Enter, Backspace at a block start.
  ({ rt }) => registerNodeNormalization(rt),
  // Copy and cut through the shared serializers (`uwg-te-req-content-6`).
  ({ rt }) => registerClipboard(rt),
  // Deletion over a cell range clears the cells, never the table (`uwg-te-lis-up-i2`).
  ({ rt }) => registerCellRangeDeletion(rt),
  // Shift with an arrow key selects the cell range of the shared rule (`uwg-te-req-tables-5`), and
  // plain ArrowUp and ArrowDown move a caret from cell to cell by the shared rule
  // (`uwg-te-req-engine-9`).
  ({ rt }) => registerCellKeys(rt),
  // A focused cell range keeps a DOM caret in the root for the Copy and Cut commands
  // (`uwg-te-req-content-6`).
  ({ rt }) => registerCellRangeCaret(rt),
  // A table that holds no cell range is never painted as one (`uwg-te-tab-vocabulary`).
  ({ rt }) => registerTablePaint(rt),
  // No collapsed selection stays beside a block that is no textblock (`uwg-te-req-engine-9`).
  ({ rt }) => registerBlockCursor(rt),
  // Enter at the start of a block keeps its identifier with its content (`uwg-te-req-content-7`).
  ({ rt }) =>
    rt.engine.registerCommand(
      rt.lexical.INSERT_PARAGRAPH_COMMAND,
      () => $splitAtStart(rt),
      rt.lexical.COMMAND_PRIORITY_LOW,
    ),
  // History availability, which the engine reports before the update that changes it.
  ({ rt, context }) =>
    rt.lexical.mergeRegister(
      rt.engine.registerCommand(
        rt.lexical.CAN_UNDO_COMMAND,
        (value) => {
          rt.canUndo = value;
          return false;
        },
        rt.lexical.COMMAND_PRIORITY_LOW,
      ),
      rt.engine.registerCommand(
        rt.lexical.CAN_REDO_COMMAND,
        (value) => {
          rt.canRedo = value;
          return false;
        },
        rt.lexical.COMMAND_PRIORITY_LOW,
      ),
      // A cleared history changes availability outside an update.
      rt.engine.registerCommand(
        rt.lexical.CLEAR_HISTORY_COMMAND,
        () => {
          queueMicrotask(() => notifyState(rt, context));
          return false;
        },
        rt.lexical.COMMAND_PRIORITY_CRITICAL,
      ),
    ),
  // Focus of the editing root.
  ({ rt, context }) =>
    rt.lexical.mergeRegister(
      rt.engine.registerCommand(
        rt.lexical.FOCUS_COMMAND,
        () => {
          if (!rt.focused) {
            rt.focused = true;
            notifyState(rt, context);
          }
          return false;
        },
        rt.lexical.COMMAND_PRIORITY_CRITICAL,
      ),
      rt.engine.registerCommand(
        rt.lexical.BLUR_COMMAND,
        () => {
          if (rt.focused) {
            rt.focused = false;
            notifyState(rt, context);
          }
          return false;
        },
        rt.lexical.COMMAND_PRIORITY_CRITICAL,
      ),
    ),
  // Editability: the root's `contenteditable` and a state notification (`uwg-te-req-engine-4`).
  ({ rt, context, onEditable }) =>
    rt.engine.registerEditableListener((editable) => {
      onEditable(editable);
      notifyState(rt, context);
    }),
  // Undo grouping of typing, Enter and Shift+Enter; own steps end it (`uwg-te-req-engine-5`).
  ({ rt }) => registerUndoGrouping(rt),
  // Versions and notifications of every committed update.
  ({ rt, context }) => registerNotifications(rt, context),
]);

/** The adapter's own extension, for `buildEditorFromExtensions`. */
export function lexicalExtension(input: LexicalMountInput): LexicalExtensionInitLike {
  const { rt, context } = input;
  return {
    name: '@tweakpad/ui/text-editor',
    namespace: 'tp-text-editor',
    theme: lexicalTheme(rt.lexical),
    editable: context.editable,
    nodes: [
      rt.kit.image,
      ...[...rt.customBlocks.values(), ...rt.customInlines.values()].map(
        (binding) => binding.klass,
      ),
    ],
    dependencies: lexicalDependencies(input),
    // No initial state: the mount loads the content in its own update once the root is set.
    $initialEditorState: null,
    onError: (error) => input.onError(error),
    // The engine's development default throws on a warning; it is a diagnostic here.
    onWarn: (error) => context.diagnostic('text-editor-engine-warning', error.message),
    register: (editor) => {
      rt.editor = editor;
      bindEditorRuntime(editor, rt);
      const cleanups = LEXICAL_REGISTRATIONS.map((register) => register(input));
      return () => {
        for (const cleanup of cleanups.reverse()) cleanup();
      };
    },
  };
}
