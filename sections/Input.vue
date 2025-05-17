<script setup lang="ts">

import CheckboxButton from "~/components/CheckboxButton.vue";
import {Temporal} from "temporal-polyfill";
const runtimeConfig = useRuntimeConfig();

const defaultFrom = Temporal.Now.zonedDateTimeISO().subtract(Temporal.Duration.from({days: 1}))
const defaultTo = Temporal.Now.zonedDateTimeISO().add(Temporal.Duration.from({minutes: 1}))

let from = defaultFrom.toString().slice(0, 16)
let to = defaultTo.toString().slice(0, 16)
let player = ""
let loading = 0;
</script>

<template>
  <b style="font-size: 1.5em; color: #fc0">StatusTracker v{{ runtimeConfig.public.clientVersion }}&nbsp;&nbsp;|&nbsp;&nbsp;</b>

  <span>Show activity</span>
  <label for="from">from </label><input type="datetime-local" id="from" v-model="from"/>
  <label for="to">to </label><input type="datetime-local" id="to" v-model="to" />
  <label for="player">for player </label><input type="text" id="player" v-model="player" placeholder="username"/>
  <button onclick={query}>Query</button><br>

  <span v-if="loading !== 0" id="player-stats">Loading...</span>
  <span v-else-if="playerStats && player === origPlayer && player !== ''" id="player-stats">
    <b>{player}</b> has played
    for <b>{playerStats.totalTime}</b> between <b>{playerStats.from}</b> and <b>{playerStats.to}</b>,
    last seen <b>{playerStats.lastLeft}</b></span>
  <span v-else-if="player === origPlayer && player !== ''" id="player-stats">
    No data found for <b>{player}</b>
  </span>

  <br>
  <span>Rolling Averages</span>
  <!--  <CheckboxButton v-model="$rollingAverageSwitches[0]">Raw</CheckboxButton>-->
  <!--  <CheckboxButton v-model="$rollingAverageSwitches[60]">1h</CheckboxButton>-->
  <!--  <CheckboxButton v-model="$rollingAverageSwitches[720]">12h</CheckboxButton>-->
  <!--  <CheckboxButton v-model="$rollingAverageSwitches[1440]">1d</CheckboxButton>-->
  <!--  <CheckboxButton v-model="$rollingAverageSwitches[10080]">7d</CheckboxButton>-->
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