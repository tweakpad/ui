export type TpNativeSelect =
  import('../../../../src/components/native-select/index.js').TpNativeSelect;
export type TpField = import('../../../../src/components/field/index.js').TpField;
const built = location.pathname.endsWith('/package.html');
const library = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const icons = await import(/* @vite-ignore */ built ? '/dist/icons/plus.js' : '/src/icons/plus.ts');
export const {
  TpNativeSelect,
  TpField,
  preventComponentHandling,
  defaultPresentationDictionary,
  setPresentationDictionary,
} = library;
export const plusIcon = icons.plusIcon;
