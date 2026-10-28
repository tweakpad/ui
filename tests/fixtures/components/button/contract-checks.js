// Button browser contract, executed through Chrome DevTools MCP `evaluate_script`.
// Evaluate-only checks return objects of booleans and throw on any failure. Hover, focus and
// keyboard checks are split into "sample"/"verify" helpers so the user input itself is tool-driven.
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const verify = (name, results) => {
  const failed = Object.entries(results).filter(([, value]) => value !== true);
  if (failed.length)
    throw new Error(
      `${name} failed: ${failed.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}`,
    );
  return results;
};
const host = () => document.querySelector('#host');
const control = (button) => button.shadowRoot.querySelector('.control');

/** Keyboard activation: arm, then press Enter and Space through the MCP key tool. */
export function armActivationCounter() {
  const button = document.querySelector('#default');
  button.dataset.activations = '0';
  button.addEventListener('click', () => {
    button.dataset.activations = String(Number(button.dataset.activations) + 1);
  });
  button.focus();
  return button.shadowRoot.activeElement === control(button);
}
export const activations = () => Number(document.querySelector('#default').dataset.activations);
/** Pressed displacement: the native control moves down 1px while the pointer is held. */
export const controlTop = () =>
  control(document.querySelector('#default')).getBoundingClientRect().top;

/** Native and synthetic action semantics inside native and library forms. */
export async function formSemantics() {
  const form = document.createElement('form');
  const button = document.createElement('tp-button');
  button.type = 'submit';
  button.name = 'intent';
  button.value = 'save';
  button.variant = 'outline';
  button.size = 'sm';
  button.innerHTML = '<span slot="icon-start" aria-hidden="true">+</span>Save';
  form.append(button);
  host().append(form);
  const submissions = [];
  let clicks = 0;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submissions.push(new FormData(form, event.submitter).get('intent'));
  });
  button.addEventListener('click', () => {
    clicks += 1;
  });
  await button.updateComplete;
  await frame();
  const native = button.shadowRoot.querySelector('button');
  const leading = button.shadowRoot.querySelector('[part~="button-leading-mark"]');
  const label = button.shadowRoot.querySelector('[part~="button-label"]');
  const trailing = button.shadowRoot.querySelector('[part~="button-trailing-mark"]');
  const parts =
    native.part.contains('button-variant-outline') &&
    native.part.contains('button-size-sm') &&
    leading.part.contains('button-leading-mark-variant-outline') &&
    label.part.contains('button-label-size-sm') &&
    trailing.part.contains('button-trailing-mark-size-sm');
  const optionalMarks = !leading.hidden && trailing.hidden;

  button.click();
  await Promise.resolve();
  const nativeSubmit = clicks === 1 && submissions.join() === 'save';
  const cancel = (event) => event.preventDefault();
  button.addEventListener('click', cancel);
  button.click();
  await Promise.resolve();
  const cancellation = clicks === 2 && submissions.length === 1;
  button.removeEventListener('click', cancel);

  button.disabled = true;
  button.focusableWhenDisabled = true;
  await button.updateComplete;
  button.focus();
  const focusableDisabled =
    button.shadowRoot.activeElement === native &&
    !native.disabled &&
    native.getAttribute('aria-disabled') === 'true';
  button.click();
  await Promise.resolve();
  const disabledBlocked = clicks === 2 && submissions.length === 1;

  button.disabled = false;
  button.nativeAction = false;
  await button.updateComplete;
  const synthetic = button.shadowRoot.querySelector('[role="button"]');
  synthetic.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  synthetic.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
  await Promise.resolve();
  const syntheticSubmit = clicks === 3 && submissions.length === 2;
  const syntheticSemantics = synthetic.tabIndex === 0;

  button.size = 'icon';
  button.ariaLabel = 'Save';
  await button.updateComplete;
  const iconName = synthetic.getAttribute('aria-label') === 'Save';
  form.remove();

  const libraryForm = document.createElement('tp-form');
  const libraryButton = document.createElement('tp-button');
  libraryButton.type = 'submit';
  libraryButton.name = 'intent';
  libraryButton.value = 'publish';
  libraryButton.textContent = 'Publish';
  libraryForm.append(libraryButton);
  host().append(libraryForm);
  const librarySubmissions = [];
  libraryForm.addEventListener('tp-submit', (event) => {
    event.preventDefault();
    librarySubmissions.push({
      value: event.detail.data.get('intent'),
      submitter: event.detail.submitter === libraryButton,
    });
  });
  await libraryButton.updateComplete;
  libraryButton.click();
  await Promise.resolve();
  const libraryFormSubmit =
    librarySubmissions.length === 1 &&
    librarySubmissions[0].value === 'publish' &&
    librarySubmissions[0].submitter;
  libraryForm.remove();
  return verify('formSemantics', {
    parts,
    optionalMarks,
    nativeSubmit,
    cancellation,
    focusableDisabled,
    disabledBlocked,
    syntheticSubmit,
    syntheticSemantics,
    iconName,
    libraryFormSubmit,
  });
}

