# components/table

## B items

| Item | Disposition | Target |
| --- | --- | --- |
| md: (intro) | in-A | ## Usage |
| md: Properties | merged | ## Usage |
| md: Sticky composition | merged | ### Sticky header and columns |
| md: Parts and appearance | dropped-api | API Reference |

## Forced edits

| Kind | A text | Reason |
| --- | --- | --- |
| prose | Scroll-edge fades are off by default. | User-directed correction: enable through scroll-edge-fade rather than a token override. |
| preview | Badges and menus | Defect fix (issue #42): the example menus used `<tp-menu-separator>`, which is not an element, so no separator rendered; menus use `<tp-separator>`. |
