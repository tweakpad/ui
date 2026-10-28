/**
 * Documentation example wiring for `tp-emoji-picker`. Every example uses only the public API:
 * properties, `tp-action`, `tp-value-change` / `tp-value-commit`, `tp-skin-tone-change` and the
 * Form submit callback. The `data-*` attributes are example setup, not component properties.
 * @param {HTMLElement} root
 * @returns {() => void} cleanup
 */
export function setupEmojiPickerExample(root) {
  const cleanups = [];
  const listen = (target, type, listener) => {
    target.addEventListener(type, listener);
    cleanups.push(() => target.removeEventListener(type, listener));
  };
  const readout = (after) => {
    const output = root.ownerDocument.createElement('output');
    output.style.display = 'block';
    output.style.marginBlockStart = 'var(--tp-space-2)';
    output.style.font = 'var(--tp-text-sm) var(--tp-font-sans)';
    after.insertAdjacentElement('afterend', output);
    cleanups.push(() => output.remove());
    return output;
  };
  // A rounded tile with a letter, standing in for an application's own emoji artwork.
  const tile = (color, letter) =>
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="22" font-family="sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`,
    );
  for (const picker of root.querySelectorAll('tp-emoji-picker')) {
    // Live readout: every pick, the committed value and the reason.
    if (picker.hasAttribute('data-output')) {
      const output = readout(picker);
      const show = (text) => (output.textContent = text);
      show(`Value: ${picker.value || '(none)'}`);
      listen(picker, 'tp-action', (event) =>
        show(`Picked ${event.detail.value} (${event.detail.item.label})`),
      );
      listen(picker, 'tp-value-commit', (event) =>
        show(`Value: ${event.detail.value} · reason ${event.detail.reason}`),
      );
    }
    // Recent emoji kept by the application: the latest picks first, at most eighteen.
    if (picker.hasAttribute('data-recent')) {
      picker.recent = ['👍', '🎉', ':ship-it:'];
      listen(picker, 'tp-action', (event) => {
        const value = event.detail.value;
        picker.recent = [value, ...picker.recent.filter((entry) => entry !== value)].slice(0, 18);
      });
    }
    // The application's own emoji in a category of their own.
    if (picker.hasAttribute('data-custom'))
      picker.custom = [
        {
          id: 'workspace',
          label: 'Workspace',
          emojis: [
            { id: 'ship-it', label: 'Ship it', keywords: ['deploy', 'release'], src: tile('#16a34a', 'S') },
            { id: 'looks-good', label: 'Looks good', keywords: ['approve', 'review'], src: tile('#2563eb', 'L') },
            { id: 'on-it', label: 'On it', keywords: ['working', 'busy'], src: tile('#d97706', 'O') },
            { id: 'blocked', label: 'Blocked', keywords: ['stop', 'waiting'], src: tile('#dc2626', 'B') },
          ],
        },
      ];
    // A remembered skin tone: the application stores the accepted tone.
    if (picker.hasAttribute('data-tone')) {
      const output = readout(picker);
      output.textContent = `Skin tone: ${picker.skinTone}`;
      listen(picker, 'tp-skin-tone-change', (event) => {
        if (!event.defaultPrevented) output.textContent = `Skin tone: ${event.detail.value}`;
      });
    }
  }
  // Inserting picks into a message field at the caret, keeping the popup open for several.
  for (const composer of root.querySelectorAll('[data-composer]')) {
    const field = composer.querySelector('tp-text-area');
    const picker = composer.querySelector('tp-emoji-picker');
    if (!field || !picker) continue;
    listen(picker, 'tp-action', (event) => {
      const text = field.value ?? '';
      const start = field.selectionStart ?? text.length;
      const end = field.selectionEnd ?? text.length;
      field.setValue(text.slice(0, start) + event.detail.value + text.slice(end));
    });
    listen(picker, 'tp-open-change', (event) => {
      // Picks keep the popup open; the trigger, Escape and outside presses still close it.
      if (!event.detail.value && event.detail.reason === 'item-press') event.preventDefault();
    });
  }
  // Form submit readout: the submitted entries.
  for (const form of root.querySelectorAll('tp-form[data-form-output]')) {
    const output = readout(form);
    form.onSubmit = (event) => {
      event.preventDefault();
      const entries = [...event.detail.formData.entries()].map(
        ([name, value]) => `${name}=${value}`,
      );
      output.textContent = entries.join('; ') || '(no entries)';
    };
    cleanups.push(() => {
      form.onSubmit = undefined;
    });
  }
  return () => {
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  };
}
