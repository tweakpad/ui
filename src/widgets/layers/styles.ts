import { css } from 'lit';

/** Structure only: layout and visibility. Appearance is the recipe. */
export const layersStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .root {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    min-block-size: 0;
  }

  .bar {
    display: flex;
    align-items: center;
    min-inline-size: 0;
  }

  .region {
    display: flex;
    align-items: center;
    gap: inherit;
    min-inline-size: 0;
  }

  /* The start region takes the free space, so the end region sits at the bar's end. */
  .region[data-region='start'] {
    flex: 1 1 auto;
  }

  .region[data-region='end'] {
    flex: 0 0 auto;
  }

  .region[data-region='end'][data-empty],
  .bar[data-empty],
  .tree[hidden],
  .empty[hidden] {
    display: none;
  }

  .tree {
    display: block;
    min-block-size: 0;
  }

  /* Rows keep a column for the group chevron so labels line up under groups; a stack without
     groups has no chevron to line up with, so its rows start at their edge. */
  .tree[data-flat]::part(indicator) {
    display: none;
  }
`;
