import '/src/register.ts';

// Issue 14: a drawer whose slotted content is large, so a restyle of that subtree is measurable.
// 300 rows of a label, a badge and a button: about 1,200 elements under the drawer surface.
const rows = document.getElementById('rows')!;
for (let index = 0; index < 300; index++) {
  const row = document.createElement('div');
  row.style.cssText =
    'display:flex;align-items:center;justify-content:space-between;gap:var(--tp-space-2)';
  row.innerHTML = `<span>Order #${10400 + index}</span><tp-badge variant="secondary">Shipped</tp-badge><tp-button size="sm" variant="ghost">Details</tp-button>`;
  rows.append(row);
}
