<script setup lang="ts">

</script>

<template>
  <h3>% of the time that each category was online</h3>
  {#each (percentages ?? []) as [k, p], i}
  <b style="color: {lineColors[i % lineColors.length]};">{k}: </b> {p}%
  {#if i !== percentages.length - 1}<b>&nbsp;|&nbsp;&nbsp;</b>{/if}
  {/each}
</template>

<style scoped>

</style>