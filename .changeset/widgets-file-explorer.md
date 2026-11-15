---
'@tweakpad/ui': minor
---

Add the File explorer widget (`tp-file-explorer`, from `@tweakpad/ui/widgets`): files and folders from any source with a folder tree, a path, five views (details, compact, icons, gallery with previews, and columns), fuzzy search, single or multiple selection, a status bar with counts and sizes, a details pane, and cancelable proposals to rename, move (drag, or cut and paste), create, delete and upload by dropping files. `root`, `operations`, `readonly`, entry `permissions` and `show-hidden` restrict it down to a single-folder picker. The companion entry `@tweakpad/ui/file-explorer` holds the data layer: `createFilePipeline` with replaceable layers (`fileCacheLayer`, `fileMetadataLayer` for lazy or eager metadata, `fileSearchLayer`, `fileSortLayer`, `defaultFileLayers`) and `createMemorySource`.
