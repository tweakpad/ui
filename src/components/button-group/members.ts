import { TpElement } from '../../foundation/element.js';

// These are the existing public boundary parts, not replacement controls.
const boundaryParts: Readonly<Record<string, string>> = {
  'tp-button': 'button',
  'tp-input': 'input',
  'tp-text-area': 'text-area',
  'tp-select': 'select-trigger',
  'tp-native-select': 'native-select-control',
  'tp-input-group': 'input-group',
  'tp-toggle': 'toggle',
  'tp-button-group-text': 'button-group-text-segment',
  'tp-separator': 'separator',
};
export interface GroupMember {
  host: TpElement;
  part: string;
  element: HTMLElement | null;
}

/** Preserve Pagination's semantic list and resolve only its existing control boundaries. */
export function paginationMembers(element: TpElement): (GroupMember | undefined)[] {
  const list = element.renderRoot?.querySelector('[part~="pagination-list"]');
  return [...(list?.children ?? [])].map((item) => {
    if (item.hasAttribute('hidden') || item.getAttribute('aria-hidden') === 'true') return;
    const control = item.querySelector(
      '[part~="pagination-page-link"], [part~="pagination-previous"], [part~="pagination-next"]',
    );
    return control ? groupMember(control) : undefined;
  });
}
export function groupMember(element: Element): GroupMember | undefined {
  if (!(element instanceof TpElement)) return;
  const tag =
    (element.constructor as typeof TpElement & { presentationTagName?: string })
      .presentationTagName ?? element.localName;
  // Text consumes the family dictionary but has its own governed part.
  const part = boundaryParts[element.localName] ?? boundaryParts[tag];
  if (part)
    return {
      host: element,
      part,
      element:
        part === 'separator'
          ? element
          : (element.renderRoot?.querySelector<HTMLElement>(`[part~="${part}"]`) ?? null),
    };
  // Floating families expose their real trigger; popup content is never a member.
  const trigger = element.querySelector(':scope > [slot="trigger"]');
  return trigger ? groupMember(trigger) : undefined;
}
