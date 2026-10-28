import { html } from 'lit';
import { DragDropManager, RestrictToVerticalAxis } from '../foundation/drag-drop/index.js';

/** Public component compositions shared by rendered examples and copyable code. */
export function setupDragDropListExample(root) {
  const lists = [...root.querySelectorAll('tp-drag-drop-list')].map((previous) => {
    // Initial value mode is lifetime-stable. Configure a fresh instance even when
    // copied markup was upgraded before this setup module finished loading.
    const list = previous.ownerDocument.createElement('tp-drag-drop-list');
    for (const attribute of previous.attributes) list.setAttribute(attribute.name, attribute.value);
    previous.replaceWith(list);
    return list;
  });
  const manager = new DragDropManager();
  const listeners = [];
  const listen = (element, name, callback) => {
    element.addEventListener(name, callback);
    listeners.push(() => element.removeEventListener(name, callback));
  };
  const status = root.querySelector('[data-status]');
  const mode = (root.matches('[data-example]') ? root : root.querySelector('[data-example]'))
    ?.dataset.example;
  const initial = Object.freeze([
    { id: 'research', label: 'Research', status: 'Ready' },
    { id: 'design', label: 'Design', status: 'In progress' },
    { id: 'review', label: 'Review', status: 'Ready' },
  ]);
  let owner = { backlog: initial, ready: [] };
  const staged = new Map();
  for (const [index, list] of lists.entries()) {
    list.manager = manager;
    list.group = index ? 'ready' : 'backlog';
    list.label = index ? 'Ready' : 'Backlog';
    if (mode === 'controlled') list.value = owner[list.group];
    else list.defaultValue = index ? [] : initial;
    if (mode === 'rich') {
      list.renderItem = (item, context) =>
        html`<span>${item.label} <tp-badge variant="secondary">${item.status}</tp-badge></span
          ><tp-button
            slot="actions"
            size="sm"
            variant="outline"
            .disabled=${context.preview}
            @click=${() => {
              status.textContent = `Opened ${item.label}`;
            }}
            >Open</tp-button
          >`;
      list.renderOverlay = (item) =>
        html`<tp-list-item variant="outline"
          >${item.label}<tp-badge slot="actions" variant="secondary">Moving</tp-badge></tp-list-item
        >`;
    }
    if (mode === 'vertical') {
      list.modifiers = [() => new RestrictToVerticalAxis()];
      list.activation = 'item';
      list.feedback = 'clone';
    }
    listen(list, 'tp-value-change', (event) => {
      if (
        event.target !== list ||
        event.defaultPrevented ||
        event.detail.cancelled ||
        mode !== 'controlled'
      )
        return;
      const metadata = event.detail.metadata;
      let proposal = staged.get(metadata.operationId);
      if (!proposal) staged.set(metadata.operationId, (proposal = new Map()));
      proposal.set(list.group, event.detail.value);
      const groups = new Set([metadata.sourceGroup, metadata.destinationGroup]);
      if ([...groups].every((group) => proposal.has(group))) {
        // Acknowledge every changed lane synchronously before transaction resolution.
        for (const member of lists)
          if (proposal.has(member.group)) member.value = proposal.get(member.group);
        staged.delete(metadata.operationId);
      }
    });
    listen(list, 'tp-value-commit', (event) => {
      if (event.target !== list) return;
      // All component lanes have published before the first notification.
      owner = Object.fromEntries(lists.map((member) => [member.group, member.value]));
      status.textContent = lists
        .map(
          (member) =>
            `${member.label}: ${member.value.map((item) => item.label).join(', ') || 'empty'}`,
        )
        .join(' · ');
    });
  }
  const move = root.querySelector('[data-move]');
  if (move)
    listen(move, 'click', () => {
      const first = lists[0].value[0];
      if (first)
        status.textContent = lists[0].moveItem(first.id, {
          list: lists[1],
          index: lists[1].value.length,
        });
    });
  let decision;
  const controls = root.querySelector('[data-decision]');
  if (controls) {
    listeners.push(
      manager.monitor.addEventListener('dragend', (event) => {
        if (event.canceled) return;
        decision = event.suspend();
        controls.hidden = false;
        status.textContent = 'Drop waiting for your decision.';
      }),
    );
    listen(root.querySelector('[data-approve]'), 'click', () => {
      decision?.resume();
      controls.hidden = true;
    });
    listen(root.querySelector('[data-reject]'), 'click', () => {
      decision?.abort();
      controls.hidden = true;
    });
    listeners.push(
      manager.monitor.addEventListener('settled', (event) => {
        decision = undefined;
        controls.hidden = true;
        if (event.outcome !== 'committed') status.textContent = `Drop ${event.outcome}.`;
      }),
    );
  }
  return () => {
    for (const release of listeners) release();
    decision?.abort();
    manager.destroy();
  };
}
