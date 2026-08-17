import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Registers the offline app shell and exposes native install/update affordances. */
export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let registration: ServiceWorkerRegistration | undefined
    let updateTimer: number | undefined
    let refreshing = false
    const onInstallPrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallPromptEvent) }
    const checkForUpdate = () => setWaitingWorker(registration?.waiting ?? null)
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((nextRegistration) => {
      registration = nextRegistration
      checkForUpdate()
      registration.addEventListener('updatefound', () => registration?.installing?.addEventListener('statechange', checkForUpdate))
      updateTimer = window.setInterval(() => void registration?.update(), 60 * 60 * 1000)
    }).catch(() => { /* Offline support is progressive. */ })
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      if (updateTimer) window.clearInterval(updateTimer)
    }
  }, [])

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }
  const update = () => {
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }
  if (!installEvent && !waitingWorker) return null
  return <aside className="pwa-notice" aria-label="Application options">
    <img src="/pwa-icon-192.png" alt="" width="40" height="40" />
    <div><strong>{waitingWorker ? 'A new version is ready' : 'Install Nexus Lab'}</strong><span>{waitingWorker ? 'Update for the latest improvements.' : 'Add the workbench to your device for a focused, app-like experience.'}</span></div>
    <button type="button" onClick={waitingWorker ? update : install}>{waitingWorker ? 'Update' : 'Install'}</button>
  </aside>
}
