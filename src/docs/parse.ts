/**
 * Reader of the library's documentation pages (`docs/components/<slug>.mdx` and
 * `docs/widgets/<slug>.mdx`): one page per published component or widget, written in a restricted
 * MDX that both renderings (Storybook and the website) compile natively while tooling reads it
 * here without an MDX compiler. The page contract:
 *
 * - YAML frontmatter with flat scalar and `[a, b]` fields: `title`, `description`, `tag`, `parts`.
 * - Markdown prose with `##` and `###` headings.
 * - Two self-closing elements and nothing else from MDX: `<Preview … />` (a live example whose
 *   `code` is both what renders and the copyable source, plus an optional `script`) and
 *   `<Keys keys="…" />` inside a Keyboard table. Multi-line attribute values are template
 *   literals (`code={`…`}`) that use only the escapes `` \` ``, `\$` and `\\`.
 * - No `import` or `export` statements: the renderings supply the two elements.
 *
 * The parser reads positions (which heading each preview sits under, which preview is the hero)
 * and the attribute grammar; the page rules themselves (section order, allowed headings, variant
 * coverage) are the documentation test's.
 */

export interface DocFrontmatter {
  readonly title: string;
  readonly description: string;
  /** The element whose page this is. */
  readonly tag: `tp-${string}`;
  /** Constituent elements documented on the same page, each with its own API block. */
  readonly parts: readonly string[];
}

export interface DocHeading {
  readonly depth: number;
  readonly text: string;
  /** The heading id both renderings derive from the text. */
  readonly slug: string;
  readonly line: number;
}

export interface DocPreview {
  /** Names the preview where a section shows several; a section's single preview has none. */
  readonly title?: string;
  readonly code: string;
  readonly script?: string;
  readonly align?: 'center' | 'start' | 'stretch';
  readonly language?: string;
  /** Block size of a scrolling example's own viewport. */
  readonly viewport?: string;
  /** The example is shown as source only (nothing visual to render). */
  readonly codeOnly?: boolean;
  /** Slug of the nearest heading above the preview; `null` before the first heading (the hero). */
  readonly afterHeading: string | null;
  readonly line: number;
}

export interface DocElement {
  readonly name: string;
  readonly line: number;
}

export interface ParsedDoc extends DocFrontmatter {
  readonly id: string;
  readonly section: 'components' | 'widgets';
  readonly slug: string;
  readonly headings: readonly DocHeading[];
  /** The first preview, when it comes before any heading. */
  readonly hero: DocPreview | null;
  /** Every preview in document order, hero included. */
  readonly previews: readonly DocPreview[];
  /** `variant` values the Variants section's previews use, in order; `null` without that section. */
  readonly variants: readonly string[] | null;
  readonly keyboard: boolean;
  /** Every MDX element the page uses, by name, with the line it starts on. */
  readonly elements: readonly DocElement[];
  /** Lines that start with `import` or `export` outside code fences. */
  readonly moduleStatements: readonly number[];
  /** The prose and headings with code fences, inline code and element tags removed. */
  readonly prose: string;
}

export class DocParseError extends Error {
  constructor(
    readonly id: string,
    readonly line: number,
    detail: string,
  ) {
    super(`${id}:${line}: ${detail}`);
    this.name = 'DocParseError';
  }
}

const PREVIEW_ATTRIBUTES = new Set([
  'title',
  'code',
  'script',
  'align',
  'language',
  'viewport',
  'codeOnly',
]);
const ALIGNMENTS = new Set(['center', 'start', 'stretch']);

/** The heading id the renderings produce: lowercase, punctuation dropped, spaces as hyphens. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** A page id (`components/badge`) from its file path under `docs/`. */
export function docId(file: string): string {
  const match = /(?:^|\/)docs\/(components|widgets)\/([^/]+)\.mdx$/.exec(file);
  if (!match) throw new Error(`${file} is not a documentation page path`);
  return `${match[1]}/${match[2]}`;
}

interface Frontmatter {
  readonly fields: Record<string, string | string[]>;
  readonly end: number;
}

function parseFrontmatter(lines: readonly string[], id: string): Frontmatter {
  if (lines[0] !== '---') throw new DocParseError(id, 1, 'the page must start with frontmatter');
  const fields: Record<string, string | string[]> = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line === '---') return { fields, end: index };
    if (!line.trim()) continue;
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!match) throw new DocParseError(id, index + 1, `unreadable frontmatter line: ${line}`);
    const [, key, raw] = match;
    const value = raw!.trim();
    if (value.startsWith('[')) {
      if (!value.endsWith(']'))
        throw new DocParseError(id, index + 1, `frontmatter list must close on its line: ${key}`);
      fields[key!] = value
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item.trim()))
        .filter(Boolean);
    } else fields[key!] = unquote(value);
  }
  throw new DocParseError(id, 1, 'frontmatter never closes');
}

const unquote = (value: string) =>
  /^(['"]).*\1$/.test(value) ? value.slice(1, -1).replace(/\\(["'])/g, '$1') : value;

