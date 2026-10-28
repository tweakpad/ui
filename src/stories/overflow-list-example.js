/**
 * A custom Count: a Button that opens a Popover listing the omitted Items. The list announces
 * every change of its omitted Items, so the Count can show their number and their labels.
 */
export function setupOverflowListExample(root) {
  const list = root.querySelector('tp-overflow-list');
  const button = root.querySelector('#more-skills-button');
  const names = root.querySelector('#more-skills');
  if (!list || !button || !names) return () => {};
  const update = () => {
    const labels = list.hiddenItems.map((item) => item.textContent?.trim() ?? '');
    button.textContent = `+${labels.length}`;
    button.setAttribute('aria-label', `${labels.length} more skills`);
    names.replaceChildren(
      ...labels.map((label) =>
        Object.assign(root.ownerDocument.createElement('li'), { textContent: label }),
      ),
    );
  };
  list.addEventListener('tp-overflow-change', update);
  update();
  return () => list.removeEventListener('tp-overflow-change', update);
}
