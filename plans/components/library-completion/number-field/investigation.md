# NumberField investigation — work remains active

Fresh live authority already read through direct Spec Blocks: Foundation
sec-146-numberfield at head8440bff24a97dbbc5c762ebf4bd6baa958b305e1,
state5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1.
No implementation gate is passed by this note, and no production NumberField
change has been made.

Required anatomy: Root, optional Group, Input, optional Increment/Decrement,
ScrubArea and ScrubAreaCursor. Required numeric semantics include locale digits,
decimal/group/sign and formatted styles, preserved incomplete editing, controlled
number-or-empty value/default lane, out-of-range editing/blur normalization,
snapOnStep and any/small/large steps, repeat press, gated wheel scrub, captured
pointer scrubbing/sensitivity/teleport, distinct change reasons and commit timing,
form participation/validity and all field markers, cursor retention and cleanup.
Root defaults are preserved in the live document; read that document for complete
property table before designing the implementation.

Local primary sources read so far:

- Base number-field/root/NumberFieldRoot.tsx first180 lines: controlled numeric
  lane and separate editable string, existing Field/Form contexts, hidden numeric
  input, Intl format, modifiers and step refs.
- Base number-field/input/NumberFieldInput.tsx first160 lines: native text input,
  Field control registration and validation, locale parser, pending caret,
  blur/normalization. It does not import the public Base Input component; it
  shares Field/form machinery. Read the remainder and all interaction tests.
- Full utils/parse.ts and validate.ts: Unicode numeral/sign/bidi and locale format
  parts; percent/per-mille and unit/currency decorations; decimal shifting;
  precision-preserving numeric cleanup, directional/nearest snap and double clamp.
- Existing local TpTextControl owns the actual Input/TextArea editing, controlled
  string lane and TpFormElement integration. InputGroup is presentation-only and
  must keep real Input/actions. LocaleService currently formats only; numeric-range
  shares clamp/format for Meter/Progress. Slider owns bounded snapping and its own
  decimal precision helper. Do not mistake Slider's bounded multi-thumb policy for
  full NumberField numeric semantics.

Next design work: finish all upstream constituent/test imports and map the live
coverage destination before selecting a Foundation/composition public interface.
Reconcile numeric form ownership with the existing text/Field implementation; do
not add a competing string/numeric event/form owner or a styled native substitute.
No new catalog identity is authorized merely by the differing upstream name.
Use the skill checklist and pass gates0–2 before production edits. Pointer repeat,
wheel and scrub cancellation have specific tool limitations to record honestly;
those limitations do not excuse omitting the implementation.
