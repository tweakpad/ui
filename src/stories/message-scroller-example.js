// Application-owned commands and subscriptions; no scroll handlers or hidden state.
export function setupMessageScrollerExample(host) {
  const root = host.querySelector('tp-message-scroller');
  const content = host.querySelector('tp-message-scroller-content');
  const output = host.querySelector('output');
  const abort = new host.ownerDocument.defaultView.AbortController();
  let unsubscribe = () => {};
  root.updateComplete.then(() => {
    if (abort.signal.aborted) return;
    unsubscribe = root.provider.subscribeVisibility(({ visibleMessageIds, currentAnchorId }) => {
      output.textContent = `Visible: ${visibleMessageIds.join(', ') || 'none'} · Current turn: ${currentAnchorId || 'none'}`;
    });
  });
  host.addEventListener(
    'click',
    (event) => {
      const action = event.target.closest('tp-button')?.dataset.action;
      if (action === 'start') root.scrollToStart({ behavior: 'smooth' });
      if (action === 'end') root.scrollToEnd({ behavior: 'smooth' });
      if (action === 'turn')
        root.scrollToMessage('turn-2', { align: 'start', scrollMargin: 24, behavior: 'smooth' });
      if (action === 'history') {
        const item = host.ownerDocument.createElement('tp-message-scroller-item');
        item.messageId = `earlier-${++historyCount}`;
        // This is transcript prose, not a recreated control.
        item.textContent = 'An earlier note: keep the pilot focused on one complete journey.';
        content.prepend(item);
      }
    },
    { signal: abort.signal },
  );
  let historyCount = 0;
  return () => {
    abort.abort();
    unsubscribe();
  };
}
