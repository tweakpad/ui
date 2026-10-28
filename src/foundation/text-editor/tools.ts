/**
 * Editor tools of the text editor (Widgets `uwg-te-par-tools-1`, `uwg-te-req-tools-1` to
 * `uwg-te-req-tools-5`, `uwg-te-tab-tools-inserts` r4, `uwg-te-req-inline-2`,
 * `uwg-te-req-surfaces-2`, `uwg-te-req-evt-1`, `uwg-te-req-evt-2`).
 *
 * A tool is a DOM-free definition from which every surface renders one view model: a control, a
 * menu item or a command entry. The built-in tools, the tools that custom node definitions derive
 * and the application's tools form one registry keyed by identifier. Availability follows the
 * capabilities of the engine; visibility, enablement, activity and labels derive from the
 * normalized state; an activation resolves the tool to actions. Nothing here renders, matches a
 * key chord or touches the DOM: shortcuts are key patterns of the key-binding owner.
 */
import type { IconDefinition } from '../../icons/types.js';
import { allowedUrl } from '../markdown/url.js';
import {
  isMutatingAction,
  type TextEditorAction,
  type TextEditorBlockSetTypeAction,
  type TextEditorBlocksInsertAction,
  type TextEditorInsertSelection,
} from './actions.js';
import {
  BASE_CAPABILITIES,
  nodeCapability,
  requirementsMet,
  type TextEditorCapability,
} from './capabilities.js';
import type { TextEditorDiagnostic, TextEditorEngine, TextEditorUrlPolicy } from './engine.js';
import type { TextEditorLayout } from './layout.js';
import type {
  TextEditorAttributes,
  TextEditorAttributeValue,
  TextEditorBlockAttributes,
  TextEditorBlockKindKey,
  TextEditorBlockState,
  TextEditorEngineState,
  TextEditorTableModel,
  TextEditorTextRange,
} from './model.js';
import type { TextEditorNodeDefinition, TextEditorSuggestionRequest } from './nodes.js';
import { isTextEditorColorChoice, type TextEditorColorChoice } from './palette.js';
import type { TextEditorStrings } from './strings.js';
import { matchTrigger } from './triggers.js';

// Kinds and surfaces (uwg-te-par-tools-1)

/** How a tool presents itself and what an activation of it does. */
export type TextEditorToolKind =
  | 'button'
  | 'toggle'
  | 'menu'
  | 'radio-menu'
  | 'color'
  | 'link'
  | 'image'
  | 'table-size'
  | 'suggestion'
  | 'custom';

/**
 * A surface that places tools: the fixed toolbar, the selection toolbar, the slash menu, the
 * turn-into menu, the block menu and the row, column and cell menus of tables.
 */
export type TextEditorSurface =
  | 'toolbar'
  | 'selection-toolbar'
  | 'slash'
  | 'turn-into'
  | 'block-menu'
  | 'table-row'
  | 'table-column'
  | 'table-cell';

/**
 * Where an activation comes from, which its request reports as `surface`: a surface that places
 * tools, a suggestion list other than the slash menu, the insert Button of the gutter, a control
 * that the engine renders in the content, a key binding, a drag, a paste, or the API.
 */
export type TextEditorRequestSurface =
  TextEditorSurface | 'suggestion' | 'gutter' | 'content' | 'keyboard' | 'drag' | 'paste' | 'api';

/** A color channel of a color tool: text color, highlight or cell background. */
export type TextEditorColorChannel = 'text' | 'highlight' | 'background';

// Values (uwg-te-req-tools-4)

/** The value of a color tool with several channels. */
export interface TextEditorColorToolValue {
  readonly channel: TextEditorColorChannel;
  readonly color: TextEditorColorChoice;
}

/** The value of a link tool. */
export interface TextEditorLinkToolValue {
  readonly href: string;
}

/** The value of an image tool. */
export interface TextEditorImageToolValue {
  readonly src: string;
  readonly alt: string;
}

/** The value of a table-size tool. */
export interface TextEditorTableSizeToolValue {
  readonly rows: number;
  readonly columns: number;
}

/** The ranges of the table size picker, which the value of a table-size tool must keep. */
export const TEXT_EDITOR_TABLE_SIZE = Object.freeze({
  rows: Object.freeze({ min: 1, max: 100 }),
  columns: Object.freeze({ min: 1, max: 20 }),
});

// Context

