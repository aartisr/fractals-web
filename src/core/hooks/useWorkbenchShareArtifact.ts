import { useCallback, useMemo, useState } from 'react'
import { downloadTextAsFile } from '../services/export'
import {
  buildShareCardMarkdown,
  buildShareUrl,
  createShareRecord,
  persistSharedCard,
  trackWorkbenchEvent,
  type WorkbenchResultCard,
  type WorkbenchShareState,
} from '../services/workbenchSharing'

type ShareStatus = 'idle' | 'copied' | 'saved' | 'error'

type UseWorkbenchShareArtifactOptions<TShareState extends WorkbenchShareState = WorkbenchShareState> = {
  card: WorkbenchResultCard | null
  sourcePath: string
  copyLinkEventName?: string
  copyTextEventName?: string
  saveEventName?: string
  remixEventName?: string
  eventPayload?: WorkbenchShareState
  onRemix?: (state: TShareState) => void
}

export function useWorkbenchShareArtifact<TShareState extends WorkbenchShareState = WorkbenchShareState>({
  card,
  sourcePath,
  copyLinkEventName,
  copyTextEventName,
  saveEventName,
  remixEventName,
  eventPayload,
  onRemix,
}: UseWorkbenchShareArtifactOptions<TShareState>) {
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle')

  const shareRecord = useMemo(() => (card ? createShareRecord(card) : null), [card])
  const shareUrl = useMemo(() => (shareRecord ? buildShareUrl(shareRecord) : ''), [shareRecord])
  const shareText = useMemo(() => (card ? buildShareCardMarkdown(card) : ''), [card])
  const shareState = card?.shareState as TShareState | undefined

  const flashStatus = useCallback((nextStatus: ShareStatus, delayMs = 1800) => {
    setShareStatus(nextStatus)
    window.setTimeout(() => setShareStatus('idle'), delayMs)
  }, [])

  const copyShareLink = useCallback(async () => {
    if (!shareUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      if (copyLinkEventName) {
        trackWorkbenchEvent(copyLinkEventName, eventPayload)
      }
      flashStatus('copied')
    } catch {
      flashStatus('error', 2200)
    }
  }, [copyLinkEventName, eventPayload, flashStatus, shareUrl])

  const copyShareText = useCallback(async () => {
    if (!shareText) {
      return
    }

    try {
      await navigator.clipboard.writeText(shareText)
      if (copyTextEventName) {
        trackWorkbenchEvent(copyTextEventName, eventPayload)
      }
      flashStatus('copied')
    } catch {
      flashStatus('error', 2200)
    }
  }, [copyTextEventName, eventPayload, flashStatus, shareText])

  const saveShareCard = useCallback(() => {
    if (!card) {
      return
    }

    persistSharedCard({
      ...card,
      sourcePath,
    })
    if (saveEventName) {
      trackWorkbenchEvent(saveEventName, eventPayload)
    }
    flashStatus('saved')
  }, [card, eventPayload, flashStatus, saveEventName, sourcePath])

  const remixShareCard = useCallback(() => {
    if (!shareState || !onRemix) {
      return
    }

    onRemix(shareState)
    if (remixEventName) {
      trackWorkbenchEvent(remixEventName, eventPayload)
    }
    flashStatus('saved')
  }, [eventPayload, flashStatus, onRemix, remixEventName, shareState])

  const exportShareCard = useCallback((filename: string, title = 'text/markdown') => {
    if (!card) {
      return
    }

    downloadTextAsFile(filename, buildShareCardMarkdown(card), title)
  }, [card])

  return {
    shareRecord,
    shareUrl,
    shareText,
    shareState,
    shareStatus,
    copyShareLink,
    copyShareText,
    saveShareCard,
    remixShareCard,
    exportShareCard,
  }
}
