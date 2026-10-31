<script lang="ts">
  // Type tests of the elements' own tags in Svelte 5, through `@tweakpad/ui/svelte`.
  import type {} from '../../../src/svelte/index.js';
  import type {} from '../../../src/svelte/widgets/index.js';

  import type { SvelteHTMLElements } from 'svelte/elements';

  let checked = $state(false);
  const items = [{ value: 'a', label: 'A' }];
  // @ts-expect-error `variant` is one of the Button variants.
  export const misuse: SvelteHTMLElements['tp-button'] = { variant: 'huge' };
</script>

<tp-checkbox
  checked={checked}
  ontp-value-change={(event) => {
    checked = event.detail.value;
  }}
></tp-checkbox>
<tp-select {items} ontp-open-change-complete={(event) => event.detail.open}></tp-select>
<tp-text-editor ontp-text-editor-error={(event) => event.detail.error}></tp-text-editor>
