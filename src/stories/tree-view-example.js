import { html } from 'lit';
import { folderIcon } from '../icons/folder.js';
import { folderOpenIcon } from '../icons/folder-open.js';
import { fileTextIcon } from '../icons/file-text.js';

const project = () => [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button.ts', label: 'button.ts' },
          { id: 'card.ts', label: 'card.ts' },
          { id: 'dialog.ts', label: 'dialog.ts' },
        ],
      },
      { id: 'lib', label: 'lib', children: [{ id: 'utils.ts', label: 'utils.ts' }] },
      { id: 'index.ts', label: 'index.ts' },
    ],
  },
  { id: 'docs', label: 'docs', children: [{ id: 'readme.md', label: 'README.md' }] },
  { id: 'package.json', label: 'package.json' },
];

/** Files and folders with icons that follow expansion and a child count for folders. */
const fileRow = (item, state) =>
  html`<tp-icon
      slot="leading"
      .icon=${state.expandable ? (state.expanded ? folderOpenIcon : folderIcon) : fileTextIcon}
    ></tp-icon
    >${item.label}${
      item.children
        ? html`<tp-badge slot="trailing" variant="secondary">${item.children.length}</tp-badge>`
        : ''
    }`;

/** Large generated hierarchy: `breadth` children per level, `depth` levels. */
function generate(breadth, depth, prefix = '') {
  return Array.from({ length: breadth }, (_, index) => {
    const id = `${prefix}${index + 1}`;
    return depth
      ? { id, label: `Folder ${id}`, children: generate(breadth, depth - 1, `${id}.`) }
      : { id, label: `File ${id}` };
  });
}

/** Wires one example by its `data-example` mode; returns the cleanup. */
export function setupTreeViewExample(root) {
  const host = root.matches('[data-example]') ? root : root.querySelector('[data-example]');
  const mode = host?.dataset.example;
  const tree = root.querySelector('tp-tree-view');
  const status = root.querySelector('[data-status]');
  const listeners = [];
  const listen = (element, name, callback) => {
    element?.addEventListener(name, callback);
    listeners.push(() => element?.removeEventListener(name, callback));
  };
  const report = (text) => {
    if (status) status.textContent = text;
  };

  if (mode === 'records') {
    tree.renderItem = fileRow;
    tree.defaultItems = project();
    tree.defaultExpanded = ['src'];
    listen(tree, 'tp-action', (event) => report(`Opened ${event.detail.value}`));
  }

  if (mode === 'checkboxes') {
    const delay = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));
    tree.defaultItems = [
      { id: 'workspace', label: 'Workspace', hasChildren: true },
      {
        id: 'billing',
        label: 'Billing',
        children: [
          { id: 'invoices', label: 'Invoices' },
          { id: 'payment-methods', label: 'Payment methods' },
          { id: 'tax', label: 'Tax settings', disabled: true },
        ],
      },
    ];
    tree.loadChildren = async (item, { signal }) => {
      await delay(600);
      if (signal.aborted) return [];
      return ['Members', 'Projects', 'Integrations'].map((label) => ({
        id: `${item.id}/${label.toLowerCase()}`,
        label,
      }));
    };
    listen(tree, 'tp-value-change', (event) =>
      report(`${event.detail.value.length} permissions selected`),
    );
  }

  if (mode === 'virtualized') {
    const items = generate(30, 3);
    tree.defaultItems = items;
    tree.defaultExpanded = ['1', '1.1'];
    report('27,930 items; only the rows in view are mounted.');
  }

  if (mode === 'reorder') {
    tree.renderItem = fileRow;
    tree.defaultItems = project();
    tree.defaultExpanded = ['src', 'components'];
    // Files cannot hold other items.
    tree.canDrop = (move) => move.toParentId === null || !/\.\w+$/.test(move.toParentId);
    listen(tree, 'tp-items-change', (event) => {
      const { itemId, toParentId, toIndex } = event.detail.metadata.move;
      report(`Moved ${itemId} to ${toParentId ?? 'the top level'}, position ${toIndex + 1}`);
    });
  }

  if (mode === 'controlled') {
    let value = ['utils.ts'];
    let expanded = [];
    tree.renderItem = fileRow;
    tree.items = project();
    tree.value = value;
    tree.expanded = expanded;
    listen(tree, 'tp-value-change', (event) => {
      value = event.detail.value;
      tree.value = value;
      report(`Selected ${value.join(', ') || 'nothing'}`);
    });
    listen(tree, 'tp-expanded-change', (event) => {
      expanded = event.detail.value;
      tree.expanded = expanded;
    });
    listen(root.querySelector('[data-expand]'), 'click', () => void tree.expandAll());
    listen(root.querySelector('[data-collapse]'), 'click', () => tree.collapseAll());
    listen(
      root.querySelector('[data-reveal]'),
      'click',
      () => void tree.revealItem(value[0] ?? 'utils.ts', { focus: true }),
    );
  }

  return () => {
    for (const release of listeners) release();
  };
}
