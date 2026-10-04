# Filled Button hover contrast contract conflict

Observed with real Chrome pointer hover in the Toolbar composition, using the
unchanged shared Button recipe and default dark theme:

- Default Button text: #18181b.
- Hover fill computed by the current required formula: approximately #7167cc.
- axe reports contrast 3.8:1, below 4.5:1 for the 15px normal text.
- The default dictionary follows live Library ucl16-button exactly. That contract
  explicitly requires primary80% mixed with light-dark(foreground,background),
  secondary80% with that same target, and destructive85% with that target.
- This is a source-contract conflict, not a Toolbar-local styling issue.

Proposed concrete amendment, retaining the existing palette, role pairs, mix
percentages, borders and motion policy:

1. Default hover: color-mix(in oklab, primary 80%, foreground).
2. Secondary hover: color-mix(in oklab, secondary 80%, background).
3. Destructive hover: color-mix(in oklab, destructive 85%, foreground).

For the shipped light/dark themes this mixes filled roles toward the contrasting
semantic role. Implement once in variantPresentation, used by Button, Toggle and
interactive Bubble, after reconciling the three MUST sentences in ucl16-button.
Verify both themes and the three role pairs with real hover and axe; preserve the
outline/ghost/link recipes. No component-specific token or local Toolbar style.
Custom themes remain responsible for their paired semantic role contrast.

No production hover formula or live specification has been changed yet.
