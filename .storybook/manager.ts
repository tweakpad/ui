import { addons } from 'storybook/manager-api';
import { create, themes } from 'storybook/theming';

// Storybook's own UI (Controls descriptions) cannot read the library tokens, so its code font
// repeats the default `--tp-font-mono` stack. It follows the device's color scheme, as the Docs
// pages do by default (the Theme toolbar's System).
addons.setConfig({
  theme: create({
    ...(matchMedia('(prefers-color-scheme: dark)').matches ? themes.dark : themes.normal),
    fontCode: "'Cascadia Mono', ui-monospace, sfmono-regular, menlo, monaco, consolas, monospace",
  }),
});
