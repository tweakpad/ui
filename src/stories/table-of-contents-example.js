import { collectTargets } from '../foundation/collect-targets.js';
import { fillGeneratedText } from './text-generator.js';

/** Builds items from targets the page marks with `data-toc`; nothing is inferred. */
function collectItems(root) {
  const toc = root.querySelector('tp-table-of-contents[data-collect]');
  const article = root.querySelector('[data-article]');
  if (!toc || !article) return;
  const items = collectTargets(article, '[data-toc]', {
    depth: (element) => Number(element.getAttribute('data-toc')) || 1,
    label: (element) => element.getAttribute('data-toc-label') ?? element.textContent.trim(),
  }).map(({ element, label, depth }) => {
    const item = root.ownerDocument.createElement('tp-table-of-contents-item');
    item.target = element; // An element reference: these targets have no ids.
    item.depth = depth ?? 1;
    item.textContent = label;
    return item;
  });
  toc.replaceChildren(...items);
}

/** Fills generated text, builds collected items, and adds sections on request. */
export function setupTableOfContentsExample(root) {
  fillGeneratedText(root);
  collectItems(root);
  const add = root.querySelector('[data-add-section]');
  let count = 0;
  const onAdd = () => {
    count += 1;
    const section = root.ownerDocument.createElement('section');
    section.setAttribute('data-toc', '1');
    section.setAttribute('data-toc-label', `Appendix ${count}`);
    section.innerHTML = `<strong>Appendix ${count}</strong><div data-generate="3"></div>`;
    root.querySelector('[data-article]')?.append(section);
    fillGeneratedText(section, 40 + count);
    collectItems(root);
  };
  add?.addEventListener('click', onAdd);
  return () => add?.removeEventListener('click', onAdd);
}
