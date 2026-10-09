import { OwnedStyles } from './owned-styles.js';

const locks = new WeakMap<Document, { count: number; release: () => void }>();

/** One owner-document lease shared by nested modal surfaces. */
export function acquireScrollLock(document: Document): () => void {
  let lock = locks.get(document);
  if (!lock) {
    const element = document.documentElement;
    const view = document.defaultView;
    const styles = new OwnedStyles(element);
    const gutter = view ? Math.max(0, view.innerWidth - element.clientWidth) : 0;
    if (gutter && view) {
      const property = 'padding-inline-end';
      styles.set(
        property,
        `${parseFloat(view.getComputedStyle(element).getPropertyValue(property)) + gutter}px`,
      );
    }
    styles.set('overflow', 'hidden');
    lock = { count: 0, release: () => styles.dispose() };
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
