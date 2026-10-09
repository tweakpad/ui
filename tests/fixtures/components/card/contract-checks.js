// Card contract checks, executed through Chrome DevTools MCP `evaluate_script`.
const settle = async (...elements) => {
  for (let i = 0; i < 3; i++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};
const part = (card, name) => card.shadowRoot.querySelector(`[part~="${name}"]`);

/** `elevated` adds the shared shadow without changing border, fill or width. */
export async function shadowOnly() {
  const card = document.querySelector('#default');
  await settle(card);
  const root = part(card, 'card');
  const initial = getComputedStyle(root);
  const border = initial.border;
  const background = initial.backgroundColor;
  const width = root.getBoundingClientRect().width;
  card.elevated = true;
  await settle(card);
  const after = getComputedStyle(root);
  const result = {
    borderUnchanged: after.border === border,
    backgroundUnchanged: after.backgroundColor === background,
    widthUnchanged: root.getBoundingClientRect().width === width,
    shadowAdded: after.boxShadow !== 'none',
  };
  card.elevated = false;
  await settle(card);
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length) throw new Error(`shadowOnly failed: ${failed.map(([key]) => key).join(', ')}`);
  return result;
}

/** A partial `styleHook` on `card-content` overrides one side only. */
export async function partialPaddingOverride() {
  const card = document.querySelector('#default');
  await settle(card);
  const body = part(card, 'card-content');
  const defaultPadding = getComputedStyle(body).paddingBlockStart;
  card.partPresentation = { 'card-content': { styleHook: { 'padding-inline-start': '31px' } } };
  await settle(card);
  const style = getComputedStyle(part(card, 'card-content'));
  const result = {
    overridden: style.paddingInlineStart === '31px',
    blockKept: style.paddingBlockStart === defaultPadding,
    inlineEndKept: style.paddingInlineEnd === defaultPadding,
  };
  card.partPresentation = {};
  await settle(card);
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length)
    throw new Error(`partialPaddingOverride failed: ${failed.map(([key]) => key).join(', ')}`);
  return result;
}

/** Computed presentation of every configuration for visual review. */
export function configurations() {
  return Object.fromEntries(
    [...document.querySelectorAll('tp-card')].map((card) => {
      const root = getComputedStyle(part(card, 'card'));
      const header = part(card, 'card-header');
      const content = part(card, 'card-content');
      return [
        card.id,
        {
          borderWidth: root.borderTopWidth,
          boxShadow: root.boxShadow,
          headerBackground: header ? getComputedStyle(header).backgroundColor : null,
          contentBackground: content ? getComputedStyle(content).backgroundColor : null,
          contentPadding: content ? getComputedStyle(content).paddingBlockStart : null,
        },
      ];
    }),
  );
}
