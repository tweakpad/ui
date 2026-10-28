/** Assign live datetimes so relative examples stay current. */
export function setupTimeExample(root) {
  const now = Date.now();
  for (const time of root.querySelectorAll('tp-time[data-offset]'))
    time.datetime = new Date(now + Number(time.dataset.offset) * 1000);
  for (const time of root.querySelectorAll('tp-time[data-days]')) {
    const date = new Date(now + Number(time.dataset.days) * 86_400_000);
    time.datetime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  for (const message of root.querySelectorAll('tp-message[data-offset]'))
    message.timestamp = new Date(now + Number(message.dataset.offset) * 1000);
  const calendar = root.querySelector('tp-time[data-messages]');
  if (calendar) calendar.messages = { today: 'Hoy a las {time}', yesterday: 'Ayer a las {time}' };
  return () => {};
}
