<script setup lang="ts">
import { counts } from "~/sections/Chart.vue";

const { data: categories } = await useFetch("/categories");

function percentage(column: "all" | `cat_${string}`): number {
  const count2 = counts.value.get(0);
  if (count2 === undefined) return 0;
  return (
    Math.round(
      (count2.filter((c) => c[column]).length / count2.length) * 100 * 100,
    ) / 100
  );
}
</script>

<template>
  <section id="statistics">
    <h3>Statistics</h3>
    <span
      >People were online <b>{{ percentage("all") }}%</b> of this time
      period</span
    ><br />
    <u>By category:</u><br />
    <span v-for="[name, { colour }] in Object.entries(categories!)" :key="name">
      &nbsp;&nbsp;<b :style="{ color: colour }">{{ name }}: </b>
      {{ percentage(`cat_${name}`) }}%<br />
    </span>
  </section>
</template>

<style scoped></style>
