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

  await page.evaluate(async () => {
    for (const [name, colorScheme, overrides] of [
      ['light', 'light', {}],
      ['dark', 'dark', {}],
      [
        'scoped',
        'light',
        {
          '--tp-background': '#f6f2e8',
          '--tp-foreground': '#24201c',
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
      const button = document.createElement('tp-button');
      button.variant = 'outline';
      button.textContent = `${name} outline`;
      region.append(button);
      document.body.append(region);
      await button.updateComplete;
    }
  });

  const hoverColors = [];
  for (const name of ['light', 'dark', 'scoped']) {
    const control = page.locator(`[data-color-case="${name}"] tp-button`).locator('button');
    const before = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        image: style.backgroundImage,
        foreground: style.color,
        border: style.borderColor,
      };
    });
    await control.hover();
    const after = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      const host = element.getRootNode().host;
      const probe = document.createElement('span');
      probe.style.backgroundColor = 'color-mix(in oklab, var(--tp-input) 50%, transparent)';
      host.parentElement.append(probe);
      const overlay = getComputedStyle(probe).backgroundColor;
      probe.remove();

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
      const base = sample([style.backgroundColor]);
      const mixed = sample([style.backgroundColor, overlay]);
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
        changed: base.some((value, index) => value !== mixed[index]),
        contrast:
          (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
          (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
      };
    });
    if (
      before.image !== 'none' ||
      !after.image.includes('linear-gradient') ||
      before.background !== after.background ||
      before.foreground !== after.foreground ||
      before.border !== after.border ||
      !after.changed ||
      after.contrast < 4.5
    ) {
      throw new Error(
        `Outline hover colors failed for ${name}: ${JSON.stringify({ before, after })}`,
      );
    }
    hoverColors.push(after.image);
  }
  if (new Set(hoverColors).size !== 3) {
    throw new Error(
      `Light, dark, and scoped hover layers did not resolve distinctly: ${hoverColors}`,
    );
  }

  const inertHover = await page.evaluate(async () => {
    const region = document.querySelector('[data-color-case="light"]');
    const disabled = document.createElement('tp-button');
    disabled.variant = 'outline';
    disabled.disabled = true;
    disabled.focusableWhenDisabled = true;
    disabled.textContent = 'Disabled';
    const secondary = document.createElement('tp-button');
    secondary.variant = 'secondary';
    secondary.textContent = 'Secondary';
    region.append(disabled, secondary);
    await Promise.all([disabled.updateComplete, secondary.updateComplete]);
    return {
      disabled: getComputedStyle(disabled.shadowRoot.querySelector('button')).borderColor,
      secondary: getComputedStyle(secondary.shadowRoot.querySelector('button')).borderColor,
    };
  });
  const disabledControl = page
    .locator('[data-color-case="light"] tp-button')
    .nth(1)
    .locator('button');
  await disabledControl.hover();
  const disabledAfter = await disabledControl.evaluate((element) => ({
    border: getComputedStyle(element).borderColor,
    image: getComputedStyle(element).backgroundImage,
  }));
  const secondaryControl = page
    .locator('[data-color-case="light"] tp-button')
    .nth(2)
    .locator('button');
  await secondaryControl.hover();
  const secondaryAfter = await secondaryControl.evaluate(
    (element) => getComputedStyle(element).borderColor,
  );
  if (
    disabledAfter.border !== inertHover.disabled ||
    disabledAfter.image !== 'none' ||
    secondaryAfter !== inertHover.secondary
  ) {
    throw new Error('Disabled hover or secondary variant border changed unexpectedly');
  }
  console.log(`Button browser contract passed in ${browserName}`);
} finally {
  await browser.close();
}
