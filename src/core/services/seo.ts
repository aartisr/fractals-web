export type SeoPage = {
  title: string
  description: string
  path: string
  image: string
  type?: 'website' | 'article'
  noindex?: boolean
}

export const SITE_NAME = 'Fractals Web'
export const SITE_TAGLINE = 'Visual science, made teachable, measurable, and shareable.'
export const DEFAULT_DESCRIPTION =
  'Fractals Web is a science workbench for generating fractals, measuring image complexity, comparing visual evidence, and documenting reproducible research.'
export const DEFAULT_IMAGE = '/og-preview.svg'

const withBrand = (value: string) => `${value} | ${SITE_NAME}`

const DISCOVERY_CHALLENGE_SEO: Record<string, Pick<SeoPage, 'title' | 'description'>> = {
  'fractals-self-similarity': {
    title: withBrand('Self-Similarity Challenge'),
    description:
      'Practice finding repeated structure at a new scale in Mandelbrot or Julia boundaries, then name the region, point to evidence, and explain it cautiously.',
  },
  'compare-evidence-story': {
    title: withBrand('Visual Evidence Challenge'),
    description:
      'Use a guided image-comparison challenge to identify what changed, what stayed consistent, and which visible evidence supports a careful, qualified conclusion.',
  },
  'box-count-methods': {
    title: withBrand('Box-Counting Methods Challenge'),
    description:
      'Define an image region, inspect box-count fit quality, compare fractal-dimension estimates, and export a reproducible record for another learner or researcher.',
  },
  'tumor-safety-audit': {
    title: withBrand('AI Claim Safety Challenge'),
    description:
      'Review an AI image overlay with evidence-first, non-diagnostic language; separate visible observations from interpretation in this educational safety challenge.',
  },
}

export const buildSeoForPath = (pathname: string): SeoPage => {
  if (pathname === '/') {
    return {
      title: withBrand('Visual Science Workbench'),
      description: DEFAULT_DESCRIPTION,
      path: '/',
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/fractals') {
    return {
      title: withBrand('Fractal Generator'),
      description:
        'Generate and investigate Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, and Sierpinski fractals; zoom, pan, analyze patterns, and export settings.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/discover') {
    return {
      title: withBrand('Discovery Feed and Shared Examples'),
      description:
        'Browse fractal examples and evidence-led learning challenges for classrooms and research; bookmark a prompt, inspect method, and continue in the source tool.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname.startsWith('/workbench/discover/')) {
    const challengeId = pathname.slice('/workbench/discover/'.length)
    const challenge = DISCOVERY_CHALLENGE_SEO[challengeId]

    if (challenge) {
      return {
        ...challenge,
        path: pathname,
        image: DEFAULT_IMAGE,
        type: 'article',
      }
    }

    return {
      title: withBrand('Challenge Not Found'),
      description:
        'This challenge is not part of the public Fractals Web catalog. Return to Discovery to choose a current, evidence-led activity.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'article',
      noindex: true,
    }
  }

  if (pathname === '/workbench/box-count') {
    return {
      title: withBrand('Box Counter'),
      description:
        'Estimate fractal dimension from an image region using repeatable box counting; inspect occupied boxes and fit quality, export a reproducible methods record.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/compare') {
    return {
      title: withBrand('Image Compare'),
      description:
        'Compare matched images with the same preprocessing and box-count scales; inspect complexity differences, fit quality, limitations, and an evidence-led summary.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/tumor-detection') {
    return {
      title: withBrand('Tumor Detection Evidence'),
      description:
        'Explore AI localization alongside fractal-morphology measurements in a transparent biomedical research workflow; educational only, not a diagnostic tool.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/runs' || pathname.startsWith('/workbench/runs/')) {
    return {
      title: withBrand(pathname.includes('/runs/') ? 'Run Detail' : 'Run History and Provenance'),
      description:
        'Open locally saved analysis records, inspect provenance, and export a reproducible methods note for your own classroom or research workflow.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'article',
      // Saved runs are browser-local, often empty for first-time visitors, and do not
      // represent a stable public resource. Keeping them out of search avoids thin,
      // duplicate detail URLs while preserving the feature for users who need it.
      noindex: true,
    }
  }

  return {
    title: withBrand('Page Not Found'),
    description: 'This route is not a public Fractals Web page. Use the workbench navigation to continue your visual science exploration.',
    path: pathname,
    image: DEFAULT_IMAGE,
    type: 'website',
    noindex: true,
  }
}

export const getSiteUrl = () => {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined
  if (configured && configured.trim()) {
    return configured.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return 'http://localhost:5173'
}

export const getCanonicalUrl = (pathname: string) => `${getSiteUrl()}${pathname === '/' ? '' : pathname}`

export const buildStructuredData = (pathname: string) => {
  const seo = buildSeoForPath(pathname)
  const canonicalUrl = getCanonicalUrl(pathname)
  const authorUrl = 'https://ai-aarti.com'
  const publisherUrl = 'https://saugus.pioneercss.org'

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: getSiteUrl(),
      description: SITE_TAGLINE,
      inLanguage: 'en-US',
      publisher: {
        '@type': 'Organization',
        name: 'Pioneer Charter School of Science II',
        url: publisherUrl,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': ['WebApplication', 'EducationalApplication'],
      name: SITE_NAME,
      url: canonicalUrl,
      description: seo.description,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      isAccessibleForFree: true,
      inLanguage: 'en-US',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      audience: [
        { '@type': 'EducationalAudience', educationalRole: 'student' },
        { '@type': 'EducationalAudience', educationalRole: 'educator' },
        { '@type': 'Audience', audienceType: 'researcher' },
      ],
      featureList: [
        'Fractal generation',
        'Box-counting analysis',
        'Image comparison',
        'Tumor evidence review',
        'Run history and provenance',
        'Shareable result cards',
      ],
      keywords: 'fractals, fractal dimension, box counting, image analysis, visual science, STEM education, reproducible research, AI literacy',
      knowsAbout: [
        'Fractal geometry',
        'Box-counting dimension',
        'Image analysis',
        'Reproducible research',
        'STEM education',
      ],
      author: {
        '@type': 'Person',
        name: 'Aarti S Ravikumar',
        url: authorUrl,
        sameAs: [authorUrl],
      },
      publisher: {
        '@type': 'Organization',
        name: 'Pioneer Charter School of Science II',
        url: publisherUrl,
        sameAs: [publisherUrl],
        logo: {
          '@type': 'ImageObject',
          url: `${getSiteUrl()}/pcssii-logo.jpg`,
        },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: getCanonicalUrl('/'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: pathname === '/' ? 'Visual Science Workbench' : pathname.replace(/^\/workbench\//, '').replace(/\//g, ' '),
          item: canonicalUrl,
        },
      ],
    },
  ]
}
