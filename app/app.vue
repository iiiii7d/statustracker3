<script setup lang="ts">
const route = useRoute();
if (route.path !== "/")
  throw createError({
    statusCode: 404,
    statusMessage: "Not Found",
  });
</script>
<template>
  <UApp>
    <UMain class="mx-8">
      <Chart />
      <Input />
      <USeparator class="m-8" />
      <CategoryStats />
    </UMain>
  </UApp>
</template>
