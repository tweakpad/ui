import type { PresentationDictionary } from '../resolver.js';
import { visuallyHiddenDeclarations } from '../../foundation/visually-hidden.js';
import {
  solidNavigationRow,
  disclosureContext,
  collapsedContext,
} from './shared/navigation-row.js';

/** Composes the real Collapsible with navigation-row paint; no second disclosure owner. */
export const navigationPanelDisclosureAppearance: PresentationDictionary = {
  'collapsible-trigger': [
    ...solidNavigationRow.map((rule) => ({
      ...rule,
      selector: disclosureContext + (rule.selector ?? '&'),
    })),
    { selector: collapsedContext + '&', declarations: { padding: '0' } },
  ],
  'collapsible-label': [
    { selector: disclosureContext + '&', declarations: { 'font-weight': 'inherit' } },
  ],
  // A navigation row spaces icon, label and chevron with its gap alone: the row gap above
  // replaces the Collapsible's own region margins, so the label lines up with sub-level rows.
  'collapsible-leading': [
    {
      selector: disclosureContext + '&',
      declarations: { color: 'inherit', 'margin-inline-end': '0' },
    },
  ],
  'collapsible-trailing': [
    {
      selector: disclosureContext + '&',
      declarations: { color: 'inherit', 'margin-inline-start': '0' },
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
      declarations: visuallyHiddenDeclarations,
    },
  ],
  'collapsible-content': [{ selector: collapsedContext + '&', declarations: { display: 'none' } }],
  'collapsible-trailing': [{ selector: collapsedContext + '&', declarations: { display: 'none' } }],
  'collapsible-leading': [
    { selector: collapsedContext + '&', declarations: { 'margin-inline': '0' } },
  ],
};
