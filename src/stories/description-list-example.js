/** Counts the hidden items in the Show more text. */
export function setupDescriptionListExample(root) {
  const list = root.querySelector('tp-description-list');
  list.messages = {
    showMore: ({ hidden }) => `Show ${hidden} more`,
    showLess: 'Show fewer',
  };
  return () => {};
}
