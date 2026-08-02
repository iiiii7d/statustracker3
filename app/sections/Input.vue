<script setup lang="ts">
import {
  from,
  to,
  player,
  shownMovingAverages,
  playerUsername,
  loading,
} from "~/state.ts";
import * as dt from "@internationalized/date";
import { z } from "zod/v4";
import { now } from "~/utils";

const initFromTo = computed(() => {
  const { query: routeQuery } = useRoute();
  const result = z
    .object({
      from: z.iso
        .datetime({ local: false, offset: true })
        .transform((s) => dt.parseAbsoluteToLocal(s))
        .default(now().subtract({ days: 1 })),
      to: z.iso
        .datetime({ local: false, offset: true })
        .transform((s) => dt.parseAbsoluteToLocal(s))
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

onMounted(() => {
  from.value = initFromTo.value.from;
  to.value = initFromTo.value.to;
});

function setPreset(d: dt.DateDuration) {
  from.value = now().subtract(d);
  to.value = now();
}

const playDuration = computed(() => {
  if (player.value?.ty !== "success") {
    return null;
  }
  const h = Math.floor(player.value.playDuration / 60);
  const m = player.value.playDuration % 60;
  return `${h}h ${m}min`;
});
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
        <ULink href="https://github.com/iiiii7d/statustracker4">
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
          v-model="from"
          :hour-cycle="24"
          :is-date-unavailable="(f) => f.compare(to) > 0"
          hide-time-zone
          @blur="console.log"
        />
      </div>
      <UIcon name="lucide:arrow-down" class="size-5 mt-1.5" />
      <div>
        <UInputDate
          v-model="to"
          :hour-cycle="24"
          :is-date-unavailable="(t) => t.compare(from) < 0"
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
      <UInput
        id="player"
        v-model="playerUsername"
        class="mt-2"
        placeholder="player username"
      >
        <template v-if="playerUsername" #trailing>
          <UIcon
            class="cursor-pointer"
            name="lucide:x"
            @click="playerUsername = ''"
          />
        </template>
      </UInput>

      <UCollapsible :open="playerUsername !== ''" class="mt-2">
        <template #content>
          <UProgress v-if="loading !== 0" id="player-stats" />
          <template v-else-if="player?.ty === 'noPlayer'">
            No such player <b>{{ playerUsername }}</b>
          </template>
          <template
            v-else-if="
              player?.ty === 'success' && player.playTimes.length === 0
            "
          >
            <b>{{ playerUsername }}</b> did not join within this time period
          </template>
          <template
            v-else-if="player?.ty === 'success' && player.playDuration !== 0"
          >
            <b>{{ playerUsername }}</b> played for
            <b>{{ playDuration }}</b> within this time period
          </template>
        </template>
      </UCollapsible>
    </UCard>
    <UCard class="content-center">
      <p>Rolling Averages</p>
      <p class="mt-2 text-wrap">
        <CheckboxButton v-model="shownMovingAverages[0]">Raw</CheckboxButton>
        <CheckboxButton v-model="shownMovingAverages[1]">1h</CheckboxButton>
        <CheckboxButton v-model="shownMovingAverages[12]">12h</CheckboxButton>
        <CheckboxButton v-model="shownMovingAverages[24]">1d</CheckboxButton>
        <CheckboxButton v-model="shownMovingAverages[168]">7d</CheckboxButton>
      </p>
    </UCard>
  </section>
</template>