const plusMark = { viewBox: '0 0 24 24', paths: [{ d: 'M12 5v14M5 12h14', strokeWidth: 2 }] };

/** Icon/loading marks, slot restoration, logical direction, spinner color and link semantics. */
export async function composition() {
  const icon = plusMark;
  const button = document.createElement('tp-button');
  button.innerHTML =
    '<span slot="icon-start" aria-hidden="true">S</span>Compose<span slot="icon-end" aria-hidden="true">E</span>';
  button.icon = icon;
  button.iconPosition = 'trailing';
  host().append(button);
  await button.updateComplete;
  const marks = () => ({
    leading: button.shadowRoot.querySelector('[part~="button-leading-mark"]'),
    trailing: button.shadowRoot.querySelector('[part~="button-trailing-mark"]'),
  });
  let current = marks();
  const trailingIcon =
    current.leading.hidden &&
    !current.trailing.hidden &&
    !current.leading.querySelector('tp-icon') &&
    Boolean(current.trailing.querySelector('tp-icon'));

  button.loadingPosition = 'leading';
  await button.updateComplete;
  current = marks();
  const native = button.shadowRoot.querySelector('button');
  const loadingWins =
    !current.leading.hidden &&
    current.trailing.hidden &&
    Boolean(current.leading.querySelector('tp-spinner')) &&
    !button.shadowRoot.querySelector('tp-icon') &&
    native.getAttribute('aria-busy') === 'true' &&
    !button.disabled &&
    !native.disabled;

  button.disabled = true;
  await button.updateComplete;
  const disabledIsExplicit = native.disabled && native.getAttribute('aria-busy') === 'true';
  button.disabled = false;
  button.loadingPosition = null;
  await button.updateComplete;
  current = marks();
  const iconRestored = current.leading.hidden && Boolean(current.trailing.querySelector('tp-icon'));

  button.icon = undefined;
  await button.updateComplete;
  await frame();
  current = marks();
  const slotsRestored =
    !current.leading.hidden &&
    !current.trailing.hidden &&
    button.querySelector('[slot="icon-start"]')?.textContent === 'S' &&
    button.querySelector('[slot="icon-end"]')?.textContent === 'E';

  button.icon = icon;
  button.iconPosition = 'leading';
  button.dir = 'rtl';
  await button.updateComplete;
  current = marks();
  const label = button.shadowRoot.querySelector('[part~="button-label"]');
  const logicalRtl =
    current.leading.getBoundingClientRect().left > label.getBoundingClientRect().left;
  button.remove();

  const colorButtons = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'].map(
    (variant) => {
      const candidate = document.createElement('tp-button');
      candidate.variant = variant;
      candidate.loadingPosition = 'leading';
      candidate.textContent = variant;
      host().append(candidate);
      return candidate;
    },
  );
  await Promise.all(colorButtons.map((candidate) => candidate.updateComplete));
  const spinnerMatchesText = colorButtons.every((candidate) => {
    const spinner = candidate.shadowRoot.querySelector('tp-spinner');
    return getComputedStyle(spinner).color === getComputedStyle(control(candidate)).color;
  });
  colorButtons.forEach((candidate) => candidate.remove());

  const link = document.createElement('tp-button');
  link.href = '#disabled-link';
  link.target = '_self';
  link.rel = 'next';
  link.download = '';
  link.type = 'submit';
  link.nativeAction = false;
  link.disabled = true;
  link.textContent = 'Navigate';
  host().append(link);
  await link.updateComplete;
  const anchor = link.shadowRoot.querySelector('a');
  location.hash = '';
  link.click();
  await Promise.resolve();
  const disabledLink =
    !link.shadowRoot.querySelector('button') &&
    anchor.getAttribute('href') === '#disabled-link' &&
    anchor.getAttribute('target') === '_self' &&
    anchor.getAttribute('rel') === 'next' &&
    anchor.getAttribute('download') === '' &&
    anchor.getAttribute('aria-disabled') === 'true' &&
    anchor.tabIndex === -1 &&
    location.hash === '';

  link.focusableWhenDisabled = true;
  await link.updateComplete;
  const focusableDisabledLink = anchor.tabIndex === 0;
  link.disabled = false;
  link.download = null;
  link.href = '#enabled-link';
  await link.updateComplete;
  link.click();
  await new Promise((resolve) => setTimeout(resolve));
  const enabledLink = location.hash === '#enabled-link';
  link.remove();
  history.replaceState(null, '', location.pathname + location.search);
  return verify('composition', {
    trailingIcon,
    loadingWins,
    disabledIsExplicit,
    iconRestored,
    slotsRestored,
    logicalRtl,
    spinnerMatchesText,
    disabledLink,
    focusableDisabledLink,
    enabledLink,
  });
}

