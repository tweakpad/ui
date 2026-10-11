/**
 * File upload contract checks (API evidence through the public surface). Run in the fixture page:
 * `await fileUploadContract.run()` resolves a report and rejects with the failing keys.
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const file = (name, size = 10, type = '', lastModified = 1) =>
  new File([new Uint8Array(size)], name, { type, lastModified });

async function mount(attributes = '', setup = () => {}) {
  const host = document.querySelector('#host');
  host.innerHTML = `<tp-file-upload ${attributes}></tp-file-upload>`;
  const element = host.firstElementChild;
  const events = [];
  for (const type of ['tp-value-change', 'tp-file-reject', 'tp-upload-start', 'tp-upload-complete', 'tp-upload-error', 'tp-file-retry', 'tp-diagnostic', 'tp-field-validity'])
    element.addEventListener(type, (event) => events.push({ type, detail: event.detail }));
  setup(element);
  await element.updateComplete;
  return { element, events };
}
const names = (files) => files.map((entry) => entry.name).join(',');
const statuses = (element) => element.items.map((item) => `${item.file.name}:${item.status}`).join(',');

const checks = {
  async assignmentHasNoEvent() {
    const { element, events } = await mount('multiple');
    element.value = [file('a.txt'), file('b.txt')];
    await element.updateComplete;
    return names(element.value) === 'a.txt,b.txt' && !events.some((e) => e.type === 'tp-value-change') && statuses(element) === 'a.txt:selected,b.txt:selected';
  },
  async proposalMetadataAndCancel() {
    const { element, events } = await mount('multiple accept=".pdf"');
    const result = await element.addFiles([file('a.pdf'), file('b.png', 10, 'image/png')]);
    const change = events.find((e) => e.type === 'tp-value-change').detail;
    const ok1 = change.reason === 'imperative-action' && change.metadata.source === 'action' && names(change.metadata.added) === 'a.pdf' && change.metadata.rejected[0].errors[0].code === 'file-invalid-type' && names(result.accepted) === 'a.pdf';
    element.addEventListener('tp-value-change', (event) => event.preventDefault(), { once: true });
    const cancelled = await element.addFiles([file('c.pdf')]);
    return ok1 && cancelled.cancelled && names(element.value) === 'a.pdf' && !element.items.some((i) => i.file.name === 'c.pdf');
  },
  async singleReplace() {
    const { element } = await mount('accept=".pdf"');
    await element.addFiles([file('a.pdf')]);
    const result = await element.addFiles([file('x.exe'), file('b.pdf'), file('c.pdf')]);
    return names(element.value) === 'b.pdf' && result.rejected.map((r) => r.errors[0].code).join(',') === 'file-invalid-type,too-many-files';
  },
  async fillThenRejectAndFull() {
    const { element } = await mount('multiple max-files="3"');
    await element.addFiles([file('1'), file('2')]);
    await element.addFiles([file('3'), file('4')]);
    const input = element.shadowRoot.querySelector('input');
    const refused = await element.addFiles([file('5')]);
    return names(element.value) === '1,2,3' && element.full && element.hasAttribute('data-full') && input.tabIndex === -1 && refused.cancelled && element.openFilePicker() === false;
  },
  async sizesAndDuplicates() {
    const { element } = await mount('multiple max-file-size="1KB" min-file-size="2" max-total-size="1.5KB"');
    const result = await element.addFiles([file('big', 2048), file('tiny', 1), file('a', 1000, '', 1), file('a', 1000, '', 1), file('b', 1000, '', 2)]);
    return result.rejected.map((r) => `${r.file.name}:${r.errors.map((e) => e.code).join('+')}`).join(',') === 'big:file-too-large,tiny:file-too-small,a:file-exists,b:total-too-large';
  },
  async validatorOrderMetadataAndExclusion() {
    const { element } = await mount('multiple', (el) => {
      el.fileValidator = async (f, { index }) => {
        await wait(f.name === 'slow' ? 150 : 10);
        if (f.name === 'bad') throw new Error('boom');
        return { meta: { index }, description: `#${index}` };
      };
    });
    const first = element.addFiles([file('slow'), file('bad')]);
    const second = element.addFiles([file('later'), file('removed')]);
    await wait(20);
    const validating = statuses(element).includes('slow:validating');
    element.removeFile(element.items.find((i) => i.file.name === 'removed'));
    await Promise.all([first, second]);
    const slow = element.items.find((i) => i.file.name === 'slow');
    return validating && names(element.value) === 'slow,later' && slow.description === '#0' && slow.meta.index === 0 && element.items.find((i) => i.file.name === 'bad').errors[0].code === 'validation-failed' && !element.items.some((i) => i.file.name === 'removed');
  },
  async validateRun() {
    const { element } = await mount('multiple');
    await element.addFiles([file('a'), file('b'), file('c')]);
    element.maxFiles = 2;
    const run = element.validate();
    const snapshot = await run.completion;
    return snapshot.status === 'invalid' && names(element.value) === 'a,b' && element.rejections[0].errors[0].code === 'too-many-files';
  },
  async resetAbortsAndRestoresDefault() {
    let aborted = false;
    const { element } = await mount('multiple', (el) => {
      el.defaultValue = [file('default.txt')];
      el.fileValidator = (_f, { signal }) => new Promise((resolve) => signal.addEventListener('abort', () => { aborted = true; resolve(null); }));
    });
    void element.addFiles([file('pending')]);
    await wait(10);
    const form = document.createElement('form');
    document.querySelector('#host').append(form);
    form.append(element);
    form.reset();
    await wait(20);
    return aborted && names(element.value) === 'default.txt' && element.items.length === 1;
  },
  async messagesLocalized() {
    const { element } = await mount('accept=".pdf"', (el) => {
      el.messages = { title: 'Sube un archivo', 'file-invalid-type': 'Tipo no aceptado: {name}', hintTypes: 'Solo {types}' };
    });
    await element.addFiles([file('x.png', 10, 'image/png')]);
    await element.updateComplete;
    const text = element.shadowRoot.textContent;
    return text.includes('Sube un archivo') && text.includes('Solo PDF') && element.rejections[0].errors[0].message === 'Tipo no aceptado: x.png';
  },
  async itemStateAndServerRejection() {
    const { element, events } = await mount('multiple');
    await element.addFiles([file('a.pdf'), file('b.pdf')]);
    element.setItemState(element.value[0], { status: 'processing', description: 'Scanning', meta: { pages: 3 } });
    const refused = element.setItemState(element.value[0], { status: 'rejected' });
    element.rejectFile(element.value[1], { code: 'virus', message: 'Malware found.' });
    await element.updateComplete;
    const attachment = element.shadowRoot.querySelector('[part~="file-upload-item"] tp-attachment');
    return !refused && attachment.status === 'processing' && names(element.value) === 'a.pdf' && element.rejections[0].errors[0].code === 'virus' && events.some((e) => e.type === 'tp-file-reject') && element.validationMessage.includes('Malware');
  },
  async keepRejectedOff() {
    const { element, events } = await mount('multiple accept=".pdf" keep-rejected="false"');
    await element.addFiles([file('x.png', 10, 'image/png')]);
    return element.items.length === 0 && events.some((e) => e.type === 'tp-file-reject') && element.checkValidity();
  },
  async uploadsAbortRetryAndConcurrency() {
    let active = 0;
    let peak = 0;
    const attempts = {};
    const { element, events } = await mount('multiple upload-concurrency="2"', (el) => {
      el.uploader = (item, { signal, onProgress }) => new Promise((resolve, reject) => {
        active++; peak = Math.max(peak, active);
        attempts[item.file.name] = (attempts[item.file.name] ?? 0) + 1;
        onProgress(50, 100);
        const timer = setTimeout(() => { active--; if (item.file.name === 'fail' && attempts.fail === 1) reject(new Error('500')); else resolve({ ok: item.file.name }); }, 60);
        signal.addEventListener('abort', () => { clearTimeout(timer); active--; reject(signal.reason); });
      });
    });
    await element.addFiles([file('a'), file('fail'), file('c'), file('cancel')]);
    await wait(10);
    const progress = element.items.find((i) => i.file.name === 'a').progress;
    element.removeFile(element.items.find((i) => i.file.name === 'cancel'));
    await wait(300);
    const failed = element.items.find((i) => i.file.name === 'fail');
    const retryButton = element.shadowRoot.querySelector('[part~="file-upload-item-retry"]');
    element.upload(failed);
    await wait(150);
    return progress === 50 && peak === 2 && failed.status === 'error' && !!retryButton && element.items.every((i) => i.status === 'complete') && element.items.find((i) => i.file.name === 'a').response.ok === 'a' && events.filter((e) => e.type === 'tp-upload-error').length === 1;
  },
  async cancelUploadReturnsToQueued() {
    const { element } = await mount('multiple', (el) => {
      el.uploader = (_item, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    });
    await element.addFiles([file('a')]);
    await wait(10);
    const uploading = element.items[0].status === 'uploading';
    element.cancelUpload();
    await wait(10);
    return uploading && element.items[0].status === 'queued';
  },
  async previewsLifecycle() {
    const created = [];
    const revoked = [];
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = (blob) => { const url = original.create(blob); created.push(url); return url; };
    URL.revokeObjectURL = (url) => { revoked.push(url); original.revoke(url); };
    try {
      const { element } = await mount('multiple');
      await element.addFiles([file('a.png', 10, 'image/png'), file('b.pdf', 10, 'application/pdf')]);
      const one = created.length === 1;
      element.showPreviews = false;
      await element.updateComplete;
      const offRevoked = revoked.length === 1;
      element.showPreviews = true;
      await element.updateComplete;
      element.remove();
      const disconnectRevoked = revoked.length === 2;
      document.querySelector('#host').append(element);
      await element.updateComplete;
      return one && offRevoked && disconnectRevoked && created.length === 3 && !!element.items[0].previewUrl;
    } finally {
      URL.createObjectURL = original.create;
      URL.revokeObjectURL = original.revoke;
    }
  },
  async disabledAndReadOnly() {
    const { element } = await mount('multiple disabled');
    const refused = await element.addFiles([file('a')]);
    element.disabled = false;
    element.readOnly = true;
    element.value = [file('b')];
    await element.updateComplete;
    const removed = element.removeFile(element.value[0]);
    const input = element.shadowRoot.querySelector('input');
    const buttons = element.shadowRoot.querySelectorAll('[part~="file-upload-item-delete"]').length;
    return refused.cancelled && !removed && input.tabIndex === 0 && buttons === 0 && element.openFilePicker() === false;
  },
  async formData() {
    const form = document.createElement('form');
    document.querySelector('#host').replaceChildren(form);
    form.innerHTML = '<tp-file-upload name="docs" multiple></tp-file-upload><tp-file-upload name="one"></tp-file-upload>';
    const [many, one] = form.querySelectorAll('tp-file-upload');
    many.value = [file('a'), file('b')];
    one.value = [file('c')];
    await many.updateComplete;
    const data = new FormData(form);
    const ok = names(data.getAll('docs')) === 'a,b' && data.get('one').name === 'c';
    many.disabled = true;
    await many.updateComplete;
    return ok && new FormData(form).getAll('docs').length === 0;
  },
  async togglesAndDiagnostics() {
    const { element, events } = await mount('multiple show-items="false" max-file-size="lots"');
    await element.addFiles([file('a')]);
    await element.updateComplete;
    const list = element.shadowRoot.querySelector('[part~="file-upload-items"]');
    const hiddenList = list.hidden;
    element.upload();
    element.removeFile('nope');
    const codes = events.filter((e) => e.type === 'tp-diagnostic').map((e) => e.detail.code);
    element.clearable = true;
    element.showItems = true;
    await element.updateComplete;
    const clear = element.shadowRoot.querySelector('[part~="file-upload-clear"]');
    return hiddenList && codes.includes('file-upload-invalid-size') && codes.includes('file-upload-no-uploader') && codes.includes('file-upload-item-not-found') && !!clear;
  },
  async documentGuard() {
    await mount('multiple');
    const transfer = new DataTransfer();
    transfer.items.add(file('x.txt'));
    const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  },
  async pasteScopes() {
    const chips = document.querySelector('#chips');
    const previous = chips.paste;
    chips.paste = 'none';
    await chips.updateComplete;
    try {
      const paste = window.fileUploadFixture.pasteFiles;
      const settle = async (element) => {
        await wait(30);
        await element.updateComplete;
      };
      const { element, events } = await mount('multiple paste="control" accept="image/*"');
      const input = element.shadowRoot.querySelector('input');
      const body = document.body;
      const notes = document.querySelector('#notes');
      const image = (name, stamp) => file(name, 10, 'image/png', stamp);
      const outsideControl = paste(body, [image('a.png', 1)]);
      const inside = paste(input, [image('a.png', 1)]);
      await settle(element);
      const change = events.find((e) => e.type === 'tp-value-change')?.detail;
      const controlOk = !outsideControl && inside && change?.reason === 'input-paste' && change.metadata.source === 'paste' && names(element.value) === 'a.png';
      const textOnly = paste(input, [], 'hello');
      const wrongType = paste(input, [file('notes.txt', 10, 'text/plain')]);
      await settle(element);
      const rejected = events.find((e) => e.type === 'tp-file-reject')?.detail.rejections[0];
      const rejectOk = !textOnly && wrongType && rejected?.errors[0].code === 'file-invalid-type' && rejected.file.name === 'notes.txt';
      element.paste = 'document';
      await element.updateComplete;
      const inNotes = paste(notes, [image('b.png', 2)]);
      const onPage = paste(body, [image('b.png', 2)]);
      await settle(element);
      const documentOk = !inNotes && onPage && names(element.value) === 'a.png,b.png';
      element.readOnly = true;
      await element.updateComplete;
      const readOnlyTaken = paste(body, [image('c.png', 3)]);
      await settle(element);
      const readOnlyOk = readOnlyTaken && names(element.value) === 'a.png,b.png' && events.some((e) => e.type === 'tp-diagnostic' && e.detail.code === 'file-upload-refused');
      element.readOnly = false;
      element.disabled = true;
      await element.updateComplete;
      const disabledTaken = paste(body, [image('c.png', 3)]);
      element.disabled = false;
      element.paste = 'none';
      await element.updateComplete;
      const noneTaken = paste(input, [image('c.png', 3)]);
      element.paste = 'document';
      await element.updateComplete;
      element.remove();
      const detachedTaken = paste(body, [image('c.png', 3)]);
      return controlOk && rejectOk && documentOk && readOnlyOk && !disabledTaken && !noneTaken && !detachedTaken && names(element.value) === 'a.png,b.png';
    } finally {
      chips.paste = previous;
    }
  },
};

window.fileUploadContract = {
  checks,
  async run(only) {
    const report = {};
    for (const [key, check] of Object.entries(checks)) {
      if (only && !only.includes(key)) continue;
      try {
        report[key] = await check();
      } catch (error) {
        report[key] = `threw: ${error?.message ?? error}`;
      }
    }
    document.querySelector('#host').replaceChildren();
    const failing = Object.entries(report).filter(([, value]) => value !== true).map(([key]) => key);
    if (failing.length) throw new Error(`Failing: ${failing.join(', ')} ${JSON.stringify(report)}`);
    return report;
  },
};
