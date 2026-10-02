import { html, render } from 'lit';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';

const example = document.createElement('div');
document.body.append(example);
render(html`<tp-progress
  .value=${56}
  label="Upload progress"
  .partContracts=${{
    'progress-value-output': { content: (state) => state.formattedValue },
  }}
  ><span slot="label">Upload progress</span></tp-progress
>`, example);
