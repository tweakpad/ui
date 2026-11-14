# Writing style

Every page is written in the same register. This governs **new pages and new sections**. It is
never a reason to reword existing text (see the parity rule in SKILL.md).

## The register: between a tutorial and a technical reference

- The page teaches the component through its **most common, familiar scenarios**, each a small
  example with a few sentences on when and why. Its full surface lives in the Properties table and
  the API Reference, not in one section per property.
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
- **Less is better.** A primitive (Separator, Label, Spinner) gets a hero and a few short
  sections; a rich component or widget gets one section per scenario a developer will meet, not
  one per property. Never pad a page.
- **Showcase features, not properties.** A section shows several properties working together in a
  real scenario. A single property gets its own section only when it changes behavior
  substantially (a mode, a layout, a selection model); otherwise its table row is enough.
- **One feature, one place, simple to complex.** Each capability appears once. A section never
  re-introduces what the hero or an earlier section shows, and never depends on a feature no
  earlier section has shown.

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
