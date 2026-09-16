import { mkdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { catalogEntries } from '../dist/index.js';

const baseUrl = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6106';
const browserName = process.env.BROWSER ?? 'chromium';
const browserType = { chromium, firefox, webkit }[browserName];
if (!browserType) throw new Error(`Unsupported browser: ${browserName}`);
const browser = await browserType.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

try {
  await page.goto(
    `${baseUrl}/iframe.html?id=tweakpad-ui-complete-catalog--overview&viewMode=story`,
    { waitUntil: 'networkidle' },
  );
  await page.locator('.catalog').waitFor();

  const tags = catalogEntries.map((entry) => entry.tagName);
  const registration = await page.evaluate(
    (publicTags) =>
      Object.fromEntries(publicTags.map((tag) => [tag, Boolean(customElements.get(tag))])),
    tags,
  );
  const missingRegistrations = Object.entries(registration)
    .filter(([, registered]) => !registered)
    .map(([tag]) => tag);
  if (missingRegistrations.length)
    throw new Error(`Missing registrations: ${missingRegistrations.join(', ')}`);

  const iconContract = await page.evaluate(async () => {
    const icon = document.createElement('tp-icon');
    document.body.append(icon);
    await icon.updateComplete;
    const absent = icon.hasAttribute('data-empty') && getComputedStyle(icon).display === 'none';
    icon.icon = { viewBox: '0 0 24 24', paths: [{ d: 'M1 2L3 4' }] };
    await icon.updateComplete;
    const decorative = icon.getAttribute('aria-hidden') === 'true' && !icon.hasAttribute('role');
    const artwork = icon.shadowRoot.querySelector('svg[part="graphic"] path')?.getAttribute('d');
    const svgNamespace =
      icon.shadowRoot.querySelector('svg path')?.namespaceURI === 'http://www.w3.org/2000/svg';
    icon.label = 'Custom mark';
    icon.size = '2rem';
    await icon.updateComplete;
    const named =
      icon.getAttribute('role') === 'img' &&
      icon.getAttribute('aria-label') === 'Custom mark' &&
      !icon.hasAttribute('aria-hidden');
    const sized = getComputedStyle(icon).width === '32px';
    icon.remove();
    return { absent, decorative, artwork: artwork === 'M1 2L3 4', svgNamespace, named, sized };
  });
  if (Object.values(iconContract).some((value) => value !== true)) {
    throw new Error(`Icon contract produced ${JSON.stringify(iconContract)}`);
  }

  for (const entry of catalogEntries) {
    const count = await page.locator(entry.tagName).count();
    if (count < 1) throw new Error(`Storybook does not render ${entry.tagName}`);
  }
  if ((await page.locator('.catalog tp-accordion-item[disabled]').count()) !== 1) {
    throw new Error(
      'Complete catalog does not demonstrate an individually disabled Accordion Item',
    );
  }
  const reducedAccordionFade = await page
    .locator('.catalog tp-accordion-item[value="section"]')
    .evaluate((item) => ({
      paragraphs: item.querySelectorAll('p').length,
      property: getComputedStyle(item.bodyElement).transitionProperty,
      duration: getComputedStyle(item.bodyElement).transitionDuration,
    }));
  if (
    reducedAccordionFade.paragraphs < 2 ||
    reducedAccordionFade.property !== 'opacity' ||
    reducedAccordionFade.duration !== '0s'
  ) {
    throw new Error(
      `Reduced-motion Accordion fade produced ${JSON.stringify(reducedAccordionFade)}`,
    );
  }

  const checkbox = page.locator('tp-checkbox').first();
  await checkbox.locator('label').click();
  if (!(await checkbox.evaluate((element) => element.checked)))
    throw new Error('Checkbox did not commit checked state');

  await checkbox.evaluate((element) => {
    element.required = true;
    element.checked = false;
    element.requestUpdate();
  });
  await checkbox.evaluate((element) => element.updateComplete);
  if (await checkbox.evaluate((element) => element.checkValidity()))
    throw new Error('Required checkbox did not report invalid state');
  await checkbox.locator('label').click();
  if (!(await checkbox.evaluate((element) => element.checkValidity())))
    throw new Error('Checked required checkbox remained invalid');
  const checkedBeforeCancellation = await checkbox.evaluate((element) => element.checked);
  await checkbox.evaluate((element) => {
    element.addEventListener('tp-value-change', (event) => event.preventDefault(), { once: true });
  });
  await checkbox.locator('label').click();
  if ((await checkbox.evaluate((element) => element.checked)) !== checkedBeforeCancellation)
    throw new Error('Checkbox committed a cancelled value request');

  const accordionContract = await page.evaluate(async () => {
    const waitForCompletion = (item, open, label) =>
      Promise.race([
        new Promise((resolve) => {
          const listener = (event) => {
            if (event.detail.open !== open) return;
            item.removeEventListener('tp-open-change-complete', listener);
            resolve(event.detail);
          };
          item.addEventListener('tp-open-change-complete', listener);
        }),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Accordion did not complete ${label ?? (open ? 'open' : 'close')}: ${item.panelElement?.dataset.state}`,
                ),
              ),
            1_000,
          ),
        ),
      ]);
    const accordion = document.createElement('tp-accordion');
    accordion.collapsible = true;
    accordion.style.setProperty('--tp-duration-normal', '40ms');
    accordion.innerHTML = `
      <tp-accordion-item value="one"><span slot="label">One</span><p>First panel</p></tp-accordion-item>
      <tp-accordion-item value="two"><span slot="label">Two</span><p>Second panel</p></tp-accordion-item>
    `;
    document.body.append(accordion);
    const [first, second] = accordion.querySelectorAll('tp-accordion-item');
    await Promise.all([first.updateComplete, second.updateComplete]);
    await accordion.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const firstTrigger = first.triggerElement;
    const secondTrigger = second.triggerElement;
    const firstPanel = first.panelElement;
    const secondPanel = second.panelElement;
    const firstBody = first.bodyElement;

    const firstOpen = waitForCompletion(first, true);
    firstTrigger.click();
    const publishedStarting = firstPanel.hasAttribute('data-starting-style');
    await firstOpen;

    const firstClose = waitForCompletion(first, false, 'first close during selection change');
    const secondOpen = waitForCompletion(second, true);
    secondTrigger.click();
    const atomicSelection = first.hasAttribute('data-closed') && second.hasAttribute('data-open');
    await Promise.all([firstClose, secondOpen]);

    const reversalCompletions = [];
    const reversalListener = (event) => reversalCompletions.push(event.detail.open);
    second.addEventListener('tp-open-change-complete', reversalListener);
    secondTrigger.click();
    const publishedEnding = secondPanel.hasAttribute('data-ending-style');
    const reopened = waitForCompletion(second, true);
    secondTrigger.click();
    await reopened;
    await new Promise((resolve) => setTimeout(resolve, 80));
    second.removeEventListener('tp-open-change-complete', reversalListener);

    accordion.style.setProperty('--tp-duration-normal', '0ms');
    const reducedClose = waitForCompletion(second, false, 'reduced-motion close');
    secondTrigger.click();
    const reducedPublishedEnding = secondPanel.hasAttribute('data-ending-style');
    await reducedClose;
    const reducedTerminalState = secondPanel.dataset.state;

    accordion.keepMounted = true;
    await accordion.updateComplete;
    const retainedOpen = waitForCompletion(first, true);
    firstTrigger.click();
    await retainedOpen;
    const retainedClose = waitForCompletion(first, false, 'retained close');
    firstTrigger.click();
    await retainedClose;
    const retainedState = firstPanel.dataset.state;
    const retainedHidden = firstPanel.hidden;

    accordion.keepMounted = false;
    accordion.hiddenUntilFound = true;
    await accordion.updateComplete;
    const hiddenUntilFound = firstPanel.getAttribute('hidden');
    const revealOpen = waitForCompletion(first, true);
    let revealReason = null;
    accordion.addEventListener(
      'tp-value-change',
      (event) => {
        revealReason = event.detail.reason;
      },
      { once: true },
    );
    firstPanel.dispatchEvent(new Event('beforematch'));
    await revealOpen;

    firstTrigger.focus();
    const arrow = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    firstTrigger.dispatchEvent(arrow);

    const result = {
      valueIsList: Array.isArray(accordion.value),
      publishedStarting,
      publishedEnding,
      atomicSelection,
      staleCloseCompletion: reversalCompletions.includes(false),
      reducedPublishedEnding,
      reducedTerminalState,
      retainedState,
      retainedHidden,
      hiddenUntilFound,
      revealReason,
      arrowPrevented: arrow.defaultPrevented,
      focusStayedSequential: first.shadowRoot.activeElement === firstTrigger,
      measuredHeight: firstPanel.style.getPropertyValue('--accordion-panel-height'),
      measuredWidth: firstPanel.style.getPropertyValue('--accordion-panel-width'),
      contentPart: firstPanel.getAttribute('part'),
      bodyPart: firstBody.getAttribute('part'),
      indicatorPart: first.indicatorElement.getAttribute('part'),
      labelledByTrigger: firstPanel.getAttribute('aria-labelledby') === firstTrigger.id,
      controlledByTrigger: firstTrigger.getAttribute('aria-controls') === firstPanel.id,
    };
    accordion.remove();
    return result;
  });
  if (
    !accordionContract.valueIsList ||
    !accordionContract.publishedStarting ||
    !accordionContract.publishedEnding ||
    !accordionContract.atomicSelection ||
    accordionContract.staleCloseCompletion ||
    !accordionContract.reducedPublishedEnding ||
    accordionContract.reducedTerminalState !== 'absent' ||
    accordionContract.retainedState !== 'retained' ||
    !accordionContract.retainedHidden ||
    accordionContract.hiddenUntilFound !== 'until-found' ||
    accordionContract.revealReason !== 'programmatic' ||
    accordionContract.arrowPrevented ||
    !accordionContract.focusStayedSequential ||
    !accordionContract.measuredHeight.endsWith('px') ||
    !accordionContract.measuredWidth.endsWith('px') ||
    accordionContract.contentPart !== 'accordion-content' ||
    accordionContract.bodyPart !== 'accordion-content-body' ||
    accordionContract.indicatorPart !== 'accordion-indicator' ||
    !accordionContract.labelledByTrigger ||
    !accordionContract.controlledByTrigger
  ) {
    throw new Error(`Accordion contract produced ${JSON.stringify(accordionContract)}`);
  }

  const accordionItemContract = await page.evaluate(async () => {
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const accordion = document.createElement('tp-accordion');
    accordion.selectionMode = 'multiple';
    accordion.style.setProperty('--tp-duration-normal', '0ms');
    accordion.innerHTML = `
      <tp-accordion-item value="first" indicator-position="trailing" heading-level="2">
        <span slot="label">First item</span><p>First content</p>
      </tp-accordion-item>
      <div value="ignored">Not an Accordion Item</div>
      <tp-accordion-item value="second" indicator-position="leading" heading-level="2">
        <span slot="label">Second item</span>
        <span slot="indicator" aria-hidden="true">+</span>
        <p>Second content</p>
      </tp-accordion-item>
    `;
    document.body.append(accordion);
    const [first, second] = accordion.querySelectorAll('tp-accordion-item');
    const ignored = accordion.querySelector('div[value="ignored"]');
    await Promise.all([accordion.updateComplete, first.updateComplete, second.updateComplete]);
    await nextFrame();
    await nextFrame();

    const firstTrigger = first.triggerElement;
    const firstPanel = first.panelElement;
    const secondTrigger = second.triggerElement;
    const secondIndicator = second.indicatorElement;
    const firstIndicator = first.indicatorElement;
    const defaultIcon = first.shadowRoot.querySelector('slot[name="indicator"] tp-icon');
    const firstLabel = first.shadowRoot.querySelector('.label');
    const secondLabel = second.shadowRoot.querySelector('.label');
    const initialPlacement =
      firstIndicator.getBoundingClientRect().left > firstLabel.getBoundingClientRect().left &&
      secondIndicator.getBoundingClientRect().left < secondLabel.getBoundingClientRect().left;
    const projection =
      first.shadowRoot.querySelector('slot[name="label"]').assignedElements()[0]?.textContent ===
        'First item' &&
      second.shadowRoot.querySelector('slot[name="indicator"]').assignedElements()[0]
        ?.textContent === '+' &&
      second.bodyElement.querySelector('slot').assignedElements()[0]?.textContent ===
        'Second content';
    const semanticParts =
      first.shadowRoot.querySelector('[part="accordion-heading"]').getAttribute('role') ===
        'heading' &&
      first.shadowRoot.querySelector('[part="accordion-heading"]').getAttribute('aria-level') ===
        '2' &&
      firstTrigger.tagName === 'BUTTON' &&
      firstPanel.getAttribute('aria-labelledby') === firstTrigger.id &&
      firstTrigger.getAttribute('aria-controls') === firstPanel.id;

    let callbackCount = 0;
    first.onOpenChange = () => callbackCount++;
    firstTrigger.click();
    const firstOpened =
      accordion.value.join(' ') === 'first' &&
      firstTrigger.getAttribute('aria-expanded') === 'true';
    secondTrigger.click();
    const independentSelection = accordion.value.join(' ') === 'first second';
    const preventClose = (event) => event.preventDefault();
    first.addEventListener('tp-open-change', preventClose, { once: true });
    firstTrigger.click();
    const cancellation = accordion.value.join(' ') === 'first second' && callbackCount === 1;

    first.indicatorPosition = 'leading';
    await first.updateComplete;
    const positionChangePreservedValue =
      accordion.value.join(' ') === 'first second' &&
      first.dataset.iconEdge === 'leading' &&
      firstIndicator.dataset.iconEdge === 'leading';
    accordion.dir = 'rtl';
    await nextFrame();
    const rtlPlacement =
      firstIndicator.getBoundingClientRect().left > firstLabel.getBoundingClientRect().left &&
      secondIndicator.getBoundingClientRect().left > secondLabel.getBoundingClientRect().left;
    second.disabled = true;
    await second.updateComplete;
    secondTrigger.click();
    const disabledStayedOpen = accordion.value.join(' ') === 'first second';
    accordion.remove();
    return {
      registered: Boolean(customElements.get('tp-accordion-item')),
      defaultIcon:
        defaultIcon?.shadowRoot?.querySelector('svg path')?.namespaceURI ===
        'http://www.w3.org/2000/svg',
      unregisteredDiv: !ignored.hasAttribute('part') && ignored.dataset.index === undefined,
      initialPlacement,
      projection,
      semanticParts,
      firstOpened,
      independentSelection,
      cancellation,
      positionChangePreservedValue,
      rtlPlacement,
      disabledStayedOpen,
    };
  });
  if (Object.values(accordionItemContract).some((value) => value !== true)) {
    throw new Error(`Accordion Item contract produced ${JSON.stringify(accordionItemContract)}`);
  }

  await page.evaluate(async () => {
    const accordion = document.createElement('tp-accordion');
    accordion.id = 'keyboard-accordion-fixture';
    accordion.collapsible = true;
    accordion.value = ['account'];
    accordion.innerHTML = `
      <tp-accordion-item value="account">
        <span slot="label">Keyboard item</span><p>Content</p>
      </tp-accordion-item>
    `;
    document.body.append(accordion);
    await accordion.querySelector('tp-accordion-item').updateComplete;
    await accordion.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  const keyboardAccordion = page.locator('#keyboard-accordion-fixture');
  const itemButton = keyboardAccordion.locator('tp-accordion-item').locator('button');
  await itemButton.focus();
  await page.keyboard.press('Enter');
  if ((await keyboardAccordion.evaluate((element) => element.value.length)) !== 0)
    throw new Error('Accordion Item Enter did not close the open item');
  await page.keyboard.press('Space');
  if ((await keyboardAccordion.evaluate((element) => element.value.join(' '))) !== 'account')
    throw new Error('Accordion Item Space did not reopen the item');
  await keyboardAccordion.evaluate((element) => element.remove());

  const tabs = page.locator('tp-tabs').first();
  await tabs.locator('[slot="tab"]').nth(1).click();
  if (
    await tabs
      .locator('[slot="panel"]')
      .nth(1)
      .evaluate((element) => element.hidden)
  )
    throw new Error('Tabs did not reveal the selected panel');
  await tabs.evaluate(async (element) => {
    element.value = 'one';
    await element.updateComplete;
  });
  await tabs.locator('[slot="tab"]').nth(0).focus();
  await page.keyboard.press('ArrowRight');
  if ((await tabs.evaluate((element) => element.value)) !== 'one')
    throw new Error('Manual Tabs activated during focus navigation');
  if (
    !(await tabs
      .locator('[slot="tab"]')
      .nth(1)
      .evaluate((element) => element === document.activeElement))
  )
    throw new Error('Tabs arrow-key navigation did not move focus');
  await page.keyboard.press('Enter');
  if ((await tabs.evaluate((element) => element.value)) !== 'two')
    throw new Error('Manual Tabs did not activate the focused tab');

  const radio = page.locator('tp-radio-group').first();
  await radio.locator('[value="one"]').focus();
  await page.keyboard.press('ArrowDown');
  if ((await radio.evaluate((element) => element.value)) !== 'two')
    throw new Error('Radio group did not select with arrow-key navigation');

  const select = page.locator('tp-select').first();
  await select.locator('button.toggle').click();
  await select.locator('[role="option"]').nth(1).click();
  if ((await select.evaluate((element) => element.value)) !== 'large')
    throw new Error('Select did not commit the selected value');

  const dialog = page.locator('tp-dialog').first();
  await dialog.locator('[slot="trigger"]').click();
  if (!(await dialog.evaluate((element) => element.open))) throw new Error('Dialog did not open');
  if (!(await dialog.getByRole('dialog', { name: 'Settings' }).isVisible()))
    throw new Error('Dialog did not expose its title as the accessible name');
  if (!(await checkbox.evaluate((element) => element.closest('.example')?.inert)))
    throw new Error('Modal Dialog did not make outside content inert');
  await page.keyboard.press('Escape');
  if (await dialog.evaluate((element) => element.open))
    throw new Error('Dialog did not dismiss with Escape');
  if (await checkbox.evaluate((element) => element.closest('.example')?.inert))
    throw new Error('Dialog did not restore outside interactivity after closing');

  const popover = page.locator('tp-popover').first();
  await popover.locator('[slot="trigger"]').click();
  const positionedSurface = popover.locator('[data-positioned]');
  await positionedSurface.waitFor();
  const surfaceBox = await positionedSurface.boundingBox();
  if (
    !surfaceBox ||
    surfaceBox.x < 0 ||
    surfaceBox.y < 0 ||
    surfaceBox.x + surfaceBox.width > 1440 ||
    surfaceBox.y + surfaceBox.height > 1000
  ) {
    throw new Error(`Popover positioning escaped the viewport: ${JSON.stringify(surfaceBox)}`);
  }
  await page.keyboard.press('Escape');
  if (await popover.evaluate((element) => element.open))
    throw new Error('Popover did not dismiss with Escape');

  const pagination = page.locator('tp-pagination').first();
  await pagination.locator('button[part~="next"]').click();
  if ((await pagination.evaluate((element) => element.page)) !== 5)
    throw new Error('Pagination did not advance');

  const menu = page.locator('tp-menu').first();
  await menu.locator('[value="edit"]').focus();
  await page.keyboard.press('d');
  if (
    !(await menu
      .locator('[value="duplicate"]')
      .evaluate((element) => element === document.activeElement))
  ) {
    throw new Error('Menu typeahead did not move focus to the matching item');
  }

  const carousel = page.locator('tp-carousel').first();
  if (!(await carousel.getByText('1 of 2').isVisible()))
    throw new Error('Carousel did not reconcile its slide inventory');
  await carousel.locator('button[part~="next"]').click();
  if ((await carousel.evaluate((element) => element.index)) !== 1)
    throw new Error('Carousel did not advance');

  const form = page.locator('tp-form').first();
  const initialFormValue = await form.evaluate((element) => new FormData(element.form).get('name'));
  if (initialFormValue !== '')
    throw new Error(`Initial form-associated input produced ${String(initialFormValue)}`);
  await form.locator('tp-input').evaluate((element) => {
    element.defaultValue = 'Reset value';
  });
  await form.locator('tp-input').locator('input').fill('Ada');
  const formValue = await form.evaluate((element) => new FormData(element.form).get('name'));
  if (formValue !== 'Ada') throw new Error(`Form-associated input produced ${String(formValue)}`);
  await form.evaluate((element) => {
    element.addEventListener(
      'tp-submit',
      (event) => {
        event.preventDefault();
        const detail = event.detail;
        window.__tpSubmission = {
          name: detail.data.get('name'),
          intent: detail.data.get('intent'),
          submitter: detail.submitter?.tagName,
        };
      },
      { once: true },
    );
  });
  await form.locator('tp-button[type="submit"]').locator('button').click();
  const submission = await page.evaluate(() => window.__tpSubmission);
  if (
    submission?.name !== 'Ada' ||
    submission?.intent !== 'save' ||
    submission?.submitter !== 'TP-BUTTON'
  ) {
    throw new Error(`Submit action produced ${JSON.stringify(submission)}`);
  }
  await form.locator('tp-button[type="reset"]').locator('button').click();
  await page.waitForFunction(
    (formElement) => formElement.querySelector('tp-input')?.value === 'Reset value',
    await form.elementHandle(),
  );
  const resetValue = await form.evaluate((element) => new FormData(element.form).get('name'));
  if (resetValue !== 'Reset value')
    throw new Error(`Reset form-associated input produced ${String(resetValue)}`);
  await form.locator('tp-input').evaluate(async (element) => {
    element.required = true;
    element.value = '';
    await element.updateComplete;
  });
  await form.locator('tp-button[type="submit"]').locator('button').click();
  if (
    !(await form.locator('tp-input').evaluate((element) => {
      return element.shadowRoot?.activeElement instanceof HTMLInputElement;
    }))
  ) {
    throw new Error('Invalid form submission did not focus the first invalid control');
  }

  const field = page.locator('tp-field').first();
  await field.locator('[part="field-label"]').click();
  if (
    !(await field.evaluate((element) => {
      const control = element.querySelector('tp-input');
      return control?.shadowRoot?.activeElement instanceof HTMLInputElement;
    }))
  ) {
    throw new Error('Field label did not focus its registered control');
  }
  const fieldInput = field.locator('tp-input input');
  const fieldAssociation = await fieldInput.evaluate((element) => {
    const root = element.getRootNode();
    const descriptionId = element.getAttribute('aria-describedby');
    return {
      label: element.getAttribute('aria-label'),
      description: descriptionId ? root.getElementById(descriptionId)?.textContent : null,
    };
  });
  if (fieldAssociation.label !== 'Email' || fieldAssociation.description !== 'Used for receipts') {
    throw new Error(`Field association produced ${JSON.stringify(fieldAssociation)}`);
  }
  await field.evaluate(async (element) => {
    element.error = 'Invalid email';
    await element.updateComplete;
    await element.querySelector('tp-input')?.updateComplete;
  });
  const fieldError = await fieldInput.evaluate((element) => {
    const root = element.getRootNode();
    const errorId = element.getAttribute('aria-errormessage');
    return {
      error: errorId ? root.getElementById(errorId)?.textContent : null,
      invalid: element.getAttribute('aria-invalid'),
    };
  });
  if (fieldError.error !== 'Invalid email' || fieldError.invalid !== 'true') {
    throw new Error(`Field error association produced ${JSON.stringify(fieldError)}`);
  }
  await field.evaluate(async (element) => {
    element.error = '';
    await element.updateComplete;
    await element.querySelector('tp-input')?.updateComplete;
  });
  const clearedFieldError = await fieldInput.evaluate((element) => ({
    error: element.getAttribute('aria-errormessage'),
    invalid: element.getAttribute('aria-invalid'),
  }));
  if (clearedFieldError.error !== null || clearedFieldError.invalid !== null) {
    throw new Error(`Cleared Field error produced ${JSON.stringify(clearedFieldError)}`);
  }

  const label = page.locator('tp-label').first();
  await label.locator('[part="root"]').click();
  if (
    !(await page
      .locator('#catalog-name')
      .evaluate((element) => element.shadowRoot?.activeElement instanceof HTMLInputElement))
  ) {
    throw new Error('Label did not focus its associated custom control');
  }
  await label.evaluate((element) => {
    element.optional = true;
  });
  await label.evaluate((element) => element.updateComplete);
  if ((await label.locator('[part="optional-indicator"]').textContent())?.trim() !== 'Optional') {
    throw new Error('Optional Label did not expose its optional indicator');
  }
  await page.locator('#catalog-name').evaluate((element) => {
    element.required = true;
  });
  await page.locator('#catalog-name').evaluate((element) => element.updateComplete);
  await label.evaluate((element) => element.updateComplete);
  if (await label.locator('[part="optional-indicator"]').count()) {
    throw new Error('Label described a required control as optional');
  }
  const shadowLabelFocused = await page.evaluate(async () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<tp-label for="shadow-name">Shadow name</tp-label><tp-input id="shadow-name"></tp-input>';
    document.body.append(host);
    const shadowLabel = root.querySelector('tp-label');
    const shadowInput = root.querySelector('tp-input');
    await Promise.all([shadowLabel.updateComplete, shadowInput.updateComplete]);
    shadowLabel.shadowRoot.querySelector('[part="root"]').click();
    const focused = shadowInput.shadowRoot.activeElement instanceof HTMLInputElement;
    host.remove();
    return focused;
  });
  if (!shadowLabelFocused)
    throw new Error('Label did not resolve its control in the current shadow root');

  const nativeSelect = page.locator('tp-native-select').first().locator('select');
  const optionGroups = await nativeSelect.locator('optgroup').evaluateAll((groups) =>
    groups.map((group) => ({
      label: group.label,
      disabled: group.disabled,
      options: [...group.querySelectorAll('option')].map((option) => option.value),
    })),
  );
  if (
    JSON.stringify(optionGroups) !==
    JSON.stringify([
      { label: 'Product', disabled: false, options: ['design', 'engineering'] },
      { label: 'Operations', disabled: true, options: ['finance'] },
    ])
  ) {
    throw new Error(`Native select option groups produced ${JSON.stringify(optionGroups)}`);
  }

  const otp = page.locator('tp-otp-field').first();
  const otpInputs = otp.locator('input');
  if ((await otpInputs.count()) !== 1)
    throw new Error('One-time code field exposed multiple editors');
  await otpInputs.fill('1a 2b3');
  if ((await otp.evaluate((element) => element.value)) !== '123') {
    throw new Error(
      `One-time code normalization produced ${await otp.evaluate((element) => element.value)}`,
    );
  }
  if ((await otp.locator('[part="slot"][data-filled]').count()) !== 3) {
    throw new Error('One-time code slots did not derive from the committed value');
  }

  const textArea = page.locator('tp-text-area').first();
  const textAreaControl = textArea.locator('textarea');
  if (
    (await textAreaControl.evaluate((element) => getComputedStyle(element).resize)) !== 'vertical'
  ) {
    throw new Error('Text area block resize policy was not applied');
  }
  await textArea.evaluate((element) => {
    element.resize = 'inline';
  });
  await textArea.evaluate((element) => element.updateComplete);
  if (
    (await textAreaControl.evaluate((element) => getComputedStyle(element).resize)) !== 'horizontal'
  ) {
    throw new Error('Text area inline resize policy was not applied');
  }

  const questionnaire = page.locator('tp-questionnaire').first();
  await questionnaire.evaluate((element) => element.updateComplete);
  const questionnaireContract = await questionnaire.evaluate((element) => {
    const root = element.shadowRoot;
    const parts = (selector) =>
      root?.querySelector(selector)?.getAttribute('part')?.split(' ') ?? [];
    const controls = [...(root?.querySelectorAll('[data-answer-control]') ?? [])];
    return {
      nativeForm: root?.querySelector('[part="questionnaire"]') instanceof HTMLFormElement,
      rootParts: parts('form'),
      progressParts: parts('[part~="questionnaire-progress"]'),
      questionParts: parts('fieldset'),
      titleParts: parts('legend'),
      descriptionParts: parts('[part~="questionnaire-description"]'),
      choicesParts: parts('[part~="questionnaire-choices"]'),
      choiceCount: root?.querySelectorAll('[part~="questionnaire-choice"]').length,
      inputRegionCount: root?.querySelectorAll('[part~="questionnaire-input-region"]').length,
      errorCount: root?.querySelectorAll('[part~="questionnaire-error"]').length,
      actionsParts: parts('[part~="questionnaire-actions"]'),
      controlTypes: controls.map((control) => control.type),
      controlNames: controls.map((control) => control.name),
      shortcuts: controls.map((control) => control.getAttribute('aria-keyshortcuts')),
      checked: controls.filter((control) => control.checked).map((control) => control.value),
      answers: element.answers,
      currentItem: element.currentItem,
      current: element.current,
      total: element.total,
      first: element.first,
      last: element.last,
      status: element.status,
      previousHidden: root?.querySelector('[data-action="previous"]')?.hidden,
      skipHidden: root?.querySelector('[data-action="skip"]')?.hidden,
      nextHidden: root?.querySelector('[data-action="next"]')?.hidden,
      submitHidden: root?.querySelector('[data-action="submit"]')?.hidden,
    };
  });
  if (
    !questionnaireContract.nativeForm ||
    !questionnaireContract.rootParts.includes('questionnaire') ||
    !questionnaireContract.progressParts.includes('questionnaire-progress') ||
    !questionnaireContract.questionParts.includes('questionnaire-question') ||
    !questionnaireContract.titleParts.includes('questionnaire-title') ||
    !questionnaireContract.descriptionParts.includes('questionnaire-description') ||
    !questionnaireContract.choicesParts.includes('questionnaire-choices') ||
    questionnaireContract.choiceCount !== 2 ||
    questionnaireContract.inputRegionCount !== 0 ||
    questionnaireContract.errorCount !== 0 ||
    !questionnaireContract.actionsParts.includes('questionnaire-actions') ||
    JSON.stringify(questionnaireContract.controlTypes) !== JSON.stringify(['radio', 'radio']) ||
    JSON.stringify(questionnaireContract.controlNames) !== JSON.stringify(['role', 'role']) ||
    JSON.stringify(questionnaireContract.shortcuts) !== JSON.stringify(['A', 'B']) ||
    JSON.stringify(questionnaireContract.checked) !== JSON.stringify(['design']) ||
    JSON.stringify(questionnaireContract.answers) !== JSON.stringify({ role: 'design' }) ||
    questionnaireContract.currentItem !== 'role' ||
    questionnaireContract.current !== 1 ||
    questionnaireContract.total !== 3 ||
    !questionnaireContract.first ||
    questionnaireContract.last ||
    questionnaireContract.status !== 'answered' ||
    !questionnaireContract.previousHidden ||
    !questionnaireContract.skipHidden ||
    questionnaireContract.nextHidden ||
    !questionnaireContract.submitHidden
  ) {
    throw new Error(
      `Questionnaire public contract produced ${JSON.stringify(questionnaireContract)}`,
    );
  }

  await questionnaire.evaluate((element) => {
    window.__tpQuestionnaireValues = [];
    window.__tpQuestionnaireItems = [];
    element.addEventListener('tp-value-change', (event) => {
      window.__tpQuestionnaireValues.push({
        value: event.detail.value,
        previousValue: event.detail.previousValue,
        reason: event.detail.reason,
      });
    });
    element.addEventListener('tp-item-change', (event) => {
      window.__tpQuestionnaireItems.push(event.detail);
    });
  });
  await questionnaire.locator('[data-action="next"]').click();
  await questionnaire.evaluate(async (element) => {
    await element.updateComplete;
    await Promise.resolve();
  });
  const questionnaireSecondItem = await questionnaire.evaluate((element) => ({
    currentItem: element.currentItem,
    current: element.current,
    status: element.status,
    focusedType: element.shadowRoot?.activeElement?.type,
    focusedValue: element.shadowRoot?.activeElement?.value,
    itemReason: window.__tpQuestionnaireItems.at(-1)?.reason,
  }));
  if (
    questionnaireSecondItem.currentItem !== 'tools' ||
    questionnaireSecondItem.current !== 2 ||
    questionnaireSecondItem.status !== 'unanswered' ||
    questionnaireSecondItem.focusedType !== 'checkbox' ||
    questionnaireSecondItem.focusedValue !== 'editor' ||
    questionnaireSecondItem.itemReason !== 'pointer'
  ) {
    throw new Error(
      `Questionnaire next action produced ${JSON.stringify(questionnaireSecondItem)}`,
    );
  }

  await page.keyboard.press('a');
  await questionnaire.evaluate((element) => element.updateComplete);
  if (
    JSON.stringify(await questionnaire.evaluate((element) => element.answers.tools)) !==
    JSON.stringify(['editor'])
  ) {
    throw new Error('Questionnaire shortcut did not activate its unique choice');
  }
  await questionnaire.evaluate((element) => {
    element.addEventListener('tp-item-change', (event) => event.preventDefault(), { once: true });
  });
  await questionnaire.locator('[data-action="skip"]').click();
  await questionnaire.evaluate((element) => element.updateComplete);
  const cancelledQuestionnaireSkip = await questionnaire.evaluate((element) => ({
    answers: element.answers,
    currentItem: element.currentItem,
    status: element.status,
  }));
  if (
    JSON.stringify(cancelledQuestionnaireSkip.answers) !==
      JSON.stringify({ role: 'design', tools: ['editor'] }) ||
    cancelledQuestionnaireSkip.currentItem !== 'tools' ||
    cancelledQuestionnaireSkip.status !== 'answered'
  ) {
    throw new Error(
      `Questionnaire committed a partial cancelled skip: ${JSON.stringify(cancelledQuestionnaireSkip)}`,
    );
  }
  await questionnaire.locator('[data-action="skip"]').click();
  await questionnaire.evaluate(async (element) => {
    await element.updateComplete;
    await Promise.resolve();
  });
  const skippedQuestionnaireItem = await questionnaire.evaluate((element) => ({
    answers: element.answers,
    currentItem: element.currentItem,
    current: element.current,
    inputType: element.shadowRoot?.querySelector('[data-answer-control]')?.type,
    focused: element.shadowRoot?.activeElement?.getAttribute('data-answer-control') !== null,
  }));
  if (
    JSON.stringify(skippedQuestionnaireItem.answers) !== JSON.stringify({ role: 'design' }) ||
    skippedQuestionnaireItem.currentItem !== 'name' ||
    skippedQuestionnaireItem.current !== 3 ||
    skippedQuestionnaireItem.inputType !== 'text' ||
    !skippedQuestionnaireItem.focused
  ) {
    throw new Error(
      `Questionnaire skip transaction produced ${JSON.stringify(skippedQuestionnaireItem)}`,
    );
  }

  await questionnaire.locator('[data-action="submit"]').click();
  await questionnaire.evaluate(async (element) => {
    await element.updateComplete;
    await Promise.resolve();
  });
  const missingQuestionnaireAnswer = await questionnaire.evaluate((element) => ({
    error: element.shadowRoot?.querySelector('[part~="questionnaire-error"]')?.textContent?.trim(),
    focused: element.shadowRoot?.activeElement?.getAttribute('data-answer-control') !== null,
  }));
  if (
    missingQuestionnaireAnswer.error !== 'Answer this question.' ||
    !missingQuestionnaireAnswer.focused
  ) {
    throw new Error(
      `Questionnaire missing-answer validation produced ${JSON.stringify(missingQuestionnaireAnswer)}`,
    );
  }
  const questionnaireTextInput = questionnaire.locator('input.free-answer');
  await questionnaireTextInput.fill('A');
  await questionnaire.locator('[data-action="submit"]').click();
  await questionnaire.evaluate((element) => element.updateComplete);
  const shortQuestionnaireError = await questionnaire
    .locator('[part~="questionnaire-error"]')
    .textContent();
  if (shortQuestionnaireError?.trim() !== 'Use at least 2 characters.') {
    throw new Error(`Questionnaire length validation produced ${shortQuestionnaireError}`);
  }
  await questionnaireTextInput.fill('Ada');
  await questionnaire.evaluate((element) => {
    element.addEventListener(
      'tp-submit',
      (event) => {
        event.preventDefault();
        window.__tpQuestionnaireSubmission = {
          data: Object.fromEntries(event.detail.data.entries()),
          answers: event.detail.answers,
          reason: event.detail.reason,
        };
      },
      { once: true },
    );
  });
  await questionnaire.locator('[data-action="submit"]').click();
  const questionnaireSubmission = await page.evaluate(() => window.__tpQuestionnaireSubmission);
  if (
    JSON.stringify(questionnaireSubmission?.data) !==
      JSON.stringify({ role: 'design', name: 'Ada' }) ||
    JSON.stringify(questionnaireSubmission?.answers) !==
      JSON.stringify({ role: 'design', name: 'Ada' }) ||
    questionnaireSubmission?.reason !== 'submit'
  ) {
    throw new Error(`Questionnaire submission produced ${JSON.stringify(questionnaireSubmission)}`);
  }

  await questionnaire.locator('[data-action="previous"]').click();
  await questionnaire.evaluate((element) => element.updateComplete);
  if (
    (await questionnaire.evaluate((element) => element.currentItem)) !== 'tools' ||
    (await questionnaire.evaluate((element) => element.status)) !== 'skipped'
  ) {
    throw new Error('Questionnaire did not preserve skipped status during backward navigation');
  }
  await questionnaire.locator('[data-action="previous"]').click();
  await questionnaire.evaluate((element) => element.updateComplete);
  await questionnaire.locator('input[value="engineering"]').click();
  await questionnaire.evaluate((element) => element.updateComplete);
  await questionnaire.locator('[data-action="next"]').click();
  await questionnaire.evaluate((element) => element.updateComplete);
  await questionnaire.evaluate((element) => {
    element.shadowRoot
      ?.querySelector('form')
      ?.addEventListener('reset', (event) => event.preventDefault(), { once: true });
    element.reset();
  });
  await Promise.resolve();
  await questionnaire.evaluate((element) => element.updateComplete);
  const preventedQuestionnaireReset = await questionnaire.evaluate((element) => ({
    answers: element.answers,
    currentItem: element.currentItem,
    status: element.status,
  }));
  if (
    JSON.stringify(preventedQuestionnaireReset.answers) !==
      JSON.stringify({ role: 'engineering', name: 'Ada' }) ||
    preventedQuestionnaireReset.currentItem !== 'tools' ||
    preventedQuestionnaireReset.status !== 'skipped'
  ) {
    throw new Error(
      `Prevented Questionnaire reset changed state: ${JSON.stringify(preventedQuestionnaireReset)}`,
    );
  }
  await questionnaire.evaluate((element) => element.reset());
  await questionnaire.evaluate(async (element) => {
    await Promise.resolve();
    await element.updateComplete;
    await Promise.resolve();
  });
  const questionnaireReset = await questionnaire.evaluate((element) => ({
    answers: element.answers,
    currentItem: element.currentItem,
    current: element.current,
    status: element.status,
    lastValueReason: window.__tpQuestionnaireValues.at(-1)?.reason,
    lastItemReason: window.__tpQuestionnaireItems.at(-1)?.reason,
  }));
  if (
    JSON.stringify(questionnaireReset.answers) !== JSON.stringify({ role: 'design' }) ||
    questionnaireReset.currentItem !== 'role' ||
    questionnaireReset.current !== 1 ||
    questionnaireReset.status !== 'answered' ||
    questionnaireReset.lastValueReason !== 'form-reset' ||
    questionnaireReset.lastItemReason !== 'form-reset'
  ) {
    throw new Error(`Questionnaire reset produced ${JSON.stringify(questionnaireReset)}`);
  }
  await questionnaire.locator('[data-action="next"]').click();
  await questionnaire.evaluate((element) => element.updateComplete);
  if ((await questionnaire.evaluate((element) => element.status)) !== 'unanswered') {
    throw new Error('Questionnaire reset did not clear skipped state');
  }

  const controlledQuestionnaireResult = await page.evaluate(async () => {
    const questions = [
      {
        name: 'role',
        title: 'Role',
        kind: 'single',
        required: true,
        choices: [
          { value: 'design', label: 'Design' },
          { value: 'engineering', label: 'Engineering' },
        ],
      },
      { name: 'name', title: 'Name', kind: 'text', required: true },
    ];
    const controlled = document.createElement('tp-questionnaire');
    controlled.questions = questions;
    controlled.value = { role: 'design' };
    controlled.item = 'role';
    const valueReasons = [];
    const itemReasons = [];
    controlled.onValueChange = (event) => {
      valueReasons.push(event.detail.reason);
      controlled.value = event.detail.value;
    };
    controlled.onItemChange = (event) => {
      itemReasons.push(event.detail.reason);
      controlled.item = event.detail.value;
    };
    document.body.append(controlled);
    await controlled.updateComplete;
    controlled.shadowRoot.querySelector('input[value="engineering"]').click();
    await controlled.updateComplete;
    await Promise.resolve();
    await controlled.updateComplete;
    controlled.shadowRoot.querySelector('[data-action="next"]').click();
    await controlled.updateComplete;
    await Promise.resolve();
    await controlled.updateComplete;
    const supplier = {
      value: controlled.value,
      answers: controlled.answers,
      item: controlled.item,
      currentItem: controlled.currentItem,
      valueReasons,
      itemReasons,
    };
    controlled.remove();

    const rejected = document.createElement('tp-questionnaire');
    rejected.questions = questions;
    rejected.value = { role: 'design' };
    rejected.item = 'role';
    document.body.append(rejected);
    await rejected.updateComplete;
    const proposed = rejected.shadowRoot.querySelector('input[value="engineering"]');
    proposed.focus();
    proposed.click();
    await rejected.updateComplete;
    rejected.shadowRoot.querySelector('[data-action="next"]').click();
    await rejected.updateComplete;
    const rejection = {
      answers: rejected.answers,
      currentItem: rejected.currentItem,
      checked: [...rejected.shadowRoot.querySelectorAll('input[type="radio"]:checked')].map(
        (input) => input.value,
      ),
      focusedValue: rejected.shadowRoot.activeElement?.value,
    };
    rejected.remove();
    return { supplier, rejection };
  });
  if (
    JSON.stringify(controlledQuestionnaireResult.supplier.value) !==
      JSON.stringify({ role: 'engineering' }) ||
    JSON.stringify(controlledQuestionnaireResult.supplier.answers) !==
      JSON.stringify({ role: 'engineering' }) ||
    controlledQuestionnaireResult.supplier.item !== 'name' ||
    controlledQuestionnaireResult.supplier.currentItem !== 'name' ||
    JSON.stringify(controlledQuestionnaireResult.supplier.valueReasons) !==
      JSON.stringify(['selection']) ||
    JSON.stringify(controlledQuestionnaireResult.supplier.itemReasons) !==
      JSON.stringify(['keyboard']) ||
    JSON.stringify(controlledQuestionnaireResult.rejection.answers) !==
      JSON.stringify({ role: 'design' }) ||
    controlledQuestionnaireResult.rejection.currentItem !== 'role' ||
    JSON.stringify(controlledQuestionnaireResult.rejection.checked) !==
      JSON.stringify(['design']) ||
    controlledQuestionnaireResult.rejection.focusedValue !== 'engineering'
  ) {
    throw new Error(
      `Controlled Questionnaire reconciliation produced ${JSON.stringify(controlledQuestionnaireResult)}`,
    );
  }

  const questionnaireFlowResult = await page.evaluate(async () => {
    const questions = ['one', 'two', 'three'].map((name) => ({
      name,
      title: name,
      kind: 'text',
      defaultValue: name,
    }));
    const flow = document.createElement('tp-questionnaire');
    flow.questions = questions;
    flow.defaultItem = 'two';
    document.body.append(flow);
    await flow.updateComplete;
    const initial = flow.currentItem;
    flow.questions = [questions[0], questions[2]];
    await flow.updateComplete;
    const afterRemoval = flow.currentItem;
    flow.questions = [];
    await flow.updateComplete;
    const empty = { currentItem: flow.currentItem, current: flow.current, total: flow.total };
    flow.remove();

    const navigation = document.createElement('tp-questionnaire');
    navigation.questions = questions;
    document.body.append(navigation);
    await navigation.updateComplete;
    const linearFuture = navigation.setItem('three');
    navigation.flow = 'free';
    const freeFuture = navigation.setItem('three');
    await navigation.updateComplete;
    const freeItem = navigation.currentItem;
    navigation.remove();

    const keyboard = document.createElement('tp-questionnaire');
    keyboard.questions = questions.slice(0, 2);
    document.body.append(keyboard);
    await keyboard.updateComplete;
    const form = keyboard.shadowRoot.querySelector('form');
    form.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        repeat: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    const composing = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    Object.defineProperty(composing, 'isComposing', { value: true });
    form.dispatchEvent(composing);
    await keyboard.updateComplete;
    const ignoredCommands = keyboard.currentItem;
    form.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await keyboard.updateComplete;
    const acceptedCommand = keyboard.currentItem;
    keyboard.remove();

    return {
      initial,
      afterRemoval,
      empty,
      linearFuture,
      freeFuture,
      freeItem,
      ignoredCommands,
      acceptedCommand,
    };
  });
  if (
    questionnaireFlowResult.initial !== 'two' ||
    questionnaireFlowResult.afterRemoval !== 'three' ||
    questionnaireFlowResult.empty.currentItem !== '' ||
    questionnaireFlowResult.empty.current !== 0 ||
    questionnaireFlowResult.empty.total !== 0 ||
    questionnaireFlowResult.linearFuture ||
    !questionnaireFlowResult.freeFuture ||
    questionnaireFlowResult.freeItem !== 'three' ||
    questionnaireFlowResult.ignoredCommands !== 'one' ||
    questionnaireFlowResult.acceptedCommand !== 'two'
  ) {
    throw new Error(
      `Questionnaire flow reconciliation produced ${JSON.stringify(questionnaireFlowResult)}`,
    );
  }

  const questionnaireInvalidFocusResult = await page.evaluate(async () => {
    const control = document.createElement('tp-questionnaire');
    control.flow = 'free';
    control.questions = [
      { name: 'email', title: 'Email', kind: 'text', inputType: 'email', required: true },
      { name: 'name', title: 'Name', kind: 'text', required: true },
    ];
    control.defaultItem = 'name';
    control.defaultValue = { name: 'Ada' };
    document.body.append(control);
    await control.updateComplete;
    control.requestSubmit();
    await control.updateComplete;
    await Promise.resolve();
    await control.updateComplete;
    const result = {
      currentItem: control.currentItem,
      error: control.shadowRoot.querySelector('[part~="questionnaire-error"]')?.textContent?.trim(),
      focusedName: control.shadowRoot.activeElement?.name,
    };
    control.remove();
    return result;
  });
  if (
    questionnaireInvalidFocusResult.currentItem !== 'email' ||
    questionnaireInvalidFocusResult.error !== 'Answer this question.' ||
    questionnaireInvalidFocusResult.focusedName !== 'email'
  ) {
    throw new Error(
      `Questionnaire invalid focus recovery produced ${JSON.stringify(questionnaireInvalidFocusResult)}`,
    );
  }

  const calendar = page.locator('tp-calendar').first();
  await calendar.evaluate((element) => element.updateComplete);
  const calendarContract = await calendar.evaluate((element) => {
    const parts = (selector) =>
      element.shadowRoot?.querySelector(selector)?.getAttribute('part')?.split(' ') ?? [];
    const days = [...(element.shadowRoot?.querySelectorAll('button.day') ?? [])];
    return {
      selection: element.selection,
      displayedMonth: element.displayedMonthValue,
      rootParts: parts('.root'),
      headerParts: parts('.header'),
      previousParts: parts('button.navigation:first-of-type'),
      nextParts: parts('button.navigation:last-of-type'),
      monthGridParts: parts('.months'),
      monthCount: element.shadowRoot?.querySelectorAll('.month').length,
      dayCount: days.length,
      dayPartsValid: days.every((day) =>
        day.getAttribute('part')?.split(' ').includes('calendar-day'),
      ),
      tabStops: days.filter((day) => day.tabIndex === 0).map((day) => day.dataset.date),
      selected: days
        .filter((day) => day.hasAttribute('data-selected'))
        .map((day) => day.dataset.date),
      selectedLabel: days
        .find((day) => day.dataset.date === '2026-09-15')
        ?.getAttribute('aria-label'),
    };
  });
  if (
    calendarContract.selection !== '2026-09-15' ||
    calendarContract.displayedMonth !== '2026-09-01' ||
    !calendarContract.rootParts.includes('calendar') ||
    !calendarContract.headerParts.includes('calendar-header') ||
    !calendarContract.previousParts.includes('calendar-previous') ||
    !calendarContract.nextParts.includes('calendar-next') ||
    !calendarContract.monthGridParts.includes('calendar-month-grid') ||
    calendarContract.monthCount !== 1 ||
    calendarContract.dayCount !== 42 ||
    !calendarContract.dayPartsValid ||
    JSON.stringify(calendarContract.tabStops) !== JSON.stringify(['2026-09-15']) ||
    JSON.stringify(calendarContract.selected) !== JSON.stringify(['2026-09-15']) ||
    !calendarContract.selectedLabel
  ) {
    throw new Error(`Calendar public contract produced ${JSON.stringify(calendarContract)}`);
  }

  await calendar.locator('button.day[data-date="2026-09-15"]').focus();
  const calendarKeyboardDestinations = [];
  for (const key of ['ArrowRight', 'ArrowDown', 'Home', 'End']) {
    await page.keyboard.press(key);
    await calendar.evaluate(async (element) => {
      await element.updateComplete;
      await Promise.resolve();
    });
    calendarKeyboardDestinations.push(
      await calendar.evaluate((element) => element.shadowRoot?.activeElement?.dataset.date),
    );
  }
  if (
    JSON.stringify(calendarKeyboardDestinations) !==
    JSON.stringify(['2026-09-16', '2026-09-23', '2026-09-21', '2026-09-27'])
  ) {
    throw new Error(
      `Calendar logical keyboard navigation produced ${JSON.stringify(calendarKeyboardDestinations)}`,
    );
  }

  await calendar.evaluate((element) => {
    window.__tpCalendarChanges = [];
    element.addEventListener('tp-value-change', (event) => {
      window.__tpCalendarChanges.push({
        value: event.detail.value,
        previousValue: event.detail.previousValue,
        reason: event.detail.reason,
      });
    });
  });
  await calendar.locator('button.day[data-date="2026-09-16"]').click();
  await calendar.evaluate((element) => element.updateComplete);
  if ((await calendar.evaluate((element) => element.selection)) !== '2026-09-16') {
    throw new Error('Calendar pointer selection did not commit');
  }
  await calendar.evaluate((element) => {
    element.addEventListener('tp-value-change', (event) => event.preventDefault(), { once: true });
  });
  await calendar.locator('button.day[data-date="2026-09-17"]').click();
  await calendar.evaluate((element) => element.updateComplete);
  if ((await calendar.evaluate((element) => element.selection)) !== '2026-09-16') {
    throw new Error('Calendar committed a cancelled selection request');
  }
  await calendar.locator('button.day[data-date="2026-09-17"]').focus();
  await page.keyboard.press('Enter');
  await calendar.evaluate((element) => element.updateComplete);
  const calendarSelectionResult = await page.evaluate(() => ({
    selection: document.querySelector('tp-calendar')?.selection,
    changes: window.__tpCalendarChanges,
  }));
  if (
    calendarSelectionResult.selection !== '2026-09-17' ||
    calendarSelectionResult.changes[0]?.reason !== 'pointer' ||
    calendarSelectionResult.changes.at(-1)?.reason !== 'keyboard'
  ) {
    throw new Error(
      `Calendar selection requests produced ${JSON.stringify(calendarSelectionResult)}`,
    );
  }

  await calendar.locator('button[part~="calendar-previous"]').click();
  await calendar.evaluate((element) => element.updateComplete);
  if ((await calendar.evaluate((element) => element.displayedMonthValue)) !== '2026-08-01') {
    throw new Error('Calendar selection bounds incorrectly constrained navigation');
  }
  await calendar.locator('button[part~="calendar-next"]').click();
  await calendar.evaluate((element) => element.updateComplete);
  await calendar.locator('button.day[data-date="2026-09-17"]').focus();
  await page.keyboard.press('PageDown');
  await calendar.evaluate(async (element) => {
    await element.updateComplete;
    await Promise.resolve();
  });
  const calendarPageNavigation = await calendar.evaluate((element) => ({
    displayedMonth: element.displayedMonthValue,
    focusedDate: element.shadowRoot?.activeElement?.dataset.date,
  }));
  if (
    calendarPageNavigation.displayedMonth !== '2026-10-01' ||
    calendarPageNavigation.focusedDate !== '2026-10-17'
  ) {
    throw new Error(`Calendar page navigation produced ${JSON.stringify(calendarPageNavigation)}`);
  }

  const calendarFormResult = await page.evaluate(async () => {
    const form = document.createElement('form');
    form.innerHTML =
      '<tp-calendar name="appointment" default-value="2026-09-15" default-displayed-month="2026-09-01"></tp-calendar>';
    document.body.append(form);
    const control = form.querySelector('tp-calendar');
    await control.updateComplete;
    const reasons = [];
    control.addEventListener('tp-value-change', (event) => reasons.push(event.detail.reason));
    const initial = new FormData(form).getAll('appointment');
    control.setValue('2026-09-20');
    await control.updateComplete;
    const changed = new FormData(form).getAll('appointment');
    form.reset();
    await Promise.resolve();
    await control.updateComplete;
    const reset = new FormData(form).getAll('appointment');
    const result = { initial, changed, reset, reasons, selection: control.selection };
    form.remove();
    return result;
  });
  if (
    JSON.stringify(calendarFormResult.initial) !== JSON.stringify(['2026-09-15']) ||
    JSON.stringify(calendarFormResult.changed) !== JSON.stringify(['2026-09-20']) ||
    JSON.stringify(calendarFormResult.reset) !== JSON.stringify(['2026-09-15']) ||
    calendarFormResult.reasons.at(-1) !== 'form-reset' ||
    calendarFormResult.selection !== '2026-09-15'
  ) {
    throw new Error(`Calendar form contract produced ${JSON.stringify(calendarFormResult)}`);
  }

  const calendarModeResult = await page.evaluate(async () => {
    const completeRange = document.createElement('tp-calendar');
    completeRange.selectionMode = 'range';
    completeRange.defaultValue = { from: '2026-09-10', to: '2026-09-14' };
    completeRange.defaultDisplayedMonth = '2026-09-01';
    document.body.append(completeRange);
    await completeRange.updateComplete;
    const rangeMarkers = {
      start: completeRange.shadowRoot
        .querySelector('button.day[data-date="2026-09-10"]')
        ?.hasAttribute('data-range-start'),
      middle: completeRange.shadowRoot
        .querySelector('button.day[data-date="2026-09-12"]')
        ?.hasAttribute('data-range-middle'),
      end: completeRange.shadowRoot
        .querySelector('button.day[data-date="2026-09-14"]')
        ?.hasAttribute('data-range-end'),
    };
    completeRange.remove();

    const excludedRange = document.createElement('tp-calendar');
    excludedRange.selectionMode = 'range';
    excludedRange.defaultValue = { from: '2026-09-10' };
    excludedRange.defaultDisplayedMonth = '2026-09-01';
    excludedRange.unavailableDates = new Set(['2026-09-12']);
    document.body.append(excludedRange);
    await excludedRange.updateComplete;
    excludedRange.shadowRoot.querySelector('button.day[data-date="2026-09-14"]').click();
    await excludedRange.updateComplete;
    const rejectedRange = excludedRange.selection;
    excludedRange.rangeExclusion = 'restart';
    await excludedRange.updateComplete;
    excludedRange.shadowRoot.querySelector('button.day[data-date="2026-09-14"]').click();
    await excludedRange.updateComplete;
    const restartedRange = excludedRange.selection;
    excludedRange.remove();

    const multiple = document.createElement('tp-calendar');
    multiple.selectionMode = 'multiple';
    multiple.defaultValue = ['2026-09-10', '2026-09-11'];
    multiple.defaultDisplayedMonth = '2026-09-01';
    multiple.minimumSelectionCount = 1;
    multiple.maximumSelectionCount = 2;
    document.body.append(multiple);
    await multiple.updateComplete;
    multiple.shadowRoot.querySelector('button.day[data-date="2026-09-12"]').click();
    await multiple.updateComplete;
    const maximumRejected = multiple.selection;
    multiple.shadowRoot.querySelector('button.day[data-date="2026-09-10"]').click();
    await multiple.updateComplete;
    const removedToMinimum = multiple.selection;
    multiple.shadowRoot.querySelector('button.day[data-date="2026-09-11"]').click();
    await multiple.updateComplete;
    const minimumPreserved = multiple.selection;
    multiple.remove();

    return {
      rangeMarkers,
      rejectedRange,
      restartedRange,
      maximumRejected,
      removedToMinimum,
      minimumPreserved,
    };
  });
  if (
    !calendarModeResult.rangeMarkers.start ||
    !calendarModeResult.rangeMarkers.middle ||
    !calendarModeResult.rangeMarkers.end ||
    JSON.stringify(calendarModeResult.rejectedRange) !== JSON.stringify({ from: '2026-09-10' }) ||
    JSON.stringify(calendarModeResult.restartedRange) !== JSON.stringify({ from: '2026-09-14' }) ||
    JSON.stringify(calendarModeResult.maximumRejected) !==
      JSON.stringify(['2026-09-10', '2026-09-11']) ||
    JSON.stringify(calendarModeResult.removedToMinimum) !== JSON.stringify(['2026-09-11']) ||
    JSON.stringify(calendarModeResult.minimumPreserved) !== JSON.stringify(['2026-09-11'])
  ) {
    throw new Error(`Calendar selection modes produced ${JSON.stringify(calendarModeResult)}`);
  }

  const calendarIntervalResult = await page.evaluate(async () => {
    const interval = document.createElement('tp-calendar');
    interval.visibleMonths = 2;
    interval.defaultDisplayedMonth = '2026-09-01';
    interval.defaultValue = '2026-10-01';
    document.body.append(interval);
    await interval.updateComplete;
    const duplicates = [
      ...interval.shadowRoot.querySelectorAll('button.day[data-date="2026-10-01"]'),
    ];
    const result = {
      publicGrids: interval.shadowRoot.querySelectorAll('[part~="calendar-month-grid"]').length,
      months: interval.shadowRoot.querySelectorAll('.month').length,
      duplicates: duplicates.length,
      selectedDuplicates: duplicates.filter((day) => day.hasAttribute('data-selected')).length,
      tabStops: interval.shadowRoot.querySelectorAll('button.day[tabindex="0"]').length,
    };
    interval.remove();
    return result;
  });
  if (
    calendarIntervalResult.publicGrids !== 1 ||
    calendarIntervalResult.months !== 2 ||
    calendarIntervalResult.duplicates !== 2 ||
    calendarIntervalResult.selectedDuplicates !== 2 ||
    calendarIntervalResult.tabStops !== 1
  ) {
    throw new Error(`Calendar visible interval produced ${JSON.stringify(calendarIntervalResult)}`);
  }

  const controlledCalendarResult = await page.evaluate(async () => {
    const controlled = document.createElement('tp-calendar');
    controlled.value = '2026-09-15';
    controlled.displayedMonth = '2026-09-01';
    const selectionReasons = [];
    const displayedMonths = [];
    controlled.onValueChange = (event) => {
      selectionReasons.push(event.detail.reason);
      controlled.value = event.detail.value;
    };
    controlled.onDisplayedMonthChange = (event) => {
      displayedMonths.push(event.detail.value);
      controlled.displayedMonth = event.detail.value;
    };
    document.body.append(controlled);
    await controlled.updateComplete;
    controlled.shadowRoot
      .querySelector('button.day[data-date="2026-09-16"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, detail: 1 }));
    await controlled.updateComplete;
    await Promise.resolve();
    await controlled.updateComplete;
    controlled.shadowRoot.querySelector('button[part~="calendar-next"]').click();
    await controlled.updateComplete;
    await Promise.resolve();
    await controlled.updateComplete;
    const result = {
      value: controlled.value,
      selection: controlled.selection,
      displayedMonth: controlled.displayedMonth,
      displayedMonthValue: controlled.displayedMonthValue,
      selectionReasons,
      displayedMonths,
    };
    controlled.remove();
    return result;
  });
  if (
    controlledCalendarResult.value !== '2026-09-16' ||
    controlledCalendarResult.selection !== '2026-09-16' ||
    controlledCalendarResult.displayedMonth !== '2026-10-01' ||
    controlledCalendarResult.displayedMonthValue !== '2026-10-01' ||
    JSON.stringify(controlledCalendarResult.selectionReasons) !== JSON.stringify(['pointer']) ||
    JSON.stringify(controlledCalendarResult.displayedMonths) !== JSON.stringify(['2026-10-01'])
  ) {
    throw new Error(
      `Controlled Calendar reconciliation produced ${JSON.stringify(controlledCalendarResult)}`,
    );
  }

  const calendarBoundaryResult = await page.evaluate(async () => {
    const bounded = document.createElement('tp-calendar');
    bounded.defaultDisplayedMonth = '2026-09-01';
    bounded.navigationStart = '2026-09-01';
    bounded.navigationEnd = '2026-09-01';
    document.body.append(bounded);
    await bounded.updateComplete;
    const disabled = {
      previous: bounded.shadowRoot.querySelector('button[part~="calendar-previous"]')?.disabled,
      next: bounded.shadowRoot.querySelector('button[part~="calendar-next"]')?.disabled,
    };
    bounded.disabledNavigation = 'hide';
    await bounded.updateComplete;
    const hidden = {
      previous: bounded.shadowRoot.querySelector('button[part~="calendar-previous"]') === null,
      next: bounded.shadowRoot.querySelector('button[part~="calendar-next"]') === null,
    };
    bounded.remove();

    const rtl = document.createElement('tp-calendar');
    rtl.dir = 'rtl';
    rtl.defaultValue = '2026-09-15';
    rtl.defaultDisplayedMonth = '2026-09-01';
    document.body.append(rtl);
    await rtl.updateComplete;
    const current = rtl.shadowRoot.querySelector('button.day[data-date="2026-09-15"]');
    current.focus();
    current.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await rtl.updateComplete;
    await Promise.resolve();
    const rtlFocusedDate = rtl.shadowRoot.activeElement?.dataset.date;
    rtl.remove();
    return { disabled, hidden, rtlFocusedDate };
  });
  if (
    !calendarBoundaryResult.disabled.previous ||
    !calendarBoundaryResult.disabled.next ||
    !calendarBoundaryResult.hidden.previous ||
    !calendarBoundaryResult.hidden.next ||
    calendarBoundaryResult.rtlFocusedDate !== '2026-09-14'
  ) {
    throw new Error(
      `Calendar navigation policies produced ${JSON.stringify(calendarBoundaryResult)}`,
    );
  }

  const slider = page.locator('tp-slider').first();
  await slider.evaluate((element) => element.updateComplete);
  const sliderContract = await slider.evaluate((element) => {
    const parts = (selector) =>
      element.shadowRoot?.querySelector(selector)?.getAttribute('part')?.split(' ') ?? [];
    const thumbs = [...(element.shadowRoot?.querySelectorAll('input[type="range"]') ?? [])];
    return {
      values: element.values,
      rootParts: parts('.root'),
      trackParts: parts('.track'),
      rangeParts: parts('.range'),
      labelParts: parts('.header span'),
      outputParts: parts('output'),
      thumbParts: thumbs.map((thumb) => thumb.getAttribute('part')?.split(' ') ?? []),
      thumbLabels: thumbs.map((thumb) => thumb.getAttribute('aria-label')),
      inputIds: element.thumbMetadata.map((thumb) => thumb.inputId),
      alignment: element.shadowRoot
        ?.querySelector('.control')
        ?.getAttribute('data-thumb-alignment'),
    };
  });
  if (
    JSON.stringify(sliderContract.values) !== JSON.stringify([20, 60]) ||
    !sliderContract.rootParts.includes('slider') ||
    !sliderContract.rootParts.includes('slider-orientation-horizontal') ||
    !sliderContract.trackParts.includes('slider-track') ||
    !sliderContract.rangeParts.includes('slider-range') ||
    !sliderContract.labelParts.includes('slider-label') ||
    !sliderContract.outputParts.includes('slider-output') ||
    sliderContract.thumbParts.length !== 2 ||
    sliderContract.thumbParts.some((parts) => !parts.includes('slider-thumb')) ||
    JSON.stringify(sliderContract.thumbLabels) !==
      JSON.stringify(['Budget minimum', 'Budget maximum']) ||
    sliderContract.inputIds.some((id) => !id) ||
    sliderContract.alignment !== 'center'
  ) {
    throw new Error(`Slider public contract produced ${JSON.stringify(sliderContract)}`);
  }

  await slider.evaluate((element) => {
    window.__tpSliderChanges = [];
    window.__tpSliderCommits = [];
    const record = (event) => ({
      value: event.detail.value,
      previousValue: event.detail.previousValue,
      reason: event.detail.reason,
      activeThumbIndex: event.detail.metadata?.activeThumbIndex,
    });
    element.addEventListener('tp-value-change', (event) => {
      window.__tpSliderChanges.push(record(event));
    });
    element.addEventListener('tp-value-commit', (event) => {
      window.__tpSliderCommits.push(record(event));
    });
  });
  const sliderThumbs = slider.locator('input[type="range"]');
  await sliderThumbs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await slider.evaluate((element) => element.updateComplete);
  const keyboardSliderResult = await page.evaluate(() => ({
    values: document.querySelector('tp-slider')?.values,
    changes: window.__tpSliderChanges,
    commits: window.__tpSliderCommits,
  }));
  if (
    JSON.stringify(keyboardSliderResult.values) !== JSON.stringify([21, 60]) ||
    keyboardSliderResult.changes.at(-1)?.reason !== 'keyboard' ||
    keyboardSliderResult.changes.at(-1)?.activeThumbIndex !== 0 ||
    keyboardSliderResult.commits.length !== 1 ||
    keyboardSliderResult.commits[0]?.reason !== 'keyboard'
  ) {
    throw new Error(`Slider keyboard request produced ${JSON.stringify(keyboardSliderResult)}`);
  }

  const valueBeforeSliderCancellation = await slider.evaluate((element) => element.values);
  const commitsBeforeSliderCancellation = await page.evaluate(
    () => window.__tpSliderCommits.length,
  );
  await slider.evaluate((element) => {
    element.addEventListener('tp-value-change', (event) => event.preventDefault(), { once: true });
  });
  await page.keyboard.press('ArrowRight');
  await slider.evaluate((element) => element.updateComplete);
  const cancelledSliderResult = await slider.evaluate((element) => ({
    values: element.values,
    commits: window.__tpSliderCommits.length,
  }));
  if (
    JSON.stringify(cancelledSliderResult.values) !==
      JSON.stringify(valueBeforeSliderCancellation) ||
    cancelledSliderResult.commits !== commitsBeforeSliderCancellation
  ) {
    throw new Error(
      `Slider committed a cancelled request: ${JSON.stringify(cancelledSliderResult)}`,
    );
  }

  await slider.evaluate(async (element) => {
    element.setValue([20, 60]);
    element.thumbCrossing = 'prevent';
    await element.updateComplete;
  });
  await sliderThumbs.nth(0).focus();
  await page.keyboard.press('End');
  await slider.evaluate((element) => element.updateComplete);
  if (
    JSON.stringify(await slider.evaluate((element) => element.values)) !== JSON.stringify([60, 60])
  ) {
    throw new Error('Slider prevent policy allowed a thumb to cross its neighbor');
  }

  await slider.evaluate(async (element) => {
    element.setValue([20, 60]);
    element.thumbCrossing = 'swap';
    await element.updateComplete;
  });
  const identityBeforeSwap = await slider.evaluate((element) => element.thumbMetadata[0]?.inputId);
  await sliderThumbs.nth(0).focus();
  await page.keyboard.press('End');
  await slider.evaluate((element) => element.updateComplete);
  const swapSliderResult = await slider.evaluate((element) => ({
    values: element.values,
    activeThumbIndex: element.activeThumbIndex,
    activeInputId: element.thumbMetadata[element.activeThumbIndex]?.inputId,
  }));
  if (
    JSON.stringify(swapSliderResult.values) !== JSON.stringify([60, 100]) ||
    swapSliderResult.activeThumbIndex !== 1 ||
    swapSliderResult.activeInputId !== identityBeforeSwap
  ) {
    throw new Error(`Slider swap policy produced ${JSON.stringify(swapSliderResult)}`);
  }

  await slider.evaluate(async (element) => {
    element.setValue([20, 60]);
    element.thumbCrossing = 'prevent';
    await element.updateComplete;
  });
  await slider.scrollIntoViewIfNeeded();
  const sliderControlBox = await slider.locator('.control').boundingBox();
  if (!sliderControlBox) throw new Error('Slider control has no rendered geometry');
  await page.mouse.click(
    sliderControlBox.x + sliderControlBox.width * 0.75,
    sliderControlBox.y + sliderControlBox.height / 2,
  );
  await slider.evaluate((element) => element.updateComplete);
  const trackSliderResult = await page.evaluate(() => ({
    values: document.querySelector('tp-slider')?.values,
    change: window.__tpSliderChanges.at(-1),
    commit: window.__tpSliderCommits.at(-1),
  }));
  if (
    JSON.stringify(trackSliderResult.values) !== JSON.stringify([20, 75]) ||
    trackSliderResult.change?.reason !== 'track-press' ||
    trackSliderResult.commit?.reason !== 'track-press'
  ) {
    throw new Error(`Slider track press produced ${JSON.stringify(trackSliderResult)}`);
  }

  const sliderFormResult = await page.evaluate(async () => {
    const form = document.createElement('form');
    form.innerHTML =
      '<tp-slider label="Window" name="window" default-value="20 60"></tp-slider><button type="reset">Reset</button>';
    document.body.append(form);
    const range = form.querySelector('tp-slider');
    await range.updateComplete;
    const initial = new FormData(form).getAll('window');
    const changes = [];
    const commits = [];
    range.addEventListener('tp-value-change', (event) => changes.push(event.detail.reason));
    range.addEventListener('tp-value-commit', (event) => commits.push(event.detail.reason));
    range.setValue([30, 70]);
    await range.updateComplete;
    const changed = new FormData(form).getAll('window');
    form.reset();
    await range.updateComplete;
    const reset = new FormData(form).getAll('window');
    const result = { initial, changed, reset, changes, commits };
    form.remove();
    return result;
  });
  if (
    JSON.stringify(sliderFormResult.initial) !== JSON.stringify(['20', '60']) ||
    JSON.stringify(sliderFormResult.changed) !== JSON.stringify(['30', '70']) ||
    JSON.stringify(sliderFormResult.reset) !== JSON.stringify(['20', '60']) ||
    sliderFormResult.changes.at(-1) !== 'form-reset' ||
    sliderFormResult.commits.at(-1) !== 'form-reset'
  ) {
    throw new Error(`Slider form contract produced ${JSON.stringify(sliderFormResult)}`);
  }

  const controlledSliderResult = await page.evaluate(async () => {
    const controlled = document.createElement('tp-slider');
    controlled.label = 'Controlled';
    controlled.value = [10, 30];
    const commits = [];
    controlled.onValueChange = (event) => {
      controlled.value = event.detail.value;
    };
    controlled.onValueCommitted = (event) => commits.push(event.detail.reason);
    document.body.append(controlled);
    await controlled.updateComplete;
    controlled.shadowRoot.querySelector('input[type="range"]').dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await controlled.updateComplete;
    await Promise.resolve();
    await controlled.updateComplete;
    const result = { value: controlled.value, values: controlled.values, commits };
    controlled.remove();
    return result;
  });
  if (
    JSON.stringify(controlledSliderResult.value) !== JSON.stringify([11, 30]) ||
    JSON.stringify(controlledSliderResult.values) !== JSON.stringify([11, 30]) ||
    JSON.stringify(controlledSliderResult.commits) !== JSON.stringify(['keyboard'])
  ) {
    throw new Error(
      `Controlled Slider reconciliation produced ${JSON.stringify(controlledSliderResult)}`,
    );
  }

  const button = page.locator('tp-button').first();
  const buttonContract = await button.evaluate((element) => ({
    variant: element.variant,
    size: element.size,
    controlPart: element.shadowRoot?.querySelector('button')?.getAttribute('part'),
    labelPart: element.shadowRoot?.querySelector('[part="button-label"]')?.getAttribute('part'),
  }));
  if (
    buttonContract.variant !== 'default' ||
    buttonContract.size !== 'default' ||
    !buttonContract.controlPart?.split(' ').includes('button') ||
    buttonContract.labelPart !== 'button-label'
  ) {
    throw new Error(`Button public contract produced ${JSON.stringify(buttonContract)}`);
  }

  const accessibility = await new AxeBuilder({ page }).analyze();
  if (accessibility.violations.length) {
    throw new Error(
      `Accessibility violations:\n${accessibility.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => `${node.target.join(' > ')} (${node.failureSummary})`).join('; ')}`).join('\n')}`,
    );
  }

  await mkdir(new URL('../tmp', import.meta.url), { recursive: true });
  await page.screenshot({
    path: new URL('../tmp/catalog-overview.png', import.meta.url).pathname,
    fullPage: false,
  });

  if (errors.length) throw new Error(errors.join('\n'));
  await page.goto(
    `${baseUrl}/iframe.html?id=tweakpad-ui-complete-catalog--states-and-motion&viewMode=story`,
    { waitUntil: 'networkidle' },
  );
  const statesAccessibility = await new AxeBuilder({ page }).analyze();
  if (statesAccessibility.violations.length) {
    throw new Error(
      `State-story accessibility violations:\n${statesAccessibility.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`).join('\n')}`,
    );
  }

  console.log(
    JSON.stringify({
      browser: browserName,
      controls: catalogEntries.length,
      registrations: Object.keys(registration).length,
      interactions: 83,
      accessibilityViolations: 0,
      errors: 0,
    }),
  );
} finally {
  await browser.close();
}
