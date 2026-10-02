import { composedParent } from '../../foundation/focus.js';

function offset(element: HTMLElement): { left: number; top: number } {
  let left = 0,
    top = 0;
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.offsetParent as HTMLElement | null
  ) {
    left += node.offsetLeft;
    top += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    left += parent?.clientLeft ?? 0;
    top += parent?.clientTop ?? 0;
  }
  return { left, top };
}

/** Layout offsets survive rotation/skew; agreeing rect offsets preserve subpixel/scaled placement. */
export function tabGeometry(tab: HTMLElement, list: HTMLElement): Record<string, number> {
  const t = offset(tab),
    l = offset(list);
  let left = t.left - l.left - list.clientLeft,
    top = t.top - l.top - list.clientTop;
  for (
    let parent = composedParent(tab);
    parent && parent !== list;
    parent = composedParent(parent)
  ) {
    if (parent.nodeType === Node.ELEMENT_NODE) {
      left -= (parent as Element).scrollLeft;
      top -= (parent as Element).scrollTop;
    }
  }
  const rect = tab.getBoundingClientRect(),
    lr = list.getBoundingClientRect();
  const view = tab.ownerDocument.defaultView!;
  const style = view.getComputedStyle(tab);
  const matrix = style.transform === 'none' ? null : new view.DOMMatrixReadOnly(style.transform);
  const translate = style.translate.split(' ');
  const length = (v = '0', size: number) =>
    (parseFloat(v) || 0) * (v.endsWith('%') ? size / 100 : 1);
  const x = (matrix?.m41 ?? 0) + length(translate[0], tab.offsetWidth);
  const y = (matrix?.m42 ?? 0) + length(translate[1], tab.offsetHeight);
  const rl =
    (rect.left - lr.left) / (lr.width / list.offsetWidth) + list.scrollLeft - list.clientLeft;
  const rt =
    (rect.top - lr.top) / (lr.height / list.offsetHeight) + list.scrollTop - list.clientTop;
  if (Math.abs(rl - x - left) <= 2 && Math.abs(rt - y - top) <= 2) {
    left = rl;
    top = rt;
  }
  const width = tab.offsetWidth,
    height = tab.offsetHeight;
  return {
    left,
    top,
    right: list.scrollWidth - left - width,
    bottom: list.scrollHeight - top - height,
    width,
    height,
  };
}
