# components/chart

## B items

| Item | Disposition | Target |
| --- | --- | --- |
| md: (intro) | in-A | ## Usage |
| md: Root API | merged | ## Usage |
| md: Tooltip and legend constituents | merged | ### Inspection |
| md: Content and appearance | dropped-api | API Reference (slots, parts, data-chart scope marker) |

## Forced edits

| Kind | A text | Reason |
| --- | --- | --- |
| preview | Data visualization → Your own renderer | User-authorized width cleanup: remove incidental framing and use preview stretch; retain capability dimensions. The element was renamed: `tp-data-visualization` is `tp-chart`, and the preview takes the new tag and id. The user asked (2026-11-26) for the stacked bars card to be the main use case, now that Chart draws its own marks: this preview moves under Usage, after the renderer paragraph it illustrates, titled for what it shows. |
| preview | Line chart | User-authorized width cleanup: remove incidental framing and use preview stretch; retain capability dimensions. The element was renamed: the preview takes `tp-chart` and its id. |
| preview | Description and table | User-authorized width cleanup: remove incidental framing and use preview stretch; retain capability dimensions. The element was renamed: the preview takes `tp-chart`, its id and the `chart-plot-region` part. |
| frontmatter | title | The element was renamed: Data visualization is Chart. |
| frontmatter | description | The element draws its own marks, so it is no longer only a frame for a renderer (user request, 2026-11-26). |
| frontmatter | tag | The element was renamed: `tp-data-visualization` is `tp-chart`. |
| prose | Data visualization is the frame around a chart | The element was renamed: the paragraph names Chart. It was wrong once Chart drew its own marks: it now says `type` draws them and a `renderer` draws any other chart, with the example below it. |
| prose | Keep the table in sync with `data` | The element was renamed: the paragraph names the `chart-plot-region` part. |
