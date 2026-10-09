// Input Group contract checks, executed through Chrome DevTools MCP `evaluate_script`.
const settle = async (...elements) => {
  for (let i = 0; i < 3; i++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

/** Group action defaults flow to members without authored values; explicit values stay. */
export async function actionInheritance() {
  const group = document.querySelector('#group');
  const inherited = document.querySelector('#inherited');
  const explicit = document.querySelector('#explicit');
  await settle(group, inherited, explicit);
  group.actionVariant = 'secondary';
  group.actionSize = 'icon-xs';
  await settle(group, inherited, explicit);
  const result = {
    inheritedVariant: inherited.variant === 'secondary',
    inheritedSize: inherited.size === 'icon-xs',
    explicitVariant: explicit.variant === 'outline',
    explicitSize: explicit.size === 'sm',
  };
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length)
    throw new Error(`actionInheritance failed: ${failed.map(([key]) => key).join(', ')}`);
  return result;
}

/** The grouped Input drops its own border: the group paints the single field boundary. */
export async function singleBoundary() {
  const input = document.querySelector('#group tp-input');
  await settle(input);
  const borderWidth = getComputedStyle(input.shadowRoot.querySelector('input')).borderWidth;
  if (borderWidth !== '0px') throw new Error(`grouped input border is ${borderWidth}`);
  return { borderWidth };
}