/**
 * An empty Label in a text size is `hidden` and takes no space, so marks sit one gap apart with
 * the icon-edge padding on both sides; in an icon size it stays visually hidden as the name.
 */
export async function emptyLabel() {
  const created = [];
  const marks =
    '<span slot="icon-start" aria-hidden="true">S</span><span slot="icon-end" aria-hidden="true">E</span>';
  const make = (size, markup = '', name = 'Choose a folder') => {
    const button = document.createElement('tp-button');
    button.variant = 'outline';
    button.size = size;
    if (name) button.setAttribute('aria-label', name);
    button.innerHTML = markup;
    host().append(button);
    created.push(button);
    return button;
  };
  const settled = async (...buttons) => {
    await Promise.all(buttons.map((button) => button.updateComplete));
    await frame();
    await Promise.all(buttons.map((button) => button.updateComplete));
  };
  // A text edit or a child change reaches the Label through the slot observer, then one update.
  const afterMutation = async (button) => {
    await Promise.resolve();
    await button.updateComplete;
  };
  const labelOf = (button) => button.shadowRoot.querySelector('[part~="button-label"]');
  const markOf = (button, edge) => button.shadowRoot.querySelector(`[part~="button-${edge}-mark"]`);
  const collapsed = (button) =>
    labelOf(button).hidden && getComputedStyle(labelOf(button)).display === 'none';
  const shown = (button) =>
    !labelOf(button).hidden &&
    getComputedStyle(labelOf(button)).display !== 'none' &&
    labelOf(button).getBoundingClientRect().width > 0;
  const results = {};
  try {
    for (const size of ['xs', 'sm', 'default', 'lg']) {
      const trigger = make(size, marks);
      const reference = make(
        size,
        '<span slot="icon-start" aria-hidden="true">S</span>Label<span slot="icon-end" aria-hidden="true">E</span>',
      );
      const labelOnly = make(size, 'Label');
      await settled(trigger, reference, labelOnly);
      const style = getComputedStyle(control(trigger));
      const marked = getComputedStyle(control(reference));
      const plain = getComputedStyle(control(labelOnly));
      const leading = markOf(trigger, 'leading').getBoundingClientRect();
      const trailing = markOf(trigger, 'trailing').getBoundingClientRect();
      results[`text:${size}`] =
        collapsed(trigger) &&
        Math.abs(trailing.left - leading.right - parseFloat(style.columnGap)) < 0.5 &&
        style.paddingInlineStart === marked.paddingInlineStart &&
        style.paddingInlineEnd === marked.paddingInlineEnd &&
        style.paddingInlineStart !== plain.paddingInlineStart &&
        style.paddingInlineEnd !== plain.paddingInlineEnd;
    }
    for (const size of ['icon-xs', 'icon-sm', 'icon', 'icon-lg']) {
      const button = make(size, '<span slot="icon-start" aria-hidden="true">S</span>', 'Open');
      await settled(button);
      const label = labelOf(button);
      results[`icon:${size}`] =
        !label.hidden &&
        getComputedStyle(label).position === 'absolute' &&
        label.getBoundingClientRect().width <= 1;
    }

    const spaced = make(
      'default',
      '\n  <span slot="icon-start" aria-hidden="true">S</span>\n  <span slot="icon-end" aria-hidden="true">E</span>\n',
    );
    const element = make('default', '<span>Visible</span>');
    await settled(spaced, element);
    results.whitespaceHidden = collapsed(spaced);
    results.elementShown = shown(element);

    const later = make('default', '', '');
    await settled(later);
    const laterEmpty = collapsed(later);
    later.textContent = 'Later';
    await afterMutation(later);
    results.textAdded = laterEmpty && shown(later);

    const edited = make('default', marks);
    const text = document.createTextNode(' ');
    edited.insertBefore(text, edited.lastChild);
    await settled(edited);
    const editedEmpty = collapsed(edited);
    text.data = 'Edited';
    await afterMutation(edited);
    const editedShown = shown(edited);
    text.data = ' ';
    await afterMutation(edited);
    results.textEdited = editedEmpty && editedShown && collapsed(edited);

    const moved = make('default', '<span aria-hidden="true">M</span>');
    await settled(moved);
    const movedShown = shown(moved);
    moved.firstElementChild.slot = 'icon-end';
    await settled(moved);
    results.slotChanged = movedShown && collapsed(moved) && !markOf(moved, 'trailing').hidden;

    const supplied = make('sm');
    supplied.partContracts = { 'button-label': { content: 'Supplied' } };
    await settled(supplied);
    const suppliedShown = shown(supplied) && labelOf(supplied).textContent === 'Supplied';
    supplied.partContracts = {};
    await settled(supplied);
    results.contentContract = suppliedShown && collapsed(supplied);

    const owned = make('sm');
    owned.partContracts = { 'button-label': { hostProperties: { hidden: false } } };
    await settled(owned);
    results.hiddenOwned = collapsed(owned);

    const convenience = make('default');
    convenience.icon = plusMark;
    await settled(convenience);
    results.iconProperty =
      collapsed(convenience) &&
      !markOf(convenience, 'leading').hidden &&
      Boolean(markOf(convenience, 'leading').querySelector('tp-icon')) &&
      markOf(convenience, 'trailing').hidden;

    const reports = new Map();
    const watched = (name) => {
      const button = document.createElement('tp-button');
      button.size = 'sm';
      if (name) button.setAttribute('aria-label', name);
      button.innerHTML = marks;
      const codes = [];
      button.addEventListener('tp-diagnostic', (event) => codes.push(event.detail?.code));
      reports.set(button, codes);
      host().append(button);
      created.push(button);
      return button;
    };
    const unnamed = watched('');
    const named = watched('Choose a region');
    await settled(unnamed, named);
    await frame();
    results.unnamedDiagnostic =
      reports.get(unnamed).filter((code) => code === 'button-accessible-name-missing').length ===
        1 && collapsed(unnamed);
    results.namedSilent = reports.get(named).length === 0 && collapsed(named);
  } finally {
    created.forEach((button) => button.remove());
  }
  return verify('emptyLabel', results);
}