/** The selection, which a tool acts on unless a surface targets something else. */
export interface TextEditorToolSelectionTarget {
  readonly kind: 'selection';
}

/** The blocks that the block menu, a block key or a block selection acts on. */
export interface TextEditorToolBlocksTarget {
  readonly kind: 'blocks';
  readonly ids: readonly string[];
}

/** The row, the column or the cells of a table that a table menu acts on. */
export interface TextEditorToolTableTarget {
  readonly kind: 'table';
  readonly table: string;
  readonly axis: 'row' | 'column' | 'cells';
  /** The row of a row menu or the column of a column menu; `cells` takes the selected range. */
  readonly index?: number | undefined;
}

export type TextEditorToolTarget =
  TextEditorToolSelectionTarget | TextEditorToolBlocksTarget | TextEditorToolTableTarget;

/** What a tool's functions receive. */
export interface TextEditorToolContext {
  /** The normalized state; before ready, the state that the editor reports then. */
  readonly state: TextEditorEngineState;
  readonly strings: TextEditorStrings;
  /** Where the tool is presented or activated. */
  readonly surface: TextEditorRequestSurface;
  readonly target: TextEditorToolTarget;
  /** The writing direction of the widget, which names the sides of table columns. */
  readonly direction: 'ltr' | 'rtl';
  /**
   * The direction that the first block of the selection resolves from its text (`dir="auto"`),
   * which names the sides of the alignments; `direction` when absent.
   */
  readonly textDirection?: 'ltr' | 'rtl' | undefined;
  /** The resolved layout: every key present, `*` expanded and the identifiers it skips removed. */
  readonly layout: TextEditorLayout;
  /** The model of the table that the target or the selection lies in, or `null`. */
  readonly table: TextEditorTableModel | null;
  /** Whether the widget uploads image files: its `imageUpload` hook is set. */
  readonly imageUpload: boolean;
  /** The value of the activation; `undefined` without one. */
  readonly value?: unknown;
}

/** A member that is a value or a function of the tool context. */
export type TextEditorToolContextual<T> = T | ((context: TextEditorToolContext) => T);

/** Tool identifiers of a menu or a radio menu; a nested list is a group. */
export type TextEditorToolItems = readonly (string | readonly string[])[];

/**
 * What an `action` function returns: an action or a list of them, or `null` when the tool has
 * nothing to do in this context, so that its activation changes nothing.
 */
export type TextEditorToolActionResult =
  TextEditorAction | readonly TextEditorAction[] | null | undefined;

/** The trigger of a suggestion tool and the text of its entries. */
export interface TextEditorToolSuggestion<I = unknown> {
  /** The trigger character, such as `/` or `@`. */
  readonly trigger: string;
  /** The label of an item's entry. */
  label?(item: I): string;
  /** The description of an item's entry. */
  description?(item: I): string;
}

/** An editor tool. */
export interface TextEditorTool {
  /** The registry key; kebab-case. */
  readonly id: string;
  readonly kind: TextEditorToolKind;
  /** The accessible name and visible label. */
  readonly label: TextEditorToolContextual<string>;
  /** The visible text where the display shows a label beside the icon. */
  readonly shortLabel?: TextEditorToolContextual<string> | undefined;
  /** The secondary text of a command entry. */
  readonly description?: TextEditorToolContextual<string> | undefined;
  readonly icon?: TextEditorToolContextual<IconDefinition | undefined> | undefined;
  /** Default `default`. */
  readonly tone?: 'default' | 'destructive' | undefined;
  /** How a toolbar shows the tool; `inline` shows a radio menu as a Toggle group. */
  readonly display?: 'icon' | 'icon-label' | 'label' | 'inline' | undefined;
  /** What the trigger of a menu, radio menu or color tool shows. */
  readonly trigger?: 'icon' | 'active-icon' | 'label' | 'active-label' | undefined;
  /** The surfaces that the tool declares, which `*` fills; none when absent. */
  readonly surfaces?: readonly TextEditorSurface[] | undefined;
  /** The group that `*` gathers the tool in. */
  readonly group?: string | undefined;
  /** Further words that the slash menu matches. */
  readonly keywords?: readonly string[] | undefined;
  /** One key pattern of the key-binding owner or a list of them; the first one is shown. */
  readonly shortcut?: string | readonly string[] | undefined;
  /** The capabilities that the tool needs, all of them; none when absent. */
  readonly requires?: readonly TextEditorCapability[] | undefined;
  /** The actions of an activation, or a function of the tool context returning them. */
  readonly action?:
    | TextEditorAction
    | readonly TextEditorAction[]
    | ((context: TextEditorToolContext) => TextEditorToolActionResult)
    | undefined;
  /** Pressed or checked. */
  readonly isActive?: ((context: TextEditorToolContext) => boolean) | undefined;
  /** Refines the enablement that the editor derives. */
  readonly isEnabled?: ((context: TextEditorToolContext) => boolean) | undefined;
  readonly isVisible?: ((context: TextEditorToolContext) => boolean) | undefined;
  /** The identifiers of the tools of a menu, a radio menu or the slash menu. */
  readonly items?: TextEditorToolContextual<TextEditorToolItems> | undefined;
  /** The channels of a color tool. */
  readonly channel?: TextEditorColorChannel | readonly TextEditorColorChannel[] | undefined;
  /** The trigger and entry texts of a suggestion tool. */
  readonly suggest?: TextEditorToolSuggestion | undefined;
  /** The items of a suggestion tool for a query. */
  readonly source?:
    | ((request: TextEditorSuggestionRequest) => readonly unknown[] | Promise<readonly unknown[]>)
    | undefined;
  /** Renders a custom tool in the toolbars; elsewhere it is a plain item that runs `action`. */
  readonly render?: ((context: TextEditorToolContext) => unknown) | undefined;
}

