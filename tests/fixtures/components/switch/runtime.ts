export type TpSwitch = import('../../../../src/components/switch/index.js').TpSwitch;
export type TpCheckbox = import('../../../../src/components/checkbox/index.js').TpCheckbox;
export type TpField = import('../../../../src/components/field/index.js').TpField;
const built = location.pathname.endsWith('/package.html');
const runtime = (await import(
  /* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts'
)) as typeof import('../../../../src/index.js');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
export const {
  TpSwitch,
  TpCheckbox,
  TpIcon,
  TpField,
  TpForm,
  CheckboxGroupController,
  preventComponentHandling,
  defaultPresentationDictionary,
  setPresentationDictionary,
} = runtime;
const icons = (await import(
  /* @vite-ignore */ built ? '/dist/icons/plus.js' : '/src/icons/plus.ts'
)) as typeof import('../../../../src/icons/plus.js');
export const plusIcon = icons.plusIcon;
