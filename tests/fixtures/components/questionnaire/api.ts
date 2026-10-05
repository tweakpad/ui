/** Browser contract assertions. Run through Chrome DevTools MCP; no browser driver. */
export async function runQuestionnaireChecks() {
  const results: string[] = [];
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
    results.push(message);
  };
  const tick = async (q: any) => {
    await q.updateComplete;
    await Promise.resolve();
    await q.updateComplete;
  };
  const mounted: HTMLElement[] = [];
  const create = async (options: any = {}) => {
    const q = Object.assign(document.createElement('tp-questionnaire'), {
      questions: [
        {
          name: 'a',
          title: 'First question',
          required: true,
          choices: [
            { value: 'one', label: 'One' },
            { value: 'two', label: 'Two' },
          ],
          input: { label: 'Another answer' },
        },
        {
          name: 'b',
          title: 'Optional question',
          skippable: true,
          kind: 'multiple',
          choices: [
            { value: 'x', label: 'X' },
            { value: 'y', label: 'Y' },
          ],
        },
      ],
      ...options,
    });
    document.querySelector('main')!.append(q);
    mounted.push(q);
    await tick(q);
    return q as any;
  };
  try {
    const q = await create();
    const aligned = () =>
      [...q.shadowRoot.querySelectorAll('[part=questionnaire-choice]')].every((row: any) => {
        const label = row.querySelector('.choice-copy > span');
        const lineCenter =
          label.getBoundingClientRect().y + parseFloat(getComputedStyle(label).lineHeight) / 2;
        return [...row.querySelectorAll('.box,.shortcut')].every((part: any) => {
          const rect = part.getBoundingClientRect();
          return Math.abs(rect.y + rect.height / 2 - lineCenter) < 0.75;
        });
      });
    assert(aligned(), 'choice indicators align with the first label line');
    q.style.inlineSize = '220px';
    q.style.setProperty('--tp-icon-size-md', '25px');
    q.shortcutMode = 'letters';
    q.questions = q.questions.map((item: any) =>
      item.name === 'a'
        ? {
            ...item,
            choices: item.choices.map((choice: any) => ({
              ...choice,
              label: 'A long wrapped choice label for alignment',
              description: 'Additional explanatory text also wraps.',
            })),
          }
        : item,
    );
    await tick(q);
    assert(aligned(), 'wrapped labels and enlarged indicators stay aligned with shortcuts');
    q.style.removeProperty('inline-size');
    q.style.removeProperty('--tp-icon-size-md');
    let submitted: any;
    q.addEventListener('tp-submit', (e: any) => {
      e.preventDefault();
      submitted = e.detail;
    });
    const progress = q.shadowRoot.querySelector('[role=progressbar]');
    assert(
      progress.getAttribute('aria-valuenow') === '1' &&
        progress.getAttribute('aria-valuemax') === '2',
      'named progress derives ordered position',
    );
    assert(
      q.shadowRoot.querySelector('[part=questionnaire-choices] .free-answer'),
      'mixed input shares Choices layout',
    );
    q.requestSubmit();
    await tick(q);
    assert(
      !submitted && q.shadowRoot.querySelector('[role=alert]'),
      'empty native submit validates and announces error',
    );
    assert(q.shadowRoot.activeElement?.matches('input'), 'invalid submission focuses an answer');
    q.setAnswer('a', 'other answer');
    q.setItem('b');
    await tick(q);
    q.setAnswer('b', ['x', 'y']);
    await tick(q);
    const check = q.shadowRoot.querySelector('tp-icon');
    await check.updateComplete;
    assert(
      check.getBoundingClientRect().width <= check.parentElement.getBoundingClientRect().width,
      'selected checkbox icon stays within its indicator',
    );
    q.requestSubmit();
    await tick(q);
    assert(
      submitted?.data.get('a') === 'other answer' && submitted.data.getAll('b').join() === 'x,y',
      'prior freeform plus repeated multiple values serialize',
    );
    const oldField = q.shadowRoot.querySelector('fieldset');
    const oldActions = q.shadowRoot.querySelector('[part=questionnaire-actions]');
    q.setItem('a');
    await tick(q);
    assert(
      q.shadowRoot.querySelector('fieldset') !== oldField &&
        q.shadowRoot.querySelector('[part=questionnaire-actions]') === oldActions,
      'item identity changes while navigation remains stable',
    );
    const field = q.shadowRoot.querySelector('fieldset');
    q.setAnswer('a', 'one');
    await tick(q);
    assert(
      q.shadowRoot.querySelector('fieldset') === field,
      'answer edits retain fieldset identity and focus target',
    );
    q.actions = {
      next: { label: 'Continue', disabled: true, variant: 'secondary', size: 'sm' },
      skip: { hidden: true },
    };
    await tick(q);
    const next = q.shadowRoot.querySelector('[data-action=next]');
    assert(
      next.disabled &&
        next.variant === 'secondary' &&
        next.size === 'sm' &&
        next.textContent === 'Continue',
      'individual actions use Button options',
    );
    assert(
      q.shadowRoot.querySelector('[data-action=skip]').hidden,
      'independent action hidden option',
    );
    let state: any;
    q.partContracts = {
      'questionnaire-choice': {
        classHook: (s: any) => {
          state = s;
          return 'custom-choice';
        },
      },
    };
    await tick(q);
    assert(
      state.name === 'a' &&
        state.type === 'radio' &&
        state.value === 'two' &&
        state.checked === false &&
        state.invalid === false,
      'constituent callbacks expose committed choice state',
    );
    q.questions = q.questions.map((item: any) =>
      item.name === 'b' ? { ...item, disabled: true } : item,
    );
    await tick(q);
    q.requestSubmit();
    await tick(q);
    assert(
      q.total === 1 && !submitted.data.has('b'),
      'disabled question omitted from progress and successful data',
    );
    q.questions = [];
    await tick(q);
    assert(q.current === 0 && q.total === 0 && q.item === '', 'empty collection has zero position');

    let accept = false;
    const controlled = await create({
      value: { a: 'one' },
      item: 'a',
      onValueChange(e: any) {
        if (accept) controlled.value = e.detail.value;
      },
      onItemChange(e: any) {
        if (accept) controlled.item = e.detail.value;
      },
    });
    assert(
      !controlled.setAnswer('a', 'two') && controlled.answers.a === 'one',
      'controlled aggregate rejection preserves answers',
    );
    accept = true;
    assert(
      controlled.setAnswer('a', 'two') && controlled.answers.a === 'two',
      'controlled aggregate synchronous acceptance',
    );
    controlled.setItem('b');
    await tick(controlled);
    controlled.setAnswer('b', ['x']);
    await tick(controlled);
    const reject = (e: Event) => e.preventDefault();
    controlled.addEventListener('tp-item-change', reject);
    controlled.reset();
    await tick(controlled);
    assert(
      controlled.item === 'b' && controlled.answers.b[0] === 'x',
      'reset veto preserves answer and active item atomically',
    );
    controlled.removeEventListener('tp-item-change', reject);

    const optional = await create({
      questions: [
        { name: 'q', title: 'Optional', skippable: true, choices: [{ value: 'x', label: 'X' }] },
      ],
    });
    let optionalData: any;
    optional.addEventListener('tp-submit', (e: any) => {
      e.preventDefault();
      optionalData = e.detail.data;
    });
    optional.setAnswer('q', 'x');
    await tick(optional);
    optional.shadowRoot.querySelector('[data-action=skip]').click();
    await tick(optional);
    await tick(optional);
    assert(
      optional.status === 'skipped' && optionalData && !optionalData.has('q'),
      'last optional skip clears then submits',
    );
    optional.setAnswer('q', 'x');
    await tick(optional);
    assert(optional.status === 'answered', 'answering clears skipped status');

    const saved = await create({ defaultItem: 'b', defaultValue: { a: 'one', b: ['x'] } });
    saved.setAnswer('b', ['y']);
    saved.reset();
    await tick(saved);
    assert(
      saved.item === 'b' && saved.answers.b.join() === 'x',
      'saved defaults and active checkpoint restored',
    );
    const stopReset = (e: Event) => e.preventDefault();
    saved.shadowRoot.querySelector('form').addEventListener('reset', stopReset);
    saved.setAnswer('b', ['y']);
    saved.reset();
    await tick(saved);
    assert(saved.answers.b.join() === 'y', 'prevented native reset preserves values');

    const dynamic = await create({ flow: 'free' });
    dynamic.setItem('b');
    await tick(dynamic);
    dynamic.questions = [dynamic.questions[0]];
    await tick(dynamic);
    assert(dynamic.item === 'a', 'removed active item falls back to remaining item');
    dynamic.remove();
    document.querySelector('main')!.append(dynamic);
    await tick(dynamic);
    assert(dynamic.setAnswer('a', 'two'), 'reconnected control remains interactive');
    return results;
  } finally {
    mounted.forEach((node) => node.remove());
  }
}
