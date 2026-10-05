import { html } from 'lit';

export function setupCarouselExample(root) {
  const container = root.matches('[data-example]')
    ? root
    : (root.querySelector('[data-example]') ?? root);
  const carousel = root.ownerDocument.createElement('tp-carousel');
  const virtual = container.dataset.example === 'virtual';
  const controlled = container.dataset.example === 'controlled';
  carousel.label = virtual ? 'Virtual numbered slides' : 'Numbered slides';
  carousel.items = Array.from({ length: virtual ? 200 : 6 }, (_, id) => ({
    id,
    label: `Slide ${id + 1}`,
  }));
  carousel.renderItem = (item) =>
    html`<tp-card class="carousel-demo-card" section-colors="off"
      ><span>${item.id + 1}</span></tp-card
    >`;
  carousel.options = {
    layout: { itemsPerView: 2, gap: 16 },
    ...(virtual ? { virtual: {} } : {}),
    scrollbar: false,
  };
  const status = container.querySelector('[data-status]');
  const change = (event) => {
    carousel.value = event.detail.value;
  };
  if (controlled) {
    carousel.value = 0;
    carousel.addEventListener('tp-value-change', change);
  }
  const commit = () => {
    if (status) status.textContent = `Committed source index: ${carousel.index}`;
  };
  carousel.addEventListener('tp-value-commit', commit);
  container.prepend(carousel);
  return () => {
    carousel.removeEventListener('tp-value-change', change);
    carousel.removeEventListener('tp-value-commit', commit);
    carousel.remove();
  };
}