/** Types a tool definition and returns it unchanged. */
export function defineTextEditorTool<const T extends TextEditorTool>(tool: T): T {
  return tool;
}

// Registry (uwg-te-req-tools-1, uwg-te-req-tools-2)

export interface TextEditorToolRegistry {
  /** The tools by identifier, in registration order. */
  readonly tools: ReadonlyMap<string, TextEditorTool>;
  readonly order: readonly string[];
  /** The capabilities that availability follows. */
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  /** Whether a registered tool has every capability it requires. */
  isAvailable(id: string): boolean;
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

export interface TextEditorToolRegistryInput {
  /** The built-in tools by identifier. */
  readonly builtins: Readonly<Record<string, TextEditorTool>>;
  /** The application's tools. */
  readonly tools?: readonly TextEditorTool[] | null | undefined;
  /** The custom node definitions, each of which derives a tool named after its node. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | null | undefined;
  /** The capabilities that availability follows; see `resolveTextEditorCapabilities`. */
  readonly capabilities: ReadonlySet<TextEditorCapability>;
}

/**
 * The capabilities that tools follow: the base capabilities without an engine, so that assigning
 * one only adds tools, and otherwise the engine's together with the capability of each custom
 * node that the engine supports.
 */
export function resolveTextEditorCapabilities(
  engine: Pick<TextEditorEngine, 'capabilities' | 'supportsNode'> | null | undefined,
  nodes: readonly TextEditorNodeDefinition[] = [],
): ReadonlySet<TextEditorCapability> {
  if (!engine) return BASE_CAPABILITIES;
  const supported = nodes.filter((definition) => engine.supportsNode(definition));
  if (supported.length === 0) return engine.capabilities;
  return new Set<TextEditorCapability>([...engine.capabilities, ...supported.map(nodeCapability)]);
}

/**
 * One registry from the built-in tools, the tools that the custom nodes derive and the
 * application's tools, in that order: a later tool replaces an earlier one with its identifier in
 * place, and of duplicate identifiers within the application's tools the last wins, with one
 * `text-editor-tool-duplicate` diagnostic for each such identifier.
 */
export function resolveTextEditorTools(input: TextEditorToolRegistryInput): TextEditorToolRegistry {
  const tools = new Map<string, TextEditorTool>();
  for (const tool of Object.values(input.builtins)) tools.set(tool.id, tool);
  for (const definition of input.nodes ?? []) tools.set(definition.name, nodeTool(definition));
  const counts = new Map<string, number>();
  for (const tool of input.tools ?? []) {
    if (!isToolLike(tool)) continue;
    counts.set(tool.id, (counts.get(tool.id) ?? 0) + 1);
    tools.set(tool.id, tool);
  }
  const diagnostics: TextEditorDiagnostic[] = [];
  for (const [id, count] of counts)
    if (count > 1)
      diagnostics.push({
        code: 'text-editor-tool-duplicate',
        message: `The tools hold ${count} tools with the identifier "${id}"; the last one is used.`,
      });
  const capabilities = input.capabilities;
  const available = new Set<string>();
  for (const [id, tool] of tools)
    if (requirementsMet(tool.requires, capabilities)) available.add(id);
  return Object.freeze({
    tools,
    order: Object.freeze([...tools.keys()]),
    capabilities,
    isAvailable: (id: string) => available.has(id),
    diagnostics: Object.freeze(diagnostics),
  });
}

const isToolLike = (value: unknown): value is TextEditorTool =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { id?: unknown }).id === 'string' &&
  (value as { id: string }).id !== '';

