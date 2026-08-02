<script setup lang="ts">
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkAreaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import VChart, { THEME_KEY } from "vue-echarts";
import type * as echarts from "echarts";
import { counts, loading, player, shownMovingAverages } from "~/state.ts";

use([
  GridComponent,
  TooltipComponent,
  MarkAreaComponent,
  LineChart,
  CanvasRenderer,
]);
provide(THEME_KEY, "dark");

const { data: categories } = await useFetch("/categories");

const ALPHA = "f84210";

// eslint-disable-next-line max-params
function generateLine(
  name: string,
  colour: string,
  y: [Date, number][],
  i: number,
  ma: MovingAverage,
): echarts.LineSeriesOption {
  return {
    id: `${name}:${ma}`,
    name: `${name}${ma === 0 ? "" : ` (Rolling average ${movingAverages[ma]})`}`,
    type: "line",
    smooth: true,
    data: y,
    color: colour + (colour.length === 4 ? ALPHA[i]! : ALPHA[i]! + ALPHA[i]!),
    showSymbol: false,
    lineStyle: {
      width: 3,
    },
  };
}

const series = computed<echarts.LineSeriesOption[]>(() =>
  Array.from(counts.value.entries())
    .sort(([a], [b]) => b - a)
    .filter(([ma]) => ma !== 0 || shownMovingAverages[0])
    .flatMap(([ma, m], i) => {
      const allLine = generateLine(
        "all",
        "#fff",
        m.map((a) => [a.timestamp.toDate(), a.all] as [Date, number]),
        i,
        ma,
      );
      const catLines = Object.entries(categories.value!).map(
        ([cat, { colour }]) =>
          generateLine(
            cat,
            colour,
            m.map(
              (a) => [a.timestamp.toDate(), a[`cat_${cat}`]] as [Date, number],
            ),
            i,
            ma,
          ),
      );
      return [allLine, ...catLines];
    }),
);

const playTimes = computed<
  [{ name: string; xAxis: Date }, { xAxis: Date }][] | null
>(() =>
  player.value?.ty === "success" && player.value.playTimes
    ? player.value.playTimes.map(({ join, leave: leave2 }) => {
        const leave = leave2 ?? now();
        return [
          {
            name: `${hhmm(join)} → ${hhmm(leave)}`,
            xAxis: join.toDate(),
          },
          {
            xAxis: leave.toDate(),
          },
        ];
      })
    : null,
);

const option = computed<
  echarts.ComposeOption<
    | echarts.LineSeriesOption
    | echarts.TooltipComponentOption
    | echarts.GridComponentOption
    | echarts.MarkAreaComponentOption
  >
>(() => ({
  backgroundColor: "transparent",
  xAxis: {
    type: "time",
  },
  yAxis: {
    type: "value",
    maxInterval: 1,
    splitLine: {
      lineStyle: {
        color: "#fff3",
      },
    },
    min: 0,
  },
  tooltip: {
    trigger: "axis",
  },
  grid: {
    left: "left",
    width: "100%",
  },
  series: [
    ...series.value,
    {
      type: "line",
      markArea: {
        label: {
          position: "inside",
        },
        itemStyle: {
          color: "#fc03",
        },
        data: playTimes.value ?? [],
      },
    },
  ],
}));
</script>

<template>
  <div class="h-[75dvh]!">
    <VChart
      class="chart"
      :option="option"
      autoresize
      :loading="loading !== 0"
    />
  </div>
</template>

<style scoped></style>
