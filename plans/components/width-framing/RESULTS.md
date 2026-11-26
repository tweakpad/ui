# Width and centering cleanup

Baseline: `f5094b03`. Goal: simpler use cases that retain their behavior and demonstration, not pixel-equal framing or zero inline styles.

Reviewed 583 authored width/centering sites. Simplified 350 previews on 62 docs pages, removed 13 empty outer wrappers, and simplified 23 story sizing sites across 16 files. Existing component APIs and runtime code are unchanged.

## Decisions

- Use Preview width presets with `align="stretch"` for ordinary forms, cards, lists and inputs. Renderer-owned classes bound and center examples outside copied markup.
- Remove outer fixed/max widths, redundant `inline-size:100%`, and auto-centering that exist only to frame a sample.
- Preserve explicit scroll/overflow bounds, line-measurement widths, sizing comparisons, widget surfaces, popup content sizing and intrinsic calendars.
- Preserve nested geometry and other styling where it communicates the capability being demonstrated. Component geometry stays explicit; incidental framing uses documentation metadata only.
- Retain native semantics, content, IDs, values, scripts and named-slot ownership. Remove empty wrappers only when they have one child and no script dependency.

## Demo-only helpers

`<Preview width="5" ... />` uses a responsive 32rem frame. Renderers apply `demo-frame demo-w-5` outside the copyable snippet. No helper enters the core library stylesheet, component API or framework bindings. Storybook stories inherit the hero frame and may override it with `parameters: { demoWidth: '5' }`.

| Preset | Maximum width |
| --- | --- |
| 1 | 16rem |
| 2 | 20rem |
| 3 | 24rem |
| 4 | 28rem |
| 5 | 32rem |
| 6 | 36rem |
| 7 | 44rem |
| 8 | 64rem |

Frames shrink to the available space. Omitting `width` preserves existing Preview alignment. The parser rejects invalid presets. Each renderer owns its stylesheet independently.

## Changed use cases

