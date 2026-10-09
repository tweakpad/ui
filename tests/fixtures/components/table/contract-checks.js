// Table contract checks, executed through Chrome DevTools MCP `evaluate_script`.
/** An authored native `<table>` stays a table element and its cells get the recipe padding. */
export async function nativeTableStyle() {
  const table = document.querySelector('#native');
  await table.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const cell = table.querySelector('td');
  const result = {
    nativeElement: table.querySelector('table').localName === 'table',
    cellPadding: parseFloat(getComputedStyle(cell).paddingInlineStart) > 0,
  };
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length)
    throw new Error(`nativeTableStyle failed: ${failed.map(([key]) => key).join(', ')}`);
  return result;
}
