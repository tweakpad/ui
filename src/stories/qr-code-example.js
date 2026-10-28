/** Encode what is typed and download the code at a chosen size. */
export function setupQrCodeExample(root) {
  const input = root.querySelector('tp-input');
  const code = root.querySelector('tp-qr-code');
  const button = root.querySelector('tp-button');
  const update = (event) => {
    code.value = String(event.detail.value ?? '');
  };
  const download = () => code.download('png', { size: 2048, filename: 'link' });
  input.addEventListener('tp-value-change', update);
  button.addEventListener('click', download);
  code.value = input.value;
  return () => {
    input.removeEventListener('tp-value-change', update);
    button.removeEventListener('click', download);
  };
}
