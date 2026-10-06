import { css } from 'lit';
import { fillLayerStyles } from '../../presentation/motion.js';
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

  ${fillLayerStyles("[part~='questionnaire-choice']")}

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

    /* Align to the first text line even when the label or description wraps. */
    margin-block-start: calc((1lh - var(--tp-icon-size-md)) / 2);
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
    font: inherit;
    block-size: 1lh;
    align-items: center;
    pointer-events: none;
  }

  .free-answer {
    box-sizing: border-box;
    inline-size: 100%;
    min-inline-size: 0;
  }

  [part~='questionnaire-progress'] {
    display: grid;
  }

  [part~='questionnaire-actions'] {
    inline-size: 100%;
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
