// Copy button browser contract, executed through Chrome DevTools MCP `evaluate_script`.
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async (...elements) => {
  for (let i = 0; i < 3; i++) {
    await Promise.all(elements.map((element) => element.updateComplete));
    await frame();
  }
};
const button = (copy) => copy.shadowRoot.querySelector('tp-button');
const fail = (name, result) => {
  const failed = Object.entries(result).filter(([, value]) => value !== true);
  if (failed.length)
    throw new Error(
      `${name} failed: ${failed.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}`,
    );
  return result;
};

/**
 * Event order, copied state and name swap, duration reset, cancellation, disabled, labels.
 * `readClipboard` also reads the clipboard back, which prompts for permission in Chrome.
 */
export async function run({ readClipboard = false } = {}) {
  const host = document.querySelector('#host');
  host.replaceChildren();
  const copy = document.createElement('tp-copy-button');
  copy.value = 'contract value';
  copy.label = 'Copy contract';
  copy.duration = 300;
  host.append(copy);
  await settle(copy);
  const events = [];
  for (const type of ['tp-copy', 'tp-copied', 'tp-copy-error'])
    copy.addEventListener(type, (event) => events.push(`${type}:${event.detail.value}`));
  const inner = button(copy);
  const restName = inner.getAttribute('aria-label') === 'Copy contract' && !copy.copied;
  const result = await copy.copy();
  await settle(copy);
  const copiedState =
    result === true &&
    copy.copied &&
    copy.hasAttribute('data-copied') &&
    inner.hasAttribute('data-copied') &&
    inner.getAttribute('aria-label') === 'Copied';
  const eventOrder = events.join(' ') === 'tp-copy:contract value tp-copied:contract value';
  await wait(450);
  await settle(copy);
  const reset = !copy.copied && inner.getAttribute('aria-label') === 'Copy contract';

  events.length = 0;
  const cancel = (event) => event.preventDefault();
  copy.addEventListener('tp-copy', cancel);
  const cancelled =
    (await copy.copy()) === false && events.join(' ') === 'tp-copy:contract value' && !copy.copied;
  copy.removeEventListener('tp-copy', cancel);

  copy.disabled = true;
  await settle(copy);
  const disabled = (await copy.copy()) === false && button(copy).disabled === true;
  copy.disabled = false;

  copy.showLabel = true;
  copy.copiedLabel = 'Done';
  await settle(copy);
  const labelled =
    button(copy).textContent.trim() === 'Copy contract' &&
    !button(copy).hasAttribute('aria-label') &&
    !!copy.shadowRoot.querySelector('tp-icon[slot="icon-start"]');
  await copy.copy();
  await settle(copy);
  const labelledCopied = button(copy).textContent.trim() === 'Done';
  await wait(450);

  let clipboard = 'unavailable';
  if (readClipboard)
    try {
      clipboard =
        (await navigator.clipboard.readText()) === 'contract value' ? 'matches' : 'differs';
    } catch {
      clipboard = 'unavailable';
    }
  return fail('copy button contract', {
    restName,
    copiedState,
    eventOrder,
    reset,
    cancelled,
    disabled,
    labelled,
    labelledCopied,
    clipboard: clipboard === 'matches' || clipboard === 'unavailable',
  });
}
