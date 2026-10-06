# Form

`tp-form` owns a native form in light DOM and coordinates the existing Field and
form-associated controls. It does not own transport or persistence.

```html
<tp-form id="profile">
  <tp-field label="Name"><tp-input name="name" required></tp-input></tp-field>
  <div slot="actions">
    <tp-button type="submit" name="intent" value="save">Save</tp-button>
    <tp-button type="reset" variant="outline">Reset</tp-button>
  </div>
</tp-form>
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
  document.querySelector('#profile').onFormSubmit = (values, details) => {
    console.log(values, details.data);
  };
</script>
```

| Property / attribute                     | Values                                                        | Default                |
| ---------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| `validationTiming` / `validation-timing` | on-submit, on-blur, on-change                                 | on-submit              |
| `validationMode` / `validation-mode`     | same; explicit value takes precedence over timing             | timing                 |
| `nativeValidation` / `native-validation` | enabled, suppressed                                           | enabled                |
| `noAutofill` / `no-autofill`             | boolean                                                       | false                  |
| `submissionPolicy` / `submission-policy` | always-enabled, disable-while-invalid, disable-while-pending  | always-enabled         |
| `novalidate`                             | boolean native-interface suppression alias                    | false                  |
| `errors`                                 | record of field name to string or string array; property only | empty record           |
| `onFormSubmit`                           | callback `(values, details)`; property only                   | undefined              |
| `disabled`                               | disables submission and submit actions                        | false                  |
| `values`                                 | read-only normalized named Field values                       | current registry       |
| `form`                                   | read-only native `HTMLFormElement` after connection           | null before connection |

`no-autofill` opts every contained text-entry control (Input, Text area, Select and its query, One-time code field) out of browser and password-manager autofill. Use it for forms about other people or for app data, not for the user's own sign-in, address or payment details.

Native form attributes `action`, `method`, `enctype`, `target`, `autocomplete`,
`accept-charset`, `rel`, `name`, and the accessible label/description attributes are
forwarded to the native form and remain live when changed. Slots are ordinary light
DOM children. An optional container with `slot="actions"` receives the actions part;
`slot="error-summary"` receives the summary part. Summary text and links remain
application content. Unnamed fields validate without entering `values`; duplicate
names aggregate in DOM registration order. External errors remain authoritative
until replaced. Native suppression hides the host validation interface; Field's
required synchronous validation still applies.

| Method                                       | Result                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `requestSubmit(submitter?)`                  | validates and requests native submission, preserving public or native submitter data |
| `validate(name?)`, `actions.validate(name?)` | current `ValidationRun`, optionally restricted to matching names                     |
| `reset()`                                    | requests native reset; restores uncontrolled defaults, preserves controlled values   |
| `checkValidity()`, `reportValidity()`        | native validity result / native interface                                            |

Required synchronous failures prevent completion and focus the first available
invalid control. `onFormSubmit` prevents default navigation and receives the same
values snapshot as `tp-submit`. Without a callback or event cancellation, valid
submission retains native behavior. **Async validation does not block submission
by default.** To await it, cancel `tp-submit` and use that event's current run:

```js
form.addEventListener('tp-submit', async (event) => {
  event.preventDefault();
  const { validationRun, values, data } = event.detail;
  const snapshot = await validationRun.completion;
  if (snapshot.status === 'valid') await save(values, data);
});
```

The run exposes generation, signal, status, fieldResults, completion and cancel().
A new aggregate validation supersedes the previous one; cancelled field results
cannot make a current aggregate appear valid. Pending policy disables only submit
controls and restores only the disabled state that the policy applied. An authored
disabled action stays disabled. Field pending markers also participate.

| Event        | Detail / cancellation                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `tp-submit`  | `{ form, data, values, submitter, validationRun, reason: 'submit', sourceEvent }`; cancel to prevent native completion and callback |
| `tp-invalid` | `{ form, validationRun?, control?, reason?, sourceEvent }`; describes synchronous rejection or native invalid event                 |
| `tp-reset`   | `{ form, values, sourceEvent }`; published after accepted reset, never for a cancelled reset                                        |

Events bubble across shadow boundaries. Parts are `form`, `form-actions` and
`form-error-summary`. Form reuses Field-group spacing and the shared theme; nested
Input, Field and Button retain their own recipes. Customize through the existing
presentation dictionary and `partPresentation`, without spacing attributes.
Export: `TpForm`.

## Usage examples

Docs include a bug report, individual field types, mixed profile settings, repeated
email fields, external errors, and cross-field validation. Each uses the existing
Field and input components and displays the actual submitted values. These are
compositions, not Form variants. Application code owns dynamic field collections
and external validation errors.
