import { chromium, firefox, webkit } from 'playwright';

const browserName = process.env.BROWSER ?? 'chromium';
const browserType = { chromium, firefox, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported browser: ${browserName}`);
const browser = await browserType.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(
    `${process.env.STORYBOOK_URL ?? 'http://localhost:6006'}/iframe.html?id=components-button--default&viewMode=story`,
    { waitUntil: 'networkidle' },
  );
  await page.locator('tp-button').waitFor();
  await page.locator('tp-button').evaluate((button) => {
    button.dataset.activations = '0';
    button.addEventListener('click', () => {
      button.dataset.activations = String(Number(button.dataset.activations) + 1);
    });
    button.focus();
  });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  if ((await page.locator('tp-button').getAttribute('data-activations')) !== '2') {
    throw new Error('Native Button keyboard gestures did not activate exactly once each');
  }
  const result = await page.evaluate(async () => {
    const form = document.createElement('form');
    const button = document.createElement('tp-button');
    button.type = 'submit';
    button.name = 'intent';
    button.value = 'save';
    button.variant = 'outline';
    button.size = 'sm';
    button.innerHTML = '<span slot="icon-start" aria-hidden="true">+</span>Save';
    form.append(button);
    document.body.append(form);
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
    await new Promise((resolve) => requestAnimationFrame(resolve));
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
    document.body.append(libraryForm);
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
    return {
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
    };
  });
  if (Object.values(result).some((value) => value !== true)) {
    throw new Error(`Button browser contract produced ${JSON.stringify(result)}`);
  }

  const hoverVariants = ['default', 'secondary', 'destructive', 'outline', 'ghost'];
  await page.evaluate(async (variants) => {
    for (const [name, colorScheme, overrides] of [
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
    ]) {
      const region = document.createElement('div');
      region.dataset.colorCase = name;
      region.style.colorScheme = colorScheme;
      region.style.background = 'var(--tp-background)';
      region.style.padding = '1rem';
      for (const [role, value] of Object.entries(overrides)) {
        region.style.setProperty(role, value);
      }
      const buttons = variants.map((variant) => {
        const button = document.createElement('tp-button');
        button.variant = variant;
        button.dataset.hoverVariant = variant;
        button.textContent = `${name} ${variant}`;
        region.append(button);
        return button;
      });
      document.body.append(region);
      await Promise.all(buttons.map((button) => button.updateComplete));
    }
  }, hoverVariants);

  const hoverColors = new Map(hoverVariants.map((variant) => [variant, []]));
  const layeredHover = new Map();
  for (const name of ['light', 'dark', 'scoped']) {
    for (const variant of hoverVariants) {
      const control = page
        .locator(`[data-color-case="${name}"] tp-button[data-hover-variant="${variant}"]`)
        .locator('button');
      const before = await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          image: style.backgroundImage,
          foreground: style.color,
          border: style.borderColor,
          overlayOpacity: getComputedStyle(element, '::before').opacity,
        };
      });
      await control.hover();
      await page.waitForTimeout(200);
      const after = await control.evaluate((element, currentVariant) => {
        const style = getComputedStyle(element);
        const layer = getComputedStyle(element, '::before');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const sample = (colors) => {
          context.clearRect(0, 0, 1, 1);
          for (const color of colors) {
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
          }
          return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const overlay =
          currentVariant === 'outline' || currentVariant === 'ghost' ? layer.backgroundColor : null;
        const base = sample([style.backgroundColor]);
        const mixed = sample(overlay ? [style.backgroundColor, overlay] : [style.backgroundColor]);
        const foreground = sample([style.color]);
        const luminance = (rgb) => {
          const [red, green, blue] = rgb.map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        };
        const foregroundLuminance = luminance(foreground);
        const backgroundLuminance = luminance(mixed);
        return {
          background: style.backgroundColor,
          image: style.backgroundImage,
          foreground: style.color,
          border: style.borderColor,
          overlay,
          overlayOpacity: layer.opacity,
          backgroundTransition:
            style.transitionProperty.includes('background-color') &&
            style.transitionDuration.split(',').some((duration) => parseFloat(duration) > 0),
          overlayTransition:
            layer.transitionProperty.includes('opacity') &&
            layer.transitionDuration.split(',').some((duration) => parseFloat(duration) > 0),
          mixed,
          overlayChanged: base.some((value, index) => value !== mixed[index]),
          contrast:
            (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
            (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
        };
      }, variant);
      const layered = variant === 'outline' || variant === 'ghost';
      if (
        before.image !== 'none' ||
        before.foreground !== after.foreground ||
        before.border !== after.border ||
        after.contrast < 4.5 ||
        after.image !== 'none' ||
        !after.backgroundTransition ||
        (layered &&
          (!after.overlayTransition ||
            before.overlayOpacity !== '0' ||
            after.overlayOpacity !== '1' ||
            !after.overlayChanged)) ||
        (!layered && before.background === after.background) ||
        (variant === 'outline' && before.background !== after.background) ||
        (variant === 'ghost' && before.background === after.background)
      ) {
        throw new Error(
          `${variant} hover colors failed for ${name}: ${JSON.stringify({ before, after })}`,
        );
      }
      hoverColors.get(variant).push(`${after.background}:${after.mixed.join(',')}`);
      if (layered) {
        const fills = layeredHover.get(name) ?? new Map();
        fills.set(variant, after);
        layeredHover.set(name, fills);
      }
    }
  }
  for (const [name, fills] of layeredHover) {
    const outline = fills.get('outline');
    const ghost = fills.get('ghost');
    if (
      outline.background !== ghost.background ||
      outline.foreground !== ghost.foreground ||
      outline.overlay !== ghost.overlay ||
      outline.mixed.join() !== ghost.mixed.join() ||
      outline.border === ghost.border
    ) {
      throw new Error(`Outline and ghost hover surfaces diverged for ${name}`);
    }
  }
  for (const [variant, colors] of hoverColors) {
    if (new Set(colors).size !== 3) {
      throw new Error(`${variant} hover did not respond to light, dark, and scoped tokens`);
    }
  }

  await page.evaluate(async (variants) => {
    const region = document.querySelector('[data-color-case="light"]');
    const buttons = variants.map((variant) => {
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
  }, hoverVariants);
  for (const variant of hoverVariants) {
    const control = page.locator(`[data-disabled-case="${variant}"]`).locator('button');
    const before = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return [
        style.backgroundColor,
        style.backgroundImage,
        style.borderColor,
        getComputedStyle(element, '::before').opacity,
      ];
    });
    await control.hover();
    const after = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return [
        style.backgroundColor,
        style.backgroundImage,
        style.borderColor,
        getComputedStyle(element, '::before').opacity,
      ];
    });
    if (before.some((value, index) => value !== after[index])) {
      throw new Error(`Disabled ${variant} Button received a hover mix`);
    }
  }
  await page.evaluate(async () => {
    const link = document.createElement('tp-button');
    link.variant = 'link';
    link.dataset.linkHoverCase = '';
    link.textContent = 'Link appearance';
    document.querySelector('[data-color-case="light"]').append(link);
    await link.updateComplete;
  });
  const linkControl = page.locator('[data-link-hover-case] button');
  const linkBefore = await linkControl.evaluate((element) => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return {
      colors: [style.backgroundColor, style.backgroundImage, style.borderColor],
      backgroundAlpha: context.getImageData(0, 0, 1, 1).data[3],
      layer: getComputedStyle(element, '::before').content,
    };
  });
  await linkControl.hover();
  const linkAfter = await linkControl.evaluate((element) => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return {
      colors: [style.backgroundColor, style.backgroundImage, style.borderColor],
      backgroundAlpha: context.getImageData(0, 0, 1, 1).data[3],
      layer: getComputedStyle(element, '::before').content,
    };
  });
  if (
    linkBefore.backgroundAlpha !== 0 ||
    linkAfter.backgroundAlpha !== 0 ||
    linkBefore.layer !== 'none' ||
    linkAfter.layer !== 'none' ||
    linkBefore.colors[1] !== 'none' ||
    linkAfter.colors[1] !== 'none' ||
    linkBefore.colors.some((value, index) => value !== linkAfter.colors[index])
  ) {
    throw new Error('Link Button unexpectedly received a hover mix');
  }
  const reducedMotion = await page.evaluate(async () => {
    const region = document.createElement('div');
    region.setAttribute('motion-policy', 'reduce');
    const buttons = ['default', 'outline', 'ghost'].map((variant) => {
      const button = document.createElement('tp-button');
      button.variant = variant;
      button.textContent = variant;
      region.append(button);
      return button;
    });
    document.body.append(region);
    await Promise.all(buttons.map((button) => button.updateComplete));
    const durations = buttons.map((button) => {
      const control = button.shadowRoot.querySelector('button');
      return {
        fill: getComputedStyle(control).transitionDuration,
        layer: getComputedStyle(control, '::before').transitionDuration,
      };
    });
    region.remove();
    return durations;
  });
  if (
    reducedMotion.some(({ fill, layer }) =>
      [fill, layer].some((durations) =>
        durations.split(',').some((duration) => parseFloat(duration) > 0),
      ),
    )
  ) {
    throw new Error(
      `Reduced-motion Button hover was not instant: ${JSON.stringify(reducedMotion)}`,
    );
  }
  console.log(`Button browser contract passed in ${browserName}`);
} finally {
  await browser.close();
}
