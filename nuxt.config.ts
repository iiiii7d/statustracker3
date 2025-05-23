import pkg from "./package.json";
import * as fs from "node:fs";

// eslint-disable-next-line init-declarations
let config: Config;
try {
  config = JSON.parse(
    fs.readFileSync(process.env.CONFIG_PATH ?? "config.json").toString(),
  );
} catch {
  config = {
    dynmapLink:
      "https://api.allorigins.win/raw?url=https%3A//dynmap.minecartrapidtransit.net/main/standalone/dynmap_new.json",
    db: {
      database: "statustracker3",
      host: "localhost",
      user: "user",
      port: 5432,
    },
  };
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
    dynmapLink: config.dynmapLink,
    db: config.db,
    webhooks:
      config.webhooks === undefined
        ? undefined
        : JSON.stringify(config.webhooks),
    deleteOldCategories: config.deleteOldCategories ? "1" : "",
    countsApproxMaxLength: config.countsApproxMaxLength ?? 1000,
    public: {
      clientVersion: pkg.version,
      categories: config.categories ?? {},
    },
  },

  components: ["~/sections", "~/components"],
  modules: ["@nuxt/eslint"],
});