/** Hover surfaces in light, dark and scoped-token regions. */
export const hoverVariants = ['default', 'secondary', 'destructive', 'outline', 'ghost'];
const hoverCases = [
  ['light', 'light', {}],
  ['dark', 'dark', {}],
  [
    'scoped',
    'light',
    {
      '--tp-background': '#f6f2e8',
      '--tp-foreground': '#24201c',
      '--tp-primary': '#4b3dad',
      '--tp-primary-foreground': '#fff',
      '--tp-secondary': '#d7e7d2',
      '--tp-secondary-foreground': '#24201c',
      '--tp-destructive': '#a52626',
      '--tp-destructive-foreground': '#fff',
      '--tp-accent': '#d7d0ea',
      '--tp-input': '#b67724',
      '--tp-border': '#85612c',
    },
  ],
];
const hoverSamples = new Map();
/** Composites colors in paint order; an entry is a color or `[color, opacity]`. */
const sampleColor = (colors) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, 1, 1);
  for (const entry of colors) {
    const [color, opacity = 1] = Array.isArray(entry) ? entry : [entry];
    context.globalAlpha = opacity;
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
  }
  return [...context.getImageData(0, 0, 1, 1).data];
};
const parentOf = (node) =>
  node.parentElement ?? (node.parentNode instanceof ShadowRoot ? node.parentNode.host : null);
