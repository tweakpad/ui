/**
 * Companion entry of the text editor, published as `@tweakpad/ui/text-editor` (Widgets
 * `uwg-te-req-pkg-1`, `uwg-te-par-def-1`, `uwg-te-par-tools-1`).
 *
 * Engine-free and DOM-free: the two engine factories, which receive the engine modules from the
 * application, the engine contract, the normalized model, actions and capabilities, the built-in
 * tools and default layouts, the request types, custom node definitions, the palette and the
 * strings. Every name but the two factories carries a `TextEditor` prefix, so that the entry can
 * be re-exported beside other widgets' names. The controller itself and its store, the portable
 * model, the converters and the preview stay internal.
 */

// Runtime
export { textEditorTools } from './builtin-tools.js';
export { defaultTextEditorLayout } from './layout.js';
export { defineTextEditorTool } from './tools.js';
export { defineTextEditorBlock, defineTextEditorInline } from './nodes.js';
export { TEXT_EDITOR_COLORS } from './palette.js';
export { textEditorStrings } from './strings.js';

// Engines (uwg-te-par-engine-1, uwg-te-tab-engine): the factories take the engine modules that
// the application imports, so the entry itself depends on no engine package
export { createTiptapEngine } from './adapters/tiptap/index.js';
export type { TextEditorTiptapModules, TextEditorTiptapOptions } from './adapters/tiptap/index.js';
export { createLexicalEngine } from './adapters/lexical/index.js';
export type {
  TextEditorLexicalModules,
  TextEditorLexicalOptions,
} from './adapters/lexical/index.js';

// Engine contract (uwg-te-par-engine-1, uwg-te-tab-engine)
export type {
  TextEditorFormat,
  TextEditorPortableFormat,
  TextEditorContentInput,
  TextEditorUrlPolicy,
  TextEditorHistoryMode,
  TextEditorContentOptions,
  TextEditorSnapshot,
  TextEditorChangeCause,
  TextEditorContentChange,
  TextEditorDiagnosticCode,
  TextEditorDiagnostic,
  TextEditorEngineNotifications,
  TextEditorEngineLabels,
  TextEditorEngineContext,
  TextEditorExecuteOptions,
  TextEditorSetContentOptions,
  TextEditorFocusPosition,
  TextEditorCellLocation,
  TextEditorTableElements,
  TextEditorRootAttributes,
  TextEditorEngineInstance,
  TextEditorEngine,
} from './engine.js';

// Normalized model (uwg-te-req-engine-3, uwg-te-req-engine-4)
export type {
  TextEditorAttributeValue,
  TextEditorAttributes,
  TextEditorAlign,
  TextEditorHeadingLevel,
  TextEditorListKind,
  TextEditorTextblockKind,
  TextEditorBuiltinBlockKind,
  TextEditorBlockKind,
  TextEditorBlockAttributes,
  TextEditorCellAddress,
  TextEditorCellPoint,
  TextEditorTextPoint,
  TextEditorTextRange,
  TextEditorCellRange,
  TextEditorNoSelection,
  TextEditorTextSelection,
  TextEditorBlockSelection,
  TextEditorCellSelection,
  TextEditorSelection,
  TextEditorTextSelectionInput,
  TextEditorCaretSelectionInput,
  TextEditorSelectionInput,
  TextEditorBlock,
  TextEditorBlockTree,
  TextEditorBlockRects,
  TextEditorTableCell,
  TextEditorTableModel,
  TextEditorToggleMark,
  TextEditorColorMark,
  TextEditorMarkStatus,
  TextEditorMarkState,
  TextEditorBlockState,
  TextEditorBlockKindKey,
  TextEditorLinkState,
  TextEditorTableState,
  TextEditorCaretState,
  TextEditorEmptyBlockState,
  TextEditorHistoryState,
  TextEditorEngineState,
} from './model.js';

