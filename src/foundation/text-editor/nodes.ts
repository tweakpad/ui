/**
 * Custom node definitions of the text editor (Widgets `uwg-te-req-blocks-6`, `uwg-te-req-inline-1`,
 * `uwg-te-req-inline-2`, `uwg-te-tab-content-model` r13).
 *
 * A custom block or inline node is defined once, engine-neutrally. Its HTML is declarative: the
 * definition's element with the node name in `data-type` and each attribute as a `data-`
 * attribute, so that the shared converters write and read it without a hook.
 * `defineTextEditorBlock` and `defineTextEditorInline` check a definition and return it frozen.
 */
import type { IconDefinition } from '../../icons/types.js';
import { VOID_ELEMENTS } from '../markdown/html.js';
import type { MarkdownBlock, MarkdownInline } from '../markdown/types.js';
import { BUILTIN_TOOL_FEATURES } from './builtin-tools/ids.js';
import { isContainedCss } from './content/node-css.js';
import type { TextEditorAttributeValue } from './model.js';

// Attributes

export interface TextEditorStringAttribute {
  readonly type: 'string';
  readonly default: string | null;
}

export interface TextEditorNumberAttribute {
  readonly type: 'number';
  readonly default: number | null;
}

export interface TextEditorBooleanAttribute {
  readonly type: 'boolean';
  readonly default: boolean;
}

/** One of the listed strings; `default` is one of them. */
export interface TextEditorEnumAttribute<V extends string = string> {
  readonly type: 'enum';
  readonly values: readonly V[];
  readonly default: V;
}

/** A typed attribute with its default. */
export type TextEditorAttributeSpec =
  | TextEditorStringAttribute
  | TextEditorNumberAttribute
  | TextEditorBooleanAttribute
  | TextEditorEnumAttribute;

/** Attribute specs by attribute name. No attribute is named `type`, nor `id` in a block. */
export type TextEditorAttributeSpecs = Readonly<Record<string, TextEditorAttributeSpec>>;

/** The value type of an attribute spec. */
export type TextEditorAttributeValueOf<A extends TextEditorAttributeSpec> =
  A extends TextEditorEnumAttribute<infer V>
    ? V
    : A extends TextEditorBooleanAttribute
      ? boolean
      : A extends TextEditorNumberAttribute
        ? number | null
        : A extends TextEditorStringAttribute
          ? string | null
          : TextEditorAttributeValue;

/** The attribute values of a node with the given specs. */
export type TextEditorAttributeValues<S extends TextEditorAttributeSpecs> = {
  readonly [K in keyof S]: TextEditorAttributeValueOf<S[K]>;
};

// Tools

/** How the tool of a custom node presents itself; the node name identifies the tool. */
export interface TextEditorNodeTool {
  readonly label: string;
  readonly description?: string | undefined;
  readonly icon?: IconDefinition | undefined;
  /** Further words that the slash menu matches. */
  readonly keywords?: readonly string[] | undefined;
}

// Blocks (uwg-te-req-blocks-6)

/** What a block's Markdown `parse` restores from a node of the Markdown tree. */
export interface TextEditorBlockMarkdownMatch<
  S extends TextEditorAttributeSpecs = TextEditorAttributeSpecs,
> {
  /** Attribute values; the defaults fill the others. */
  readonly attrs: Partial<TextEditorAttributeValues<S>>;
  /** The inline content of a textblock. */
  readonly content?: readonly MarkdownInline[] | undefined;
}

export interface TextEditorBlockMarkdown<
  S extends TextEditorAttributeSpecs = TextEditorAttributeSpecs,
> {
  /** Writes the block; `markdown` is its inline content as Markdown, empty for an atom. */
  serialize(block: {
    readonly attrs: TextEditorAttributeValues<S>;
    readonly markdown: string;
  }): string;
  /** Restores the block from the Markdown node that `serialize` wrote, or answers `null`. */
  parse?(node: MarkdownBlock): TextEditorBlockMarkdownMatch<S> | null;
}

/** The definition that `defineTextEditorBlock` receives. */
export interface TextEditorBlockInit<
  S extends TextEditorAttributeSpecs = TextEditorAttributeSpecs,
