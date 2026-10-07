import { lex, type Grammar, type LexRule } from '../lexer.js';

const rules: LexRule[] = [
  { pattern: /\s+/y },
  // JSONC comments; plain JSON never contains them, so one grammar serves both.
  { scope: 'comment', pattern: /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y },
  { scope: 'property', pattern: /"(?:\\.|[^"\\\n])*"(?=\s*:)/y },
  { scope: 'string', pattern: /"(?:\\.|[^"\\\n])*"?/y },
  { scope: 'number', pattern: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y },
  { scope: 'constant', pattern: /\b(?:true|false|null)\b/y },
  { scope: 'punctuation', pattern: /[{}[\],:]/y },
];

export const json: Grammar = (code) => lex(code, rules);
