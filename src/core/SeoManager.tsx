import { useEffect, useMemo } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { buildSeoForPath, buildStructuredData, getCanonicalUrl, getSiteUrl, SITE_NAME, SITE_TAGLINE } from './services/seo'

const META_IDS = {
  description: 'seo-description',
  robots: 'seo-robots',
  ogTitle: 'seo-og-title',
  ogDescription: 'seo-og-description',
  ogUrl: 'seo-og-url',
  ogImage: 'seo-og-image',
  ogType: 'seo-og-type',
  twitterCard: 'seo-twitter-card',
  twitterTitle: 'seo-twitter-title',
  twitterDescription: 'seo-twitter-description',
  twitterImage: 'seo-twitter-image',
  themeColor: 'seo-theme-color',
  canonical: 'seo-canonical',
  appName: 'seo-app-name',
  appleTitle: 'seo-apple-title',
  author: 'seo-author',
  structuredData: 'seo-structured-data',
} as const

const ensureMeta = (selector: string, create: () => HTMLMetaElement) => {
  const existing = document.head.querySelector<HTMLMetaElement>(selector)
  if (existing) {
    return existing
  }
  const meta = create()
  document.head.appendChild(meta)
  return meta
}

const ensureLink = (selector: string, create: () => HTMLLinkElement) => {
  const existing = document.head.querySelector<HTMLLinkElement>(selector)
  if (existing) {
    return existing
  }
  const link = create()
  document.head.appendChild(link)
  return link
}

const ensureScript = (id: string) => {
  const existing = document.head.querySelector<HTMLScriptElement>(`script#${id}`)
  if (existing) {
    return existing
  }
  const script = document.createElement('script')
  script.id = id
  script.type = 'application/ld+json'
  document.head.appendChild(script)
  return script
}

export function SeoManager() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const seo = useMemo(() => buildSeoForPath(pathname), [pathname])

  useEffect(() => {
    const canonicalUrl = getCanonicalUrl(seo.path)
    const siteUrl = getSiteUrl()
    const title = seo.title
    const description = seo.description
    const imageUrl = `${siteUrl}${seo.image.startsWith('/') ? seo.image : `/${seo.image}`}`

    document.title = title

    const titleSelector = 'meta[property="og:title"]'
    const descriptionSelector = 'meta[name="description"]'

    ensureMeta(descriptionSelector, () => {
      const meta = document.createElement('meta')
      meta.name = 'description'
      return meta
    }).setAttribute('content', description)

    ensureMeta('meta[name="robots"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'robots'
      return meta
    }).setAttribute('content', seo.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')

    ensureMeta(titleSelector, () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'og:title')
      return meta
    }).setAttribute('content', title)

    ensureMeta('meta[property="og:description"]', () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'og:description')
      return meta
    }).setAttribute('content', description)

    ensureMeta('meta[property="og:url"]', () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'og:url')
      return meta
    }).setAttribute('content', canonicalUrl)

    ensureMeta('meta[property="og:image"]', () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'og:image')
      return meta
    }).setAttribute('content', imageUrl)

    ensureMeta('meta[property="og:type"]', () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'og:type')
      return meta
    }).setAttribute('content', seo.type ?? 'website')

    ensureMeta('meta[name="twitter:card"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'twitter:card'
      return meta
    }).setAttribute('content', 'summary_large_image')

    ensureMeta('meta[name="twitter:title"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'twitter:title'
      return meta
    }).setAttribute('content', title)

    ensureMeta('meta[name="twitter:description"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'twitter:description'
      return meta
    }).setAttribute('content', description)

    ensureMeta('meta[name="twitter:image"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'twitter:image'
      return meta
    }).setAttribute('content', imageUrl)

    ensureMeta('meta[name="theme-color"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      return meta
    }).setAttribute('content', '#08121d')

    ensureMeta('meta[name="application-name"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'application-name'
      return meta
    }).setAttribute('content', SITE_NAME)

    ensureMeta('meta[name="apple-mobile-web-app-title"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'apple-mobile-web-app-title'
      return meta
    }).setAttribute('content', SITE_NAME)

    ensureMeta('meta[name="author"]', () => {
      const meta = document.createElement('meta')
      meta.name = 'author'
      return meta
    }).setAttribute('content', 'Aarti S Ravikumar')

    ensureLink('link[rel="canonical"]', () => {
      const link = document.createElement('link')
      link.rel = 'canonical'
      return link
    }).href = canonicalUrl

    ensureLink('link[rel="preconnect"][href="https://fonts.googleapis.com"]', () => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = 'https://fonts.googleapis.com'
      link.crossOrigin = 'anonymous'
      return link
    })

    ensureLink('link[rel="preconnect"][href="https://fonts.gstatic.com"]', () => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = 'https://fonts.gstatic.com'
      link.crossOrigin = 'anonymous'
      return link
    })

    const structuredData = ensureScript(META_IDS.structuredData)
    structuredData.textContent = JSON.stringify(buildStructuredData(pathname))

    return () => {
      // Keep the tags in place; they are page-level metadata, not ephemeral UI.
    }
  }, [pathname, seo])

  return null
}

export function SeoHeadDefaults() {
  return (
    <>
      <meta name="description" content={SITE_TAGLINE} />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={SITE_NAME} />
      <meta property="og:description" content={SITE_TAGLINE} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${getSiteUrl()}/og-preview.svg`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={SITE_NAME} />
      <meta name="twitter:description" content={SITE_TAGLINE} />
      <meta name="twitter:image" content={`${getSiteUrl()}/og-preview.svg`} />
      <meta name="theme-color" content="#08121d" />
      <link rel="canonical" href={getSiteUrl()} />
    </>
  )
}
