---
'@tweakpad/ui': minor
---

`@tweakpad/ui/markdown` adds `serializeMarkdown`, which writes a Markdown tree back as markdown that parses to the same tree. It escapes only what would be read as syntax, gives each construct one form, and writes alerts, admitted elements and footnotes so that they resolve again. The entry also exports the sanitizing rules the resolve step applies, for code that cleans imported HTML: `isAlwaysRemovedAttribute`, `LINK_URL_ATTRIBUTES`, `IMAGE_URL_ATTRIBUTES`, `linkProtocols` and `imageProtocols`, beside the default element policy and protocol lists, which are now frozen.
