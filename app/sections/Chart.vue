<script lang="ts">
import type { InternalApi } from "nitropack/types";
import * as df from "date-fns";
import { FetchError } from "ofetch";
// temp value
export const from = ref(new Date());
export const to = ref(new Date());

export const shownMovingAverages = reactive<Record<MovingAverage, boolean>>({
  0: true,
  1: true,
  12: false,
  24: false,
  168: false,
});
export const counts = ref(
  new Map<MovingAverage, InternalApi["/counts"]["default"]>(),
);

export const shownPlayer = ref("");
export const player = ref<InternalApi["/player/:name"]["default"] | null>(null);

export async function updateCounts() {
  counts.value = new Map(
    await Promise.all(
      Object.entries(shownMovingAverages)
        .filter(([ma, a]) => ma === "0" || a)
        .map(async ([ma2]) => {
          const ma = parseInt(ma2) as MovingAverage;
          const { data } = await useAsyncData(
            `counts:${from.value}:${to.value}:${ma}`,
            () =>
              $fetch("/counts", {
                query: {
                  from: from.value.toISOString(),
                  to: to.value.toISOString(),
                  movingAverage: ma,
                },
              }),
            { deep: false },
          );
          return [ma, data.value] as [
            MovingAverage,
            InternalApi["/counts"]["default"],
          ];
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
              `player:${shownPlayer.value}:${from.value}:${to.value}`,
              () =>
                $fetch(`/player/${shownPlayer.value}`, {
                  query: {
                    from: from.value.toISOString(),
                    to: to.value.toISOString(),
                  },
                }),
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
// temporary
import "echarts";
import type * as echarts from "echarts";
import VChart, { THEME_KEY } from "vue-echarts";
provide(THEME_KEY, "dark");

const { data: categories } = await useFetch("/categories");

const ALPHA = "f84210";

// eslint-disable-next-line max-params
function generateLine(
  name: string,
  colour: string,
  y: [string, number][],
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
        m.map((a) => [a.timestamp, a.all] as [string, number]),
        i,
        ma,
      );
      const catLines = Object.entries(categories.value!).map(
        ([cat, { colour }]) =>
          generateLine(
            cat,
            colour,
            m.map((a) => [a.timestamp, a[`cat_${cat}`]] as [string, number]),
            i,
            ma,
          ),
      );
      return [allLine, ...catLines];
    }),
);

// const chartData = computed<ChartData<"line", Point[]>>(() => ({
//   // labels: counts.value?.map(c => c.timestamp),
//   datasets: Array.from(counts.value.entries())
//     .sort(([a], [b]) => b - a)
//     .filter(([ma]) => ma !== 0 || shownMovingAverages[0])
//     .flatMap(([ma, m], i) => {
//       const allLine = generateLine(
//         "all",
//         "#fff",
//         m.map((a) => ({ x: a.timestamp, y: a.all })) as unknown as Point[],
//         i,
//         ma,
//       );
//       const catLines = Object.entries(categories.value!).map(
//         ([cat, { colour }]) =>
//           generateLine(
//             cat,
//             colour,
//             m.map((a) => ({
//               x: a.timestamp,
//               y: a[`cat_${cat}`],
//             })) as unknown as Point[],
//             i,
//             ma,
//           ),
//       );
//       return [allLine, ...catLines];
//     }),
// }));

// const windowInnerWidth = ref(1000);
// onMounted(() => {
//   windowInnerWidth.value = window.innerWidth;
//   window.addEventListener("resize", () => {
//     windowInnerWidth.value = window.innerWidth;
//   });
// });

// eslint-disable-next-line max-lines-per-function
// const chartOptions = computed<ChartOptions<"line">>(() => ({
//   animation: false,
//   aspectRatio: windowInnerWidth.value / 750,
//   plugins: {
//     annotation: {
//       common: {
//         drawTime: "beforeDraw",
//       },
//       annotations: (player.value?.playTimes ?? []).map(
//         ({ join: j, leave: l }) => {
//           const join = df.parseISO(j);
//           const leave = l === null ? new Date() : df.parseISO(l);
//           return {
//             type: "box",
//             backgroundColor: "#fc02",
//             borderWidth: 0,
//             xMin: join as unknown as number,
//             xMax: leave as unknown as number,
//             label: {
//               drawTime: "afterDatasetsDraw",
//               display: false,
//               content: `${df.format(join, "HH:mm")} → ${df.format(leave, "HH:mm")}`,
//               color: "#fc0",
//             },
//             enter({ element }) {
//               if (element.label) element.label.options.display = true;
//               return true;
//             },
//             leave({ element }) {
//               if (element.label) element.label.options.display = false;
//               return true;
//             },
//           };
//         },
//       ),
//     },
//   },
//   scales: {
//     x: {
//       type: "time",
//       grid: {
//         color: ["#555"],
//       },
//       time: {
//         // unit: "minute",
//       },
//     },
//     y: {
//       grid: {
//         color: ["#999"],
//       },
//       min: 0,
//     },
//   },
// }));

const playTimes = computed<
  [{ name: string; xAxis: Date }, { xAxis: Date }][] | null
>(
  () =>
    player.value?.playTimes?.map(({ join: j, leave: l }) => {
      const join = df.parseISO(j);
      const leave = l === null ? new Date() : df.parseISO(l);
      return [
        {
          name: `${df.format(join, "HH:mm")} → ${df.format(leave, "HH:mm")}`,
          xAxis: join,
        },
        {
          xAxis: leave,
        },
      ];
    }) ?? null,
);

const option = computed<
  echarts.ComposeOption<
    | echarts.LineSeriesOption
    | echarts.TooltipComponentOption
    | echarts.GridComponentOption
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
  <VChart
    class="chart"
    :option="option"
    style="height: 75vh"
    :autoresize="true"
  />
</template>

<style scoped></style>