> {
  /** Matches `/^[a-z][a-z0-9-]*$/`; neither a reserved name nor a built-in tool identifier. */
  readonly name: string;
  /** `inline` for a textblock, `none` for an atom. */
  readonly content: 'inline' | 'none';
  readonly attrs?: S | undefined;
  /** The HTML element of the block, such as `aside` or `figure`. */
  readonly element: string;
  /** Without it the block is written as its text. */
  readonly markdown?: TextEditorBlockMarkdown<S> | undefined;
  /** The text format of the block; `text` is the text of a textblock, empty for an atom. */
  text?(block: { readonly attrs: TextEditorAttributeValues<S>; readonly text: string }): string;
  /**
   * Renders an atom into its host inside the editable content, light DOM only; may return a
   * cleanup function.
   */
  view?(host: HTMLElement, attrs: TextEditorAttributeValues<S>): void | (() => void);
  /** Styles adopted under the content part. */
  readonly css?: string | undefined;
  /**
   * A presentation role of the content that the block takes: `callout` renders its element with
   * `tp-te-callout` beside `tp-te-block-<name>`, so the widget paints it as a callout, in the tone
   * that a `tone` attribute names as an alert kind or severity (`tip`, `warning`, `caution`).
   */
  readonly presents?: TextEditorBlockPresentation | undefined;
  readonly tool: TextEditorNodeTool;
}

/** The presentation roles of the content that a custom block can take. */
export type TextEditorBlockPresentation = 'callout';

/** The class of each presentation role, from the engine-neutral class vocabulary. */
const PRESENTATION_CLASSES: Readonly<Record<TextEditorBlockPresentation, string>> = Object.freeze({
  callout: 'tp-te-callout',
});

/**
 * The classes of a custom node's element on every engine and in the preview: `tp-te-block-` or
 * `tp-te-inline-` with the node name, then the class of a block's presentation role.
 */
export function customNodeClassName(
  definition: Pick<TextEditorNodeDefinition, 'kind' | 'name'> & {
    readonly presents?: TextEditorBlockPresentation | undefined;
  },
): string {
  const own = `${definition.kind === 'block' ? 'tp-te-block-' : 'tp-te-inline-'}${definition.name}`;
  const role =
    definition.kind === 'block' && definition.presents
      ? PRESENTATION_CLASSES[definition.presents]
      : undefined;
  return role ? `${own} ${role}` : own;
}

/** A custom block definition, as `defineTextEditorBlock` returns it, frozen. */
export interface TextEditorBlockDefinition<
  S extends TextEditorAttributeSpecs = TextEditorAttributeSpecs,
> extends TextEditorBlockInit<S> {
  readonly kind: 'block';
  readonly attrs: S;
}

// Inline nodes (uwg-te-req-inline-1, uwg-te-req-inline-2)

/** The query of a suggestion and the signal that aborts its call. */
export interface TextEditorSuggestionRequest {
  /** The text from the trigger to the caret; it holds no whitespace. */
  readonly query: string;
  /** Aborted by a newer query and when the list closes. */
  readonly signal: AbortSignal;
}

/** The suggestion of an inline node, which derives a suggestion tool named after the node. */
export interface TextEditorSuggestion<
  I = unknown,
  S extends TextEditorAttributeSpecs = TextEditorAttributeSpecs,
> {
  /** The trigger character, such as `@`. */
  readonly trigger: string;
  source(request: TextEditorSuggestionRequest): readonly I[] | Promise<readonly I[]>;
  /** The label of an item's entry. */
  label(item: I): string;
  /** The description of an item's entry. */
  description?(item: I): string;
  /** The attributes of the node that an item inserts; the defaults fill the others. */
  attrs(item: I): Partial<TextEditorAttributeValues<S>>;
}

export interface TextEditorInlineMarkdown<
  S extends TextEditorAttributeSpecs = TextEditorAttributeSpecs,
> {
  serialize(attrs: TextEditorAttributeValues<S>): string;
}

/** The definition that `defineTextEditorInline` receives. */
export interface TextEditorInlineInit<
  S extends TextEditorAttributeSpecs = TextEditorAttributeSpecs,
  I = unknown,