| Page | Use cases |
| --- | --- |
| components/accordion | Accordion; Multiple open items; Positional content; Disabled item; Line-by-line reveal |
| components/alert | Alert; Severity; Title slot and actions; Live update |
| components/aspect-ratio | Cover and contain |
| components/attachment | Attachment; Statuses; Image cards; Title and description only; Preview trigger, download and retry; Sizes; Remove event |
| components/autocomplete | Autocomplete; Prefix matching; Grouped suggestions; Inline completion; Searching hidden fields; Ranking over several fields; Search source; In a form |
| components/badge | Status in a list |
| components/bubble | Conversation; Variants; Alignment; Reactions; Rich content; Expandable message; Quick replies |
| components/button-group | Mixed controls; Steppers, labels and counts; Select and native select; Input groups and nesting |
| components/calendar | In a popover |
| components/card | Card; Header action; Content only; Elevated; Small |
| components/carousel | Carousel; Items per view; Bullets inside; Autoplay; Vertical; Crossfade; Layered 3D; Parallax; Focus; Shader transition; Virtual archive with controlled selection; Commit |
| components/checkbox | Field; Form values; Select all; CheckboxGroupController; Inline |
| components/citation | Citation; Source preview; Numbered references; Horizontal list |
| components/code-block | Code block; Title slot; Highlighted lines; Diff; Collapsible; Shell; CSS; Token theme |
| components/collapsible | Collapsible; Leading indicator; Positional slots; As a heading; Searchable; Open change; Disabled; Line-by-line reveal |
| components/color-input | Inline; Chip or text; Formats and alpha; Sizes; In a form; Disabled and read-only; Right-to-left |
| components/command-palette | Command palette; Custom empty state; Server-filtered list |
| components/copy-button | Copy button; Beside a value; In an input group and a field group |
| components/chart | Chart; Line chart; Description and table |
| components/description-list | Description list; Record details; Show more; Summary row |
| components/drag-drop-list | Drag drop list; Commit events; Variants and sizes; Whole-row drag with swap; Custom rows and overlay; Horizontal; Read-only; Board lanes; Controlled lanes; Approve before committing; Vertical axis only |
| components/empty-state | In a card |
| components/field-group | Field group; Color channels; Separator; Read-only and disabled; Vertical; Unjoined; Inline; Expanded |
| components/field | Field; Validate on blur; Custom validator; Horizontal; Slots; Legend and group; Disabled |
| components/file-upload | File upload; Custom text and compact size; Rejected files; Custom validator; Chips; Rows; Image grid; Upload adapter; Field and form; Server rejection |
| components/form | Form; Notification settings; Validate on blur; External errors; Matching passwords; Wait for async checks; Repeated emails; Disable while invalid |
| components/image | Image; Fallbacks; Loading placeholders; Hover zoom; Card hover; Staggered group; Headline, group and caption |
| components/input-group | Input group; Text addons; Status addons; Actions; Button group composition; Interactive addons; Composer; Native textarea; Disabled and invalid |
| components/input | Input; Types; Mono; Owner-shaped value; Error; Disabled and read-only; Inline; Number steps; Units and icons |
| components/kbd | Input group |
| components/label | Label; By id and by nesting; Optional |
| components/list | List; Content and actions; Variants and sizes; Media; Divided list; Header and footer; Link rows; Recordings; People and invitations |
| components/markdown | Markdown; Script child; Heading offset; Code and alerts; Small; Streaming; Element policy; Custom node rendering |
| components/marker | Marker; Variants; Tones; With icons; Shimmer; With an action; Native hosts and layout; Accordion label and drawer |
| components/media-player | Media Player; Audio layout; Audio; Trimmed layout; Custom top region; Text tracks; Custom bar; Live with DVR (simulated); Tracks adapter (mock); French controls |
| components/message | Message; Sender sides; Header and footer; Sending and failed; Message group; Footer actions; Attachment; Retry a failed message |
| components/native-select | Native select; Placeholder; Sizes; Multiple; Form value; Controlled value; Disabled, read-only and invalid |
| components/one-time-code-field | One-time code field |
| components/pagination | Rows per page |
| components/progress | Progress; Bare and captioned; Indeterminate; Steps; Import; Formatted value |
| components/qr-code | Connect a device; Live value |
| components/questionnaire | Questionnaire; Choices and free text; Skip and validate; Resume a draft; Follow-up question; Number shortcuts; Submit; Checkpoint and cross-answer validation; Disabled until answered; Progress bar; Animated questions; Inside a Card |
| components/scroll-trigger | Scroll Trigger; From the center; Reveal events |
| components/select | Select; Groups and disabled options; tp-select-option; Multiple; Searchable; Columns; Items property; Rich labels; Virtualized time zones; Search source; Value change; Disabled, read-only and error; Inline |
| components/separator | Separator; Between sections |
| components/skeleton | Pulse, sweep and none; Card; Video and description; Settings form; Table rows |
| components/slider | Slider; Price range; Push, swap and none; Currency and percent; Controlled range; Step and large step; Compact readout; Media timeline; Authored thumbs; Fixed start and added thumbs; Thumb alignment and right to left; Field and form; Disabled and read-only; Change and commit; Rejecting values; Inline; Inline in a field; Editable value; Ticks |
| components/status-dot | Service status; Compact column |
| components/switch | Settings; Form value; Disabled and read-only; Controlled; Inline |
| components/tabs | Tabs; Underline; Vertical; Automatic activation; Change event and setValue; Controlled with a veto; Disabled |
| components/text-area | Text area; Content and fixed sizing; Mono; Error; Character count; Form; Disabled and read-only |
| components/text-transform | Text transform; Plans; Uploads |
| components/theme-switcher | Theme switcher; Variants; Small, defaulting to dark; Explicit choices only; Color scheme store |
| components/time | Time; Due dates |
| components/timeline | Timeline; Step tracker; Numbered steps; Expandable phases; Conversation; Changelog; Explicit status |
| components/tree-view | Tree view; Permissions; Chevron only; Small, no guides |
| components/visually-hidden | Filter results; Repeated actions |
| widgets/color-picker | Color input trigger; Popup in a form |
| widgets/emoji-picker | Insert into a message; Popup in a form |
| widgets/gradient-picker | Gradient picker; Stop controls; Midpoints; Small and read-only; Field; Field settings |
| widgets/text-editor | Text editor; Classic editor; Node editor; Custom nodes; Markdown in and out; In a form; Read-only and disabled |
| motion/surface/glow-border | Controls and fields |

