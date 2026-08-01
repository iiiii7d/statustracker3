<script setup lang="ts">
import {
  from,
  to,
  player,
  shownPlayer,
  updateCounts,
  updatePlayer,
  shownMovingAverages,
} from "~/sections/Chart.vue";
import * as df from "date-fns";
import { z } from "zod/v4";
import * as dt from "@internationalized/date";

const now = () => dt.now(dt.getLocalTimeZone());

const initFromTo = computed(() => {
  const { query: routeQuery } = useRoute();
  const result = z
    .object({
      from: z.iso
        .datetime({ local: false, offset: true })
        .transform((s) => dt.parseAbsolute(s, dt.getLocalTimeZone()))
        .default(now().subtract({ days: 1 })),
      to: z.iso
        .datetime({ local: false, offset: true })
        .transform((s) => dt.parseAbsolute(s, dt.getLocalTimeZone()))
        .default(now().add({ minutes: 1 })),
    })
    .refine(
      ({ from: f, to: t }) =>
        !(f instanceof dt.ZonedDateTime) ||
        !(t instanceof dt.ZonedDateTime) ||
        f.compare(t) < 0,
      { error: "`to` is earlier than `from`" },
    )
    .safeParse(routeQuery);
  if (!result.success)
    throw createError({
      statusCode: 400,
      message: z.prettifyError(result.error),
      data: JSON.parse(result.error.message),
    });

  return result.data;
});

const inputFrom = useState("inputFrom", () => initFromTo.value.from);
const inputTo = useState("inputTo", () => initFromTo.value.to);

const inputPlayer = useState("player", () => "");
const loading = useState("loading", () => 0);

function setPreset(d: dt.DateDuration) {
  inputFrom.value = now().subtract(d);
  inputTo.value = now();
}

async function query() {
  loading.value += 1;
  try {
    from.value = inputFrom.value.toDate();
    to.value = inputTo.value.toDate();
    shownPlayer.value = inputPlayer.value.trim();
    await Promise.all([updateCounts(), updatePlayer()]);
  } finally {
    loading.value -= 1;
  }
}

onMounted(() => query());

const playDuration = computed(() =>
  player.value === null
    ? null
    : df.formatDuration({
        hours: Math.floor(player.value.playDuration / 60),
        minutes: player.value.playDuration % 60,
      }),
);
</script>

<template>
  <section
    id="input"
    class="select-none flex flex-wrap gap-5 justify-center text-center *:grow-3 min-h-[20dvh]"
  >
    <UCard class="content-center">
      <p class="font-bold text-5xl text-primary">
        StatusTracker v{{ $config.public.clientVersion }}
      </p>
      <p class="mt-2 *:mx-2">
        <span
          ><UIcon name="lucide:code-xml" class="size-4 translate-y-0.5" />
          7d</span
        >
        <ULink href="https://github.com/iiiii7d/statustracker3">
          <UIcon name="lucide:github" class="size-4 translate-y-0.5" /> GitHub
        </ULink>
        <ULink href="/licenses.txt">
          <UIcon name="lucide:scroll" class="size-4 translate-y-0.5" /> Licences
        </ULink>
      </p>
    </UCard>

    <UCard class="flex flex-col justify-center">
      <div>
        <UInputDate
          v-model="inputFrom"
          :hour-cycle="24"
          :is-date-unavailable="(f) => f.compare(inputTo) > 0"
          hide-time-zone
        />
      </div>
      <UIcon name="lucide:arrow-down" class="size-5 mt-1.5" />
      <div>
        <UInputDate
          v-model="inputTo"
          :hour-cycle="24"
          :is-date-unavailable="(t) => t.compare(inputFrom) < 0"
          hide-time-zone
        />
      </div>
      <p class="mt-2">
        <span>Presets: Past </span>
        <UButton @click="setPreset({ days: 1 })">Day</UButton>
        <UButton @click="setPreset({ weeks: 1 })">Week</UButton>
        <UButton @click="setPreset({ months: 1 })">Month</UButton>
        <UButton @click="setPreset({ years: 1 })">Year</UButton>
      </p>
    </UCard>
    <UCard class="text-wrap w-sm content-center">
      <p><label for="player">Show play time for</label></p>
      <UFieldGroup class="mt-2">
        <UInput id="player" v-model="inputPlayer" placeholder="player username">
          <template v-if="inputPlayer" #trailing>
            <UIcon
              class="cursor-pointer"
              name="lucide:x"
              @click="inputPlayer = ''"
            />
          </template>
        </UInput>
        <UButton id="query" @click="query">Query</UButton>
      </UFieldGroup>

      <UCollapsible
        :open="inputPlayer !== '' && inputPlayer === shownPlayer"
        class="mt-2"
      >
        <template #content>
          <UProgress v-if="loading !== 0" id="player-stats" />
          <template
            v-else-if="player !== null && player.playTimes.length === 0"
          >
            <b>{{ shownPlayer }}</b> did not join within this time period
          </template>
          <template v-else-if="player !== null">
            <b>{{ shownPlayer }}</b> played for <b>{{ playDuration }}</b> within
            this time period
          </template>
          <template v-else-if="shownPlayer !== ''">
            No such player <b>{{ shownPlayer }}</b>
          </template>
        </template>
      </UCollapsible>
    </UCard>
    <UCard class="content-center">
      <p>Rolling Averages</p>
      <p class="mt-2 text-wrap">
        <CheckboxButton v-model="shownMovingAverages[0]" @click="updateCounts"
          >Raw</CheckboxButton
        >
        <CheckboxButton v-model="shownMovingAverages[1]" @click="updateCounts"
          >1h</CheckboxButton
        >
        <CheckboxButton v-model="shownMovingAverages[12]" @click="updateCounts"
          >12h</CheckboxButton
        >
        <CheckboxButton v-model="shownMovingAverages[24]" @click="updateCounts"
          >1d</CheckboxButton
        >
        <CheckboxButton v-model="shownMovingAverages[168]" @click="updateCounts"
          >7d</CheckboxButton
        >
      </p>
    </UCard>
  </section>
</template>
