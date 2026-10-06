import type { PresentationRule } from '../../resolver.js';

/** The fill layer of every compound selector in a list (`&` is the part). */
function layer(selector: string): string {
  const entries: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < selector.length; index++) {
    const character = selector[index];
    if (character === '(') depth++;
    else if (character === ')') depth--;
    else if (character === ',' && depth === 0) {
      entries.push(selector.slice(start, index));
      start = index + 1;
    }
  }
  entries.push(selector.slice(start));
  return entries.map((entry) => `${entry.trim()}::before`).join(', ');
}

/**
 * State fills paint the structural fill layer (`fillLayerStyles`). The layer keeps one
 * color so it can fade out after its state ends; states only show or hide it. A state that
 * needs a different color is the part's own fill and changes instantly.
 */
export function fillColor(color: string, selector = '&'): PresentationRule {
  return { selector: layer(selector), declarations: { 'background-color': color } };
}

export function fillShown(selector: string): PresentationRule {
  return { selector: layer(selector), declarations: { opacity: '1' } };
}

export function fillHidden(selector: string): PresentationRule {
  return { selector: layer(selector), declarations: { opacity: '0' } };
}
