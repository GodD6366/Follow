import { registerGlobalContext } from "@follow/shared/bridge"
import { env } from "@follow/shared/env"
import { authConfigManager } from "@hono/auth-js/react"
import { repository } from "@pkg"
import { getUISettings } from "@renderer/atoms/settings/ui"
import { isElectronBuild } from "@renderer/constants"
import { browserDB } from "@renderer/database"
import { initI18n } from "@renderer/i18n"
import { settingSyncQueue } from "@renderer/modules/settings/helper/sync-queue"
import {
  ElectronCloseEvent,
  ElectronShowEvent,
} from "@renderer/providers/invalidate-query-provider"
import { CleanerService } from "@renderer/services/cleaner"
import dayjs from "dayjs"
import duration from "dayjs/plugin/duration"
import localizedFormat from "dayjs/plugin/localizedFormat"
import relativeTime from "dayjs/plugin/relativeTime"
import { enableMapSet } from "immer"
import { toast } from "sonner"

import { subscribeNetworkStatus } from "../atoms/network"
import { getGeneralSettings, subscribeShouldUseIndexedDB } from "../atoms/settings/general"
import { appLog } from "../lib/log"
import { hydrateDatabaseToStore, hydrateSettings, setHydrated } from "./hydrate"
import { doMigration } from "./migrates"
import { initPostHog } from "./posthog"
import { initSentry } from "./sentry"

const cleanup = subscribeShouldUseIndexedDB((value) => {
  if (!value) {
    browserDB.tables.forEach((table) => {
      table.clear()
    })
    setHydrated(false)
    return
  }
  setHydrated(true)
})

declare global {
  interface Window {
    version: string
  }
}

export const initializeApp = async () => {
  appLog(`${APP_NAME}: Next generation information browser`, repository.url)
  appLog(`Initialize ${APP_NAME}...`)
  window.version = APP_VERSION

  const now = Date.now()
  // Initialize the auth config first
  authConfigManager.setConfig({
    baseUrl: env.VITE_API_URL,
    basePath: "/auth",
    credentials: "include",
  })

  // Set Environment
  document.documentElement.dataset.buildType = isElectronBuild ? "electron" : "web"

  apm("migration", doMigration)

  // Initialize dayjs
  dayjs.extend(duration)
  dayjs.extend(relativeTime)
  dayjs.extend(localizedFormat)

  // Enable Map/Set in immer
  enableMapSet()

  subscribeNetworkStatus()

  registerGlobalContext({
    showSetting: (path) => window.router.showSettings(path),
    getGeneralSettings,
    getUISettings,
    /**
     * Electron app only
     */
    electronClose() {
      document.dispatchEvent(new ElectronCloseEvent())
    },
    electronShow() {
      document.dispatchEvent(new ElectronShowEvent())
    },

    toast,
  })

  apm("hydrateSettings", hydrateSettings)

  apm("setting sync", () => {
    settingSyncQueue.init()
    settingSyncQueue.syncLocal()
  })

  // should after hydrateSettings
  const { dataPersist: enabledDataPersist, sendAnonymousData } = getGeneralSettings()

  initSentry()
  await apm("i18n", initI18n)

  if (sendAnonymousData) initPostHog()

  let dataHydratedTime: undefined | number
  // Initialize the database
  if (enabledDataPersist) {
    dataHydratedTime = await apm("hydrateDatabaseToStore", hydrateDatabaseToStore)
    CleanerService.cleanOutdatedData()
  }

  const loadingTime = Date.now() - now
  appLog(`Initialize ${APP_NAME} done,`, `${loadingTime}ms`)

  window.posthog?.capture("app_init", {
    electron: !!window.electron,
    loading_time: loadingTime,
    using_indexed_db: enabledDataPersist,
    data_hydrated_time: dataHydratedTime,
    version: APP_VERSION,
  })
}

import.meta.hot?.dispose(cleanup)

const apm = async (label: string, fn: () => Promise<any> | any) => {
  const start = Date.now()
  const result = await fn()
  const end = Date.now()
  appLog(`${label} took ${end - start}ms`)
  return result
}
