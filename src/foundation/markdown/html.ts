/**
 * Raw HTML grammar (CommonMark §6.6) and the restricted tag lexer (Foundation §18.16). Raw HTML is
 * never parsed as markup: the lexer only recognizes tags, attributes and text so the resolve step
 * can admit elements from the element policy and keep everything else as literal text.
 */
import { decodeEntities } from './entities.js';

const TAG_NAME = '[A-Za-z][A-Za-z0-9-]*';
const ATTRIBUTE_NAME = '[a-zA-Z_:][a-zA-Z0-9:._-]*';
const ATTRIBUTE_VALUE = `(?:[^"'=<>\`\\x00-\\x20]+|'[^']*'|"[^"]*")`;
const ATTRIBUTE = `(?:\\s+${ATTRIBUTE_NAME}(?:\\s*=\\s*${ATTRIBUTE_VALUE})?)`;
export const OPEN_TAG = `<${TAG_NAME}${ATTRIBUTE}*\\s*/?>`;
export const CLOSE_TAG = `</${TAG_NAME}\\s*>`;
const COMMENT = '<!-->|<!--->|<!--[\\s\\S]*?-->';
const PROCESSING = '<[?][\\s\\S]*?[?]>';
const DECLARATION = '<![A-Za-z]+[^>]*>';
const CDATA = '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>';

/** One raw inline HTML construct at the start of the input. */
export const HTML_TAG = new RegExp(
  `^(?:${OPEN_TAG}|${CLOSE_TAG}|${COMMENT}|${PROCESSING}|${DECLARATION}|${CDATA})`,
);

/** HTML block start conditions 1 to 7 and end conditions 1 to 5 (CommonMark §4.6). */
export const HTML_BLOCK_OPEN: readonly RegExp[] = [
  /^$/,
  /^<(?:script|pre|textarea|style)(?:\s|>|$)/i,
  /^<!--/,
  /^<[?]/,
  /^<![A-Za-z]/,
  /^<!\[CDATA\[/,
  /^<[/]?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[123456]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|[/]?[>]|$)/i,
  new RegExp(`^(?:${OPEN_TAG}|${CLOSE_TAG})\\s*$`),
];
export const HTML_BLOCK_CLOSE: readonly RegExp[] = [
  /^$/,
  /<\/(?:script|pre|textarea|style)>/i,
  /-->/,
  /\?>/,
  />/,
  /\]\]>/,
];

export type HtmlToken =
  | {
      readonly kind: 'open';
      readonly name: string;
      readonly attributes: readonly (readonly [string, string])[];
      readonly selfClosing: boolean;
      readonly raw: string;
    }
  | { readonly kind: 'close'; readonly name: string; readonly raw: string }
  | { readonly kind: 'comment'; readonly raw: string }
  | { readonly kind: 'other'; readonly raw: string }
  | { readonly kind: 'text'; readonly value: string; readonly raw: string };

const OPEN = new RegExp(`^${OPEN_TAG}`);
const CLOSE = new RegExp(`^${CLOSE_TAG}`);
const COMMENT_AT = new RegExp(`^(?:${COMMENT})`);
const OTHER_AT = new RegExp(`^(?:${PROCESSING}|${DECLARATION}|${CDATA})`);
const ATTRIBUTES = new RegExp(`\\s+(${ATTRIBUTE_NAME})(?:\\s*=\\s*(${ATTRIBUTE_VALUE}))?`, 'g');

function openToken(raw: string): HtmlToken {
  const name = /^<([A-Za-z][A-Za-z0-9-]*)/.exec(raw)![1]!.toLowerCase();
  const attributes: (readonly [string, string])[] = [];
  const body = raw.slice(name.length + 1).replace(/\s*\/?>$/, '');
  for (const match of body.matchAll(ATTRIBUTES)) {
    let value = match[2] ?? '';
    if (/^["']/.test(value)) value = value.slice(1, -1);
    attributes.push([match[1]!.toLowerCase(), decodeEntities(value)]);
  }
  return { kind: 'open', name, attributes, selfClosing: /\/>$/.test(raw), raw };
}

/** Splits raw HTML into tags, comments, other constructs and text; never builds markup. */
export function lexHtml(source: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  let text = '';
  const flush = (): void => {
    if (text) tokens.push({ kind: 'text', value: decodeEntities(text), raw: text });
    text = '';
  };
  let index = 0;
  while (index < source.length) {
    const next = source.indexOf('<', index);
    if (next < 0) {
      text += source.slice(index);
      break;
    }
    text += source.slice(index, next);
    const rest = source.slice(next);
    const match =
      OPEN.exec(rest) ?? CLOSE.exec(rest) ?? COMMENT_AT.exec(rest) ?? OTHER_AT.exec(rest);
    if (!match) {
      text += '<';
      index = next + 1;
      continue;
    }
    flush();
    const raw = match[0];
    if (raw.startsWith('</'))
      tokens.push({ kind: 'close', name: raw.slice(2).replace(/\s*>$/, '').toLowerCase(), raw });
    else if (raw.startsWith('<!--')) tokens.push({ kind: 'comment', raw });
    else if (/^<[A-Za-z]/.test(raw)) tokens.push(openToken(raw));
    else tokens.push({ kind: 'other', raw });
    index = next + raw.length;
  }
  flush();
  return tokens;
}

/** Elements that never have content (HTML void elements). */
export const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
