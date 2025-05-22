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
    categories: {
      test: { uuids: ["3b95b88fcee947549f965a5866ecf773"], colour: "#ff0000" },
    },
    dynmapLink:
      "https://api.allorigins.win/raw?url=https%3A//dynmap.minecartrapidtransit.net/main/standalone/dynmap_new.json",
    db: {
      database: "statustracker3",
      host: "localhost",
      user: "user",
      port: 5432,
    },
    deleteOldCategories: false,
  };
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  css: ["./assets/style.css"],

  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "* * * * *": ["updateCount"],
    },
  },

  runtimeConfig: {
    dynmapLink: config.dynmapLink,
    db: config.db,
    deleteOldCategories: config.deleteOldCategories ? "1" : "",
    public: {
      clientVersion: pkg.version,
      categories: config.categories,
    },
  },

  components: ["~/sections", "~/components"],
  modules: ["@nuxt/eslint"],
});
