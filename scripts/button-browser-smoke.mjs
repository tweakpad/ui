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
  const defaultControl = page.locator('tp-button').locator('button');
  const defaultControlBox = await defaultControl.boundingBox();
  if (!defaultControlBox) throw new Error('Default Button has no pointer target');
  const restingTop = await defaultControl.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  await page.mouse.move(
    defaultControlBox.x + defaultControlBox.width / 2,
    defaultControlBox.y + defaultControlBox.height / 2,
  );
  await page.mouse.down();
  const pressedTop = await defaultControl.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  await page.mouse.up();
  const releasedTop = await defaultControl.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  if (pressedTop !== restingTop + 1 || releasedTop !== restingTop) {
    throw new Error(
      `Button pressed displacement was not 1px: ${JSON.stringify({ restingTop, pressedTop, releasedTop })}`,
    );
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

  const composition = await page.evaluate(async () => {
    const icon = {
      viewBox: '0 0 24 24',
      paths: [{ d: 'M12 5v14M5 12h14', strokeWidth: 2 }],
    };
    const button = document.createElement('tp-button');
    button.innerHTML =
      '<span slot="icon-start" aria-hidden="true">S</span>Compose<span slot="icon-end" aria-hidden="true">E</span>';
    button.icon = icon;
    button.iconPosition = 'trailing';
    document.body.append(button);
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
    const iconRestored =
      current.leading.hidden && Boolean(current.trailing.querySelector('tp-icon'));

    button.icon = undefined;
    await button.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
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
        document.body.append(candidate);
        return candidate;
      },
    );
    await Promise.all(colorButtons.map((candidate) => candidate.updateComplete));
    const spinnerMatchesText = colorButtons.every((candidate) => {
      const control = candidate.shadowRoot.querySelector('.control');
      const spinner = candidate.shadowRoot.querySelector('tp-spinner');
      return getComputedStyle(spinner).color === getComputedStyle(control).color;
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
    document.body.append(link);
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

    return {
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
    };
  });
  if (Object.values(composition).some((value) => value !== true)) {
    throw new Error(`Button composition contract produced ${JSON.stringify(composition)}`);
  }

  const buttonGroup = await page.evaluate(async () => {
    const group = document.createElement('tp-button-group');
    group.label = 'Document actions';
    const archive = document.createElement('tp-button');
    archive.variant = 'outline';
    archive.textContent = 'Archive';
    const report = document.createElement('tp-button');
    report.variant = 'outline';
    report.disabled = true;
    report.textContent = 'Report';
    const more = document.createElement('tp-button');
    more.variant = 'outline';
    more.href = '#group-link';
    more.textContent = 'More';
    group.append(archive, report, more);
    document.body.append(group);
    await Promise.all([
      group.updateComplete,
      archive.updateComplete,
      report.updateComplete,
      more.updateComplete,
    ]);

    const root = group.shadowRoot.querySelector('[part~="button-group"]');
    const controls = [archive, report, more].map((button) =>
      button.shadowRoot.querySelector('.control'),
    );
    const horizontalStyles = controls.map((control) => getComputedStyle(control));
    const horizontalBoxes = controls.map((control) => control.getBoundingClientRect());
    const nonZero = (value) => parseFloat(value) > 0;
    const horizontalCorners =
      nonZero(horizontalStyles[0].borderTopLeftRadius) &&
      !nonZero(horizontalStyles[0].borderTopRightRadius) &&
      !nonZero(horizontalStyles[1].borderTopLeftRadius) &&
      !nonZero(horizontalStyles[1].borderTopRightRadius) &&
      !nonZero(horizontalStyles[2].borderTopLeftRadius) &&
      nonZero(horizontalStyles[2].borderTopRightRadius);
    const horizontalSeams =
      horizontalStyles[1].borderLeftWidth === '0px' &&
      horizontalStyles[2].borderLeftWidth === '0px' &&
      Math.abs(horizontalBoxes[0].right - horizontalBoxes[1].left) < 0.1 &&
      Math.abs(horizontalBoxes[1].right - horizontalBoxes[2].left) < 0.1;

    let archiveClicks = 0;
    archive.addEventListener('click', () => {
      archiveClicks += 1;
    });
    archive.click();
    report.click();
    const membersStayButtons =
      archiveClicks === 1 &&
      controls[0].localName === 'button' &&
      controls[1].localName === 'button' &&
      controls[1].disabled &&
      controls[2].localName === 'a' &&
      controls[2].getAttribute('href') === '#group-link';
    const defaultControlStyle = getComputedStyle(controls[0]);
    const typographyResolvesOnce =
      Math.abs(parseFloat(getComputedStyle(document.documentElement).fontSize) - 16) < 0.1 &&
      Math.abs(parseFloat(defaultControlStyle.fontSize) - 15) < 0.1 &&
      defaultControlStyle.transform === 'none';
    report.focusableWhenDisabled = true;
    await report.updateComplete;
    report.focus();
    const focusRaised = getComputedStyle(report).zIndex === '1';

    const sizePairs = [
      ['sm', 'icon-sm'],
      ['default', 'icon'],
      ['lg', 'icon-lg'],
    ];
    const pairedSizeGeometry = [];
    for (const [textSize, iconSize] of sizePairs) {
      const sizeGroup = document.createElement('tp-button-group');
      const textButton = document.createElement('tp-button');
      textButton.variant = 'outline';
      textButton.size = textSize;
      textButton.textContent = textSize;
      const iconButton = document.createElement('tp-button');
      iconButton.variant = 'outline';
      iconButton.size = iconSize;
      iconButton.ariaLabel = `${textSize} icon`;
      sizeGroup.append(textButton, iconButton);
      document.body.append(sizeGroup);
      await Promise.all([
        sizeGroup.updateComplete,
        textButton.updateComplete,
        iconButton.updateComplete,
      ]);
      const textHostBox = textButton.getBoundingClientRect();
      const iconHostBox = iconButton.getBoundingClientRect();
      const textControlBox = textButton.shadowRoot
        .querySelector('.control')
        .getBoundingClientRect();
      const iconControlBox = iconButton.shadowRoot
        .querySelector('.control')
        .getBoundingClientRect();
      pairedSizeGeometry.push({
        textSize,
        iconSize,
        textHostHeight: textHostBox.height,
        iconHostHeight: iconHostBox.height,
        textControlHeight: textControlBox.height,
        iconControlWidth: iconControlBox.width,
        iconControlHeight: iconControlBox.height,
      });
      sizeGroup.remove();
    }
    const pairedSizesShareGeometry = pairedSizeGeometry.every(
      ({
        textHostHeight,
        iconHostHeight,
        textControlHeight,
        iconControlWidth,
        iconControlHeight,
      }) =>
        Math.abs(textControlHeight - iconControlHeight) < 0.1 &&
        Math.abs(textHostHeight - textControlHeight) < 0.1 &&
        Math.abs(iconHostHeight - iconControlHeight) < 0.1 &&
        Math.abs(iconControlWidth - iconControlHeight) < 0.1,
    );
    if (!pairedSizesShareGeometry) {
      throw new Error(`Button size geometry diverged: ${JSON.stringify(pairedSizeGeometry)}`);
    }

    group.orientation = 'vertical';
    await group.updateComplete;
    const verticalStyles = controls.map((control) => getComputedStyle(control));
    const verticalBoxes = controls.map((control) => control.getBoundingClientRect());
    const verticalCorners =
      nonZero(verticalStyles[0].borderTopLeftRadius) &&
      nonZero(verticalStyles[0].borderTopRightRadius) &&
      !nonZero(verticalStyles[1].borderTopLeftRadius) &&
      !nonZero(verticalStyles[1].borderBottomLeftRadius) &&
      nonZero(verticalStyles[2].borderBottomLeftRadius) &&
      nonZero(verticalStyles[2].borderBottomRightRadius);
    const verticalSeams =
      verticalStyles[1].borderTopWidth === '0px' &&
      verticalStyles[2].borderTopWidth === '0px' &&
      Math.abs(verticalBoxes[0].bottom - verticalBoxes[1].top) < 0.1 &&
      Math.abs(verticalBoxes[1].bottom - verticalBoxes[2].top) < 0.1 &&
      verticalBoxes.every((box) => Math.abs(box.width - verticalBoxes[0].width) < 0.1);
    const orderUnchanged =
      group.children[0] === archive && group.children[1] === report && group.children[2] === more;

    group.orientation = 'horizontal';
    group.joined = false;
    await group.updateComplete;
    const unjoinedStyles = controls.map((control) => getComputedStyle(control));
    const unjoined =
      parseFloat(getComputedStyle(root).gap) > 0 &&
      unjoinedStyles.every(
        (style) =>
          nonZero(style.borderTopLeftRadius) &&
          nonZero(style.borderTopRightRadius) &&
          style.borderLeftWidth !== '0px',
      );
    const semantics =
      root.getAttribute('role') === 'group' &&
      root.getAttribute('aria-label') === 'Document actions';
    group.remove();

    return {
      horizontalCorners,
      horizontalSeams,
      membersStayButtons,
      typographyResolvesOnce,
      focusRaised,
      pairedSizesShareGeometry,
      verticalCorners,
      verticalSeams,
      orderUnchanged,
      unjoined,
      semantics,
    };
  });
  if (Object.values(buttonGroup).some((value) => value !== true)) {
    throw new Error(`Button group contract produced ${JSON.stringify(buttonGroup)}`);
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
      await page.waitForTimeout(350);
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
      decoration: style.textDecorationLine,
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
      decoration: style.textDecorationLine,
    };
  });
  if (
    linkBefore.backgroundAlpha !== 0 ||
    linkAfter.backgroundAlpha !== 0 ||
    linkBefore.decoration !== 'none' ||
    linkAfter.decoration !== 'underline' ||
    linkBefore.layer !== 'none' ||
    linkAfter.layer !== 'none' ||
    linkBefore.colors[1] !== 'none' ||
    linkAfter.colors[1] !== 'none' ||
    linkBefore.colors.some((value, index) => value !== linkAfter.colors[index])
  ) {
    throw new Error('Link Button unexpectedly received a hover mix');
  }
  await page.mouse.move(0, 0);
  await page.keyboard.press('Tab');
  await linkControl.focus();
  const linkFocus = await linkControl.evaluate((element) => ({
    focusVisible: element.matches(':focus-visible'),
    decoration: getComputedStyle(element).textDecorationLine,
  }));
  if (!linkFocus.focusVisible || linkFocus.decoration !== 'underline') {
    throw new Error(`Link Button focus underline failed: ${JSON.stringify(linkFocus)}`);
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