// Tools of custom nodes (uwg-te-tab-tools-inserts r4)

/** The attribute values of a node at their defaults. */
function attributeDefaults(definition: TextEditorNodeDefinition): TextEditorAttributes {
  const values: Record<string, TextEditorAttributeValue> = {};
  for (const [name, spec] of Object.entries(definition.attrs)) values[name] = spec.default;
  return values;
}

/**
 * The tool of a custom node, identified by the node name and requiring its capability: a toggle
 * on the slash and turn-into menus for a textblock, a button on the slash menu for an atom or an
 * inline node, and a suggestion tool with no surface for an inline node that declares one.
 */
export function nodeTool(definition: TextEditorNodeDefinition): TextEditorTool {
  const { name } = definition;
  const presentation = definition.tool;
  const base = {
    id: name,
    label: presentation?.label ?? name,
    requires: Object.freeze([nodeCapability(definition)]),
    ...(presentation?.description === undefined ? {} : { description: presentation.description }),
    ...(presentation?.icon === undefined ? {} : { icon: presentation.icon }),
    ...(presentation?.keywords === undefined
      ? {}
      : { keywords: Object.freeze([...presentation.keywords]) }),
  };
  if (definition.kind === 'block') {
    if (definition.content === 'inline')
      return Object.freeze({
        ...base,
        kind: 'toggle',
        surfaces: Object.freeze(['slash', 'turn-into'] as const),
        action: (context: TextEditorToolContext) => setBlockKind(context, { kind: name }, name),
        isActive: (context: TextEditorToolContext) => blockKindIs(context.state, name),
        isVisible: outsideTable,
      });
    return Object.freeze({
      ...base,
      kind: 'button',
      surfaces: Object.freeze(['slash'] as const),
      action: (context: TextEditorToolContext) => [insertBlock(context, name)],
    });
  }
  const defaults = attributeDefaults(definition);
  const suggestion = definition.suggest;
  if (!suggestion)
    return Object.freeze({
      ...base,
      kind: 'button',
      surfaces: Object.freeze(['slash'] as const),
      action: Object.freeze([
        Object.freeze({
          type: 'inline.insert',
          kind: name,
          attrs: Object.freeze(defaults),
        } as const),
      ]),
    });
  const { trigger } = suggestion;
  return Object.freeze({
    ...base,
    kind: 'suggestion',
    surfaces: Object.freeze([]),
    suggest: Object.freeze({
      trigger,
      label: (item: unknown) => suggestion.label(item),
      ...(suggestion.description
        ? { description: (item: unknown) => suggestion.description!(item) }
        : {}),
    }),
    source: (request: TextEditorSuggestionRequest) => suggestion.source(request),
    action: (context: TextEditorToolContext): TextEditorToolActionResult => {
      if (context.value === undefined) return null;
      const range = suggestionRange(context, trigger);
      if (!range) return null;
      const attrs: Record<string, TextEditorAttributeValue> = { ...defaults };
      for (const [key, value] of Object.entries(suggestion.attrs(context.value)))
        if (value !== undefined) attrs[key] = value as TextEditorAttributeValue;
      return [{ type: 'inline.insert', kind: name, attrs, range }];
    },
  });
}

// Shared resolution helpers

/** The key under which `blockKinds` reports a block: a heading qualified by its level. */
export function blockKindKey(block: Pick<TextEditorBlockState, 'kind' | 'attrs'>): string {
  return block.kind === 'heading' ? `heading:${String(block.attrs.level)}` : block.kind;
}

/** Whether every block that the selection spans is of one kind, as `blockKinds` reports it. */
export function blockKindIs(state: TextEditorEngineState, key: TextEditorBlockKindKey): boolean {
  if (state.blockKinds.length > 0)
    return state.blockKinds.length === 1 && state.blockKinds[0] === key;
  return state.block !== null && blockKindKey(state.block) === key;
}

