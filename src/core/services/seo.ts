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
  'Fractals Web is a modular visual science workbench for fractal generation, box counting, image comparison, tumor evidence, and shareable research workflows.'
export const DEFAULT_IMAGE = '/og-preview.svg'

const withBrand = (value: string) => `${value} | ${SITE_NAME}`

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
        'Generate Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, and Sierpinski variants in an interactive fractal studio.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/discover') {
    return {
      title: withBrand('Discovery Feed and Shared Examples'),
      description:
        'Browse shared fractal examples, bookmarkable challenge pages, and trust-first discovery tools for classrooms and research.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname.startsWith('/workbench/discover/')) {
    return {
      title: withBrand('Discovery Challenge'),
      description:
        'Open a bookmarkable challenge page that helps students and educators explain visual evidence with clarity.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'article',
    }
  }

  if (pathname === '/workbench/box-count') {
    return {
      title: withBrand('Box Counter'),
      description:
        'Measure fractal dimension from a selected region of interest with repeatable box-counting workflows and exportable results.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/compare') {
    return {
      title: withBrand('Image Compare'),
      description:
        'Compare two images side by side, quantify complexity shifts, and produce a clear interpretation of the evidence.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/tumor-detection') {
    return {
      title: withBrand('Tumor Detection Evidence'),
      description:
        'Review model outputs, confidence overlays, and evidence summaries in a caution-aware biomedical visualization workflow.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'website',
    }
  }

  if (pathname === '/workbench/runs' || pathname.startsWith('/workbench/runs/')) {
    return {
      title: withBrand(pathname.includes('/runs/') ? 'Run Detail' : 'Run History and Provenance'),
      description:
        'Inspect reusable run records, compare analysis settings, and export reproducible history for classroom or research use.',
      path: pathname,
      image: DEFAULT_IMAGE,
      type: 'article',
    }
  }

  return {
    title: withBrand('Visual Science Workbench'),
    description: DEFAULT_DESCRIPTION,
    path: pathname,
    image: DEFAULT_IMAGE,
    type: 'website',
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
  const canonicalUrl = getCanonicalUrl(pathname)
  const authorUrl = 'https://ai-aarti.com'
  const publisherUrl = 'https://saugus.pioneercss.org'

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: canonicalUrl,
      description: DEFAULT_DESCRIPTION,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
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