> {
  /** The naming rules of custom blocks apply. */
  readonly name: string;
  readonly attrs?: S | undefined;
  /** The HTML element of the node, such as `span`. */
  readonly element: string;
  /** The text the node shows and contributes to plain text. */
  text(attrs: TextEditorAttributeValues<S>): string;
  /** Without it the node is written as its text. Markdown import never restores inline nodes. */
  readonly markdown?: TextEditorInlineMarkdown<S> | undefined;
  /**
   * Renders the node into its host inside the editable content, light DOM only; may return a
   * cleanup function. Without it the host shows the node's text.
   */
  view?(host: HTMLElement, attrs: TextEditorAttributeValues<S>): void | (() => void);
  /** Styles adopted under the content part. */
  readonly css?: string | undefined;
  readonly suggest?: TextEditorSuggestion<I, S> | undefined;
  readonly tool?: TextEditorNodeTool | undefined;
}

/** A custom inline node definition, as `defineTextEditorInline` returns it, frozen. */
export interface TextEditorInlineDefinition<
  S extends TextEditorAttributeSpecs = TextEditorAttributeSpecs,
  I = unknown,
> extends TextEditorInlineInit<S, I> {
  readonly kind: 'inline';
  readonly attrs: S;
}

/** A custom block or inline node definition. */
export type TextEditorNodeDefinition = TextEditorBlockDefinition | TextEditorInlineDefinition;

// Definitions (uwg-te-req-blocks-6, uwg-te-req-inline-1)

/**
 * Names that no custom node takes: the document, the built-in kinds and their parts, and
 * `cursor`. The identifiers of the built-in tools are reserved as well.
 */
export const RESERVED_NODE_NAMES: ReadonlySet<string> = new Set([
  'doc',
  'root',
  'text',
  'hard-break',
  'paragraph',
  'heading',
  'quote',
  'code',
  'list',
  'list-item',
  'list-bullet',
  'list-ordered',
  'list-task',
  'task',
  'divider',
  'image',
  'table',
  'table-row',
  'table-cell',
  'table-header',
  'cursor',
]);

/** The name of a custom node, which its HTML holds in `data-type` and its classes repeat. */
export const NODE_NAME = /^[a-z][a-z0-9-]*$/u;

/**
 * Whether an engine adapter supports a custom node definition, its `supportsNode`
 * (`uwg-te-par-engine-1`, `uwg-te-req-engine-2`): a definition with a valid node name that the
 * factory's `nodes` option overrides under that name, or whose node the adapter generates, which
 * it does for a textblock, an atom block and an inline node. An override counts only as an own
 * property of `overrides`, and no override makes an invalid name supported.
 */
export function isSupportedNode(
  definition: unknown,
  overrides: Readonly<Record<string, unknown>>,
): boolean {
  if (typeof definition !== 'object' || definition === null) return false;
  const { name, kind, content } = definition as {
    readonly name?: unknown;
    readonly kind?: unknown;
    readonly content?: unknown;
  };
  if (typeof name !== 'string' || !NODE_NAME.test(name)) return false;
  if (Object.hasOwn(overrides, name)) return true;
  return kind === 'inline' || (kind === 'block' && (content === 'inline' || content === 'none'));
}

/** Lowercase, so that the name survives as a `data-` attribute, whose name HTML lowercases. */
export const ATTRIBUTE_NAME = /^[a-z][a-z0-9-]*$/u;
/** A lowercase element name, a custom element's included. */
export const ELEMENT_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
/** Elements that cannot stand for a node in the content: document parts, scripts, lists, tables. */
const UNUSABLE_ELEMENTS: ReadonlySet<string> = new Set([
  'html',
  'head',
  'body',
  'title',
  'base',
  'link',
  'meta',
  'script',
  'style',
  'noscript',
  'template',
  'slot',
  'ul',
  'ol',
  'li',
  'table',
  'caption',
  'colgroup',
  'col',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
]);
/** Elements that close an open paragraph in HTML, so that an inline node cannot be one. */
const BLOCK_ELEMENTS: ReadonlySet<string> = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'main',
  'menu',
  'nav',
  'p',
  'pre',
  'section',
]);

