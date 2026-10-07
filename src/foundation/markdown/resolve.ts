/**
 * The shared resolve step (Foundation §18.16), applied to every tree whatever parser produced it:
 * raw HTML becomes element and text nodes under the element policy, links and images pass the URL
 * policy, GitHub alerts become alert nodes, footnotes are numbered by first reference, and every
 * heading receives an identifier. The input tree is not modified.
 */
import { lexHtml, VOID_ELEMENTS, type HtmlToken } from './html.js';
import { inlineText, normalizeLabel } from './inline.js';
import { Slugger } from './slug.js';
import { allowedUrl, imageProtocols, linkProtocols } from './url.js';
import type {
  MarkdownAlertKind,
  MarkdownBlock,
  MarkdownContent,
  MarkdownDiagnostic,
  MarkdownElement,
  MarkdownElementPolicy,
  MarkdownFootnoteDefinition,
  MarkdownInline,
  MarkdownNode,
  MarkdownRoot,
  MarkdownUrlPolicy,
} from './types.js';

/** Default element policy: inline formatting and disclosure, with `title`, `lang` and `dir`. */
export const DEFAULT_MARKDOWN_ELEMENTS: MarkdownElementPolicy = {
  '*': ['title', 'lang', 'dir'],
  abbr: [],
  b: [],
  br: [],
  del: [],
  details: ['open'],
  em: [],
  i: [],
  ins: [],
  kbd: [],
  mark: [],
  s: [],
  small: [],
  strong: [],
  sub: [],
  summary: [],
  sup: [],
  u: [],
};

const ALWAYS_REMOVED = /^(?:on|style$|srcdoc$)/;
const LINK_ATTRIBUTES = new Set(['href', 'action', 'formaction', 'cite', 'xlink:href', 'data']);
const IMAGE_ATTRIBUTES = new Set(['src', 'poster', 'srcset']);
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/i;

export interface ResolveOptions {
  readonly elements?: MarkdownElementPolicy | null;
  readonly urls?: MarkdownUrlPolicy | null;
  readonly idPrefix?: string;
}

export interface ResolvedMarkdown {
  readonly root: MarkdownRoot;
  readonly diagnostics: readonly MarkdownDiagnostic[];
}

type AnyNode = MarkdownNode & { children?: unknown[]; value?: string };

/** Merges a consumer element policy over the default one; `false` removes a tag. */
export function mergeElementPolicy(
  policy: MarkdownElementPolicy | null | undefined,
): Map<string, Set<string>> {
  const merged = new Map<string, Set<string>>();
  for (const source of [DEFAULT_MARKDOWN_ELEMENTS, policy ?? {}])
    for (const [tag, attributes] of Object.entries(source)) {
      const name = tag.toLowerCase();
      if (attributes === false) merged.delete(name);
      else
        merged.set(
          name,
          new Set([...(merged.get(name) ?? []), ...attributes.map((a) => a.toLowerCase())]),
        );
    }
  return merged;
}

class Resolver {
  readonly diagnostics: MarkdownDiagnostic[] = [];
  readonly #policy: Map<string, Set<string>>;
  readonly #links: readonly string[];
  readonly #images: readonly string[];
  readonly #slugger: Slugger;
  readonly #prefix: string;
  readonly #definitions = new Map<string, { url: string; title: string | null }>();
  readonly #footnotes = new Map<string, MarkdownFootnoteDefinition>();
  readonly #order: MarkdownFootnoteDefinition[] = [];

  constructor(options: ResolveOptions) {
    this.#policy = mergeElementPolicy(options.elements);
    this.#links = linkProtocols(options.urls);
    this.#images = imageProtocols(options.urls);
    this.#prefix = options.idPrefix ?? '';
    this.#slugger = new Slugger(this.#prefix);
  }

