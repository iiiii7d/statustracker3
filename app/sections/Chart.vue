<script lang="ts">
import { FetchError } from "ofetch";
import { now, hhmm } from "~/utils";
import {
  countsAPI,
  type CountsAPI,
  playerAPI,
  type PlayerAPI,
} from "#shared/api.ts";
// temp value
export const from = ref(now());
export const to = ref(now());

export const shownMovingAverages = reactive<Record<MovingAverage, boolean>>({
  0: true,
  1: true,
  12: false,
  24: false,
  168: false,
});
export const counts = ref(new Map<MovingAverage, CountsAPI>());

export const shownPlayer = ref("");
export const player = ref<PlayerAPI | null>(null);

export async function updateCounts() {
  counts.value = new Map(
    await Promise.all(
      Object.entries(shownMovingAverages)
        .filter(([ma, a]) => ma === "0" || a)
        .map(async ([ma2]) => {
          const ma = parseInt(ma2) as MovingAverage;
          const { data } = await useAsyncData(
            `counts:${from.value.toAbsoluteString()}:${to.value.toAbsoluteString()}:${ma}`,
            () =>
              $fetch("/counts", {
                query: {
                  from: from.value.toAbsoluteString(),
                  to: to.value.toAbsoluteString(),
                  movingAverage: ma,
                },
              }).then(countsAPI.de),
            { deep: false },
          );
          return [ma, data.value] as [MovingAverage, CountsAPI];
        }),
    ),
  );
}

export async function updatePlayer() {
  try {
    player.value =
      shownPlayer.value === ""
        ? null
        : (
            await useAsyncData(
              `player:${shownPlayer.value}:${from.value.toAbsoluteString()}:${to.value.toAbsoluteString()}`,
              () =>
                $fetch(`/player/${shownPlayer.value}`, {
                  query: {
                    from: from.value.toAbsoluteString(),
                    to: to.value.toAbsoluteString(),
                  },
                }).then(playerAPI.de),
              { deep: false },
            )
          ).data.value!;
  } catch (e) {
    if (e instanceof FetchError && e.status === 404) {
      player.value = null;
      return;
    }
    throw e;
  }
}
</script>
<script setup lang="ts">
/* eslint-disable import/first */
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
>(
  () =>
    player.value?.playTimes?.map(({ join, leave: leave2 }) => {
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
    }) ?? null,
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
  <VChart class="chart h-[75dvh]!" :option="option" autoresize />
</template>

<style scoped></style>
