export const getPostHogAssetHost = (host: string, configured?: string) => {
  if (configured) return configured.replace(/\/$/, '')
  return host.replace(/\.i\.posthog\.com\/?$/, '-assets.i.posthog.com')
}