type Members = Readonly<Record<string, unknown>>;

const isMembers = (value: unknown): value is Members =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function describe(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : String(value);
}

function checkName(name: unknown): string {
  if (typeof name !== 'string' || !NODE_NAME.test(name))
    throw new TypeError(
      `A text editor node name must match /^[a-z][a-z0-9-]*$/, not ${describe(name)}.`,
    );
  if (RESERVED_NODE_NAMES.has(name))
    throw new TypeError(`"${name}" is a reserved text editor node name.`);
  if (Object.hasOwn(BUILTIN_TOOL_FEATURES, name))
    throw new TypeError(`"${name}" is the identifier of a built-in text editor tool.`);
  return name;
}

function checkElement(name: string, element: unknown, role: 'textblock' | 'atom' | 'inline') {
  if (typeof element !== 'string' || !ELEMENT_NAME.test(element))
    throw new TypeError(
      `The node "${name}" needs a lowercase element name, not ${describe(element)}.`,
    );
  if (UNUSABLE_ELEMENTS.has(element))
    throw new TypeError(`The node "${name}" cannot be written as <${element}>.`);
  if (role === 'textblock' && VOID_ELEMENTS.has(element))
    throw new TypeError(
      `The textblock "${name}" cannot be written as the void element <${element}>.`,
    );
  if (role === 'inline' && BLOCK_ELEMENTS.has(element))
    throw new TypeError(
      `The inline node "${name}" cannot be written as the block element <${element}>.`,
    );
  return element;
}

function checkSpec(name: string, attribute: string, spec: unknown): TextEditorAttributeSpec {
  const subject = `The attribute "${attribute}" of the node "${name}"`;
  if (!isMembers(spec)) throw new TypeError(`${subject} needs a spec.`);
  const fallback = spec.default;
  switch (spec.type) {
    case 'string':
      if (fallback !== null && typeof fallback !== 'string')
        throw new TypeError(`${subject} needs a string or null default.`);
      return Object.freeze({ type: 'string', default: fallback });
    case 'number':
      if (fallback !== null && !(typeof fallback === 'number' && Number.isFinite(fallback)))
        throw new TypeError(`${subject} needs a finite number or null default.`);
      return Object.freeze({ type: 'number', default: fallback });
    case 'boolean':
      if (typeof fallback !== 'boolean') throw new TypeError(`${subject} needs a Boolean default.`);
      return Object.freeze({ type: 'boolean', default: fallback });
    case 'enum': {
      const values: unknown = spec.values;
      if (
        !Array.isArray(values) ||
        values.length === 0 ||
        !values.every((value) => typeof value === 'string') ||
        new Set(values).size !== values.length
      )
        throw new TypeError(`${subject} needs a list of distinct string values.`);
      if (typeof fallback !== 'string' || !values.includes(fallback))
        throw new TypeError(`${subject} needs a default among its values.`);
      return Object.freeze({
        type: 'enum',
        values: Object.freeze([...(values as string[])]),
        default: fallback,
      });
    }
    default:
      throw new TypeError(`${subject} has no attribute type ${describe(spec.type)}.`);
  }
}

function checkAttributes(name: string, attrs: unknown, block: boolean): TextEditorAttributeSpecs {
  if (attrs === undefined) return Object.freeze({});
  if (!isMembers(attrs))
    throw new TypeError(`The attributes of the node "${name}" must be an object.`);
  const specs: Record<string, TextEditorAttributeSpec> = {};
  for (const [attribute, spec] of Object.entries(attrs)) {
    if (!ATTRIBUTE_NAME.test(attribute))
      throw new TypeError(
        `The attribute name "${attribute}" of the node "${name}" must match /^[a-z][a-z0-9-]*$/.`,
      );
    if (attribute === 'type' || (block && attribute === 'id'))
      throw new TypeError(
        `The node "${name}" cannot have an attribute named "${attribute}", which its HTML holds.`,
      );
    specs[attribute] = checkSpec(name, attribute, spec);
  }
  return Object.freeze(specs);
}

