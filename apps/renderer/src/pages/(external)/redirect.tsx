import { DEEPLINK_SCHEME } from "@follow/shared/constants"
import { PoweredByFooter } from "@renderer/components/common/PoweredByFooter"
import { Button } from "@renderer/components/ui/button"
import { UserAvatar } from "@renderer/components/user-button"
import { apiClient } from "@renderer/lib/api-fetch"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

export function Component() {
  const navigate = useNavigate()
  const { t } = useTranslation("external")

  const getCallbackUrl = async () => {
    const { data } = await apiClient["auth-app"]["new-session"].$post({})
    return `${DEEPLINK_SCHEME}auth?token=${data.sessionToken}`
  }

  const onceRef = useRef(false)
  useEffect(() => {
    if (onceRef.current) return
    onceRef.current = true
    if (window.electron) {
      navigate("/")
    } else {
      getCallbackUrl().then((url) => {
        window.open(url, "_top")
      })
    }
  }, [])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-10 px-4 pb-12 pt-[30vh]">
      <UserAvatar className="gap-8 px-10 py-4 text-2xl" />
      <h2 className="text-center">
        {t("redirect.successMessage", { APP_NAME })} <br />
        <br />
        {t("redirect.instruction", { APP_NAME })}
      </h2>
      <div className="center flex flex-col gap-4 sm:flex-row">
        <Button variant="text" className="h-14 px-10 text-base" onClick={() => navigate("/")}>
          {t("redirect.continueInBrowser")}
        </Button>

        <Button
          className="h-14 !rounded-full px-5 text-lg"
          onClick={async () => window.open(await getCallbackUrl(), "_top")}
        >
          {t("redirect.openApp", { APP_NAME })}
        </Button>
      </div>
      <div className="grow" />
      <PoweredByFooter />
    </div>
  )
}
