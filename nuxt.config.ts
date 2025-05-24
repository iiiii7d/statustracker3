import pkg from "./package.json";
import { getConfig } from "./server/utils/config";

const config = getConfig();

declare module "nuxt/schema" {
  interface RuntimeConfig {
    config: string;
  }
  interface PublicRuntimeConfig {
    clientVersion: string;
    categories: Config["categories"];
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
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
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "* * * * *": [
        "updateCount",
        ...(config.webhooks === undefined && !process.env.NUXT_WEBHOOKS
          ? []
          : ["webhooks"]),
      ],
    },
  },

  runtimeConfig: {
    config: JSON.stringify(config),
    public: {
      clientVersion: pkg.version,
      categories: config.categories ?? {},
    },
  },

  components: ["~/sections", "~/components"],
  modules: ["@nuxt/eslint"],
});
