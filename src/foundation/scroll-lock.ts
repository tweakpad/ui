const locks = new WeakMap<Document, { count: number; release: () => void }>();

/** One owner-document lease shared by nested modal surfaces. */
export function acquireScrollLock(document: Document): () => void {
  let lock = locks.get(document);
  if (!lock) {
    const element = document.documentElement;
    const view = document.defaultView;
    const previous = new Map<string, { value: string; priority: string; applied: string }>();
    const set = (property: string, value: string): void => {
      previous.set(property, {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
        applied: value,
      });
      element.style.setProperty(property, value);
    };
    const gutter = view ? Math.max(0, view.innerWidth - element.clientWidth) : 0;
    if (gutter && view) {
      const property = 'padding-inline-end';
      set(
        property,
        `${parseFloat(view.getComputedStyle(element).getPropertyValue(property)) + gutter}px`,
      );
    }
    set('overflow', 'hidden');
    lock = {
      count: 0,
      release: () => {
        for (const [property, state] of previous)
          if (element.style.getPropertyValue(property) === state.applied) {
            if (state.value) element.style.setProperty(property, state.value, state.priority);
            else element.style.removeProperty(property);
          }
      },
    };
    locks.set(document, lock);
  }
  lock.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--lock.count === 0) {
      lock.release();
      locks.delete(document);
    }
  };
}
