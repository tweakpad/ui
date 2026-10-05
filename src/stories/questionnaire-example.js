import { html } from 'lit';

/** Configure a real Questionnaire using only its public APIs. Returns teardown. */
export function setupQuestionnaireExample(root, questions, kind, submitLabel) {
  const placeholder = root.querySelector('tp-questionnaire');
  // Defaults and controlled ownership must be configured before connection.
  const q = placeholder.cloneNode(true);
  const result = root.querySelector('output');
  const dialog = root.querySelector('tp-dialog');
  const view = root.ownerDocument.defaultView;
  const cleanup = new view.AbortController();
  const listen = (element, name, callback) =>
    element?.addEventListener(name, callback, { signal: cleanup.signal });
  const report = (text) => {
    if (result) result.textContent = text;
  };
  q.questions = view.structuredClone(questions);
  q.actions = { submit: { label: submitLabel } };
  q.shortcutMode = kind === 'card' ? 'numbers' : 'letters';

  if (kind === 'controlled' || kind === 'validation') {
    q.item = questions[0].name;
    q.onItemChange = (event) => {
      if (event.defaultPrevented || event.detail.cancelled) return;
      q.item = event.detail.value;
      if (kind === 'controlled')
        report(
          `Current checkpoint: ${q.questions.find((item) => item.name === event.detail.value)?.title}`,
        );
    };
    if (kind === 'controlled') report(`Current checkpoint: ${questions[0].title}`);
  }
  if (kind === 'resume') {
    q.defaultItem = 'verification';
    // Defaults on the choice/input definitions also participate in native reset.
    listen(root.querySelector('[data-reset]'), 'click', () => {
      q.reset();
      report('Saved answers restored');
    });
  }
  if (kind === 'conditional') {
    q.value = { runtime: 'local' };
    const synchronize = (answers) => {
      q.value = answers;
      q.questions = questions.map((item) => ({
        ...item,
        disabled: item.name === 'environment' && answers.runtime !== 'cloud',
      }));
    };
    synchronize({ runtime: 'local' });
    q.onValueChange = (event) => {
      if (!event.defaultPrevented && !event.detail.cancelled) synchronize(event.detail.value);
    };
  }
  if (kind === 'navigation-state') {
    const synchronize = () => {
      const disabled = q.status !== 'answered';
      q.actions = {
        next: { disabled, variant: 'secondary' },
        submit: { label: submitLabel, disabled },
      };
    };
    q.questions = q.questions.map((item) => ({ ...item, onStatusChange: synchronize }));
    listen(q, 'tp-item-change', () => view.queueMicrotask(synchronize));
    void q.updateComplete.then(synchronize);
  }
  if (kind === 'shortcuts') {
    const select = root.querySelector('tp-select');
    listen(select, 'tp-value-change', (event) => {
      if (!event.defaultPrevented && !event.detail.cancelled) q.shortcutMode = event.detail.value;
    });
  }
  if (kind === 'progress') {
    q.partContracts = {
      'questionnaire-progress': {
        renderDelegate: ({ bind, state }) =>
          html`<div ${bind}>
            <tp-progress
              aria-hidden="true"
              .value=${state.current}
              .maximum=${state.total}
            ></tp-progress>
            <span>Checkpoint ${state.current} of ${state.total}</span>
          </div>`,
      },
    };
  }
  if (kind === 'card' || kind === 'validation') {
    // Recompose the already bound regions. No recreated answers or navigation.
    q.partContracts = {
      questionnaire: {
        renderDelegate: ({ bind, state }) =>
          html`<form ${bind}>${state.regions.answers}${state.regions.question}</form>`,
      },
      'questionnaire-question': {
        renderDelegate: ({ bind, state }) =>
          html`<fieldset ${bind}>
            <tp-card>
              ${state.regions.title}${state.regions.description}${state.regions.progress}
              ${state.regions.choices}${state.regions.error} ${state.regions.actions}
            </tp-card>
          </fieldset>`,
      },
      'questionnaire-actions': { hostProperties: { slot: 'footer' } },
      'questionnaire-description': { hostProperties: { slot: 'description' } },
      'questionnaire-progress': { hostProperties: { slot: 'action' } },
      'questionnaire-title': {
        hostProperties: { slot: 'header' },
        renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>`,
      },
      ...(kind === 'validation'
        ? {
            'questionnaire-progress': {
              hostProperties: { slot: 'action' },
              content: (state) => `${state.current} / ${state.total}`,
            },
          }
        : {}),
    };
  }
  let animation;
  let item;
  if (kind === 'animated') {
    q.partContracts = {
      'questionnaire-question': {
        elementReference: (element) => {
          if (element === item) return;
          animation?.cancel();
          item = element;
          if (!element) return;
          // Part refs attach during rendering; wait until inherited styles are resolved.
          view.queueMicrotask(() => {
            if (item !== element || !element.isConnected || cleanup.signal.aborted) return;
            // Use the inherited library motion scale (includes OS and explicit reduce policy).
            const style = view.getComputedStyle(element);
            const scale = Number(style.getPropertyValue('--tp-motion-scale').trim() || 1);
            if (!scale) return;
            const duration = parseFloat(style.getPropertyValue('--tp-duration-normal')) || 200;
            animation = element.animate(
              [
                { opacity: 0, transform: 'translateY(0.5rem)' },
                { opacity: 1, transform: 'none' },
              ],
              { duration: duration * scale, easing: 'ease-out' },
            );
          });
        },
      },
    };
  }
  if (kind === 'validation') {
    listen(q, 'tp-value-change', () => {
      q.questions = q.questions.map((item) => ({ ...item, invalid: false, error: '' }));
    });
  }
  listen(q, 'tp-submit', (event) => {
    event.preventDefault();
    const { answers, data } = event.detail;
    if (kind === 'validation' && answers.audience === 'public' && answers.detail === 'summary') {
      q.questions = q.questions.map((item) => ({
        ...item,
        invalid: item.name === 'detail',
        error:
          item.name === 'detail'
            ? 'Public answers need enough context. Choose a complete answer.'
            : '',
      }));
      q.item = 'detail';
      return;
    }
    report(
      `Submitted: ${JSON.stringify(Object.fromEntries([...new Set(data.keys())].map((name) => [name, q.questions.find((item) => item.name === name)?.kind === 'multiple' || data.getAll(name).length > 1 ? data.getAll(name) : data.get(name)])))}`,
    );
    if (dialog) dialog.close();
  });
  listen(root.querySelector('[data-cancel]'), 'click', () => dialog?.close());
  const accessory = root.querySelector('tp-select, [data-reset]');
  if (accessory) {
    // The existing form layout owns spacing for composed controls too.
    q.partContracts = {
      ...q.partContracts,
      questionnaire: {
        renderDelegate: ({ bind, content }) =>
          html`<form ${bind}>
            ${kind === 'shortcuts' ? accessory : null}${content}${kind === 'resume' ? accessory : null}
          </form>`,
      },
    };
  }
  if (dialog) dialog.showHeader = false;
  placeholder.replaceWith(q);
  return () => {
    cleanup.abort();
    animation?.cancel();
    q.onItemChange = undefined;
    q.onValueChange = undefined;
  };
}
