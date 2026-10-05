import { html, render } from 'lit';
import { questionnaireData } from '../../../../src/stories/questionnaire-data.js';
import { setupQuestionnaireExample } from '../../../../src/stories/questionnaire-example.js';
import { questionnaireExamples } from '../../../../src/stories/questionnaire.examples.js';
const packageMode = new URLSearchParams(location.search).has('package');
if (packageMode) await import('../../../../dist/register.js');
else await import('../../../../src/register.js');
await import('../../../../src/styles.css');
const main = document.querySelector('main')!;
const query = new URLSearchParams(location.search);
const choice = query.get('case');
const examples = questionnaireExamples.filter((example) => !choice || example.title === choice);
render(
  html`<h1>Questionnaire verification</h1>
    ${examples.map(
      (example) =>
        html`<section
          aria-label=${example.title}
          style="padding:2rem;border-block-end:1px solid var(--tp-border)"
        >
          <h2>${example.title}</h2>
          ${example.render()}
        </section>`,
    )}`,
  main,
);
Object.assign(window, { questionnaireData, setupQuestionnaireExample });
const { runQuestionnaireChecks } = await import('./api.js');
Object.assign(window, { runQuestionnaireChecks });
