<script setup lang="ts">
import { counts } from "~/state.ts";
import { use } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TitleComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import VChart, { THEME_KEY } from "vue-echarts";
import type * as echarts from "echarts";

use([GridComponent, BarChart, TitleComponent, CanvasRenderer]);
provide(THEME_KEY, "dark");

const { data: categories } = await useFetch("/categories");

const percentages = computed(() => {
  const count2 = counts.value.get(0);
  if (count2 === undefined) return [];
  const columns: ("all" | `cat_${string}`)[] = [
    "all",
    ...Object.keys(categories.value!).map((c) => `cat_${c}` as const),
  ];
  return columns.map(
    (column) =>
      Math.round(
        (count2.filter((c) => c[column]).length / count2.length) * 100 * 100,
      ) / 100,
  );
});

const option = computed<
  echarts.ComposeOption<
    | echarts.BarSeriesOption
    | echarts.GridComponentOption
    | echarts.TitleComponentOption
  >
>(() => ({
  title: {
    text: "% of the time players were online",
    textStyle: {
      color: "#fff",
    },
  },
  backgroundColor: "transparent",
  xAxis: {
    type: "value",
  },
  yAxis: {
    type: "category",
    data: ["all", ...Object.keys(categories.value!)],
    axisLabel: {
      show: false,
    },
  },
  series: [
    {
      type: "bar",
      colorBy: "data",
      data: percentages.value,
      color: [
        "#fff",
        ...Object.values(categories.value!).map(({ colour }) => colour),
      ],
      label: {
        show: true,
        formatter: "{b}: {c}%",
        fontSize: 30,
      },
    },
  ],
}));
</script>

<template>
  <VChart class="chart h-[75dvh]!" :option="option" :autoresize="true" />
</template>

<style scoped></style>
