import { css } from 'lit';
export const questionnaireStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  form,
  fieldset,
  [part~='questionnaire-choices'] {
    display: grid;
    min-inline-size: 0;
  }

  fieldset {
    margin: 0;
  }

  [part~='questionnaire-choice'] {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    position: relative;
    cursor: pointer;
    min-block-size: var(--tp-target-size-min);
  }

  .choice-native {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    opacity: 0;
    cursor: inherit;
    margin: 0;
  }

  .box {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--tp-icon-size-md);
    block-size: var(--tp-icon-size-md);
    flex: none;
    pointer-events: none;
  }

  .dot {
    inline-size: 50%;
    block-size: 50%;
    border-radius: 50%;
    background: currentcolor;
  }

  .choice-copy {
    display: grid;
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .shortcut {
    pointer-events: none;
  }

  .free-answer {
    box-sizing: border-box;
    inline-size: 100%;
    min-inline-size: 0;
  }

  [part~='questionnaire-actions'] {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
  }

  [data-action='previous'] {
    grid-column: 1;
    grid-row: 1;
    justify-self: start;
  }

  [data-action='skip'] {
    grid-column: 2;
    grid-row: 1;
  }

  [data-action='next'],
  [data-action='submit'] {
    grid-column: 3;
    grid-row: 1;
  }

  [hidden] {
    display: none !important;
  }
`;
