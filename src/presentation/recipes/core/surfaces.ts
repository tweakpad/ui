import type { PresentationDictionary } from '../../resolver.js';
import { surfaceAppearance } from '../shared/surface.js';

// Input and Text area paint comes entirely from fieldBoundary (shared/text-control.ts).
export const inputCoreAppearance: PresentationDictionary = { input: [] };
export const textAreaCoreAppearance: PresentationDictionary = { 'text-area': [] };
export const toastCoreAppearance: PresentationDictionary = {
  // The close control is an icon-sm ghost Button; its size step owns the extent.
  'toast-toast': surfaceAppearance,
};
export const attachmentCoreAppearance: PresentationDictionary = {
  'attachment-root': surfaceAppearance,
};
export const selectCoreAppearance: PresentationDictionary = {
  'select-content': surfaceAppearance,
};