// Actions (uwg-te-par-engine-2, uwg-te-tab-actions)
export type {
  TextEditorBlockSlot,
  TextEditorInsertPosition,
  TextEditorInsertSelection,
  TextEditorTableTarget,
  TextEditorMarkToggleAction,
  TextEditorMarkColorAction,
  TextEditorMarkClearAction,
  TextEditorLinkSetAction,
  TextEditorLinkUnsetAction,
  TextEditorBlockSetTypeAction,
  TextEditorBlockSetAttrsAction,
  TextEditorBlockAlignAction,
  TextEditorBlockIndentAction,
  TextEditorBlockOutdentAction,
  TextEditorBlocksInsertAction,
  TextEditorBlocksMoveAction,
  TextEditorBlocksDuplicateAction,
  TextEditorBlocksDeleteAction,
  TextEditorTextInsertAction,
  TextEditorTextDeleteAction,
  TextEditorInlineInsertAction,
  TextEditorContentInsertAction,
  TextEditorContentSetAction,
  TextEditorSelectionSetAction,
  TextEditorHistoryUndoAction,
  TextEditorHistoryRedoAction,
  TextEditorTableInsertRowAction,
  TextEditorTableInsertColumnAction,
  TextEditorTableDeleteRowsAction,
  TextEditorTableDeleteColumnsAction,
  TextEditorTableMoveRowAction,
  TextEditorTableMoveColumnAction,
  TextEditorTableDuplicateRowAction,
  TextEditorTableDuplicateColumnAction,
  TextEditorTableMergeCellsAction,
  TextEditorTableSplitCellAction,
  TextEditorTableSetHeaderAction,
  TextEditorTableAlignAction,
  TextEditorTableBackgroundAction,
  TextEditorTableColumnWidthsAction,
  TextEditorTableClearCellsAction,
  TextEditorAction,
  TextEditorActionType,
  TextEditorActionOf,
} from './actions.js';

// Capabilities (uwg-te-req-engine-2)
export type {
  TextEditorBaseCapability,
  TextEditorOptionalCapability,
  TextEditorCapability,
} from './capabilities.js';

// Palette (uwg-te-tab-content-model r10)
export type { TextEditorColor, TextEditorColorChoice } from './palette.js';

// Tools and layouts (uwg-te-par-tools-1, uwg-te-par-tools-2)
export type {
  TextEditorToolKind,
  TextEditorSurface,
  TextEditorRequestSurface,
  TextEditorColorChannel,
  TextEditorColorToolValue,
  TextEditorLinkToolValue,
  TextEditorImageToolValue,
  TextEditorTableSizeToolValue,
  TextEditorToolSelectionTarget,
  TextEditorToolBlocksTarget,
  TextEditorToolTableTarget,
  TextEditorToolTarget,
  TextEditorToolContext,
  TextEditorToolContextual,
  TextEditorToolItems,
  TextEditorToolActionResult,
  TextEditorToolSuggestion,
  TextEditorTool,
} from './tools.js';
export type { TextEditorBuiltinToolId } from './builtin-tools.js';
export type {
  TextEditorLayoutGroups,
  TextEditorLayout,
  TextEditorLayoutSurfaceKey,
} from './layout.js';

// Requests (uwg-te-req-evt-1, uwg-te-req-evt-2); the surface comes from the tools above
export type {
  TextEditorRequestOutcome,
  TextEditorRequestDetail,
  TextEditorRequestFailedDetail,
} from './controller.js';

// Custom node definitions (uwg-te-req-blocks-6, uwg-te-req-inline-1, uwg-te-req-inline-2)
export type {
  TextEditorStringAttribute,
  TextEditorNumberAttribute,
  TextEditorBooleanAttribute,
  TextEditorEnumAttribute,
  TextEditorAttributeSpec,
  TextEditorAttributeSpecs,
  TextEditorAttributeValueOf,
  TextEditorAttributeValues,
  TextEditorNodeTool,
  TextEditorBlockMarkdownMatch,
  TextEditorBlockMarkdown,
  TextEditorBlockInit,
  TextEditorBlockPresentation,
  TextEditorBlockDefinition,
  TextEditorSuggestionRequest,
  TextEditorSuggestion,
  TextEditorInlineMarkdown,
  TextEditorInlineInit,
  TextEditorInlineDefinition,
  TextEditorNodeDefinition,
} from './nodes.js';

// Strings (uwg-te-tab-props r12)
export type { TextEditorStrings } from './strings.js';
