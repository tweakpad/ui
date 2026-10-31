<script setup lang="ts">
// Type tests of the Vue bindings and of the elements' own tags in Vue templates.
import { ref } from 'vue';
import { Button, Checkbox, Dialog, Select } from '../../../src/vue/index.js';
import { Flow } from '../../../src/vue/widgets/index.js';
import type {} from '../../../src/vue/elements.js';

const checked = ref(false);
const fruit = ref<unknown>('a');
const open = ref(false);
const opened = (event: CustomEvent<{ open: boolean }>): boolean => event.detail.open;
</script>

<template>
  <Checkbox v-model:checked="checked" disabled />
  <Checkbox v-model="checked" @tp-value-change="(event) => event.detail.value.valueOf()" />
  <Select v-model="fruit" :items="[{ value: 'a', label: 'A' }]" @tp-open-change-complete="opened" />
  <Dialog v-model:open="open" label="Rename"><Button slot="trigger">Rename</Button></Dialog>
  <Flow @tp-history-change="(event) => event.detail.canUndo" />
  <tp-checkbox :default-checked="true" @tp-value-change="(event) => event.detail.value.valueOf()" />
  <!-- @vue-expect-error `variant` is one of the Button variants. -->
  <Button variant="huge" />
  <!-- @vue-expect-error a Checkbox lane is a boolean. -->
  <Checkbox v-model:checked="fruit" :checked="'yes'" />
</template>
