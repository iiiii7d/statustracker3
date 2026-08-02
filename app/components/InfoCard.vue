<template>
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
</template>
