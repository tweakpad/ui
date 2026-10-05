import type { TpMessage } from '../../../../src/components/message/index.js';

async function settle(root: Element = document.body) {
  for (let i = 0; i < 4; i++)
    await Promise.all([...root.querySelectorAll('*')].map((e) => (e as TpMessage).updateComplete));
}

export async function assertMessageLayout() {
  await settle();
  const results: { name: string; pass: boolean; actual: unknown }[] = [];
  const check = (name: string, pass: boolean, actual: unknown) => {
    results.push({ name, pass, actual });
    if (!pass) throw new Error(`${name}: ${JSON.stringify(actual)}`);
  };
  const rect = (message: TpMessage, selector: string) =>
    message.shadowRoot!.querySelector(selector)!.getBoundingClientRect();
  const messages = [...document.querySelectorAll<TpMessage>('tp-message')];
  const withAvatar = messages.filter((m) => !!m.querySelector('tp-avatar'));
  check(
    'Avatar bottoms match Content independently of footer height',
    withAvatar.every((m) => Math.abs(rect(m, '.avatar').bottom - rect(m, '.content').bottom) < 1),
    withAvatar.map((m) => rect(m, '.avatar').bottom - rect(m, '.content').bottom),
  );
  const group = document.querySelector('tp-message-group')!;
  const rows = [...group.querySelectorAll<TpMessage>('tp-message')];
  check(
    'Empty avatar preserves the grouped content column',
    Math.abs(rect(rows[0]!, '.content').left - rect(rows[1]!, '.content').left) < 1,
    rows.map((m) => rect(m, '.content').left),
  );
  const delivered = document.querySelectorAll<TpMessage>('#message-conversation tp-message')[2]!;
  const footer = delivered.querySelector<HTMLElement>('[slot=footer]')!;
  const initial = rect(delivered, '.avatar').bottom;
  const previousStyle = footer.getAttribute('style');
  footer.style.blockSize = '80px';
  check(
    'Growing footer does not displace avatar or content',
    Math.abs(initial - rect(delivered, '.avatar').bottom) < 1 &&
      Math.abs(rect(delivered, '.avatar').bottom - rect(delivered, '.content').bottom) < 1,
    { initial, after: rect(delivered, '.avatar').bottom },
  );
  if (previousStyle === null) footer.removeAttribute('style');
  else footer.setAttribute('style', previousStyle);
  const previousAuthor = delivered.author;
  delivered.author = 'Sender identity';
  await delivered.updateComplete;
  check(
    'End-aligned row keeps Header at logical start and Footer at logical end',
    getComputedStyle(delivered.shadowRoot!.querySelector('.meta')!).justifyContent !== 'flex-end' &&
      getComputedStyle(delivered.shadowRoot!.querySelector('.footer')!).justifyContent ===
        'flex-end',
    {
      header: getComputedStyle(delivered.shadowRoot!.querySelector('.meta')!).justifyContent,
      footer: getComputedStyle(delivered.shadowRoot!.querySelector('.footer')!).justifyContent,
    },
  );
  delivered.author = previousAuthor;
  await delivered.updateComplete;
  check(
    'Removing optional Header collapses its region',
    rect(delivered, '.meta').height === 0,
    rect(delivered, '.meta').height,
  );
  const direction = getComputedStyle(delivered).direction;
  check(
    'End avatar follows logical direction',
    direction === 'rtl'
      ? rect(delivered, '.avatar').right <= rect(delivered, '.content').left
      : rect(delivered, '.avatar').left >= rect(delivered, '.content').right,
    direction,
  );
  const imageRow = document.querySelector<TpMessage>('#message-attachment tp-message')!;
  const image = imageRow.querySelector('tp-attachment')!.getBoundingClientRect();
  const content = rect(imageRow, '.content');
  check(
    'Image attachment follows outgoing logical side',
    direction === 'rtl'
      ? Math.abs(image.left - content.left) < 1
      : Math.abs(image.right - content.right) < 1,
    { image: image.toJSON(), content: content.toJSON() },
  );
  const overflow = messages.filter((m) => m.scrollWidth > m.clientWidth + 1);
  check('All message rows contain their content', overflow.length === 0, overflow.length);
  return results;
}
Object.assign(window, { assertMessageLayout });
