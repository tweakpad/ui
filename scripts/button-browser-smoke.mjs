import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
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
  console.log('Button browser contract passed');
} finally {
  await browser.close();
}
