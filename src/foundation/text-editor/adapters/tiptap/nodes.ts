/**
 * Custom nodes of the Tiptap adapter (Widgets `uwg-te-req-blocks-6`, `uwg-te-req-inline-1`,
 * `uwg-te-tab-vocabulary`, `uwg-te-tab-engine` r9, `uwg-te-par-engine-1`).
 *
 * Each custom definition of a mount becomes a node of the engine: the override that the factory's
 * `nodes` option gives for its name, else a node generated from the definition, built once per
 * core module and definition. A generated textblock renders the definition's element holding its
 * content. A generated atom block or inline node renders through a view: a host of the
 * definition's element, neither editable nor draggable, carrying `tp-te-block-` or `tp-te-inline-`
 * with the node name (and a block's presentation role, `customNodeClassName`), the name in `data-type` and its attributes as the HTML profile writes them,
 * into which the definition's view renders light DOM; an inline node without a view shows its
 * text. A view that throws leaves its host empty; its cleanup runs when the node re-renders or
 * leaves the document.
 */
import { isTextEditorAttributeValue } from '../../actions.js';
import { customNodeAttributes, definitionAttributes } from '../../content/portable.js';
import type { TextEditorAttributes, TextEditorAttributeValue } from '../../model.js';
import {
  customNodeClassName,
  isSupportedNode,
  type TextEditorNodeDefinition,
} from '../../nodes.js';
import type { TextEditorTiptapModules, TiptapExtensionLike, TiptapNodeLike } from './modules.js';
import {
  hiddenAttribute,
  nativeNodeName,
  type CustomNodeNames,
  type NodeViewProps,
  type TiptapNodeView,
} from './schema.js';

/** The attribute values of a node's attributes: every valid value but the identifier. */
const definitionValues = (attrs: Readonly<Record<string, unknown>>): TextEditorAttributes => {
  const values: Record<string, TextEditorAttributeValue> = {};
  for (const [key, value] of Object.entries(attrs))
    if (key !== 'id' && isTextEditorAttributeValue(value)) values[key] = value;
  return values;
};

/** The `data-` attributes of a custom node's values, as the HTML profile writes them. */
function dataAttributes(
  name: string,
  attrs: Readonly<Record<string, unknown>>,
  block: boolean,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [attribute, value] of customNodeAttributes(name, definitionValues(attrs), block))
    result[attribute] = value;
  return result;
}