## Purposeful constraints retained

| Page | Use case / element | Purpose |
| --- | --- | --- |
| components/aspect-ratio | Aspect ratio / `tp-aspect-ratio` | Clipped ratio surface keeps its media geometry. |
| components/aspect-ratio | Common ratios / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/aspect-ratio | Common ratios / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/aspect-ratio | Common ratios / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/aspect-ratio | One ratio, three widths / `figure` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/aspect-ratio | One ratio, three widths / `figure` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/aspect-ratio | One ratio, three widths / `figure` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/attachment | Image cards / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/attachment | Image cards / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/attachment | Image cards / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/attachment | Image cards / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/attachment | Scrollable groups / `tp-stack` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/attachment | Scrollable groups / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/attachment | Scrollable groups / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/autocomplete | Autocomplete / `tp-autocomplete` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/autocomplete | Prefix matching / `tp-autocomplete` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/autocomplete | Grouped suggestions / `tp-autocomplete` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/autocomplete | Inline completion / `tp-autocomplete` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/autocomplete | Searching hidden fields / `tp-autocomplete` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/autocomplete | Ranking over several fields / `tp-autocomplete` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/autocomplete | Search source / `tp-autocomplete` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/autocomplete | In a form / `tp-autocomplete` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/breadcrumb | Long trail / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/button-group | Steppers, labels and counts / `tp-input` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/calendar | Calendar / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Range / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Multiple / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Bookable dates / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Nightly prices and booked dates / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Dropdown caption / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Week numbers / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Quick picks / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Date with start and end times / `tp-card` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/calendar | Date with start and end times / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/calendar | French and Brazilian Portuguese / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/calendar | French and Brazilian Portuguese / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/calendar | Arabic, right to left / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/calendar | Value change / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Layered 3D / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Layered 3D / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Layered 3D / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Parallax / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Parallax / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Parallax / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Parallax / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Focus / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Focus / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Focus / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Focus / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Focus / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Shader transition / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Shader transition / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/carousel | Shader transition / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/cursor | Cursor / `span` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/cursor | Zones / `span` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/cursor | Dot and ring / `span` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/description-list | Alignment and stacking / `tp-description-list` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/description-list | Alignment and stacking / `tp-description-list` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/dialog | Container modality / `section` | Width/viewport bounds participate in the visible scrolling demonstration. |
| components/empty-state | No results / `tp-input-group` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/field-group | Constraints / `tp-field-group` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/image | Ratio and fit / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/image | Fallbacks / `span` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/image | Loading placeholders / `img` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/image | Reveal timing and repeat / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/image | Parallax in a scroller / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/image | Horizontal strip / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/image | Smoothing / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/input-group | Button group composition / `tp-button-group` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/input-group | Button group composition / `tp-button-group` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/input-group | Native textarea / `textarea` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/list | Card grid / `tp-list` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/list | Card grid / `tp-aspect-ratio` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/list | Card grid / `tp-aspect-ratio` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/list | Card grid / `tp-aspect-ratio` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/markdown | Streaming / `tp-markdown` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/marker | Native hosts and layout / `tp-icon` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/menu | Context invocation / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/message-scroller | Message Scroller / `tp-message-scroller` | Bounded conversation width keeps messages wrapped and the fixed-height viewport scrollable. |
| components/message-scroller | Streaming / `tp-stack` | Bounded conversation width keeps messages wrapped and the fixed-height viewport scrollable. |
| components/message-scroller | Join marker as anchor / `tp-stack` | Bounded conversation width keeps messages wrapped and the fixed-height viewport scrollable. |
| components/message-scroller | Commands / `tp-stack` | Bounded conversation width keeps messages wrapped and the fixed-height viewport scrollable. |
| components/message-scroller | Outline and edges / `div` | Bounded conversation width keeps messages wrapped and the fixed-height viewport scrollable. |
| components/message-scroller | Prepend history / `tp-stack` | Bounded conversation width keeps messages wrapped and the fixed-height viewport scrollable. |
| components/message-scroller | Animated send / `tp-stack` | Bounded conversation width keeps messages wrapped and the fixed-height viewport scrollable. |
| components/message-scroller | Open at the start / `tp-message-scroller` | Bounded conversation width keeps messages wrapped and the fixed-height viewport scrollable. |
| components/overflow-list | Row limit / `tp-resizable-panel-group` | Width constraints cause the overflow/count behavior being demonstrated. |
| components/overflow-list | In a table / `div` | Width constraints cause the overflow/count behavior being demonstrated. |
| components/overflow-list | Custom count / `div` | Width constraints cause the overflow/count behavior being demonstrated. |
| components/preview-card | Preview Card / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/preview-card | Delays / `tp-stack` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/preview-card | Placement and arrow / `tp-stack` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/progress | Import / `tp-progress` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/qr-code | Live value / `tp-field` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/questionnaire | Resume a draft / `tp-questionnaire` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/resizable-panel-group | Collapsible sidebar / `tp-resizable-panel-group` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Scroll Area / `tp-scroll-area` | Viewport dimensions create the intended horizontal/vertical scroll surface. |
| components/scroll-area | Horizontal / `tp-scroll-area` | Viewport dimensions create the intended horizontal/vertical scroll surface. |
| components/scroll-area | Horizontal / `tp-stack` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Horizontal / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Horizontal / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Horizontal / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Horizontal / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Horizontal / `tp-card` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Both axes / `tp-scroll-area` | Viewport dimensions create the intended horizontal/vertical scroll surface. |
| components/scroll-area | Visibility / `tp-scroll-area` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Visibility / `tp-scroll-area` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-area | Edge fade / `tp-scroll-area` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Replay on entry / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/scroll-trigger | Scrubbed band / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/scroll-trigger | Scrubbed band / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Scrubbed band / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Scrubbed band / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Scrubbed band / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Custom scroll range / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/scroll-trigger | Custom scroll range / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Custom scroll range / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Custom scroll range / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Custom scroll range / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Pinned scene / `div` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/scroll-trigger | Pinned scene / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Pinned scene / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Pinned scene / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/scroll-trigger | Pinned scene / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/select | Chips / `tp-field` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/skeleton | Skeleton / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Skeleton / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Skeleton / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Card / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Card / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Card / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Video and description / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Video and description / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Settings form / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Settings form / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Settings form / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Table rows / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Table rows / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Table rows / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Table rows / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Table rows / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/skeleton | Table rows / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/slider | Controlled range / `tp-slider` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/slider | Fixed start and added thumbs / `tp-slider` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/table-of-contents | Nested items / `div` | Standalone fixed dimension expresses the actual control/content geometry, rather than a framing width limit. |
| components/table | Inputs / `tp-table-head` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/table | Selects / `tp-table-cell` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/table | Selects / `tp-table-cell` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/table | Selects / `tp-table-cell` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/table | Prose column / `tp-table-head` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/text-transform | Text transform / `dd` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/timeline | Roadmap / `tp-scroll-area` | The constrained surface makes this specific sizing, overflow, grid or scroll capability visible. |
| components/toggle-group | Font weight / `tp-field` | Content-sized surface is intentional; do not stretch an intrinsic control or calendar. |
| components/tooltip | Cursor tracking / `div` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/tree-view | Opening items / `tp-tree-view` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| components/tree-view | Expand, collapse and reveal / `tp-tree-view` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Color picker / `tp-color-picker` | Assigned widget dimensions give its editing/selection surface a usable size. |
| widgets/color-picker | Limited formats, no alpha / `tp-color-picker` | Assigned widget dimensions give its editing/selection surface a usable size. |
| widgets/color-picker | Channel sliders / `tp-color-picker` | Assigned widget dimensions give its editing/selection surface a usable size. |
| widgets/color-picker | Harmony wheel and triangle / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Harmony wheel and triangle / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Reading the palette / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Brand swatches / `tp-color-picker` | Assigned widget dimensions give its editing/selection surface a usable size. |
| widgets/color-picker | Commit events / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Controlled owner / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Surface only, and fields without a format choice / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Surface only, and fields without a format choice / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Small and read-only / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Small and read-only / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Right-to-left / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/color-picker | Right-to-left / `tp-color-picker` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/easing-editor | Easing editor / `tp-easing-editor` | The editor explicitly consumes an assigned width; graph/preset layout needs a usable surface. |
| widgets/easing-editor | Spring and custom points / `tp-easing-editor` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/easing-editor | Spring and custom points / `tp-easing-editor` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/easing-editor | Rotation preview / `tp-easing-editor` | The editor explicitly consumes an assigned width; graph/preset layout needs a usable surface. |
| widgets/easing-editor | Design system presets / `tp-easing-editor` | The editor explicitly consumes an assigned width; graph/preset layout needs a usable surface. |
| widgets/easing-editor | Export for code / `tp-easing-editor` | The editor explicitly consumes an assigned width; graph/preset layout needs a usable surface. |
| widgets/easing-editor | Commit and veto / `tp-easing-editor` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/easing-editor | Controlled owner / `tp-easing-editor` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/easing-editor | Field, small size / `tp-easing-editor` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/flow | Voice chain / `tp-flow` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Kinds and animation / `tp-flow` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Authored nodes / `tp-flow` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Library and inspector / `tp-flow` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Toolbars and panels / `tp-flow` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Automatic layout / `tp-stack` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Automatic layout / `tp-flow` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/flow | Commit and selection / `tp-stack` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Commit and selection / `tp-flow` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/flow | Controlled owner / `tp-stack` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | A finished run in view mode / `tp-flow` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Run requests / `tp-flow` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | Read-only dependency viewer / `tp-flow` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | In a form / `form` | Canvas geometry is part of the node-editor/viewport demonstration. |
| widgets/flow | In a form / `tp-flow` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| widgets/plot | Live signal / `tp-plot` | Canvas dimensions and aspect ratio define the monitoring/plot surface. |
| widgets/plot | Distribution / `tp-plot` | Canvas dimensions and aspect ratio define the monitoring/plot surface. |
| motion/surface/glow-border | Glow border / `tp-mo-glow-border` | Standalone fixed dimension expresses the actual control/content geometry, rather than a framing width limit. |
| motion/surface/glow-border | Hover / `tp-mo-glow-border` | Standalone fixed dimension expresses the actual control/content geometry, rather than a framing width limit. |
| motion/surface/glow-border | Lingering light / `tp-mo-glow-border` | Standalone fixed dimension expresses the actual control/content geometry, rather than a framing width limit. |
| motion/surface/glow-border | Custom colors / `tp-button` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/surface/glow-border | Lit by an element / `div` | Standalone fixed dimension expresses the actual control/content geometry, rather than a framing width limit. |
| motion/surface/segment-border | Focus / `tp-field` | Standalone fixed dimension expresses the actual control/content geometry, rather than a framing width limit. |
| motion/surface/segment-border | Scanner / `tp-mo-segment-border` | Standalone fixed dimension expresses the actual control/content geometry, rather than a framing width limit. |
| motion/text/text-mirror | Text mirror / `p` | Text geometry defines measured lines and the mirror seam. |
| motion/text/text-mirror | From the center line / `p` | Text geometry defines measured lines and the mirror seam. |
| motion/text/text-mirror | Vertical seam / `p` | Text geometry defines measured lines and the mirror seam. |
| motion/text/text-mirror | Hide and reveal / `div` | Text geometry defines measured lines and the mirror seam. |
| motion/text/text-mirror | Hide and reveal / `p` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-mirror | Scrubbed by the scroll / `div` | Text geometry defines measured lines and the mirror seam. |
| motion/text/text-mirror | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-mirror | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-mirror | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-mirror | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-split | Text split / `p` | Text width defines the measured line-splitting and reveal demonstration. |
| motion/text/text-split | Words behind a mask / `p` | Text width defines the measured line-splitting and reveal demonstration. |
| motion/text/text-split | Characters from the center / `p` | Text width defines the measured line-splitting and reveal demonstration. |
| motion/text/text-split | Slow stagger / `p` | Text width defines the measured line-splitting and reveal demonstration. |
| motion/text/text-split | Reveal on demand / `div` | Text width defines the measured line-splitting and reveal demonstration. |
| motion/text/text-split | Custom reveal / `p` | Text width defines the measured line-splitting and reveal demonstration. |
| motion/text/text-split | Inline formatting / `p` | Text width defines the measured line-splitting and reveal demonstration. |
| motion/text/text-split | Scrubbed by the scroll / `div` | Text width defines the measured line-splitting and reveal demonstration. |
| motion/text/text-split | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-split | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-split | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-split | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-stroke | Word by word / `p` | Text geometry defines the stroke/reveal demonstration. |
| motion/text/text-stroke | Hide and reveal / `tp-stack` | Text geometry defines the stroke/reveal demonstration. |
| motion/text/text-stroke | Scrubbed by the scroll / `div` | Text geometry defines the stroke/reveal demonstration. |
| motion/text/text-stroke | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-stroke | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-stroke | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |
| motion/text/text-stroke | Scrubbed by the scroll / `tp-skeleton` | Nested content/slot/item sizing is not outer demo framing; retain its own geometry. |

