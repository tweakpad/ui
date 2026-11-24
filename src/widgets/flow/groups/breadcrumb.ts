import { html, type TemplateResult } from 'lit';
import { TpBreadcrumb } from '../../../components/breadcrumb/breadcrumb.js';
import { fillTemplate } from '../../../foundation/template.js';
import type { FlowStrings } from '../types.js';

/**
 * The library elements the path Breadcrumb renders; the flow lists them among its own
 * (`...flowBreadcrumb.elements`), as Input does with its inline Copy button.
 */
export const flowBreadcrumb = Object.freeze({ elements: Object.freeze([TpBreadcrumb]) });

/** One group on the path from the root to the current group. */
export interface FlowBreadcrumbCrumb {
  id: string;
  label: string;
}

export interface FlowBreadcrumbOptions {
  /** The root crumb's label: the widget's label. */
  rootLabel: string;
  /** The groups on the path, outermost first; the last one is the current group. */
  crumbs: readonly FlowBreadcrumbCrumb[];
  strings: FlowStrings;
  /**
   * A crumb press: `index` is the group's position in `crumbs` to return to, `-1` the root. The
   * current group has no link, so it never navigates.
   */
  onNavigate: (index: number, event: MouseEvent) => void;
}

/**
 * The path Breadcrumb of the header's start region while the view is inside a group (Widgets 6.3
 * Anatomy): a navigation landmark with the root and every enclosing group as links and the current
 * group as the page, as the File explorer composes its path.
 */
export function renderFlowBreadcrumb(options: FlowBreadcrumbOptions): TemplateResult {
  const { rootLabel, crumbs, strings, onNavigate } = options;
  const trail = [{ id: '', label: rootLabel }, ...crumbs];
  const press = (index: number) => (event: MouseEvent) => {
    event.preventDefault();
    onNavigate(index, event);
  };
  return html`<tp-breadcrumb
    class="breadcrumb"
    part="flow-breadcrumb"
    label=${fillTemplate(strings.groupPath, { flow: rootLabel })}
  >
    ${trail.map((crumb, position) =>
      position === trail.length - 1
        ? html`<span data-group=${crumb.id}>${crumb.label}</span>`
        : html`<a href="#" data-group=${crumb.id} @click=${press(position - 1)}>${crumb.label}</a>`,
    )}
  </tp-breadcrumb>`;
}
