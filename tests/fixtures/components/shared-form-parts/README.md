# Shared form and part fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package (`npm run build` first).

## Sections

- `tp-part-probe`: a fixture-only element that renders one shared part (`probe`) as a native
  button. `window.delegateHtml(bind, content)` returns a button template for a part contract's
  `renderDelegate`; the probe's `calls` and `count` record the activations it handled.
- `#outside`: a native form with a submit Button.
- A Field (Full name) with its description around an Input.
- `#local`: a form with a disabled fieldset around an Input, then a Checkbox, a Switch, a Native
  select and a searchable Select.
- `#association`: three fixture-only `tp-association-probe` controls, each in its own Field with
  a description. Each renders a textbox root (`.probe-root`, its focus target) and a group
  (`.probe-target`). `data-probe-mode` sets how it takes the Field association:
  - `root` (Expedition log, which also carries an error): no association target; the control
    applies the association to its root itself;
  - `target` (Summit notes): the group is its association target, but the control applies the
    association to its root, so the group keeps none of the attributes;
  - `default` (Base camp memo): the control only records the association, and the group
    receives it as on every library control.

  Each probe keeps `associationRecords` (every association it received) and
  `appliedAssociation` (its root's attributes after the last update). A root without a Field
  label is named Route sketch.

`window.partFixture` holds `fixture`, `probe`, the Full name `input` and its `field`.

## Steps

1. Navigate to `http://localhost:5173/tests/fixtures/components/shared-form-parts/` and wait for
   `window.partFixture`.
2. Evaluate `await runSharedRegressions()`. It appends a form whose disabled fieldset holds a
   Native select with an authored option, a Select and a searchable Select (both given their
   option through `items`), a Slider, a Calendar, a One-time code field, a Switch and a Toggle.
   It checks that the fieldset disables each of them without touching its own `disabled`, that
   nothing submits while disabled, that enabling the fieldset enables them again and that an
   authored `disabled` survives the fieldset toggling. It then removes the form and returns the
   states and form entries of each phase; once enabled, every control but the Toggle, which
   submits no value, adds its entry. `passed` must be true.
3. Evaluate `await associationFixture.check()`. For each probe it returns the last record, the
   root and group attributes, the description and error nodes with their tree, and whether each
   id in the record resolves in the probe's shadow root. `passed` holds when the record carries
   the Field label, description and error, the attributes sit only on the element the mode
   names, the nodes sit in the shadow root and every id resolves.
4. Take a snapshot: each probe's root is a textbox named by its Field label (Base camp memo's
   root keeps Route sketch, and its group carries the Field label) and described by the
   description and, for Expedition log, the error.
5. Click each probe's Field label: the probe's root becomes the active element in its shadow
   root.
6. Evaluate `await associationFixture.cycle()`. On Expedition log it changes the description,
   sets and clears the error, moves the probe out of its Field and back, and returns each step.
   Once moved out, the record is all `null`, the nodes are gone and the root keeps only its
   default name; moved back, both return. `passed` must be true. The Field's texts are restored
   at the end.
7. Run axe through `evaluate_script`: no violation on the probes.
