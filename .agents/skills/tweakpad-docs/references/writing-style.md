# Writing style

Every page is written in the same register. This governs **new pages and new sections**. It is
never a reason to reword existing text during a merge (see merge.md).

## The register: between a tutorial and a technical reference

- The page gives the reader the component's **full capabilities and features**. Each one is shown
  by a **small example** with a few sentences on when and why to use it.
- It is **not a tutorial**:
  - no step-by-step walkthroughs, no "first we…, then we…";
  - no multi-step flows;
  - no whole screens built around the component.

  Full compositions are patterns on the website.

- It is **not a technical reference** either:
  - no prose that walks API rows, lists values with their defaults, restates a default or
    enumerates what the element lacks;
  - if a sentence could be a table row, it belongs in the element's JSDoc, which the generated API
    Reference prints.
- **Length follows complexity.**
  - A primitive (Separator, Label, Spinner, Visually hidden) gets a hero and a few short sections.
  - A rich component or widget (Select, Table, Slider, Flow, Text editor) gets as many sections as
    it has features worth seeing.
  - Never pad a simple page or squeeze a complex one.
- **One feature, one place.** Each capability appears once, in the section that shows it. Order the
  sections from the most common and simplest to the rarer and more involved. A later section never
  depends on a feature that no earlier section has shown.

## Sections and examples

- A section heading names what it shows. Valid headings include: "Variants", "Sizes", "Range",
  "Popup", "In a form", "Controlled", "Disabled", "Right-to-left" and "Events".
- A preview is the smallest markup that makes the feature real:
  - realistic labels and data in an appropriate setting (a field with a real label, a list with
    real rows);
  - never a bare control with placeholder text;
  - never a page-sized scenario.
- One preview per section is the norm. Use two when a contrast matters, such as single versus
  multiple selection.
- Nested roles are library components (`tp-icon`, `tp-badge`, `tp-button`, `tp-spinner`), never
  inline SVG, styled spans or native substitutes. Icons are set from a script that imports
  `@tweakpad/ui/icons/<name>`.
- Sample content is original. Never copy names, labels or domains from reference screenshots or
  other products.

## Prose

- Prose explains intent and choice: when to use the element, what to prefer over what, and what a
  configuration changes. "`variant` is visual emphasis only. Use `destructive` for failures and
  blocking problems" is the register.
- Write plainly, in present tense, addressed to a developer using the package.
- Prose never mentions:
  - Storybook, "this example" or "the story";
  - specifications or spec sections;
  - `plans/` records;
  - third-party libraries the implementation draws on;
  - class names, presentation dictionary keys, `data-*` markers or private custom properties;
  - design rationale ("we built it this way because…").
- Keep every inline code span on one line, because a wrapped span breaks Storybook's Markdown.
