import { html } from 'lit';

export function setupCarouselExample(root) {
  const carousel = root.ownerDocument.createElement('tp-carousel');
  const virtual = root.dataset.example === 'virtual';
  const controlled = root.dataset.example === 'controlled';
  carousel.label = virtual ? 'Virtual project archive' : 'Project collection';
  carousel.items = Array.from({ length: virtual ? 200 : 6 }, (_, id) => ({
    id,
    label: `Project ${id + 1}`,
  }));
  carousel.renderItem = (item) =>
    html`<tp-card
      ><h3>${item.label}</h3>
      <p>Reusable Card content in a keyed Carousel item.</p>
      <tp-button type="button" variant="outline">Open project</tp-button></tp-card
    >`;
  carousel.options = {
    layout: { itemsPerView: 2, gap: 16 },
    ...(virtual ? { virtual: {} } : {}),
    scrollbar: { draggable: true },
  };
  const status = root.querySelector('[data-status]');
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
  root.prepend(carousel);
  return () => {
    carousel.removeEventListener('tp-value-change', change);
    carousel.removeEventListener('tp-value-commit', commit);
    carousel.remove();
  };
}
