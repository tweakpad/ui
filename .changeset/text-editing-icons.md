---
'@tweakpad/ui': minor
---

Add text-editing icons: the modules `@tweakpad/ui/icons/text-blocks`, `text-align`, `link`, `table-editing`, `arrows`, `ellipsis`, `image-plus`, `at-sign` and `ban`, and `strikethroughIcon`, `codeIcon`, `superscriptIcon`, `subscriptIcon`, `highlighterIcon`, `baselineIcon` and `removeFormattingIcon` in `@tweakpad/ui/icons/text-formatting`. Each is a separate 24×24 outline definition, so importing one keeps the others out of a bundle; importing one definition of `text-formatting` no longer bundles the bookmark artwork. The package ships the artwork's license notice as a `LICENSE.*` file. The Icon documentation states the real `size` default.
