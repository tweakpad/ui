# Side Panel migration

Side Panel is consolidated into [Drawer](./drawer.md#side-panels-and-backdrops). Use `tp-drawer` with `edge="inline-end" swipe-enabled="false"`. Drawer owns all behavior and presentation, including `backdrop="dark"` and `backdrop="blur"`.

The deprecated `tp-side-panel` / `TpSidePanel` compatibility binding delegates to Drawer with these defaults. Replace old part names with Drawer parts; `side-panel-content` becomes `drawer-surface`. Existing properties and slots continue through the shared Dialog implementation.
