/** Keep a hover surface open while the pointer crosses the gap toward it. */
export function safeCorridor(
  reference: HTMLElement,
  floating: HTMLElement,
  exit: PointerEvent,
  close: (event: PointerEvent) => void,
): () => void {
  if (exit.pointerType === 'touch') return () => {};
  const doc = reference.ownerDocument;
  const view = doc.defaultView;
  const origin = { x: exit.clientX, y: exit.clientY };
  let previousDistance = Infinity;
  const insideTriangle = (
    x: number,
    y: number,
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): boolean => {
    const side = (p: typeof origin, q: typeof origin) =>
      (x - q.x) * (p.y - q.y) - (p.x - q.x) * (y - q.y);
    const values = [side(origin, a), side(a, b), side(b, origin)];
    return !(values.some((value) => value < -0.5) && values.some((value) => value > 0.5));
  };
  const stop = (): void => {
    doc.removeEventListener('pointermove', move, true);
    view?.clearTimeout(timer);
  };
  const move = (event: PointerEvent): void => {
    const path = event.composedPath();
    if (path.includes(reference) || path.includes(floating)) {
      stop();
      return;
    }
    const box = floating.getBoundingClientRect();
    const horizontal = origin.x < box.left || origin.x > box.right;
    const a = horizontal
      ? { x: origin.x < box.left ? box.left : box.right, y: box.top - 0.5 }
      : { x: box.left - 0.5, y: origin.y < box.top ? box.top : box.bottom };
    const b = horizontal ? { x: a.x, y: box.bottom + 0.5 } : { x: box.right + 0.5, y: a.y };
    const distance = Math.hypot(event.clientX - (a.x + b.x) / 2, event.clientY - (a.y + b.y) / 2);
    if (!insideTriangle(event.clientX, event.clientY, a, b) || distance > previousDistance + 0.5) {
      stop();
      close(event);
    }
    previousDistance = distance;
  };
  const timer = view?.setTimeout(() => {
    stop();
    close(exit);
  }, 1000);
  doc.addEventListener('pointermove', move, true);
  return stop;
}
