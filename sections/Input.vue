<script setup lang="ts">
import CheckboxButton from "~/components/CheckboxButton.vue";
import {
  from,
  to,
  player,
  shownPlayer,
  defaultFrom,
  defaultTo,
  updateCounts,
  updatePlayer,
  shownMovingAverages,
} from "~/sections/Chart.vue";
import * as df from "date-fns";
const runtimeConfig = useRuntimeConfig();

const inputFrom = useState("inputFrom", () =>
  df.formatISO(defaultFrom()).replace(/(?:Z|\+.*)$/u, ""),
);
const inputTo = useState("inputTo", () =>
  df.formatISO(defaultTo()).replace(/(?:Z|\+.*)$/u, ""),
);
const inputPlayer = useState("player", () => "");
const loading = useState("loading", () => 0);

async function query() {
  loading.value += 1;
  try {
    from.value = df.parseISO(inputFrom.value);
    to.value = df.parseISO(inputTo.value);
    shownPlayer.value = inputPlayer.value.trim();
    await Promise.all([updateCounts(), updatePlayer()]);
  } finally {
    loading.value -= 1;
  }
}

const playDuration = computed(() =>
  player.value === null
    ? null
    : df.formatDuration({
        hours: Math.floor(player.value.playDuration / 60),
        minutes: player.value.playDuration % 60,
      }),
);

const mobile = ref(false);
onMounted(() => {
  mobile.value = window.innerWidth < 800;
  window.addEventListener("resize", () => {
    mobile.value = window.innerWidth < 800;
  });
});
</script>

<template>
  <b style="font-size: 1.5em; color: #fc0">
    StatusTracker v{{ runtimeConfig.public.clientVersion
    }}<span v-if="!mobile">&nbsp;&nbsp;|&nbsp;&nbsp;</span><br v-else />
  </b>

  <label for="from">Show activity from </label
  ><input id="from" v-model="inputFrom" type="datetime-local" />
  <br v-if="mobile" />

  <label for="to">to </label
  ><input id="to" v-model="inputTo" type="datetime-local" />
  <br v-if="mobile" />

  <label for="player">for player </label
  ><input
    id="player"
    v-model="inputPlayer"
    type="text"
    placeholder="username"
  />
  &nbsp;
  <button @click="query">Query</button><br />

  <span v-if="loading !== 0" id="player-stats">Loading...</span>
  <span
    v-else-if="player !== null && player.playTimes.length === 0"
    id="player-stats"
  >
    <b>{{ shownPlayer }}</b> did not join within this time period
  </span>
  <span v-else-if="player !== null" id="player-stats">
    <b>{{ shownPlayer }}</b> played for <b>{{ playDuration }}</b> within this
    time period
  </span>
  <span v-else-if="shownPlayer !== ''" id="player-stats">
    Player <b>{{ shownPlayer }}</b> does not exist
  </span>

  <br />
  <span>Rolling Averages </span>
  <CheckboxButton v-model="shownMovingAverages[0]" @click="updateCounts"
    >Raw</CheckboxButton
  >&nbsp;
  <CheckboxButton v-model="shownMovingAverages[1]" @click="updateCounts"
    >1h</CheckboxButton
  >&nbsp;
  <CheckboxButton v-model="shownMovingAverages[12]" @click="updateCounts"
    >12h</CheckboxButton
  >&nbsp;
  <CheckboxButton v-model="shownMovingAverages[24]" @click="updateCounts"
    >1d</CheckboxButton
  >&nbsp;
  <CheckboxButton v-model="shownMovingAverages[168]" @click="updateCounts"
    >7d</CheckboxButton
  >
</template>

<style scoped>
#player-stats {
  color: #aaa;

  b {
    color: #fc0;
  }
}

* {
  user-select: none;
}
</style>
