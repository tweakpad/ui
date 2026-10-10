/**
 * Documentation example wiring for `tp-color-picker`. Every example uses only the public
 * API: properties, `tp-value-change` / `tp-value-commit`, `tp-harmony-change`, the read-only
 * getters and the Form submit callback. The `data-*` attributes are example setup, not
 * component properties.
 * @param {HTMLElement} root
 * @returns {() => void} cleanup
 */
export function setupColorPickerExample(root) {
  const cleanups = [];
  const listen = (target, type, listener) => {
    target.addEventListener(type, listener);
    cleanups.push(() => target.removeEventListener(type, listener));
  };
  const readout = (after) => {
    const output = root.ownerDocument.createElement('output');
    output.style.display = 'block';
    output.style.marginBlockStart = 'var(--tp-space-2)';
    output.style.font = 'var(--tp-text-sm) var(--tp-font-mono)';
    after.insertAdjacentElement('afterend', output);
    cleanups.push(() => output.remove());
    return output;
  };
  for (const picker of root.querySelectorAll('tp-color-picker')) {
    // Saved swatches: a flat list or labeled groups, as JSON.
    if (picker.hasAttribute('data-swatches')) {
      try {
        picker.swatches = JSON.parse(picker.getAttribute('data-swatches') || '[]');
      } catch {
        picker.swatches = [];
      }
    }
    // Recent colors are application state: keep the last five committed colors, newest
    // first, and supply them through `recent` (the widget keeps no history of its own).
    if (picker.hasAttribute('data-recent')) {
      let recent = [];
      listen(picker, 'tp-value-commit', (event) => {
        if (!event.detail.value || (event.detail.metadata && event.detail.metadata.formatChange))
          return;
        recent = [event.detail.value, ...recent.filter((entry) => entry !== event.detail.value)];
        picker.recent = recent.slice(0, 5);
      });
    }
    // Live readout: the committed and proposed values of the picker.
    if (picker.hasAttribute('data-output')) {
      const output = readout(picker);
      const show = () => {
        output.textContent = picker.value ? picker.value : '(empty)';
      };
      show();
      listen(picker, 'tp-value-change', (event) => {
        if (!event.defaultPrevented)
          output.textContent = `${event.detail.value} (${event.detail.reason})`;
      });
      listen(picker, 'tp-value-commit', show);
    }
    // Harmony readout: one Badge per derived color, base first.
    if (picker.hasAttribute('data-harmony-badges')) {
      const list = root.ownerDocument.createElement('div');
      list.style.display = 'flex';
      list.style.flexWrap = 'wrap';
      list.style.gap = 'var(--tp-space-2)';
      list.style.marginBlockStart = 'var(--tp-space-2)';
      picker.insertAdjacentElement('afterend', list);
      cleanups.push(() => list.remove());
      const render = () => {
        list.replaceChildren(
          ...picker.harmonyColors.map((color) => {
            const badge = root.ownerDocument.createElement('tp-badge');
            badge.setAttribute('variant', 'outline');
            badge.style.setProperty('--tp-badge-color', color);
            badge.textContent = color;
            return badge;
          }),
        );
      };
      // The colors exist once the picker has rendered; follow commits and rule changes after that.
      render();
      if (picker.updateComplete) picker.updateComplete.then(render);
      listen(picker, 'tp-value-commit', render);
      listen(picker, 'tp-harmony-change', () => Promise.resolve().then(render));
    }
    // Controlled owner: accept every proposal by writing it back.
    if (picker.hasAttribute('data-controlled')) {
      picker.value = picker.getAttribute('data-controlled') || '#6d5dfc';
      listen(picker, 'tp-value-change', (event) => {
        picker.value = event.detail.value;
      });
    }
    // Rejecting owner: refuse colors whose sRGB luma exceeds the data-limit (0–1). The
    // proposal metadata carries the floating-point color in the working space of the format.
    if (picker.hasAttribute('data-limit')) {
      const limit = Number(picker.getAttribute('data-limit'));
      listen(picker, 'tp-value-change', (event) => {
        const color = event.detail.metadata && event.detail.metadata.color;
        if (!color || color.space !== 'srgb') return;
        const [r, g, b] = color.coords;
        if (0.2126 * r + 0.7152 * g + 0.0722 * b > limit) event.preventDefault();
      });
    }
  }
  // Form readout: the submitted values of a Form holding the picker.
  for (const form of root.querySelectorAll('tp-form[data-form-output]')) {
    const output = readout(form);
    output.textContent = 'Submit the form to read its values.';
    form.onFormSubmit = (values) => {
      output.textContent = JSON.stringify(values);
    };
    cleanups.push(() => {
      form.onFormSubmit = undefined;
    });
  }
  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
}