/** Hidden while the selection lies in a table, whose cells hold paragraphs only (tools-5). */
export function outsideTable(context: TextEditorToolContext): boolean {
  return context.state.table === null;
}

/**
 * The blocks that a block tool acts on: the targeted blocks, a block selection, the table that a
 * selection in it touches, or the one block of a text selection; `null` for a text selection
 * across blocks, which the widget targets as the blocks it touches.
 */
export function targetBlockIds(context: TextEditorToolContext): readonly string[] | null {
  const { target, state } = context;
  if (target.kind === 'blocks') return target.ids.length > 0 ? target.ids : null;
  if (target.kind === 'table') return [target.table];
  const selection = state.selection;
  switch (selection.kind) {
    case 'blocks':
      return selection.ids.length > 0 ? selection.ids : null;
    case 'cells':
      return [selection.table];
    case 'text':
      return selection.anchor.block === selection.head.block ? [selection.anchor.block] : null;
    default:
      return null;
  }
}

/** The `ids` member of a block action: the targeted blocks, or none to act on the selection. */
export function targetIdsMember(context: TextEditorToolContext): {
  readonly ids?: readonly string[];
} {
  return context.target.kind === 'blocks' && context.target.ids.length > 0
    ? { ids: context.target.ids }
    : {};
}

/**
 * Turns the selected or targeted blocks into a kind, or back into paragraphs when every one of
 * them already has it.
 */
export function setBlockKind(
  context: TextEditorToolContext,
  type: { readonly kind: string; readonly attrs?: TextEditorBlockAttributes },
  key: TextEditorBlockKindKey,
): readonly TextEditorBlockSetTypeAction[] {
  const ids = targetIdsMember(context);
  if (key !== 'paragraph' && blockKindIs(context.state, key))
    return [{ type: 'block.set-type', kind: 'paragraph', ...ids }];
  return [{ type: 'block.set-type', ...type, ...ids }];
}

/**
 * Inserts a block: after the targeted blocks, or at the point of insertion of the selection,
 * which the engine resolves.
 */
export function insertBlock(
  context: TextEditorToolContext,
  kind: string,
  attrs?: TextEditorBlockAttributes,
  select?: TextEditorInsertSelection,
): TextEditorBlocksInsertAction {
  const { target } = context;
  const last = target.kind === 'blocks' ? target.ids.at(-1) : undefined;
  return {
    type: 'blocks.insert',
    kind,
    ...(attrs ? { attrs } : {}),
    ...(last === undefined ? {} : { at: { after: last } }),
    ...(select ? { select } : {}),
  };
}

/**
 * The range of the trigger and the query before the caret, which a suggestion replaces, or
 * `null` when the caret follows no match of the trigger.
 */
export function suggestionRange(
  context: TextEditorToolContext,
  trigger: string,
): TextEditorTextRange | null {
  const caret = context.state.caret;
  if (!caret) return null;
  const match = matchTrigger(caret.textBefore, [trigger], {
    inCode: caret.inCode,
    inLink: context.state.link !== null,
  });
  if (!match) return null;
  const from = caret.point.offset - (caret.textBefore.length - match.offset);
  if (from < 0) return null;
  return {
    block: caret.point.block,
    ...(caret.point.cell ? { cell: caret.point.cell } : {}),
    from,
    to: caret.point.offset,
  };
}

/** The value of a contextual member. */
export function resolveToolMember<T>(
  member: TextEditorToolContextual<T>,
  context: TextEditorToolContext,
): T {
  return typeof member === 'function'
    ? (member as (context: TextEditorToolContext) => T)(context)
    : member;
}

export function toolLabel(tool: TextEditorTool, context: TextEditorToolContext): string {
  return resolveToolMember(tool.label, context);
}

/** The identifiers of a tool's items, groups flattened; the `*` of a layout is none. */
export function toolItemIds(tool: TextEditorTool, context: TextEditorToolContext): string[] {
  return toolItemGroups(tool, context).flat();
}

/**
 * The item identifiers of a menu tool by group, as its menu separates them: each nested list is a
 * group, and consecutive identifiers outside a nested list form one.
 */
