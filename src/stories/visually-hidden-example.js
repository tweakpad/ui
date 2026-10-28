import { mapPinIcon } from '../icons/map.js';
import { sunIcon } from '../icons/sun.js';
import { waypointsIcon } from '../icons/waypoints.js';

export function setupVisuallyHiddenExample(root) {
  for (const icon of root.querySelectorAll('tp-icon[data-layer-icon]'))
    icon.icon = { campsites: mapPinIcon, routes: waypointsIcon, sun: sunIcon }[
      icon.dataset.layerIcon
    ];
  const input = root.querySelector('tp-input');
  const status = root.querySelector('[data-match-count]');
  if (!input || !status) return () => {};
  const items = [...root.querySelectorAll('tp-list-item')];
  // The list shows the matches; the hidden status region says how many there are.
  const filter = () => {
    const query = String(input.value).trim().toLowerCase();
    const matches = items.filter((item) => {
      const shown = item.textContent.toLowerCase().includes(query);
      item.hidden = !shown;
      return shown;
    });
    status.textContent = query
      ? `${matches.length} of ${items.length} tools match “${query}”.`
      : `All ${items.length} tools shown.`;
  };
  input.addEventListener('input', filter);
  return () => input.removeEventListener('input', filter);
}
