/** Public API wiring shared by rendered examples and copyable source. */
export function setupSliderExample(root) {
  const slider = root.querySelector('tp-slider');
  const cleanup = [];
  const listen = (target, type, handler) => {
    target?.addEventListener(type, handler);
    if (target) cleanup.push(() => target.removeEventListener(type, handler));
  };
  if (slider.hasAttribute('data-output')) {
    slider.partContracts = {
      'slider-output': {
        content: (state) => state.formattedValues.join(' – ') + (slider.dataset.unit || ''),
      },
    };
  }
  if (slider.dataset.format === 'currency')
    slider.format = { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 };
  if (slider.dataset.format === 'percent')
    slider.format = { style: 'percent', maximumFractionDigits: 0 };
  if (slider.hasAttribute('data-controlled'))
    slider.onValueChange = (event) => {
      if (!event.defaultPrevented && !event.detail.cancelled) slider.value = event.detail.value;
    };
  if (!slider.closest('tp-field'))
    slider.getAccessibleLabel = (index) =>
      slider.values.length > 1
        ? `${slider.label || 'Range'} ${slider.values.length === 2 ? (index === 0 ? 'minimum' : 'maximum') : `point ${index + 1}`}`
        : slider.label || slider.getAttribute('aria-label') || 'Value';
  const status = root.querySelector('[data-status]');
  listen(slider, 'tp-value-change', (event) => {
    if (slider.hasAttribute('data-limit') && Number(event.detail.value) > 80) {
      event.preventDefault();
      if (status) status.textContent = 'Values above 80 are rejected; the previous value remains.';
    }
  });
  listen(slider, 'tp-value-commit', (event) => {
    if (status) status.textContent = `Committed ${event.detail.value} (${event.detail.reason}).`;
  });
  listen(root.querySelector('[data-restore]'), 'click', () => {
    slider.value = [0.3, 0.7];
  });
  listen(root.querySelector('[data-add]'), 'click', () => {
    if (slider.querySelectorAll('tp-slider-thumb').length > 1) return;
    const thumb = root.ownerDocument.createElement('tp-slider-thumb');
    thumb.index = 1;
    slider.append(thumb);
    slider.setValue([25, 75]);
  });
  listen(root.querySelector('[data-remove]'), 'click', () => {
    const thumbs = slider.querySelectorAll('tp-slider-thumb');
    if (thumbs.length > 1) thumbs[thumbs.length - 1].remove();
  });
  const form = root.querySelector('tp-form');
  if (form)
    form.onFormSubmit = (values) => {
      if (status) status.textContent = JSON.stringify(values);
    };
  return () => {
    cleanup.forEach((release) => release());
    slider.onValueChange = undefined;
    if (form) form.onFormSubmit = undefined;
  };
}
