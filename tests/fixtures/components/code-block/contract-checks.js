// Code block collapsible contract, executed through Chrome DevTools MCP `evaluate_script`.
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const settle = async (...elements) => {
  for (let i = 0; i < 3; i++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await frame();
  }
};
const fail = (name, result) => {
  const failed = Object.entries(result).filter(([, value]) => value !== true);
  if (failed.length)
    throw new Error(
      `${name} failed: ${failed.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}`,
    );
  return result;
};
const parts = (block) => {
  const root = block.shadowRoot;
  const row = root.querySelector('[part~="expand"]');
  const button = row?.querySelector('tp-button') ?? null;
  return {
    row,
    button,
    control: button?.shadowRoot.querySelector('button') ?? null,
    viewport: root.querySelector('[part~="viewport"]'),
  };
};
const box = (element) => element.getBoundingClientRect();
const near = (a, b) => Math.abs(a - b) < 1;

/**
 * The Expand control fills its row in both states and both directions, and keeps proposing
 * `expanded`. Pointer, hover and keyboard paths are driven through the MCP tools.
 */
export async function run() {
  const block = (id) => document.querySelector(`#${id}`);
  const result = {};
  for (const id of ['titled', 'untitled', 'wide', 'wrapped', 'rtl']) {
    block(id).setExpanded(false);
    await settle(block(id));
    const { row, button, control, viewport } = parts(block(id));
    const figure = box(block(id).shadowRoot.querySelector('figure'));
    const border = Number.parseFloat(getComputedStyle(row).borderBlockStartWidth);
    Object.assign(result, {
      [`${id}.composesButton`]: button?.localName === 'tp-button',
      [`${id}.fillsRowInline`]: near(box(control).width, box(row).width),
      [`${id}.fillsRowBlock`]: near(box(control).height, box(row).height - border),
      [`${id}.rowSpansFigure`]: near(box(row).width, figure.width - border * 2),
      [`${id}.atEndEdge`]: near(box(control).bottom, figure.bottom - border),
      [`${id}.collapsedName`]: button.textContent.trim() === 'Expand',
      [`${id}.collapsedState`]: control.getAttribute('aria-expanded') === 'false',
      [`${id}.controls`]: control.ariaControlsElements?.[0] === viewport,
    });
  }

  const events = [];
  const record = (event) => events.push(`${event.detail.reason}:${event.detail.value}`);
  block('rtl').addEventListener('tp-value-change', record);
  parts(block('rtl')).control.click();
  await settle(block('rtl'));
  const open = parts(block('rtl'));
  Object.assign(result, {
    'expanded.name': open.button.textContent.trim() === 'Collapse',
    'expanded.state': open.control.getAttribute('aria-expanded') === 'true',
    'expanded.fillsRowInline': near(box(open.control).width, box(open.row).width),
    'expanded.host': block('rtl').hasAttribute('data-expanded'),
  });
  open.control.click();
  await settle(block('rtl'));
  block('rtl').removeEventListener('tp-value-change', record);
  Object.assign(result, {
    'proposals.expand': events[0] === 'trigger-press:true',
    'proposals.collapse': events[1] === 'trigger-press:false',
    'proposals.collapsedAgain': !block('rtl').expanded,
  });

  return fail('code block expand row', result);
}

globalThis.codeBlockContract = { run };