function optionalFunction<F>(name: string, member: string, value: F | undefined): F | undefined {
  if (value !== undefined && typeof value !== 'function')
    throw new TypeError(`The ${member} of the node "${name}" must be a function.`);
  return value;
}

function requiredFunction<F>(name: string, member: string, value: F | undefined): F {
  if (typeof value !== 'function')
    throw new TypeError(`The node "${name}" needs a ${member} function.`);
  return value;
}

function optionalString(name: string, member: string, value: unknown): string | undefined {
  if (value !== undefined && typeof value !== 'string')
    throw new TypeError(`The ${member} of the node "${name}" must be a string.`);
  return value;
}

/** The `css` of a node: a string whose rules stay in the block the widget nests them in. */
function checkCss(name: string, value: unknown): string | undefined {
  const css = optionalString(name, 'css', value);
  if (css !== undefined && !isContainedCss(css))
    throw new TypeError(
      `The css of the node "${name}" must close every brace, comment and string it opens.`,
    );
  return css;
}

const isIcon = (value: unknown): value is IconDefinition =>
  isMembers(value) && typeof value.viewBox === 'string' && Array.isArray(value.paths);

function checkTool(name: string, tool: unknown): TextEditorNodeTool {
  if (!isMembers(tool)) throw new TypeError(`The tool of the node "${name}" must be an object.`);
  const { label, description, icon, keywords } = tool;
  if (typeof label !== 'string' || label.trim() === '')
    throw new TypeError(`The tool of the node "${name}" needs a label.`);
  if (description !== undefined && typeof description !== 'string')
    throw new TypeError(`The tool description of the node "${name}" must be a string.`);
  if (icon !== undefined && !isIcon(icon))
    throw new TypeError(`The tool icon of the node "${name}" must be an icon definition.`);
  if (
    keywords !== undefined &&
    !(Array.isArray(keywords) && keywords.every((keyword) => typeof keyword === 'string'))
  )
    throw new TypeError(`The tool keywords of the node "${name}" must be a list of strings.`);
  return Object.freeze({
    label,
    ...(description === undefined ? {} : { description }),
    // An icon definition is shared data and stays as it was given.
    ...(icon === undefined ? {} : { icon }),
    ...(keywords === undefined ? {} : { keywords: Object.freeze([...(keywords as string[])]) }),
  });
}

function checkBlockMarkdown(name: string, markdown: unknown): TextEditorBlockMarkdown | undefined {
  if (markdown === undefined) return undefined;
  if (!isMembers(markdown))
    throw new TypeError(`The Markdown of the node "${name}" must be an object.`);
  const serialize = requiredFunction(
    name,
    'Markdown serialize',
    markdown.serialize as TextEditorBlockMarkdown['serialize'] | undefined,
  );
  const parse = optionalFunction(
    name,
    'Markdown parse',
    markdown.parse as TextEditorBlockMarkdown['parse'] | undefined,
  );
  return Object.freeze({ serialize, ...(parse ? { parse } : {}) });
}

function checkInlineMarkdown(
  name: string,
  markdown: unknown,
): TextEditorInlineMarkdown | undefined {
  if (markdown === undefined) return undefined;
  if (!isMembers(markdown))
    throw new TypeError(`The Markdown of the node "${name}" must be an object.`);
  const serialize = requiredFunction(
    name,
    'Markdown serialize',
    markdown.serialize as TextEditorInlineMarkdown['serialize'] | undefined,
  );
  return Object.freeze({ serialize });
}

function checkSuggestion(name: string, suggest: unknown): TextEditorSuggestion | undefined {
  if (suggest === undefined) return undefined;
  if (!isMembers(suggest))
    throw new TypeError(`The suggestion of the node "${name}" must be an object.`);
  const { trigger } = suggest;
  if (typeof trigger !== 'string' || [...trigger].length !== 1 || /\s/u.test(trigger))
    throw new TypeError(`The suggestion of the node "${name}" needs one trigger character.`);
  type Suggestion = TextEditorSuggestion;
  const source = requiredFunction(
    name,
    'suggestion source',
    suggest.source as Suggestion['source'],
  );
  const label = requiredFunction(name, 'suggestion label', suggest.label as Suggestion['label']);
  const attrs = requiredFunction(name, 'suggestion attrs', suggest.attrs as Suggestion['attrs']);
  const description = optionalFunction(
    name,
    'suggestion description',
    suggest.description as Suggestion['description'],
  );
  return Object.freeze({ trigger, source, label, attrs, ...(description ? { description } : {}) });
}

