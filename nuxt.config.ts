import pkg from "./package.json"
import * as fs from "node:fs";

let trackerConfig;
try {
  trackerConfig = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH ?? "config.json").toString())
} catch {
  trackerConfig = {
    categories: {},
    dynmapLink: "https://dynmap.minecartrapidtransit.net/standalone/dynmap_new.json",
    dbUri: ""
  } as Config
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  css: ["./assets/style.css"],
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "* * * * *": ["updateCount"]
    }
  },
  runtimeConfig: {
    trackerConfig,
    public: {
      clientVersion: pkg.version,
    },
  },
  components: [
    "~/sections",
    "~/components",
  ]
})
