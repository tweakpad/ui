/**
 * Sequences a heading, a held image group and a caption: the group stays held until both its
 * images have loaded and the heading has finished animating in; the caption fades in once the
 * staggered image reveal has completed.
 */
export function setupCoordinatedReveal(root) {
  const heading = root.querySelector('h3');
  const caption = root.querySelector('p');
  const group = root.querySelector('tp-image-group');
  const view = root.ownerDocument.defaultView;
  const duration = view.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';

  const headingShown = heading.animate(
    [
      { opacity: 0, transform: 'translateY(12px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration, easing, fill: 'both' },
  ).finished;

  // Group and member events share names; the group's own events target the group.
  const imagesLoaded =
    group.loadingStatus === 'loaded'
      ? Promise.resolve()
      : new Promise((resolve) => {
          const onStatus = (event) => {
            if (event.target !== group || event.detail.status !== 'loaded') return;
            group.removeEventListener('tp-loading-status-change', onStatus);
            resolve();
          };
          group.addEventListener('tp-loading-status-change', onStatus);
        });

  let active = true;
  void Promise.all([headingShown, imagesLoaded]).then(() => {
    if (active) group.revealHold = false;
  });

  const onRevealed = (event) => {
    if (event.target !== group || !event.detail.revealed) return;
    caption.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing, fill: 'both' });
  };
  group.addEventListener('tp-reveal-change-complete', onRevealed);
  return () => {
    active = false;
    group.removeEventListener('tp-reveal-change-complete', onRevealed);
  };
}
