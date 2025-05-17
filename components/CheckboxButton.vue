<script setup lang="ts">
const model = defineModel<boolean>();
</script>

<template>
  <button id="button" :class="{checked: model}" @click="model = !model;"><slot /></button>
</template>

<style scoped>
button.checked {
  background-color: #8c0;
  color: #000;
  border: unset;
  box-shadow: #8c08 0px 3px;

  &:hover {
    background-color: #bf3;
    color: #000;
    box-shadow: #bf38 0px 4px;
  }
}
</style>