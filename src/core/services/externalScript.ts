export type ExternalScriptOptions = {
  id: string
  src: string
  async?: boolean
  crossOrigin?: '' | 'anonymous' | 'use-credentials'
  referrerPolicy?: ReferrerPolicy
}

export function injectExternalScriptOnce({
  id,
  src,
  async = true,
  crossOrigin,
  referrerPolicy,
}: ExternalScriptOptions) {
  const existing = document.getElementById(id)
  if (existing) {
    return existing as HTMLScriptElement
  }

  const script = document.createElement('script')
  script.id = id
  script.async = async
  script.src = src

  if (crossOrigin) {
    script.crossOrigin = crossOrigin
  }

  if (referrerPolicy) {
    script.referrerPolicy = referrerPolicy
  }

  document.head.appendChild(script)
  return script
}
