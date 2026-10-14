import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { TpValueChangeEvent } from '../../../foundation/events.js';
import { emojiCategoryIcons } from '../../../icons/emoji-categories.js';
import type { IconDefinition } from '../../../icons/types.js';
import type { PartPresentation } from '../../../presentation/resolver.js';
import type { PickerCategory } from '../groups.js';

export interface CategoryBarOptions {
  readonly categories: readonly PickerCategory[];
  /** Identifier of the category at the top of the list; none while a query is active. */
  readonly active: string | undefined;
  readonly label: string;
  readonly disabled: boolean;
  readonly onChange: (event: TpValueChangeEvent<unknown>) => void;
}

const stop = (event: Event): void => event.stopPropagation();
/** The tabs share the bar's width; extra categories scroll instead of wrapping. */
const FULL_WIDTH: PartPresentation = {
  'tabs-list': {
    styleHook: {
      'inline-size': '100%',
      gap: '0',
      'overscroll-behavior-x': 'contain',
      'scrollbar-width': 'none',
    },
  },
  // At least a small control wide, growing to share the bar.
  'tabs-trigger': {
    styleHook: {
      flex: '1 0 var(--tp-control-height-sm)',
      'padding-inline': '0',
      'justify-content': 'center',
    },
  },
};

function categoryIcon(category: PickerCategory): unknown {
  const icon = category.icon;
  if (typeof icon === 'string')
    return html`<span class="category-glyph" aria-hidden="true">${icon}</span>`;
  if (!icon && category.image)
    return html`<img class="category-image" src=${category.image} alt="" draggable="false" />`;
  const definition: IconDefinition =
    icon ??
    (emojiCategoryIcons as Record<string, IconDefinition>)[category.id] ??
    emojiCategoryIcons.custom;
  return html`<tp-icon .icon=${definition} aria-hidden="true"></tp-icon>`;
}

/**
 * The category bar: underline Tabs without panels, one icon tab per shown category, named by its
 * category. One Tooltip shows the name of the tab under the pointer or focus; the widget
 * registers each tab with it. The widget owns the selected tab.
 */
export function renderCategoryBar(options: CategoryBarOptions) {
  if (!options.categories.length) return nothing;
  return html`<tp-tabs
      class="categories"
      part="emoji-picker-categories"
      variant="underline"
      label=${options.label}
      .value=${options.active ?? null}
      .partPresentation=${FULL_WIDTH}
      ?disabled=${options.disabled}
      @tp-value-change=${options.onChange}
      @tp-presence-complete=${stop}
      >${repeat(
        options.categories,
        // Keyed, so a category keeps its tab (and focus) when Recent comes and goes.
        (category) => category.id,
        (category) =>
          html`<button
            slot="tab"
            class="category"
            value=${category.id}
            aria-label=${category.label}
            ?disabled=${options.disabled}
          >
            ${categoryIcon(category)}
          </button>`,
      )}</tp-tabs
    ><tp-tooltip
      class="category-tooltip"
      describes="none"
      side="bottom"
      .content=${(payload: unknown) => payload}
    ></tp-tooltip>`;
}