/** The backgrounds painted behind an element, from the nearest opaque ancestor inward. */
const backdrop = (element) => {
  const colors = [];
  for (let node = parentOf(element); node; node = parentOf(node)) {
    const color = getComputedStyle(node).backgroundColor;
    const alpha = sampleColor([color])[3];
    if (alpha === 0) continue;
    colors.unshift(color);
    if (alpha === 255) return colors;
  }
  throw new Error('No opaque backdrop behind the Button');
};
const luminance = (rgb) => {
  const [red, green, blue] = rgb.slice(0, 3).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
/** Creates the three color regions; returns the selectors to hover with the MCP hover tool. */
export async function prepareHover() {
  const buttons = [];
  for (const [name, colorScheme, overrides] of hoverCases) {
    const region = document.createElement('div');
    region.dataset.colorCase = name;
    region.className = 'row';
    region.style.colorScheme = colorScheme;
    region.style.background = 'var(--tp-background)';
    region.style.padding = '1rem';
    for (const [role, value] of Object.entries(overrides)) region.style.setProperty(role, value);
    for (const variant of hoverVariants) {
      const button = document.createElement('tp-button');
      button.variant = variant;
      button.dataset.hoverVariant = variant;
      button.textContent = `${name} ${variant}`;
      region.append(button);
      buttons.push(button);
    }
    host().append(region);
  }
  await Promise.all(buttons.map((button) => button.updateComplete));
  return hoverCases.flatMap(([name]) =>
    hoverVariants.map(
      (variant) => `[data-color-case="${name}"] tp-button[data-hover-variant="${variant}"]`,
    ),
  );
}
const hoverControl = (name, variant) =>
  control(
    document.querySelector(
      `[data-color-case="${name}"] tp-button[data-hover-variant="${variant}"]`,
    ),
  );
/**
 * Sample one control before hovering it (`phase: 'before'`) and 350ms after (`'after'`). Every
 * variant paints its hover on the `::before` fill layer: the layer keeps one color and fades its
 * opacity, while the control's own fill stays as it is. `mixed` is what shows: the backdrop, the
 * control's fill and the layer at its current opacity, composited in paint order.
 */
export function sampleHover(name, variant, phase) {
  const element = hoverControl(name, variant);
  const style = getComputedStyle(element);
  const layer = getComputedStyle(element, '::before');
  const behind = backdrop(element);
  const rest = sampleColor([...behind, style.backgroundColor]);
  const mixed = sampleColor([
    ...behind,
    style.backgroundColor,
    [layer.backgroundColor, Number(layer.opacity)],
  ]);
  const shown = sampleColor([...behind, style.backgroundColor, layer.backgroundColor]);
  const foreground = luminance(sampleColor([style.color]));
  const background = luminance(mixed);
  const sample = {
    background: style.backgroundColor,
    image: style.backgroundImage,
    foreground: style.color,
    border: style.borderColor,
    backdrop: behind,
    overlay: layer.backgroundColor,
    overlayOpacity: layer.opacity,
    overlayChanged: shown.some((value, index) => value !== rest[index]),
    backgroundTransition:
      style.transitionProperty.includes('background-color') &&
      style.transitionDuration.split(',').some((duration) => parseFloat(duration) > 0),
    overlayTransition:
      layer.transitionProperty.includes('opacity') &&
      layer.transitionDuration.split(',').some((duration) => parseFloat(duration) > 0),
    mixed,
    contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
  };
  hoverSamples.set(`${name}:${variant}:${phase}`, sample);
  return sample;
}
/** The fill-layer conditions one sampled before/after pair fails; empty when it passes. */
const hoverFailures = (before, after) =>
  Object.entries({
    'gradient image': before.image !== 'none' || after.image !== 'none',
    'foreground changed': before.foreground !== after.foreground,
    'border changed': before.border !== after.border,
    'control fill changed': before.background !== after.background,
    'background-color transitions': after.backgroundTransition,
    'no layer opacity transition': !after.overlayTransition,
    'layer not hidden at rest': before.overlayOpacity !== '0',
    'layer not shown on hover': after.overlayOpacity !== '1',
    'layer color changed': before.overlay !== after.overlay,
    'layer paints nothing': !after.overlayChanged,
    'hover fill unchanged': before.mixed.join() === after.mixed.join(),
    [`contrast ${after.contrast.toFixed(2)}`]: after.contrast < 4.5,
  })
    .filter(([, failed]) => failed)
    .map(([condition]) => condition);
/** Validates every sampled before/after pair, layer parity and token responsiveness. */
export function verifyHover() {
  const colors = new Map(hoverVariants.map((variant) => [variant, []]));
  const layeredHover = new Map();
  const failures = {};
  for (const [name] of hoverCases)
    for (const variant of hoverVariants) {
      const before = hoverSamples.get(`${name}:${variant}:before`);
      const after = hoverSamples.get(`${name}:${variant}:after`);
      if (!before || !after) throw new Error(`${name} ${variant}: sample both phases first`);
      const failed = hoverFailures(before, after);
      if (failed.length) failures[`${name}:${variant}`] = failed;
      colors.get(variant).push(`${after.overlay}:${after.mixed.join(',')}`);
      if (variant === 'outline' || variant === 'ghost')
        layeredHover.set(name, { ...layeredHover.get(name), [variant]: after });
    }
  // Outline and ghost share one layer color and content color; only outline paints a boundary.
  for (const [name, { outline, ghost }] of layeredHover)
    if (
      outline.overlay !== ghost.overlay ||
      outline.foreground !== ghost.foreground ||
      outline.border === ghost.border
    )
      failures[`${name}:outline-ghost`] = ['layer parity'];
  for (const [variant, values] of colors)
    if (new Set(values).size !== 3) failures[variant] = ['not responsive to scoped tokens'];
  if (Object.keys(failures).length)
    throw new Error(`Button hover colors failed: ${JSON.stringify(failures)}`);
  return { cases: hoverCases.length * hoverVariants.length };
}

/** Disabled, focusable buttons receive no hover mix. */
export async function prepareDisabledHover() {
  const region = document.querySelector('[data-color-case="light"]');
  const buttons = hoverVariants.map((variant) => {
    const button = document.createElement('tp-button');
    button.variant = variant;
    button.dataset.disabledCase = variant;
    button.disabled = true;
    button.focusableWhenDisabled = true;
    button.textContent = `${variant} disabled`;
    region.append(button);
    return button;
  });
  await Promise.all(buttons.map((button) => button.updateComplete));
  return hoverVariants.map((variant) => `[data-disabled-case="${variant}"]`);
}
export function sampleDisabled(variant, phase) {
  const element = control(document.querySelector(`[data-disabled-case="${variant}"]`));
  const style = getComputedStyle(element);
  const sample = [
    style.backgroundColor,
    style.backgroundImage,
    style.borderColor,
    getComputedStyle(element, '::before').opacity,
  ];
  hoverSamples.set(`disabled:${variant}:${phase}`, sample);
  return sample;
}
export function verifyDisabledHover() {
  for (const variant of hoverVariants) {
    const before = hoverSamples.get(`disabled:${variant}:before`);
    const after = hoverSamples.get(`disabled:${variant}:after`);
    if (!before || !after) throw new Error(`disabled ${variant}: sample both phases first`);
    if (before.some((value, index) => value !== after[index]))
      throw new Error(`Disabled ${variant} Button received a hover mix`);
  }
  return { variants: hoverVariants.length };
}

/** The link variant underlines on hover/focus without a fill or overlay. */
export async function prepareLinkHover() {
  const link = document.createElement('tp-button');
  link.variant = 'link';
  link.dataset.linkHoverCase = '';
  link.textContent = 'Link appearance';
  document.querySelector('[data-color-case="light"]').append(link);
  await link.updateComplete;
  return '[data-link-hover-case]';
}
export function sampleLink(phase) {
  const element = control(document.querySelector('[data-link-hover-case]'));
  const style = getComputedStyle(element);
  const sample = {
    colors: [style.backgroundColor, style.backgroundImage, style.borderColor],
    backgroundAlpha: sampleColor([style.backgroundColor])[3],
    layer: getComputedStyle(element, '::before').content,
    decoration: style.textDecorationLine,
    focusVisible: element.matches(':focus-visible'),
  };
  hoverSamples.set(`link:${phase}`, sample);
  return sample;
}
export function verifyLinkHover() {
  const before = hoverSamples.get('link:before');
  const after = hoverSamples.get('link:after');
  if (!before || !after) throw new Error('link: sample both phases first');
  if (
    before.backgroundAlpha !== 0 ||
    after.backgroundAlpha !== 0 ||
    before.decoration !== 'none' ||
    after.decoration !== 'underline' ||
    before.layer !== 'none' ||
    after.layer !== 'none' ||
    before.colors[1] !== 'none' ||
    after.colors[1] !== 'none' ||
    before.colors.some((value, index) => value !== after.colors[index])
  )
    throw new Error(
      `Link Button unexpectedly received a hover mix: ${JSON.stringify({ before, after })}`,
    );
  return after;
}
/** After Tab moves keyboard focus to the link: focus-visible with an underline. */
export function verifyLinkFocus() {
  const sample = sampleLink('focus');
  if (!sample.focusVisible || sample.decoration !== 'underline')
    throw new Error(`Link Button focus underline failed: ${JSON.stringify(sample)}`);
  return sample;
}

/** Under a reduce policy the fill and overlay transitions are instant. */
export async function reducedMotion() {
  const region = document.createElement('div');
  region.setAttribute('motion-policy', 'reduce');
  const buttons = ['default', 'outline', 'ghost'].map((variant) => {
    const button = document.createElement('tp-button');
    button.variant = variant;
    button.textContent = variant;
    region.append(button);
    return button;
  });
  host().append(region);
  await Promise.all(buttons.map((button) => button.updateComplete));
  const durations = buttons.map((button) => ({
    fill: getComputedStyle(control(button)).transitionDuration,
    layer: getComputedStyle(control(button), '::before').transitionDuration,
  }));
  region.remove();
  if (
    durations.some(({ fill, layer }) =>
      [fill, layer].some((value) => value.split(',').some((duration) => parseFloat(duration) > 0)),
    )
  )
    throw new Error(`Reduced-motion Button hover was not instant: ${JSON.stringify(durations)}`);
  return { instant: true, durations };
}

/** Every evaluate-only check in sequence. */
export async function runAll() {
  return {
    formSemantics: await formSemantics(),
    composition: await composition(),
    reducedMotion: await reducedMotion(),
    emptyLabel: await emptyLabel(),
  };
}