interface Attribute {
  readonly value: string | true;
  readonly line: number;
}

/**
 * The attributes of a self-closing element starting at `start` (the `<` position), and the
 * position just after its `/>`.
 */
function readElement(
  source: string,
  start: number,
  id: string,
  lineAt: (offset: number) => number,
): { name: string; attributes: Map<string, Attribute>; end: number } {
  const nameMatch = /^<([A-Z][\w.]*)/.exec(source.slice(start));
  if (!nameMatch) throw new DocParseError(id, lineAt(start), 'malformed element');
  const name = nameMatch[1]!;
  let cursor = start + nameMatch[0].length;
  const attributes = new Map<string, Attribute>();
  for (;;) {
    const whitespace = /^\s*/.exec(source.slice(cursor))![0];
    cursor += whitespace.length;
    if (source.startsWith('/>', cursor)) return { name, attributes, end: cursor + 2 };
    if (source.startsWith('>', cursor))
      throw new DocParseError(id, lineAt(cursor), `<${name}> must be self-closing`);
    const attribute = /^([A-Za-z][\w-]*)/.exec(source.slice(cursor));
    if (!attribute)
      throw new DocParseError(id, lineAt(cursor), `unreadable attribute in <${name}>`);
    const attributeName = attribute[1]!;
    const line = lineAt(cursor);
    cursor += attributeName.length;
    if (!source.startsWith('=', cursor)) {
      attributes.set(attributeName, { value: true, line });
      continue;
    }
    cursor += 1;
    const quote = source[cursor];
    if (quote === '"' || quote === "'") {
      const close = source.indexOf(quote, cursor + 1);
      if (close === -1)
        throw new DocParseError(id, line, `unterminated ${attributeName} in <${name}>`);
      attributes.set(attributeName, { value: source.slice(cursor + 1, close), line });
      cursor = close + 1;
      continue;
    }
    if (quote !== '{')
      throw new DocParseError(id, line, `${attributeName} in <${name}> needs a quoted value`);
    if (source.startsWith('{true}', cursor)) {
      attributes.set(attributeName, { value: true, line });
      cursor += '{true}'.length;
      continue;
    }
    if (source.startsWith('{"', cursor)) {
      // A one-line string literal, as the literal-code plugin rewrites template literals.
      const close = /^"(?:\\.|[^"\\])*"/.exec(source.slice(cursor + 1));
      if (!close || !source.startsWith('}', cursor + 1 + close[0].length))
        throw new DocParseError(id, line, `unreadable ${attributeName} in <${name}>`);
      attributes.set(attributeName, { value: JSON.parse(close[0]) as string, line });
      cursor += 1 + close[0].length + 1;
      continue;
    }
    if (!source.startsWith('{`', cursor))
      throw new DocParseError(
        id,
        line,
        `${attributeName} in <${name}> must be a string or a template literal`,
      );
    const literal = readTemplateLiteral(source, cursor + 2, id, line, `${name} ${attributeName}`);
    if (!source.startsWith('}', literal.end))
      throw new DocParseError(id, line, `${attributeName} in <${name}> does not close its braces`);
    attributes.set(attributeName, { value: literal.value, line });
    cursor = literal.end + 1;
  }
}

/** The unescaped text of a template literal whose content starts at `start`, and the position after its closing backtick. */
function readTemplateLiteral(
  source: string,
  start: number,
  id: string,
  line: number,
  what: string,
): { value: string; end: number } {
  let value = '';
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const character = source[cursor]!;
    if (character === '`') return { value, end: cursor + 1 };
    if (character === '$' && source[cursor + 1] === '{')
      throw new DocParseError(id, line, `${what} must not interpolate (escape the dollar sign)`);
    if (character !== '\\') {
      value += character;
      continue;
    }
    const escaped = source[cursor + 1];
    if (escaped !== '`' && escaped !== '$' && escaped !== '\\')
      throw new DocParseError(
        id,
        line,
        `${what} may only escape backticks, dollar signs and backslashes`,
      );
    value += escaped;
    cursor += 1;
  }
  throw new DocParseError(id, line, `${what} never closes its template literal`);
}

/** Replaces fenced code blocks with blank lines of the same count, so positions keep their lines. */
function blankFences(body: string): string {
  return body.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, (fence) =>
    fence.replace(/[^\n]/g, ''),
  );
}

