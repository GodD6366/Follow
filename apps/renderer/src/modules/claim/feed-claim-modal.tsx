import { FollowSummary } from "@renderer/components/feed-summary"
import { AutoResizeHeight } from "@renderer/components/ui/auto-resize-height"
import { Button } from "@renderer/components/ui/button"
import { Card, CardHeader } from "@renderer/components/ui/card"
import { CopyButton, ShikiHighLighter } from "@renderer/components/ui/code-highlighter"
import { useShikiDefaultTheme } from "@renderer/components/ui/code-highlighter/shiki/hooks"
import { LoadingCircle } from "@renderer/components/ui/loading"
import { useCurrentModal } from "@renderer/components/ui/modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"
import { useAuthQuery } from "@renderer/hooks/common"
import { Queries } from "@renderer/queries"
import { useClaimFeedMutation } from "@renderer/queries/feed"
import { useFeedById } from "@renderer/store/feed"
import type { FC } from "react"
import { useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"

export const FeedClaimModalContent: FC<{
  feedId: string
}> = ({ feedId }) => {
  const { t } = useTranslation()
  const feed = useFeedById(feedId)
  const {
    data: claimMessage,
    isLoading,
    error,
  } = useAuthQuery(Queries.feed.claimMessage({ feedId }), {
    enabled: !!feed,
  })
  const { setClickOutSideToDismiss } = useCurrentModal()

  const { mutateAsync: claim, isPending, isSuccess } = useClaimFeedMutation(feedId)

  useEffect(() => {
    setClickOutSideToDismiss(!isPending)
  }, [isPending, setClickOutSideToDismiss])

  const shikiTheme = useShikiDefaultTheme()

  if (!feed) return null

  if (isLoading) {
    return (
      <div className="center h-32 w-[650px]">
        <LoadingCircle size="large" />
      </div>
    )
  }

  if (error) {
    return <div>{t("feed_claim_modal.failed_to_load")}</div>
  }

  return (
    <div className="w-[650px] max-w-full">
      <Card className="mb-2">
        <CardHeader>
          <FollowSummary feed={feed} />
        </CardHeader>
      </Card>
      <p>{t("feed_claim_modal.verify_ownership")}</p>
      <p>{t("feed_claim_modal.choose_verification_method")}</p>
      <Tabs defaultValue="content" className="mt-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="content">{t("feed_claim_modal.tab_content")}</TabsTrigger>
          <TabsTrigger value="description">{t("feed_claim_modal.tab_description")}</TabsTrigger>
          <TabsTrigger value="rss">{t("feed_claim_modal.tab_rss")}</TabsTrigger>
        </TabsList>
        <AutoResizeHeight duration={0.1} className="px-2">
          <TabsContent className="mt-0 pt-3" value="content">
            <p>{t("feed_claim_modal.content_instructions")}</p>
            {feed.url.startsWith("rsshub://") && (
              <p className="mt-2 text-sm leading-tight text-orange-800 dark:text-orange-500/70">
                {t("feed_claim_modal.rsshub_notice")}
              </p>
            )}
            <BaseCodeBlock>{claimMessage?.data.content || ""}</BaseCodeBlock>
          </TabsContent>
          <TabsContent className="mt-0 pt-3" value="description">
            <p className="mb-2 leading-none">
              {t("feed_claim_modal.description_current")}
              <span className="ml-2 text-xs text-zinc-500">{feed.description}</span>
            </p>
            <Trans
              i18nKey="feed_claim_modal.description_instructions"
              components={{ code: <code className="text-sm">{"<description />"}</code> }}
            />
            {feed.url.startsWith("rsshub://") && (
              <p className="mt-1 leading-tight text-orange-800">
                {t("feed_claim_modal.rsshub_notice")}
              </p>
            )}
            <BaseCodeBlock>{claimMessage?.data.description || ""}</BaseCodeBlock>
          </TabsContent>
          <TabsContent className="mt-0 pt-3" value="rss">
            <div className="space-y-3">
              <p>{t("feed_claim_modal.rss_instructions")}</p>
              <p>{t("feed_claim_modal.rss_format_choice")}</p>
              <p>
                <b>{t("feed_claim_modal.rss_xml_format")}</b>
              </p>
              <ShikiHighLighter
                transparent
                theme={shikiTheme}
                className="group relative mt-3 cursor-auto select-text whitespace-pre break-words rounded-lg border border-border bg-zinc-100 p-2 text-sm dark:bg-neutral-800 [&_pre]:whitespace-pre [&_pre]:break-words [&_pre]:!p-0"
                code={claimMessage?.data.xml || ""}
                language="xml"
              />
              <p>
                <b>{t("feed_claim_modal.rss_json_format")}</b>
              </p>
              <ShikiHighLighter
                transparent
                theme={shikiTheme}
                className="group relative mt-3 cursor-auto select-text whitespace-pre break-words rounded-lg border border-border bg-zinc-100 p-2 text-sm dark:bg-neutral-800 [&_pre]:whitespace-pre [&_pre]:break-words [&_pre]:!p-0"
                code={JSON.stringify(JSON.parse(claimMessage?.data.json || "{}"), null, 2)}
                language="json"
              />
            </div>
          </TabsContent>
        </AutoResizeHeight>
      </Tabs>

      <div className="mt-4 flex justify-end">
        <Button
          disabled={isSuccess}
          isLoading={isPending}
          onClick={() => claim()}
          variant={isSuccess ? "outline" : "primary"}
        >
          {isSuccess && <i className="i-mgc-check-circle-filled mr-2 bg-green-500" />}
          {t("feed_claim_modal.claim_button")}
        </Button>
      </div>
    </div>
  )
}

const BaseCodeBlock: FC<{
  children: string
}> = ({ children }) => (
  <pre className="group relative mt-3 cursor-auto select-text whitespace-pre-line break-words rounded-lg border border-border bg-zinc-100 p-2 text-sm dark:bg-neutral-800">
    <code>{children}</code>
    <CopyButton
      value={children}
      className="absolute bottom-2 right-2 z-[3] opacity-0 group-hover:opacity-100"
    />
  </pre>
)
