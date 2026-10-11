/**
 * Documentation example wiring for `tp-easing-editor`. Every example uses only the public
 * API: properties, `tp-value-change` / `tp-value-commit`, `tp-duration-change`,
 * `tp-adapter-change`, the read-only getters and the Form submit callback. The `data-*`
 * attributes are example setup, not component properties.
 * @param {HTMLElement} root
 * @returns {() => void} cleanup
 */
export function setupEasingEditorExample(root) {
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
  for (const editor of root.querySelectorAll('tp-easing-editor')) {
    // A controlled owner: the attribute value is the owner's state; proposals are written back.
    if (editor.hasAttribute('data-controlled')) {
      editor.value = editor.getAttribute('data-controlled') || '';
      listen(editor, 'tp-value-change', (event) => {
        if (!event.defaultPrevented) editor.value = event.detail.value;
      });
    }
    // Rejecting proposals whose Bézier control points overshoot beyond the limit.
    if (editor.hasAttribute('data-limit')) {
      const limit = Number(editor.getAttribute('data-limit'));
      listen(editor, 'tp-value-change', (event) => {
        const curve = event.detail.metadata && event.detail.metadata.curve;
        if (!curve || curve.kind !== 'bezier') return;
        if (Math.max(curve.y1, curve.y2) > limit || Math.min(curve.y1, curve.y2) < -limit)
          event.preventDefault();
      });
    }
    // A second export adapter beside CSS: the in-house motion library notation.
    if (editor.hasAttribute('data-adapters')) {
      editor.adapters = [
        { id: 'css', label: 'CSS', format: (_curve, context) => context.css },
        {
          id: 'motion',
          label: 'Motion',
          format: (curve, context) =>
            curve.kind === 'bezier'
              ? `ease: [${[curve.x1, curve.y1, curve.x2, curve.y2].join(', ')}]`
              : `ease: [${context
                  .samples(12)
                  .map((point) => Number(point.output.toFixed(3)))
                  .join(', ')}]`,
        },
      ];
    }
    // Live readout: the committed value, the output and the last proposal reason.
    if (editor.hasAttribute('data-output')) {
      const output = readout(editor);
      const show = () => {
        output.textContent = editor.value ? `${editor.value} → ${editor.output}` : '(empty)';
      };
      show();
      listen(editor, 'tp-value-change', (event) => {
        if (!event.defaultPrevented)
          output.textContent = `${event.detail.value} (${event.detail.reason})`;
      });
      listen(editor, 'tp-value-commit', show);
      listen(editor, 'tp-duration-change', () => Promise.resolve().then(show));
      listen(editor, 'tp-adapter-change', () => Promise.resolve().then(show));
    }
  }
  // Dialog hosts: the Button opens the Dialog that holds the compact editor.
  for (const trigger of root.querySelectorAll('[data-opens]')) {
    const dialog = root.querySelector(`#${trigger.getAttribute('data-opens')}`);
    if (!dialog) continue;
    listen(trigger, 'click', () => dialog.setOpen && dialog.setOpen(true, 'trigger-press'));
  }
  // Form submit readout.
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
