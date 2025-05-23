<script lang="ts">
import {
  Chart,
  registerables,
  type ChartData,
  type Point,
  type ChartOptions,
  type ChartDataset,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";
import type { InternalApi } from "nitropack/types";
import * as df from "date-fns";
import { FetchError } from "ofetch";
Chart.register(...registerables, annotationPlugin);

export const defaultFrom = () =>
  df.roundToNearestMinutes(df.sub(new Date(), { days: 1 }));
export const defaultTo = () =>
  df.roundToNearestMinutes(df.add(new Date(), { minutes: 1 }));

export const from = ref(defaultFrom());
export const to = ref(defaultTo());

export const shownMovingAverages = reactive<Record<MovingAverage, boolean>>({
  0: true,
  1: false,
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
          const data = await $fetch("/counts", {
            query: {
              from: from.value.toISOString(),
              to: to.value.toISOString(),
              movingAverage: ma,
            },
          });
          return [ma, data] as [
            MovingAverage,
            InternalApi["/counts"]["default"],
          ];
        }),
    ),
  );
  console.log("counts updated");
}

export async function updatePlayer() {
  try {
    player.value =
      shownPlayer.value === ""
        ? null
        : await $fetch(`/player/${shownPlayer.value}`, {
            query: {
              from: from.value.toISOString(),
              to: to.value.toISOString(),
            },
          });
  } catch (e) {
    if (e instanceof FetchError && e.status === 404) {
      player.value = null;
      return;
    }
    throw e;
  }
  console.log("player updated");
}
</script>
<script setup lang="ts">
/* eslint-disable import/first */
import { Line } from "vue-chartjs";

const ALPHA = "f84210";

onMounted(() => updateCounts());

// eslint-disable-next-line max-params
function generateLine(
  name: string,
  colour: string,
  y: Point[],
  i: number,
  ma: MovingAverage,
): ChartDataset<"line", Point[]> {
  return {
    tension: 0.25,
    label: `${name}${ma === 0 ? "" : ` (Rolling average ${movingAverages[ma]})`}`,
    data: y,
    borderColor:
      colour + (colour.length === 4 ? ALPHA[i] : ALPHA[i] + ALPHA[i]),
    pointRadius: 0,
    pointHitRadius: 5,
    spanGaps: ma !== 0,
  };
}

const chartData = computed<ChartData<"line", Point[]>>(() => ({
  // labels: counts.value?.map(c => c.timestamp),
  datasets: Array.from(counts.value.entries())
    .sort(([a], [b]) => b - a)
    .filter(([ma]) => ma !== 0 || shownMovingAverages[0])
    .flatMap(([ma, m], i) => {
      const runtimeConfig = useRuntimeConfig();
      const allLine = generateLine(
        "all",
        "#fff",
        m.map((a) => ({ x: a.timestamp, y: a.all })),
        i,
        ma,
      );
      const catLines = Object.entries(runtimeConfig.public.categories).map(
        ([cat, { colour }]) =>
          generateLine(
            cat,
            colour,
            m.map((a) => ({
              x: a.timestamp,
              y: a[`cat_${cat}`],
            })),
            i,
            ma,
          ),
      );
      return [allLine, ...catLines];
    }),
}));

// eslint-disable-next-line max-lines-per-function
const chartOptions = computed<ChartOptions<"line">>(() => ({
  animation: false,
  plugins: {
    annotation: {
      common: {
        drawTime: "beforeDraw",
      },
      annotations: (player.value?.playTimes ?? []).map(
        ({ join: j, leave: l }) => {
          const join = df.parseISO(j);
          const leave = l === null ? new Date() : df.parseISO(l);
          return {
            type: "box",
            backgroundColor: "#fc02",
            borderWidth: 0,
            xMin: join as unknown as number,
            xMax: leave as unknown as number,
            label: {
              drawTime: "afterDatasetsDraw",
              display: false,
              content: `${df.format(join, "HH:mm")} → ${df.format(leave, "HH:mm")}`,
              color: "#fc0",
            },
            enter({ element }) {
              if (element.label) element.label.options.display = true;
              return true;
            },
            leave({ element }) {
              if (element.label) element.label.options.display = false;
              return true;
            },
          };
        },
      ),
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