## Story consistency

| Source | Removed framing |
| --- | --- |
| src/stories/description-list.stories.ts | `max-inline-size:28rem` |
| src/stories/citation.examples.ts | `max-inline-size:36rem` |
| src/stories/citation.examples.ts | `max-inline-size:36rem` |
| src/stories/citation.examples.ts | `max-inline-size:36rem` |
| src/stories/autocomplete.stories.ts | `max-inline-size: 22rem` |
| src/stories/questionnaire.stories.ts | `max-inline-size:28rem;margin-inline:auto` |
| src/stories/questionnaire.examples.ts | `max-inline-size:28rem;margin-inline:auto` |
| src/stories/map.examples.ts | `display: grid; gap: var(--tp-space-4); grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); align-items: start; max-inline-size: 64rem` |
| src/stories/presentation-primitives.examples.ts | `inline-size:100%;max-inline-size:calc(var(--tp-spacing) * 140);margin-inline:auto;padding-block:var(--tp-space-6)` |
| src/stories/skeleton.examples.ts | `max-inline-size:calc(var(--tp-spacing) * 64)` |
| src/stories/skeleton.examples.ts | `max-inline-size:calc(var(--tp-spacing) * 80)` |
| src/stories/skeleton.examples.ts | `max-inline-size:calc(var(--tp-spacing) * 100)` |
| src/stories/skeleton.examples.ts | `display:grid;gap:calc(var(--tp-spacing) * 7);max-inline-size:calc(var(--tp-spacing) * 100)` |
| src/stories/skeleton.examples.ts | `max-inline-size:calc(var(--tp-spacing) * 120)` |
| src/stories/chart.stories.ts | `max-inline-size:calc(var(--tp-spacing) * 200);margin-inline:auto` |
| src/stories/tree-view.stories.ts | `max-inline-size: 18rem` |
| src/stories/widgets/gradient-picker.stories.ts | `max-inline-size: calc(var(--tp-spacing) * 100)` |
| src/stories/media-player.stories.ts | `max-inline-size: 48rem` |
| src/stories/media-player.stories.ts | `max-inline-size: 48rem` |
| src/stories/image.stories.ts | `max-inline-size: 40rem` |
| src/stories/field-group.stories.ts | `max-inline-size: calc(var(--tp-spacing) * 80)` |
| src/stories/scroll-trigger.stories.ts | `max-inline-size: 48rem` |
| src/stories/timeline.stories.ts | `max-inline-size: 24rem` |

## Verification

Edits completed first, as requested. Final source, docs, unit/build and rendered capability checks follow; intentional visual differences are allowed. Check statuses and any connection limitations are recorded in implementation-checklist.md.