export function toolItemGroups(tool: TextEditorTool, context: TextEditorToolContext): string[][] {
  if (tool.items === undefined) return [];
  const groups: string[][] = [];
  let loose: string[] | null = null;
  for (const item of resolveToolMember(tool.items, context)) {
    if (typeof item === 'string') {
      if (item === '*') continue;
      if (!loose) groups.push((loose = []));
      loose.push(item);
    } else {
      loose = null;
      groups.push([...item].filter((id) => id !== '*'));
    }
  }
  return groups.filter((group) => group.length);
}

/** The channels of a color tool; `text` when it names none. */
export function toolChannels(tool: TextEditorTool): readonly TextEditorColorChannel[] {
  const { channel } = tool;
  if (channel === undefined) return ['text'];
  return typeof channel === 'string' ? [channel] : channel;
}

// Values (uwg-te-req-tools-4)

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks the value of an activation against the domain of the tool's kind: a RangeError for rows
 * or columns of a table-size value that are not integers within the ranges of the table size
 * picker, a TypeError for any other value outside the domain, any value given to a button, toggle
 * or menu tool included, and `null` for a value in the domain or no value. The value of a custom
 * tool is the application's.
 */
export function checkToolValue(
  tool: TextEditorTool,
  value: unknown,
  urls: TextEditorUrlPolicy,
  context: TextEditorToolContext,
): RangeError | TypeError | null {
  if (value === undefined) return null;
  const outside = (reason: string) => new TypeError(`The tool "${tool.id}" ${reason}.`);
  switch (tool.kind) {
    case 'button':
    case 'toggle':
    case 'menu':
      return outside('takes no value');
    case 'radio-menu':
      return typeof value === 'string' && toolItemIds(tool, context).includes(value)
        ? null
        : outside(`has no item ${describe(value)}`);
    case 'color': {
      const channels = toolChannels(tool);
      if (channels.length === 1)
        return isTextEditorColorChoice(value)
          ? null
          : outside(`takes a palette name or "default", not ${describe(value)}`);
      if (!isRecord(value) || !channels.includes(value.channel as TextEditorColorChannel))
        return outside(`takes { channel, color } with one of the channels ${channels.join(', ')}`);
      return isTextEditorColorChoice(value.color)
        ? null
        : outside(`takes a palette name or "default", not ${describe(value.color)}`);
    }
    case 'link':
      return isRecord(value) && usableUrl(value.href, urls.links)
        ? null
        : outside('takes { href } with a link that the link policy allows');
    case 'image':
      return isRecord(value) && usableUrl(value.src, urls.images) && typeof value.alt === 'string'
        ? null
        : outside('takes { src, alt } with an image source that the image policy allows');
    case 'table-size': {
      if (!isRecord(value)) return outside('takes { rows, columns }');
      const { rows, columns } = TEXT_EDITOR_TABLE_SIZE;
      if (!within(value.rows, rows) || !within(value.columns, columns))
        return new RangeError(
          `The tool "${tool.id}" takes from ${rows.min} to ${rows.max} rows and from ${columns.min} to ${columns.max} columns.`,
        );
      return null;
    }
    case 'suggestion':
      if (tool.items === undefined) return null;
      return typeof value === 'string' && toolItemIds(tool, context).includes(value)
        ? null
        : outside(`has no entry ${describe(value)}`);
    default:
      return null;
  }
}

const usableUrl = (url: unknown, protocols: readonly string[]): boolean =>
  typeof url === 'string' && url.trim() !== '' && allowedUrl(url, protocols);

const within = (value: unknown, range: { readonly min: number; readonly max: number }) =>
  typeof value === 'number' && Number.isInteger(value) && value >= range.min && value <= range.max;

