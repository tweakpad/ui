import { lex, type Grammar, type LexRule, type RawToken } from '../lexer.js';

const KEYWORDS = new Set(
  (
    'if then else elif fi for while until do done case esac in function select return exit ' +
    'export local readonly declare unset source time break continue'
  ).split(' '),
);
/** Keywords after which the next word is a command again. */
const COMMAND_KEYWORDS = new Set(['then', 'else', 'do', 'time', '!']);

/**
 * Shell commands. The first word of a command (at line start, after `|`, `;`, `&&`, `||`, `(`,
 * a console `$ ` prompt or a control keyword) is a function; options are attributes.
 */
export const bash: Grammar = (code) => {
  let command = true;
  const word: LexRule = {
    match(source, offset): RawToken[] | null {
      const match = /[A-Za-z0-9_./~@%+:,-][\w./~@%+:,=-]*/y;
      match.lastIndex = offset;
      const text = match.exec(source)?.[0];
      if (!text) return null;
      const previous = source[offset - 1];
      const separated = previous === undefined || /\s/.test(previous);
      let scope: RawToken['scope'];
      if (separated && /^--?[A-Za-z]/.test(text)) scope = 'attribute';
      else if (KEYWORDS.has(text) && (command || text === 'in')) scope = 'keyword';
      else if (command) scope = 'function';
      command = COMMAND_KEYWORDS.has(text) && scope === 'keyword';
      return [{ text, scope }];
    },
  };
  const rules: LexRule[] = [
    {
      match(source, offset) {
        // A console prompt at the start of a line.
        if (offset !== 0 && source[offset - 1] !== '\n') return null;
        const prompt = /\$ (?=\S)/y;
        prompt.lastIndex = offset;
        const text = prompt.exec(source)?.[0];
        if (!text) return null;
        command = true;
        return [{ text, scope: 'punctuation' }];
      },
    },
    {
      match(source, offset) {
        const space = /[ \t]+|\n/y;
        space.lastIndex = offset;
        const text = space.exec(source)?.[0];
        if (!text) return null;
        if (text === '\n') command = true;
        return [{ text }];
      },
    },
    {
      match(source, offset) {
        const previous = source[offset - 1];
        if (source[offset] !== '#' || (previous !== undefined && !/\s/.test(previous))) return null;
        const end = source.indexOf('\n', offset);
        return [{ text: source.slice(offset, end < 0 ? source.length : end), scope: 'comment' }];
      },
    },
    { scope: 'string', pattern: /"(?:\\[\s\S]|[^"\\])*"?|'[^']*'?/y },
    { scope: 'variable', pattern: /\$\{[^}\n]*\}?|\$[A-Za-z_]\w*|\$[0-9@#?$!*-]/y },
    {
      match(source, offset) {
        const operator = /&&|\|\||[|;&()<>]+/y;
        operator.lastIndex = offset;
        const text = operator.exec(source)?.[0];
        if (!text) return null;
        command = /^(?:&&|\|\||[|;&(])$/.test(text);
        return [{ text, scope: 'operator' }];
      },
    },
    word,
  ];
  return lex(code, rules);
};
