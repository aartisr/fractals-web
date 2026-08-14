import { useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { trackWorkbenchEvent } from './services/workbenchSharing'

type SiteShareButtonProps = {
  className?: string
}

const SITE_URL = 'https://fractals.ai-aaarti.com'
const SHARE_TITLE = 'Fractals Web — Visual Science Workbench'
const SHARE_TEXT = 'Explore fractals, measure image complexity, and compare visual evidence with Fractals Web.'

const getShareUrl = (pathname: string) => {
  if (pathname.startsWith('/workbench/runs/')) {
    return `${SITE_URL}/workbench/runs`
  }
  return `${SITE_URL}${pathname === '/' ? '' : pathname}`
}

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.append(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) throw new Error('Copy unavailable')
}

export function SiteShareButton({ className = '' }: SiteShareButtonProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [status, setStatus] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle')
  const shareUrl = getShareUrl(pathname)

  const flash = (next: typeof status) => {
    setStatus(next)
    window.setTimeout(() => setStatus('idle'), 1800)
  }

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: shareUrl })
        trackWorkbenchEvent('site_shared', { method: 'native', url: shareUrl })
        flash('shared')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await copyText(shareUrl)
      trackWorkbenchEvent('site_shared', { method: 'copy', url: shareUrl })
      flash('copied')
    } catch {
      flash('error')
    }
  }

  const label = status === 'copied' ? 'Link copied' : status === 'shared' ? 'Shared' : status === 'error' ? 'Copy link' : 'Share'
  return (
    <button type="button" className={`tb-site-share ${className}`.trim()} onClick={() => void share()} aria-label="Share this Fractals Web page">
      <span aria-hidden="true">↗</span>
      {label}
    </button>
  )
}