  resolve(root: MarkdownRoot): MarkdownRoot {
    this.#collect(root as AnyNode);
    const children = this.#blocks(root.children as AnyNode[]);
    // Definitions referenced from other definitions join the order while it is walked.
    const contents: MarkdownBlock[][] = [];
    for (let index = 0; index < this.#order.length; index++)
      contents.push(this.#blocks(this.#order[index]!.children as AnyNode[]));
    const footnotes = this.#order.map((definition, index) => ({
      ...definition,
      children: contents[index]!,
    }));
    if (footnotes.length) children.push({ type: 'footnotes', children: footnotes });
    return { ...root, children };
  }

  #diagnostic(code: string, message: string): void {
    this.diagnostics.push({ code, message });
  }

  /** Link definitions (adapter trees) and footnote definitions anywhere in the tree. */
  #collect(node: AnyNode): void {
    const record = node as unknown as Record<string, unknown>;
    if (node.type === ('definition' as string)) {
      const id = normalizeLabel(String(record.identifier ?? record.label ?? ''));
      if (id && !this.#definitions.has(id))
        this.#definitions.set(id, {
          url: String(record.url ?? ''),
          title: (record.title as string) ?? null,
        });
    } else if (node.type === 'footnoteDefinition') {
      const id = normalizeLabel(node.identifier || node.label);
      if (!this.#footnotes.has(id)) this.#footnotes.set(id, node);
    }
    if (Array.isArray(node.children))
      for (const child of node.children) this.#collect(child as AnyNode);
  }

  /**
   * Block content. An allowed open tag in an HTML block stays open across the following sibling
   * blocks until its close tag, so `<details>` can wrap markdown content.
   */
  #blocks(nodes: readonly AnyNode[]): MarkdownBlock[] {
    const out: MarkdownContent[] = [];
    const stack: Frame[] = [];
    const target = (): MarkdownContent[] => stack.at(-1)?.element.children ?? out;
    const place = (tokens: HtmlToken[]): void => {
      const inline = this.#html(tokens);
      if (!inline.some((node) => node.type !== 'text' || node.value.trim())) return;
      if (stack.length) target().push(...inline);
      else out.push({ type: 'paragraph', children: inline });
    };
    for (const node of nodes) {
      if (node.type === 'footnoteDefinition' || node.type === ('definition' as string)) continue;
      if (node.type !== 'html') {
        const resolved = this.#block(node);
        if (resolved) target().push(resolved);
        continue;
      }
      let pending: HtmlToken[] = [];
      for (const token of lexHtml(node.value ?? '')) {
        if (this.#opens(token)) {
          place(pending);
          pending = [];
          stack.push({ element: this.#element(token), out: target() });
          continue;
        }
        if (token.kind === 'close' && stack.some((frame) => frame.element.tagName === token.name)) {
          place(pending);
          pending = [];
          closeFrame(stack, token.name, out);
          continue;
        }
        pending.push(token);
      }
      place(pending);
    }
    while (stack.length) unwind(stack.pop()!, out);
    return out as MarkdownBlock[];
  }

  #opens(token: HtmlToken): token is Extract<HtmlToken, { kind: 'open' }> {
    return (
      token.kind === 'open' &&
      !token.selfClosing &&
      !VOID_ELEMENTS.has(token.name) &&
      this.#policy.has(token.name)
    );
  }

  #block(node: AnyNode): MarkdownBlock | null {
    switch (node.type) {
      case 'paragraph': {
        const children = this.#inlines(node.children as AnyNode[]);
        return { ...node, children } as MarkdownBlock;
      }
      case 'heading': {
        const children = this.#inlines(node.children as AnyNode[]);
        return { ...node, children, identifier: this.#slugger.slug(inlineText(children)) };
      }
      case 'blockquote': {
        const alert = this.#alert(node);
        if (alert) return alert;
        return { ...node, children: this.#blocks(node.children as AnyNode[]) } as MarkdownBlock;
      }
      case 'list':
        return {
          ...node,
          children: (node.children as AnyNode[]).map((item) => ({
            ...item,
            children: this.#blocks((item.children ?? []) as AnyNode[]),
          })),
        } as MarkdownBlock;
      case 'table':
        return {
          ...node,
          children: (node.children as AnyNode[]).map((row) => ({
            ...row,
            children: (row.children as AnyNode[]).map((cell) => ({
              ...cell,
              children: this.#inlines((cell.children ?? []) as AnyNode[]),
            })),
          })),
        } as MarkdownBlock;
      case 'code':
      case 'thematicBreak':
        return node as MarkdownBlock;
      default:
        return this.#unknown(node) as MarkdownBlock;
    }
  }

  /** A node of an unknown type keeps its resolved children, or its value as text. */
  #unknown(node: AnyNode): MarkdownContent {
    if (Array.isArray(node.children))
      return { ...node, children: this.#mixed(node.children as AnyNode[]) } as MarkdownContent;
    return node as MarkdownContent;
  }

  #mixed(nodes: AnyNode[]): MarkdownContent[] {
    return nodes.some((node) => isBlockType(node.type))
      ? this.#blocks(nodes)
      : this.#inlines(nodes);
  }

  #alert(node: AnyNode): MarkdownBlock | null {
    const first = (node.children as AnyNode[] | undefined)?.[0];
    const text = first?.type === 'paragraph' ? (first.children as AnyNode[])[0] : undefined;
    const match = text?.type === 'text' ? ALERT.exec(text.value ?? '') : null;
    if (!first || !text || !match) return null;
    const rest = (text.value ?? '').slice(match[0].length);
    const paragraph = (first.children as AnyNode[]).slice(1);
    if (rest) paragraph.unshift({ ...text, value: rest } as AnyNode);
    const children = [...(node.children as AnyNode[]).slice(1)];
    if (paragraph.length) children.unshift({ ...first, children: paragraph } as AnyNode);
    return {
      type: 'alert',
      kind: match[1]!.toLowerCase() as MarkdownAlertKind,
      children: this.#blocks(children),
      ...(node.position ? { position: node.position } : {}),
    };
  }

  #inlines(nodes: readonly AnyNode[]): MarkdownInline[] {
    const out: MarkdownContent[] = [];
    const stack: Frame[] = [];
    const target = (): MarkdownContent[] => stack.at(-1)?.element.children ?? out;
    for (const node of nodes) {
      if (node.type !== 'html') {
        target().push(...this.#inline(node));
        continue;
      }
      for (const token of lexHtml(node.value ?? '')) {
        if (this.#opens(token)) stack.push({ element: this.#element(token), out: target() });
        else if (!(token.kind === 'close' && closeFrame(stack, token.name, null)))
          target().push(...this.#html([token]));
      }
    }
    while (stack.length) unwind(stack.pop()!, null);
    return out as MarkdownInline[];
  }

  #inline(node: AnyNode): MarkdownInline[] {
    const record = node as unknown as Record<string, unknown>;
    switch (node.type) {
      case 'text':
      case 'inlineCode':
      case 'break':
        return [node as MarkdownInline];
      case 'emphasis':
      case 'strong':
      case 'delete':
        return [{ ...node, children: this.#inlines(node.children as AnyNode[]) } as MarkdownInline];
      case 'link': {
        const children = this.#inlines(node.children as AnyNode[]);
        if (!allowedUrl(node.url, this.#links)) {
          this.#diagnostic('markdown-url', `Blocked link destination "${node.url}".`);
          return children;
        }
        return [{ ...node, children }];
      }
      case 'image':
        if (!allowedUrl(node.url, this.#images)) {
          this.#diagnostic('markdown-url', `Blocked image source "${node.url}".`);
          return node.alt ? [{ type: 'text', value: node.alt }] : [];
        }
        return [node];
      case 'footnoteReference':
        return [this.#footnoteReference(node)];
      default:
        if (
          (node.type as string) === 'linkReference' ||
          (node.type as string) === 'imageReference'
        ) {
          const definition = this.#definitions.get(
            normalizeLabel(String(record.identifier ?? record.label ?? '')),
          );
          const image = (node.type as string) === 'imageReference';
          if (!definition) {
            const label = String(record.label ?? record.identifier ?? '');
            return [
              { type: 'text', value: image ? `![${String(record.alt ?? label)}]` : `[${label}]` },
            ];
          }
          const resolved = image
            ? {
                type: 'image',
                url: definition.url,
                title: definition.title,
                alt: String(record.alt ?? ''),
              }
            : {
                type: 'link',
                url: definition.url,
                title: definition.title,
                children: node.children ?? [],
              };
          return this.#inline(resolved as AnyNode);
        }
        return [this.#unknown(node) as MarkdownInline];
    }
  }

  #footnoteReference(node: AnyNode & { identifier?: string; label?: string }): MarkdownInline {
    const id = normalizeLabel(node.identifier || node.label || '');
    const definition = this.#footnotes.get(id);
    if (!definition) return { type: 'text', value: `[^${node.label ?? node.identifier ?? ''}]` };
    let entry = this.#order.find((item) => normalizeLabel(item.identifier || item.label) === id);
    if (!entry) {
      entry = { ...definition, index: this.#order.length + 1, references: 0 };
      this.#order.push(entry);
    }
    entry.references = (entry.references ?? 0) + 1;
    return {
      type: 'footnoteReference',
      identifier: definition.identifier,
      label: definition.label,
      index: entry.index!,
      occurrence: entry.references,
    };
  }

  #element(token: Extract<HtmlToken, { kind: 'open' }>): MarkdownElement {
    const allowed = new Set([
      ...(this.#policy.get('*') ?? []),
      ...(this.#policy.get(token.name) ?? []),
    ]);
    const attributes: Record<string, string> = {};
    for (const [name, value] of token.attributes) {
      if (ALWAYS_REMOVED.test(name) || !allowed.has(name)) continue;
      const protocols = LINK_ATTRIBUTES.has(name)
        ? this.#links
        : IMAGE_ATTRIBUTES.has(name)
          ? this.#images
          : null;
      if (protocols && !allowedUrl(value, protocols)) {
        this.#diagnostic('markdown-url', `Blocked ${name} "${value}" on <${token.name}>.`);
        continue;
      }
      attributes[name] = value;
    }
    return { type: 'element', tagName: token.name, attributes, children: [] };
  }

  /** Tokens outside the policy as literal text; allowed void/self-closing tags as elements. */
  #html(tokens: readonly HtmlToken[]): MarkdownInline[] {
    const out: MarkdownInline[] = [];
    for (const token of tokens) {
      if (token.kind === 'comment') continue;
      if (
        token.kind === 'open' &&
        this.#policy.has(token.name) &&
        (token.selfClosing || VOID_ELEMENTS.has(token.name))
      ) {
        out.push(this.#element(token));
        continue;
      }
      if (token.kind === 'open' || token.kind === 'close')
        this.#diagnostic(
          'markdown-element',
          `<${token.name}> is not in the element policy; shown as text.`,
        );
      const value = token.kind === 'text' ? token.value : token.raw;
      const last = out.at(-1);
      if (last?.type === 'text') last.value += value;
      else out.push({ type: 'text', value });
    }
    return out;
  }
}

interface Frame {
  readonly element: MarkdownElement;
  readonly out: MarkdownContent[];
}

/** Closes the innermost open element named `name`; inner open elements unwind as text. */
function closeFrame(stack: Frame[], name: string, root: MarkdownContent[] | null): boolean {
  let index = stack.length - 1;
  while (index >= 0 && stack[index]!.element.tagName !== name) index--;
  if (index < 0) return false;
  while (stack.length > index + 1) unwind(stack.pop()!, root);
  const { element, out } = stack.pop()!;
  out.push(element);
  return true;
}

/** An element left open shows its open tag as text; its content returns to the parent. */
function unwind({ element, out }: Frame, root: MarkdownContent[] | null): void {
  const content: MarkdownContent[] = [
    { type: 'text', value: rawOpenTag(element) },
    ...element.children,
  ];
  if (out !== root) {
    out.push(...content);
    return;
  }
  // Block level: runs of inline content become paragraphs.
  let run: MarkdownInline[] | null = null;
  for (const node of content) {
    if (isBlockType(node.type) || node.type === 'alert' || node.type === 'footnotes') {
      run = null;
      out.push(node);
    } else if (run) run.push(node as MarkdownInline);
    else {
      run = [node as MarkdownInline];
      out.push({ type: 'paragraph', children: run });
    }
  }
}

function isBlockType(type: string): boolean {
  return [
    'paragraph',
    'heading',
    'thematicBreak',
    'blockquote',
    'list',
    'code',
    'table',
    'html',
  ].includes(type);
}

function rawOpenTag(element: MarkdownElement): string {
  const attributes = Object.entries(element.attributes)
    .map(([name, value]) => ` ${name}="${value}"`)
    .join('');
  return `<${element.tagName}${attributes}>`;
}

/** Runs the shared resolve step over a parsed tree. */
export function resolveMarkdown(
  root: MarkdownRoot,
  options: ResolveOptions = {},
): ResolvedMarkdown {
  const resolver = new Resolver(options);
  return { root: resolver.resolve(root), diagnostics: resolver.diagnostics };
}

/** Whether a value has the shape of a tree root, for validating parser adapter output. */
export function isMarkdownRoot(value: unknown): value is MarkdownRoot {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'root' &&
    Array.isArray((value as { children?: unknown }).children)
  );
}
