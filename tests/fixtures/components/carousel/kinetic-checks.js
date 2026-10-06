// Execute through Chrome DevTools MCP. Multi-sample synthetic pointer sequences for the
// interruptible, velocity-driven motion; they complement real input and are not evidence of
// hardware input.

/** Presented logical position in item pitches, read from the shells' progress property. */
export function carouselPresented(carousel) {
  const shells = [...carousel.shadowRoot.querySelectorAll('.item')];
  let position = null;
  shells.forEach((shell, index) => {
    const progress = parseFloat(shell.style.getPropertyValue('--tp-carousel-item-progress'));
    if (progress <= 1e-4 && progress > -1 + 1e-4) position = index - progress;
  });
  return position;
}

/**
 * Drag `steps` sampled moves of `pixels` each (negative = toward next in LTR), then optionally
 * reverse with `reverse` moves, and release. Returns the committed index once settled, whether a
 * native dragstart/selectstart during the gesture was prevented, and per-frame positions.
 */
export async function carouselDrag(carousel, { steps, pixels, reverse = [], during, wait = 1600 }) {
  const document = carousel.ownerDocument;
  const view = document.defaultView;
  const frame = () => new Promise((resolve) => view.requestAnimationFrame(resolve));
  const track = carousel.shadowRoot.querySelector('.track');
  const rect = track.getBoundingClientRect();
  const y = rect.top + rect.height / 2;
  let x = rect.left + rect.width / 2;
  const send = (type, target = document) =>
    target.dispatchEvent(
      new view.PointerEvent(type, {
        // The mouse pointer (ID 1) is always active, so pointer capture accepts it.
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  const frames = [];
  let recording = true;
  const record = (time) => {
    view.setTimeout(() => frames.push([Math.round(time), carouselPresented(carousel)]), 0);
    if (recording) view.requestAnimationFrame(record);
  };
  view.requestAnimationFrame(record);
  const media = carousel.querySelector('[data-carousel-media]') ?? track;
  send('pointerdown', media);
  const native = {};
  for (const step of [...Array(steps).fill(pixels), ...reverse]) {
    x += step;
    send('pointermove');
    await frame();
    if (native.dragstart === undefined) {
      const drag = new view.DragEvent('dragstart', {
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      media.dispatchEvent(drag);
      native.dragstart = drag.defaultPrevented;
      const select = new view.Event('selectstart', {
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      media.dispatchEvent(select);
      native.selectstart = select.defaultPrevented;
    }
    await during?.();
  }
  send('pointerup');
  await new Promise((resolve) => view.setTimeout(resolve, wait));
  recording = false;
  return { index: carousel.controller.index, native, frames };
}
