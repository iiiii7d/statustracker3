<script setup lang="ts">
  import { Line } from "vue-chartjs";
  import { Chart, registerables, type ChartData, type Point, type ChartDataset } from 'chart.js';
  import annotationPlugin from 'chartjs-plugin-annotation';

  Chart.register(...registerables, annotationPlugin);
  const chartData = {
    datasets: [{ data: [40, 20, 12] }]
  };
  const chartOptions = {};
</script>

<template>
  <Line :data="chartData" :options="chartOptions"></Line>
</template>

<style scoped>

</style>