/** The text an inline node shows: its definition's text, or nothing when that fails. */
function inlineNodeText(
  definition: TextEditorNodeDefinition & { readonly kind: 'inline' },
  attrs: Readonly<Record<string, unknown>>,
): string {
  try {
    const text: unknown = definition.text(definitionAttributes(definition, attrs) as never);
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

/** The class of a custom node's element, with a block's presentation role. */
const nodeClass = (definition: TextEditorNodeDefinition): string => customNodeClassName(definition);

/** Sets an element's `data-` attributes to the given ones, removing those it no longer has. */
function writeDataAttributes(element: HTMLElement, attributes: Readonly<Record<string, string>>) {
  for (const name of element.getAttributeNames())
    if (name.startsWith('data-') && !Object.hasOwn(attributes, name)) element.removeAttribute(name);
  for (const [name, value] of Object.entries(attributes))
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

const sameAttrs = (a: TiptapNodeLike, b: TiptapNodeLike): boolean =>
  JSON.stringify(a.attrs) === JSON.stringify(b.attrs);

/**
 * The view of a generated atom block or inline node: a host that is neither editable nor
 * draggable, holding the light DOM the definition's view renders, or an inline node's text.
 */
export function customNodeView(definition: TextEditorNodeDefinition) {
  const block = definition.kind === 'block';
  return (props: NodeViewProps): TiptapNodeView => {
    let current = props.node;
    const host = props.view.dom.ownerDocument.createElement(definition.element);
    host.className = nodeClass(definition);
    host.setAttribute('contenteditable', 'false');
    host.draggable = false;
    if (block) host.dir = 'auto';
    let cleanup: (() => void) | null = null;
    const release = () => {
      const run = cleanup;
      cleanup = null;
      try {
        run?.();
      } catch {
        // A failing cleanup leaves nothing else to release.
      }
    };
    const render = (node: TiptapNodeLike) => {
      writeDataAttributes(host, dataAttributes(definition.name, node.attrs, block));
      release();
      host.replaceChildren();
      try {
        const values = definitionAttributes(definition, node.attrs) as never;
        if (definition.view) {
          const result: unknown = definition.view(host, values);
          if (typeof result === 'function') cleanup = result as () => void;
        } else if (definition.kind === 'inline')
          host.textContent = inlineNodeText(definition, node.attrs);
      } catch {
        // A failing view leaves the host empty; the node keeps its value.
        host.replaceChildren();
      }
    };
    render(current);
    return {
      dom: host,
      update(node) {
        if (node.type !== current.type) return false;
        const changed = !sameAttrs(node, current);
        current = node;
        if (changed) render(node);
        return true;
      },
      // The host and what the view renders in it are never content of the engine.
      ignoreMutation: () => true,
      destroy: release,
    };
  };
}

/**
 * The generated node of a custom definition: a textblock, an atom block or an inline atom, with
 * its attributes stored and its element written as the HTML profile writes it.
 */
function generatedNode(modules: TextEditorTiptapModules, definition: TextEditorNodeDefinition) {
  const attributes = () =>
    Object.fromEntries(
      Object.entries(definition.attrs).map(([key, spec]) => [key, hiddenAttribute(spec.default)]),
    );
  const tag = definition.element;
  const className = nodeClass(definition);
  if (definition.kind === 'inline')
    return modules.core.Node.create({
      name: nativeNodeName(definition.name),
      group: 'inline',
      inline: true,
      atom: true,
      selectable: false,
      draggable: false,
      addAttributes: attributes,
      parseHTML: () => [{ tag: `${tag}[data-type="${definition.name}"]` }],
      renderHTML: ({ node }: { node: TiptapNodeLike }) => [
        tag,
        {
          class: className,
          contenteditable: 'false',
          ...dataAttributes(definition.name, node.attrs, false),
        },
        inlineNodeText(definition, node.attrs),
      ],
      addNodeView: () => customNodeView(definition),
    });
  const textblock = definition.content === 'inline';
  return modules.core.Node.create({
    name: nativeNodeName(definition.name),
    group: 'block',
    ...(textblock
      ? { content: 'inline*', defining: true }
      : { atom: true, selectable: true, addNodeView: () => customNodeView(definition) }),
    draggable: false,
    addAttributes: attributes,
    parseHTML: () => [{ tag: `${tag}[data-type="${definition.name}"]` }],
    renderHTML: ({ node }: { node: TiptapNodeLike }) => {
      const element = [
        tag,
        {
          class: className,
          dir: 'auto',
          ...(textblock ? {} : { contenteditable: 'false' }),
          ...dataAttributes(definition.name, node.attrs, true),
        },
      ];
      return textblock ? [...element, 0] : element;
    },
  });
}

/** The generated nodes of each core module, by definition. */
const generated = new WeakMap<object, WeakMap<TextEditorNodeDefinition, TiptapExtensionLike>>();

/** The generated node of a definition for a core module, built once. */
function generatedNodeOf(
  modules: TextEditorTiptapModules,
  definition: TextEditorNodeDefinition,
): TiptapExtensionLike {
  let byDefinition = generated.get(modules.core);
  if (!byDefinition) {
    byDefinition = new WeakMap();
    generated.set(modules.core, byDefinition);
  }
  let node = byDefinition.get(definition);
  if (!node) {
    node = generatedNode(modules, definition);
    byDefinition.set(definition, node);
  }
  return node;
}

/** The overrides renamed into the adapter's namespace, by override and engine name. */
const renamed = new WeakMap<object, Map<string, TiptapExtensionLike>>();

/** An override under the engine name of its definition, built once per override and name. */
function overrideOf(override: TiptapExtensionLike, name: string): TiptapExtensionLike {
  let byName = renamed.get(override);
  if (!byName) {
    byName = new Map();
    renamed.set(override, byName);
  }
  let node = byName.get(name);
  if (!node) {
    node = override.name === name ? override : override.extend({ name });
    byName.set(name, node);
  }
  return node;
}

/**
 * The extensions of the custom nodes of a mount and the engine names of its custom blocks: each
 * definition's override when the options give one, else its generated node, both under the
 * engine name of the definition (`nativeNodeName`).
 */
export function customNodeExtensions(
  modules: TextEditorTiptapModules,
  definitions: readonly TextEditorNodeDefinition[],
  overrides: Readonly<Record<string, TiptapExtensionLike>>,
): { readonly extensions: TiptapExtensionLike[]; readonly names: CustomNodeNames } {
  const extensions: TiptapExtensionLike[] = [];
  const blocks: string[] = [];
  for (const definition of definitions) {
    if (!isSupportedNode(definition, overrides)) continue;
    const override = Object.hasOwn(overrides, definition.name)
      ? overrides[definition.name]
      : undefined;
    const name = nativeNodeName(definition.name);
    extensions.push(override ? overrideOf(override, name) : generatedNodeOf(modules, definition));
    if (definition.kind === 'block') blocks.push(name);
  }
  return { extensions, names: { blocks } };
}
