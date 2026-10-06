// Execute through Chrome DevTools MCP. These multi-sample synthetic regressions
// complement real tool-driven drag; they are not evidence of hardware input.
export async function checkCarouselRelease(carousel) {
  const document = carousel.ownerDocument;
  const view = document.defaultView;
  const originalOptions = carousel.options;
  const originalIndex = carousel.index;
  const results = [];
  const frame = () => new Promise((resolve) => view.requestAnimationFrame(resolve));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  try {
    carousel.options = { ...originalOptions, interaction: {} };
    await carousel.updateComplete;
    await new Promise((resolve) => view.setTimeout(resolve, 100));
    for (const direction of [1, -1]) {
      const startIndex = direction === 1 ? 0 : 3;
      await carousel.controller.scrollToIndex(startIndex, { speed: 0 });
      const track = carousel.shadowRoot.querySelector('.track');
      const viewport = carousel.shadowRoot.querySelector('.viewport');
      const rect = viewport.getBoundingClientRect();
      const start = direction === 1 ? rect.right - 20 : rect.left + 20;
      const origin = start - direction * 10;
      const distance = rect.width * 0.65;
      const preview = origin - direction * distance;
      // The last move AND pointerup reverse slightly, while the overall gesture
      // still advances in its original direction. Pointerup adds a fresh sample.
      const release = preview + direction * 5;
      let motion;
      const collect = (event) => {
        if (event.request.role === 'track') motion = event.request;
      };
      carousel.addEventListener('tp-motion-request', collect);
      const send = (type, x) => {
        const event = new view.PointerEvent(type, {
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: rect.top + rect.height / 2,
          bubbles: true,
          composed: true,
          cancelable: true,
        });
        (type === 'pointerdown' ? track : document).dispatchEvent(event);
      };
      try {
        const startPosition = -new view.DOMMatrix(view.getComputedStyle(track).transform).m41;
        send('pointerdown', start);
        send('pointermove', origin);
        await frame();
        send('pointermove', preview);
        await frame();
        send('pointermove', preview + direction * 3);
        await frame();
        const settled = new Promise((resolve) =>
          carousel.addEventListener('tp-carousel-settled', resolve, { once: true }),
        );
        send('pointerup', release);
        await frame();
        const expectedPosition = startPosition + direction * (distance - 5);
        const expectedIndex = direction === 1 ? 2 : 1;
        assert(carousel.index === expectedIndex, `reversed snap: ${carousel.index}`);
        assert(motion, 'release did not request track settlement');
        const from = -new view.DOMMatrix(motion.fromState).m41;
        assert(
          Math.abs(from - expectedPosition) < 0.01,
          `last sample lost: ${from} vs ${expectedPosition}`,
        );
        // Frame-driven settlement: the release keeps transitioning until it settles.
        assert(carousel.hasAttribute('data-transitioning'), 'release jumped without animation');
        await settled;
        results.push({ direction, index: carousel.index, from, expectedPosition, threshold: 5 });
      } finally {
        carousel.removeEventListener('tp-motion-request', collect);
      }
    }
    return results;
  } finally {
    carousel.options = originalOptions;
    await carousel.updateComplete;
    await carousel.controller.scrollToIndex(originalIndex, { speed: 0 });
  }
}

// Replays the event order captured from a real quick mouse release in Chrome.
// Also checks that explicit capture loss and pointercancel still roll back.
export async function checkCarouselReleaseOrdering(carousel) {
  const document = carousel.ownerDocument;
  const view = document.defaultView;
  const originalOptions = carousel.options;
  const originalIndex = carousel.index;
  const results = [];
  const frame = () => new Promise((resolve) => view.requestAnimationFrame(resolve));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  try {
    carousel.options = { ...originalOptions, interaction: {} };
    await carousel.updateComplete;
    await new Promise((resolve) => view.setTimeout(resolve, 100));
    for (const mode of ['quick-release', 'held-release', 'capture-loss', 'pointercancel']) {
      await carousel.controller.scrollToIndex(3, { speed: 0 });
      const track = carousel.shadowRoot.querySelector('.track');
      const position = () => -new view.DOMMatrix(view.getComputedStyle(track).transform).m41;
      const start = position();
      let motion;
      const collect = (event) => {
        if (event.request.role === 'track') motion = event.request;
      };
      carousel.addEventListener('tp-motion-request', collect);
      const send = (type, x, buttons = 1) => {
        const target = ['pointerdown', 'lostpointercapture'].includes(type) ? track : document;
        target.dispatchEvent(
          new view.PointerEvent(type, {
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: 0,
            buttons,
            clientX: x,
            clientY: track.getBoundingClientRect().top + 20,
            bubbles: true,
            composed: true,
            cancelable: true,
          }),
        );
      };
      try {
        send('pointerdown', 100);
        send('pointermove', 110);
        await frame();
        send('pointermove', 150);
        await frame();
        await frame();
        assert(Math.abs(position() - (start - 40)) < 0.01, 'preview did not follow drag');
        if (mode === 'quick-release') {
          send('lostpointercapture', 160, 0);
          send('pointermove', 160, 0);
          await Promise.resolve();
          assert(
            carousel.hasAttribute('data-dragging'),
            'normal release cancelled before pointerup',
          );
          assert(Math.abs(position() - start) > 30, 'normal release snapped back before pointerup');
        } else if (mode === 'held-release') {
          await new Promise((resolve) => view.setTimeout(resolve, 350));
        } else {
          send(
            mode === 'capture-loss' ? 'lostpointercapture' : 'pointercancel',
            150,
            mode === 'capture-loss' ? 1 : 0,
          );
          await frame();
          assert(!carousel.hasAttribute('data-dragging'), 'cancel left gesture active');
          assert(Math.abs(position() - start) < 0.01, 'cancel did not restore selection');
          send('pointerup', 160, 0);
          await frame();
          assert(!motion && carousel.index === 3, 'cancel became a successful swipe');
          results.push({ mode, index: carousel.index, restored: position() });
          continue;
        }
        const settled = new Promise((resolve) =>
          carousel.addEventListener('tp-carousel-settled', resolve, { once: true }),
        );
        send('pointerup', 160, 0);
        await frame();
        assert(motion, 'normal release skipped settling motion');
        const from = -new view.DOMMatrix(motion.fromState).m41;
        assert(Math.abs(from - (start - 50)) < 0.01, 'final release sample was lost');
        assert(carousel.hasAttribute('data-transitioning'), 'release jumped instead of animating');
        await settled;
        assert(!carousel.hasAttribute('data-dragging'), 'release left gesture active');
        assert(carousel.index === (mode === 'quick-release' ? 2 : 3), 'wrong release destination');
        results.push({ mode, index: carousel.index, from, settled: position() });
      } finally {
        carousel.removeEventListener('tp-motion-request', collect);
      }
    }
    return results;
  } finally {
    carousel.options = originalOptions;
    await carousel.updateComplete;
    await carousel.controller.scrollToIndex(originalIndex, { speed: 0 });
  }
}
