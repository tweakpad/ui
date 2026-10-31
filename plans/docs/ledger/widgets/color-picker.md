# widgets/color-picker

## B items

| Item | Disposition | Target |
| --- | --- | --- |
| md: (intro) | merged | ## Usage |
| md: Value and formats | merged | ### Formats |
| md: Views and layout | merged | ### Popup |
| md: Harmony and schemes | merged | ### Views |
| md: Interaction and events | merged | ### Listening to changes |
| md: Keyboard and pointer | appended | ### Keyboard and pointer |
| md: Constituents and accessibility | appended | ### Constituents and accessibility |
| md: Forms and Field | merged | ### In a form |
| md: Parts and customization | dropped-api | parts, markers and private variables |
| md: Usage guide | in-A | ## Usage sections |
| example: Live value | in-A | ### Listening to changes |
| example: Controlled owner | in-A | ### Controlled, with limits |
| example: Rejecting proposals | in-A | ### Controlled, with limits |
| example: Popup in a form | in-A | ### In a form |
| example: Channel sliders | in-A | ### Views |
| example: Harmony wheel | in-A | ### Views |
| example: Hue triangle | in-A | ### Views |
| example: Saved and recent colors | in-A | ### Swatches and schemes |
| example: Schemes | in-A | ### Swatches and schemes |
| example: Right-to-left | in-A | ### Right-to-left |
| story: Popup | dropped-storybook | fixture |
| story: ChannelSliders | dropped-storybook | fixture |
| story: HarmonyWheel | dropped-storybook | fixture |
| story: HueTriangle | dropped-storybook | fixture |
| story: Schemes | dropped-storybook | fixture |

## Forced edits

| Kind | A text | Reason |
| --- | --- | --- |
| prose | `picker="popup"` puts the panel in a Popover opened from a swatch Button | The popup trigger became a Color input (`tp-color-input`), so it is no longer a swatch Button |