/** Reads one documentation page. `id` is its page id, `components/badge`. */
export function parseDoc(source: string, id: string): ParsedDoc {
  const [section, slug] = id.split('/') as ['components' | 'widgets', string];
  if ((section !== 'components' && section !== 'widgets') || !slug)
    throw new Error(`${id} is not a page id`);
  const text = source.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const frontmatter = parseFrontmatter(lines, id);
  const field = (name: string): string => {
    const value = frontmatter.fields[name];
    if (typeof value !== 'string' || !value)
      throw new DocParseError(id, 1, `frontmatter needs a ${name}`);
    return value;
  };
  const tag = field('tag');
  if (!tag.startsWith('tp-')) throw new DocParseError(id, 1, `tag must be a tp- element: ${tag}`);
  const partsField = frontmatter.fields.parts ?? [];
  if (!Array.isArray(partsField)) throw new DocParseError(id, 1, 'parts must be a list');
  for (const key of Object.keys(frontmatter.fields))
    if (!['title', 'description', 'tag', 'parts'].includes(key))
      throw new DocParseError(id, 1, `unknown frontmatter field: ${key}`);

  // Offsets of the body are offsets of the whole text, so lines stay right.
  const bodyStart = lines.slice(0, frontmatter.end + 1).join('\n').length + 1;
  const body = blankFences(text.slice(bodyStart));
  const lineStarts = [0];
  for (let index = 0; index < text.length; index += 1)
    if (text[index] === '\n') lineStarts.push(index + 1);
  const lineAt = (offset: number) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (lineStarts[middle]! <= offset) low = middle;
      else high = middle - 1;
    }
    return low + 1;
  };

  const headings: DocHeading[] = [];
  const bodyLines = body.split('\n');
  bodyLines.forEach((line, index) => {
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading)
      headings.push({
        depth: heading[1]!.length,
        text: heading[2]!,
        slug: slugify(heading[2]!),
        line: index + frontmatter.end + 2,
      });
  });

  const elements: DocElement[] = [];
  const previews: DocPreview[] = [];
  const consumed: [number, number][] = [];
  // Inline code never holds an element, and a code fence was blanked already.
  const scannable = body.replace(/`[^`\n]*`/g, (code) => ' '.repeat(code.length));
  for (const match of scannable.matchAll(/<[A-Z][\w.]*(?=[\s/>])/g)) {
    const start = bodyStart + match.index;
    const element = readElement(text, start, id, lineAt);
    const line = lineAt(start);
    elements.push({ name: element.name, line });
    consumed.push([match.index, element.end - bodyStart]);
    if (element.name !== 'Preview') continue;
    for (const [name, attribute] of element.attributes) {
      if (!PREVIEW_ATTRIBUTES.has(name))
        throw new DocParseError(id, attribute.line, `unknown Preview attribute: ${name}`);
      if (name === 'codeOnly' ? attribute.value !== true : attribute.value === true)
        throw new DocParseError(id, attribute.line, `Preview ${name} has the wrong value form`);
    }
    const stringAttribute = (name: string) => {
      const value = element.attributes.get(name)?.value;
      return typeof value === 'string' ? value : undefined;
    };
    const title = stringAttribute('title');
    const code = stringAttribute('code');
    if (code === undefined) throw new DocParseError(id, line, 'Preview needs code');
    const align = stringAttribute('align');
    if (align !== undefined && !ALIGNMENTS.has(align))
      throw new DocParseError(id, line, `Preview align must be center, start or stretch`);
    const above = headings.filter((heading) => heading.line < line).at(-1);
    const script = stringAttribute('script');
    const language = stringAttribute('language');
    const viewport = stringAttribute('viewport');
    const preview: {
      -readonly [Key in keyof DocPreview]: DocPreview[Key];
    } = { code, afterHeading: above?.slug ?? null, line };
    if (title !== undefined) preview.title = title;
    if (script !== undefined) preview.script = script;
    if (align !== undefined) preview.align = align as NonNullable<DocPreview['align']>;
    if (language !== undefined) preview.language = language;
    if (viewport !== undefined) preview.viewport = viewport;
    if (element.attributes.has('codeOnly')) preview.codeOnly = true;
    previews.push(preview);
  }
  // The page without its elements, lines kept, so statements inside an attribute do not count.
  const consumedRanges = consumed.sort((a, b) => a[0] - b[0]);
  let prose = '';
  let cursor = 0;
  for (const [start, end] of consumedRanges) {
    prose += scannable.slice(cursor, start) + scannable.slice(start, end).replace(/[^\n]/g, '');
    cursor = end;
  }
  prose += scannable.slice(cursor);
  const moduleStatements: number[] = [];
  prose.split('\n').forEach((line, index) => {
    if (/^(?:import|export)\b/.test(line)) moduleStatements.push(index + frontmatter.end + 2);
  });

  const variantsHeading = headings.find(
    (heading) => heading.depth === 3 && heading.slug === 'variants',
  );
  const variants = variantsHeading
    ? previews
        .filter((preview) => preview.afterHeading === variantsHeading.slug)
        .flatMap((preview) =>
          [...preview.code.matchAll(/\svariant="([^"]*)"/g)].map((match) => match[1]!),
        )
    : null;

  return {
    id,
    section,
    slug,
    title: field('title'),
    description: field('description'),
    tag: tag as `tp-${string}`,
    parts: partsField,
    headings,
    hero: previews[0]?.afterHeading === null ? previews[0] : null,
    previews,
    variants,
    keyboard: headings.some((heading) => heading.depth === 2 && heading.slug === 'keyboard'),
    elements,
    moduleStatements,
    prose,
  };
}