function describe(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

// Actions (uwg-te-req-tools-3)

/** Kinds whose entry in the slash menu opens a surface rather than acting at once. */
const SURFACE_KINDS: ReadonlySet<TextEditorToolKind> = new Set<TextEditorToolKind>([
  'menu',
  'radio-menu',
  'color',
  'link',
  'table-size',
]);

function actionList(result: TextEditorToolActionResult): readonly TextEditorAction[] | null {
  if (result === null || result === undefined) return null;
  return Object.freeze(Array.isArray(result) ? [...result] : [result as TextEditorAction]);
}

/**
 * The actions of an activation, its value in `context.value`: those of the tool's `action`; for a
 * radio menu without one, those of the chosen item's tool, or `null` when that item is already
 * the active one; for a suggestion tool with items, such as the slash menu, the removal of the
 * trigger and the query followed by the chosen entry's actions, or the removal alone for an entry
 * that opens a surface; and otherwise `null`, nothing to do. An empty list acts outside the
 * document.
 */
export function toolActions(
  tool: TextEditorTool,
  context: TextEditorToolContext,
  registry: TextEditorToolRegistry,
): readonly TextEditorAction[] | null {
  const { action } = tool;
  if (typeof action === 'function') return actionList(action(context));
  if (action !== undefined) return actionList(action);
  if (tool.kind === 'radio-menu') {
    const item = chosenItem(tool, context, registry);
    if (!item) return null;
    const bare = { ...context, value: undefined };
    return item.isActive?.(bare) ? null : toolActions(item, bare, registry);
  }
  if (tool.kind === 'suggestion' && tool.items !== undefined && tool.suggest) {
    const entry = chosenItem(tool, context, registry);
    const range = entry ? suggestionRange(context, tool.suggest.trigger) : null;
    if (!entry || !range) return null;
    const removal: TextEditorAction = { type: 'text.delete', range };
    if (SURFACE_KINDS.has(entry.kind)) return Object.freeze([removal]);
    const actions = toolActions(entry, { ...context, value: undefined }, registry);
    return actions === null ? null : Object.freeze([removal, ...actions]);
  }
  return null;
}

function chosenItem(
  tool: TextEditorTool,
  context: TextEditorToolContext,
  registry: TextEditorToolRegistry,
): TextEditorTool | null {
  const { value } = context;
  if (typeof value !== 'string' || !toolItemIds(tool, context).includes(value)) return null;
  const item = registry.tools.get(value);
  return item && registry.isAvailable(value) ? item : null;
}

/**
 * The tool of the entry that the value of a suggestion tool with items, such as the slash menu,
 * chooses: available and listed by the tool; `null` for any other tool or value.
 */
export function suggestionEntryTool(
  tool: TextEditorTool,
  context: TextEditorToolContext,
  registry: TextEditorToolRegistry,
): TextEditorTool | null {
  return tool.kind === 'suggestion' && tool.items !== undefined
    ? chosenItem(tool, context, registry)
    : null;
}

// Derived state (uwg-te-req-tools-2)

export interface TextEditorToolEnablement {
  readonly ready: boolean;
  readonly disabled: boolean;
  /** The document is editable: not read-only, and the engine accepts input. */
  readonly editable: boolean;
  readonly registry: TextEditorToolRegistry;
  /** The engine's dry run, memoized by the caller. */
  can(action: TextEditorAction): boolean;
}

/** Kinds whose activation takes a value that changes the document. */
const VALUE_KINDS: ReadonlySet<TextEditorToolKind> = new Set<TextEditorToolKind>([
  'radio-menu',
  'color',
  'link',
  'image',
  'table-size',
  'suggestion',
]);

/**
 * Whether a tool is enabled: only while the editor is ready and not disabled, the tool available
 * and its `isEnabled` refining nothing away; a menu then always is; a tool that takes a value only
 * while the document is editable and, when the context resolves it to actions, as its value does,
 * only when `can` accepts them; and any other tool only when it resolves to actions, which `can`
 * accepts, and, when they change the document, while it is editable.
 */
export function toolEnabled(
  tool: TextEditorTool,
  context: TextEditorToolContext,
  input: TextEditorToolEnablement,
): boolean {
  if (!input.ready || input.disabled) return false;
  if (!requirementsMet(tool.requires, input.registry.capabilities)) return false;
  if (tool.isEnabled && !tool.isEnabled(context)) return false;
  if (tool.kind === 'menu') return true;
  if (VALUE_KINDS.has(tool.kind)) {
    if (!input.editable) return false;
    const resolved = toolActions(tool, context, input.registry);
    return resolved === null || resolved.every((action) => input.can(action));
  }
  const actions = toolActions(tool, context, input.registry);
  if (actions === null) return false;
  if (!input.editable && actions.some(isMutatingAction)) return false;
  return actions.every((action) => input.can(action));
}

export function toolVisible(tool: TextEditorTool, context: TextEditorToolContext): boolean {
  return tool.isVisible ? tool.isVisible(context) : true;
}

export function toolActive(tool: TextEditorTool, context: TextEditorToolContext): boolean {
  return tool.isActive ? tool.isActive(context) : false;
}
