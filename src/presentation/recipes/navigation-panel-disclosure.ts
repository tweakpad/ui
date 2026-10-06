import type { PresentationDictionary } from '../resolver.js';
import { navigationRow, disclosureContext, collapsedContext } from './shared/navigation-row.js';

/** Composes the real Collapsible with SidebarMenuButton paint; no second disclosure owner. */
export const navigationPanelDisclosureAppearance: PresentationDictionary = {
  'collapsible-trigger': [
    ...navigationRow.map((rule) => ({
      ...rule,
      selector: disclosureContext + (rule.selector ?? '&'),
    })),
    { selector: collapsedContext + '&', declarations: { padding: '0' } },
  ],
  'collapsible-label': [
    { selector: disclosureContext + '&', declarations: { 'font-weight': 'inherit' } },
  ],
  'collapsible-leading': [
    {
      selector: disclosureContext + '&',
      declarations: { color: 'inherit', 'margin-inline-end': 'var(--tp-space-2)' },
    },
  ],
  'collapsible-trailing': [
    {
      selector: disclosureContext + '&',
      declarations: { color: 'inherit', 'margin-inline-start': 'var(--tp-space-2)' },
    },
  ],
  'collapsible-content-body': [
    { selector: disclosureContext + '&', declarations: { padding: '0' } },
  ],
};
export const navigationPanelDisclosureStructure: PresentationDictionary = {
  'collapsible-trigger': [
    {
      selector: disclosureContext + '&',
      declarations: { 'box-sizing': 'border-box', 'min-inline-size': '0' },
    },
    {
      selector: collapsedContext + '&',
      declarations: { display: 'flex', 'justify-content': 'center' },
    },
  ],
  'collapsible-label': [
    {
      selector: disclosureContext + '&',
      declarations: { overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' },
    },
    {
      selector: collapsedContext + '&',
      declarations: {
        position: 'absolute',
        'inline-size': '1px',
        'block-size': '1px',
        padding: '0',
        overflow: 'hidden',
        'clip-path': 'inset(50%)',
        'white-space': 'nowrap',
      },
    },
  ],
  'collapsible-content': [{ selector: collapsedContext + '&', declarations: { display: 'none' } }],
  'collapsible-trailing': [{ selector: collapsedContext + '&', declarations: { display: 'none' } }],
  'collapsible-leading': [
    { selector: collapsedContext + '&', declarations: { 'margin-inline': '0' } },
  ],
};
