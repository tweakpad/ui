import type { ApiMember } from '../src/docs/api.js';
import { signatureTokens, type ApiToken } from '../src/docs/api-types.js';
import { types } from './types.js';

const escape = (text: string) =>
  text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

/**
 * Tokens as HTML for an args table description (Markdown with inline HTML): each piece colored
 * by its syntax role, each project type name a button that opens its card (`TypeCard`). The
 * Markdown renderer trims leading whitespace, so spaces end the piece before them.
 */
export function tokensHtml(tokens: readonly ApiToken[]): string {
  const pieces: { token: ApiToken; html: string }[] = [];
  for (const token of tokens) {
    const last = pieces.at(-1);
    const lead = /^\s*/u.exec(token.text)![0];
    const rest = escape(token.text.slice(lead.length));
    // Leading whitespace joins the plain piece before it; after a type button it becomes a
    // non-breaking space, the one the renderer keeps.
    if (lead && last && !last.token.ref) last.html += lead;
    const html = lead && last?.token.ref ? `&nbsp;${rest}` : last ? rest : escape(token.text);
    if (html) pieces.push({ token, html });
  }
  return pieces
    .map(({ token, html }) => {
      const color = token.scope ? ` style="color: var(--tp-syntax-${token.scope})"` : '';
      return token.ref
        ? `<button type="button" class="tp-docs-type-ref" data-tp-ref="${token.ref}"${color}>${html}</button>`
        : `<span${color}>${html}</span>`;
    })
    .join('');
}

/** A signature of `tag` as one line of clickable tokens, for an args table description. */
export function signatureHtml(tag: string, code: string): string {
  return code
    ? `<span class="tp-docs-signature">${tokensHtml(signatureTokens(types, tag, code))}</span>`
    : '';
}

/**
 * A Properties row's description: the attribute that sets it, what it does, read-only state and
 * its type as the compiler declares it, one line whose type names open their cards. Storybook's
 * own type chip stays empty, so the type shows once and never widens the table.
 */
export function memberDescription(row: ApiMember, tag: string): string {
  return [
    row.attribute ? `Attribute \`${row.attribute}\`` : '',
    row.description,
    row.readonly ? 'Read-only.' : '',
    signatureHtml(tag, row.type),
  ]
    .filter(Boolean)
    .join('\n\n');
}