/**
 * Defines a custom block: a textblock (`content: 'inline'`) or an atom (`content: 'none'`). Throws
 * a TypeError for an invalid definition: a name outside `/^[a-z][a-z0-9-]*$/`, a reserved name
 * or a built-in tool identifier, an element that cannot hold the block, an attribute named `type`
 * or `id`, an attribute spec or default that does not fit, a member of the wrong type, or a view
 * on a textblock. Returns the definition frozen, with no attributes when it declares none.
 */
export function defineTextEditorBlock<const S extends TextEditorAttributeSpecs>(
  init: TextEditorBlockInit<S>,
): TextEditorBlockDefinition<S> {
  if (!isMembers(init)) throw new TypeError('A text editor block definition must be an object.');
  const name = checkName(init.name);
  const { content } = init;
  if (content !== 'inline' && content !== 'none')
    throw new TypeError(`The block "${name}" needs the content "inline" or "none".`);
  const element = checkElement(name, init.element, content === 'inline' ? 'textblock' : 'atom');
  const attrs = checkAttributes(name, init.attrs, true);
  const markdown = checkBlockMarkdown(name, init.markdown);
  const text = optionalFunction(name, 'text', init.text);
  const view = optionalFunction(name, 'view', init.view);
  if (view && content === 'inline')
    throw new TypeError(`The textblock "${name}" cannot have a view; only an atom renders one.`);
  const css = checkCss(name, init.css);
  const presents: unknown = init.presents;
  if (
    presents !== undefined &&
    !(typeof presents === 'string' && Object.hasOwn(PRESENTATION_CLASSES, presents))
  )
    throw new TypeError(
      `The block "${name}" cannot present ${describe(presents)}; it presents "callout" or nothing.`,
    );
  const tool = checkTool(name, init.tool);
  return Object.freeze({
    kind: 'block',
    name,
    content,
    element,
    attrs,
    ...(markdown ? { markdown } : {}),
    ...(text ? { text } : {}),
    ...(view ? { view } : {}),
    ...(css === undefined ? {} : { css }),
    ...(presents === undefined ? {} : { presents: presents as TextEditorBlockPresentation }),
    tool,
  }) as unknown as TextEditorBlockDefinition<S>;
}

/**
 * Defines a custom inline node, an atom inside text. Throws a TypeError for an invalid definition,
 * by the naming rules of custom blocks, an element that would close a paragraph, an attribute
 * named `type`, an attribute spec or default that does not fit, a missing `text`, a member of the
 * wrong type, or a suggestion without one trigger character, `source`, `label` and `attrs`.
 * Returns the definition frozen.
 */
export function defineTextEditorInline<const S extends TextEditorAttributeSpecs, I = unknown>(
  init: TextEditorInlineInit<S, I>,
): TextEditorInlineDefinition<S, I> {
  if (!isMembers(init))
    throw new TypeError('A text editor inline node definition must be an object.');
  const name = checkName(init.name);
  const element = checkElement(name, init.element, 'inline');
  const attrs = checkAttributes(name, init.attrs, false);
  const text = requiredFunction(name, 'text', init.text);
  const markdown = checkInlineMarkdown(name, init.markdown);
  const view = optionalFunction(name, 'view', init.view);
  const css = checkCss(name, init.css);
  const suggest = checkSuggestion(name, init.suggest);
  const tool = init.tool === undefined ? undefined : checkTool(name, init.tool);
  return Object.freeze({
    kind: 'inline',
    name,
    element,
    attrs,
    text,
    ...(markdown ? { markdown } : {}),
    ...(view ? { view } : {}),
    ...(css === undefined ? {} : { css }),
    ...(suggest ? { suggest } : {}),
    ...(tool ? { tool } : {}),
  }) as unknown as TextEditorInlineDefinition<S, I>;
}
