<script setup lang="ts">
const route = useRoute();
if (route.path !== "/")
  throw createError({
    statusCode: 404,
    statusMessage: "Not Found",
  });
</script>
<template>
  <Chart />
  <Input />
  <hr />
  <CategoryStats />
  <hr />
  <a href="https://github.com/iiiii7d/statustracker3">StatusTracker3 by 7d</a> |
  <a href="/licenses.txt">Licenses</a>
</template>
