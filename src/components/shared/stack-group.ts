import { css, html } from 'lit';
import type { TpElement } from '../../foundation/element.js';

/** A vertical stack of family members (Bubble, Message and List item groups). */
export const stackGroupStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .group {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }
`;

/** Renders the family's root part as the stack and projects the members into it. */
export function renderStackGroup(host: TpElement, part: string): unknown {
  return host.renderPart(part, Object.freeze({}), {
    properties: { class: 'group', part },
    content: html`<slot></slot>`,
  });
}
