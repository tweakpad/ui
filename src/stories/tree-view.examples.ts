import { interactiveMarkupExample, publishedSource } from './documentation-examples.js';
import { setupTreeViewExample } from './tree-view-example.js';
import setupSource from './tree-view-example.js?raw';

const script = publishedSource(setupSource);

function example(title: string, mode: string, content: string, description: string) {
  const id = `tree-view-${mode}-example`;
  return interactiveMarkupExample(
    title,
    `<section id="${id}" data-example="${mode}" style="display:grid;gap:var(--tp-space-3);max-inline-size:22rem">${content}<p data-status role="status" aria-live="polite"></p></section>`,
    setupTreeViewExample,
    `${script}\nconst cleanup = setupTreeViewExample(document.getElementById('${id}'));\n// Call cleanup() when removing the example.`,
    description,
  );
}

export const treeViewDefaultSource = `<tp-tree-view label="Files" default-expanded='["src", "components"]' default-value='["button.ts"]'>
  <tp-tree-item value="src">
    <tp-icon slot="leading" data-icon="folder"></tp-icon>src
    <tp-tree-item value="components">
      <tp-icon slot="leading" data-icon="folder"></tp-icon>components
      <tp-tree-item value="button.ts">button.ts</tp-tree-item>
      <tp-tree-item value="card.ts">card.ts</tp-tree-item>
    </tp-tree-item>
    <tp-tree-item value="index.ts">index.ts</tp-tree-item>
  </tp-tree-item>
  <tp-tree-item value="package.json">package.json</tp-tree-item>
</tp-tree-view>
<script type="module">
  import { folderIcon } from '@tweakpad/ui/icons/folder';
  for (const icon of document.querySelectorAll('tp-icon[data-icon="folder"]')) icon.icon = folderIcon;
</script>`;

export const treeViewExamples = [
  example(
    'Records and custom rows',
    'records',
    '<tp-tree-view label="Project files"></tp-tree-view>',
    'Records supply the hierarchy; renderItem places an Icon in the leading slot and a Badge with the child count in the trailing slot. Enter or a press fires tp-action.',
  ),
  example(
    'Checkbox selection with lazy loading',
    'checkboxes',
    '<tp-tree-view label="Permissions" selection-mode="multiple" checkbox-selection selection-propagation></tp-tree-view>',
    'Selecting a group selects its enabled items, including ones that load later; groups show checked, unchecked or mixed. Workspace loads its children on first expansion.',
  ),
  example(
    'Virtualized large tree',
    'virtualized',
    '<tp-tree-view label="Generated" virtualized style="block-size:20rem"></tp-tree-view>',
    'Only the rows near the viewport are mounted. Keyboard navigation, typeahead and focusItem mount a row before focusing it.',
  ),
  example(
    'Reordering',
    'reorder',
    '<tp-tree-view label="Project files" reorderable></tp-tree-view>',
    'Drag a handle, or press Control+Enter (Command+Enter) on an item and use the arrow keys. canDrop keeps files from holding items.',
  ),
  example(
    'Controlled lanes and built-in expansion',
    'controlled',
    '<div style="display:flex;gap:var(--tp-space-2);flex-wrap:wrap"><tp-button data-expand variant="outline" size="sm">Expand all</tp-button><tp-button data-collapse variant="outline" size="sm">Collapse all</tp-button><tp-button data-reveal variant="outline" size="sm">Reveal selection</tp-button></div><tp-tree-view label="Project files"></tp-tree-view>',
    'The owner holds value and expanded and writes back every accepted proposal. The selected item starts hidden inside collapsed folders until Reveal selection expands its ancestors.',
  ),
];
