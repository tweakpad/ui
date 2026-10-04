import { refreshIcon } from '../icons/refresh.js';

export function setupOneTimeCodeExample(root) {
  const code = root.querySelector('tp-otp-field');
  const output = root.querySelector('output');
  const form = root.querySelector('tp-form');
  const resend = root.querySelector('[data-resend]');
  if (resend) resend.icon = refreshIcon;
  const cleanup = [];
  const listen = (element, type, listener) => {
    element?.addEventListener(type, listener);
    cleanup.push(() => element?.removeEventListener(type, listener));
  };
  let connected = true;
  if (code.hasAttribute('data-controlled')) {
    code.value = code.getAttribute('data-controlled');
    const report = () => {
      if (connected)
        output.textContent = code.value
          ? `You entered: ${code.value}`
          : 'Enter your one-time code.';
    };
    listen(code, 'tp-value-change', (event) => {
      if (event.defaultPrevented || event.detail.cancelled) return;
      code.value = event.detail.value;
      root.ownerDocument.defaultView.queueMicrotask(report);
    });
    report();
  }
  listen(form, 'tp-submit', (event) => {
    event.preventDefault();
    output.textContent = `Submitted code: ${event.detail.values.code}`;
  });
  listen(form, 'tp-reset', () => {
    output.textContent = '';
  });
  listen(resend, 'click', () => {
    output.textContent = 'Resend requested.';
  });
  return () => {
    connected = false;
    cleanup.forEach((release) => release());
  };
}
