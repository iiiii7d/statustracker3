<script lang="ts">
import { Temporal } from "temporal-polyfill";
import {
  Chart,
  registerables,
  type ChartData,
  type Point,
  type ChartOptions,
  type ChartDataset,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import type { InternalApi } from "nitropack/types";
Chart.register(...registerables, annotationPlugin);

export const counts = ref(
  new Map<MovingAverage, InternalApi["/counts"]["default"]>(),
);
export const from = ref(Temporal.Now.zonedDateTimeISO().subtract({ weeks: 1 }));
export const to = ref(Temporal.Now.zonedDateTimeISO().add({ minutes: 1 }));

export async function useCounts(
  ma: MovingAverage = 0,
): Promise<Ref<InternalApi["/counts"]["default"] | null>> {
  const { data } = await useFetch("/counts", {
    query: {
      from: from.value.toString(),
      to: to.value.toString(),
      movingAverage: ma,
    },
  });
  return data;
}
</script>
<script setup lang="ts">
/* eslint-disable import/first */
import { Line } from "vue-chartjs";

onMounted(async () => {
  counts.value.set(0, (await useCounts()).value!);
});

function generateLine(
  name: string,
  colour: string,
  y: Point[],
  i: number,
  ma: MovingAverage,
): ChartDataset<"line", (number | Point)[]> {
  return {
    tension: 0.25,
    label: `${name}${ma === 0 ? "" : ` (Rolling average ${rollingAverages[ma]})`}`,
    data: y,
    borderColor: colour + alpha[i],
    pointRadius: 0,
    pointHitRadius: 5,
    spanGaps: ma !== 0,
  };
}

const chartData = computed<
  ChartData<"line", (number | Point | null)[], unknown>
>(() => ({
  // labels: counts.value?.map(c => c.timestamp),
  datasets: Array.from(counts.value.entries())
    .sort(([a, _], [b, __]) => b - a)
    .flatMap(([ma, m], i) => {
      const runtimeConfig = useRuntimeConfig();
      const allLine = generateLine(
        "all",
        "#fff",
        m.map((a) => ({ x: new Date(a.timestamp).getTime(), y: a.all })),
        i,
        ma,
      );
      const catLines = Object.entries(runtimeConfig.public.categories).map(
        ([cat, { colour }]) =>
          generateLine(
            cat,
            colour,
            m.map((a) => ({
              x: new Date(a.timestamp).getTime(),
              y: a[`cat_${cat}`],
            })),
            i,
            ma,
          ),
      );
      return [allLine, ...catLines];
    }),
}));

const chartOptions = computed<ChartOptions<"line">>(() => ({
  animation: false,
  plugins: {
    annotation: {
      common: {
        drawTime: "beforeDraw",
      },
      // annotations: playerActiveTimes.map(([from, to]) => {
      //   console.log(from, to);
      //   return {
      //     type: "box",
      //     backgroundColor: "#333",
      //     borderWidth: 0,
      //     xMin: from as unknown as number, // prevent ts from erroring
      //     xMax: to as unknown as number, // prevent ts from erroring
      //     label: {
      //       drawTime: "afterDatasetsDraw",
      //       display: false,
      //       content: `${from.local().format("HH:mm")} → ${to.local().format("HH:mm")}`,
      //       color: "#fc0",
      //     },
      //     enter({ element }: any) {
      //       if (element.label) element.label.options.display = true;
      //       return true;
      //     },
      //     leave({ element }: any) {
      //       if (element.label) element.label.options.display = false;
      //       return true;
      //     },
      //   };
      // }),
    },
  },
  scales: {
    x: {
      type: "time",
      grid: {
        color: ["#555"],
      },
      time: {
        // unit: "minute",
      },
    },
    y: {
      grid: {
        color: ["#999"],
      },
      min: 0,
    },
  },
}));
</script>

<template>
  <Line :data="chartData" :options="chartOptions"></Line>
</template>

<style scoped></style>
