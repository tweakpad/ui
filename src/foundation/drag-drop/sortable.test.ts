import { expect, it } from 'vitest';
import { Draggable, Droppable } from './entities.js';
import { Sortable, isSortable, isSortableOperation } from './sortable.js';

it('recognizes composed sortable entities and narrows both operation members', () => {
  const sortable = new Sortable({ id: 'sortable', index: 2, register: false });
  const plain = [
    new Draggable({ id: 'drag', register: false }),
    new Droppable({ id: 'drop', register: false }),
    null,
    { index: 0 },
  ];
  for (const entity of [sortable.draggable, sortable.droppable])
    expect(isSortable(entity)).toBe(true);
  for (const entity of plain) {
    expect(isSortable(entity)).toBe(false);
    expect(isSortableOperation({ source: entity, target: sortable.droppable })).toBe(false);
    expect(isSortableOperation({ source: sortable.draggable, target: entity })).toBe(false);
  }
  const operation: { source: unknown; target: unknown } = {
    source: sortable.draggable,
    target: sortable.droppable,
  };
  expect(isSortableOperation(operation)).toBe(true);
  if (isSortableOperation(operation)) {
    expect(operation.source.sortable.index).toBe(2);
    expect(operation.target.sortable).toBe(sortable);
  }
  sortable.destroy();
  for (const entity of plain)
    if (entity instanceof Draggable || entity instanceof Droppable) entity.destroy();
});

it('preserves runtime transition defaults, partial merge and explicit disable on updates', () => {
  const sortable = new Sortable({ id: 'motion', index: 0, register: false });
  expect(sortable.transition).toEqual({
    duration: 250,
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    idle: false,
  });
  sortable.transition = { duration: 120 };
  expect(sortable.transition).toEqual({
    duration: 120,
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    idle: false,
  });
  sortable.transition = null;
  expect(sortable.transition).toBeNull();
  sortable.transition = undefined;
  expect(sortable.transition?.duration).toBe(250);
  sortable.destroy();
});
