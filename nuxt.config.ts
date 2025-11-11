import pkg from "./package.json";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  app: {
    head: {
      title: "StatusTracker 3",
      htmlAttrs: {
        lang: "en",
      },
    },
  },
  css: ["./assets/style.css"],

  nitro: {
    compressPublicAssets: true,
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "* * * * *": ["updateCount", "webhooks"],
    },
  },

  runtimeConfig: {
    public: {
      clientVersion: pkg.version,
    },
  },

  components: ["~/sections", "~/components"],
  modules: (await import("@nuxt/eslint")) ? ["@nuxt/eslint"] : [],
});
