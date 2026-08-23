import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const siteUrl = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  (process.env.URL ?? 'https://fractals.ai-aarti.com')
).replace(/\/+$/, '')

const siteName = 'Fractals Web'
const image = `${siteUrl}/og-preview.svg`

// These are the stable, substantive routes in the generated sitemap. Local run
// history and unknown paths are intentionally excluded from the static output.
const pages = [
  {
    path: '/workbench/fractals',
    title: 'Fractal Generator | Fractals Web',
    description: 'Generate and investigate Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, and Sierpinski fractals; zoom, pan, analyze patterns, and export settings.',
    fallback: 'Choose a fractal family, move through the canvas, and preserve the settings behind an observation so another person can revisit it.',
    detail: 'The studio supports a range of mathematical systems, from complex-plane escape-time sets to iterated-function-system examples. Use it to make a specific observation about a boundary, repeated motif, symmetry, or change across scale—not simply to collect a visually striking image.',
    sections: [
      {
        heading: 'How the fractal generator works',
        content: 'A fractal is produced by repeatedly applying a small mathematical rule. Mandelbrot, Julia, Burning Ship, and Newton views use complex-number iteration: each canvas point follows the selected rule until it escapes or settles into a pattern. Barnsley Fern and Sierpinski Triangle use iterated transformations to place many points. Changing the family changes the rule; zooming and panning change the part of that rule you are examining.',
      },
      {
        heading: 'What to investigate',
        content: 'Start at a broad view, then move toward a boundary, spiral, ridge, or branching edge. Compare what remains recognizable at a new scale with what changes. For a Mandelbrot or Julia set, look for repeated miniature structures and thin boundary filaments. For Burning Ship, inspect asymmetric ridges and cusps. For Newton fractals, compare the colored convergence regions with the intricate boundary between them. A useful observation names the chosen family, the location or zoom level, and the visible feature that supports the claim.',
      },
      {
        heading: 'From visual exploration to evidence',
        content: 'The generator is designed for exploration first, then careful documentation. Save the chosen fractal family, parameter values, palette, iteration limit, and viewport before sharing an image. Those settings let another learner reproduce the same view and test whether the observation holds. To study a visual pattern quantitatively, continue with the Box Counter and compare a selected region across a visible scale ladder. To practice turning an observation into a concise explanation, use the guided self-similarity challenge in Discovery.',
      },
    ],
    type: 'website',
  },
  {
    path: '/workbench/discover',
    title: 'Discovery Feed and Shared Examples | Fractals Web',
    description: 'Browse fractal examples and evidence-led learning challenges for classrooms and research; bookmark a prompt, inspect method, and continue in the source tool.',
    fallback: 'Each challenge starts with a concrete visual task and asks learners to connect a conclusion to what they can actually see.',
    detail: 'Discovery is organized around reusable prompts instead of an unmoderated stream. A challenge identifies its audience, source module, success criteria, and evidence expectations so a student, teacher, or researcher can enter with a clear purpose and leave with a defensible next step.',
    type: 'website',
  },
  {
    path: '/workbench/discover/fractals-self-similarity',
    title: 'Self-Similarity Challenge | Fractals Web',
    description: 'Practice finding repeated structure at a new scale in Mandelbrot or Julia boundaries, then name the region, point to evidence, and explain it cautiously.',
    fallback: 'Name the region you explored, point to a repeated feature, and distinguish the observation from any broader interpretation.',
    detail: 'Open the fractal studio, select Mandelbrot or Julia, and zoom toward a boundary feature that appears again at a different scale. Record where you looked and describe only what the image supports; apparent repetition is an observation to explain, not a substitute for a formal proof.',
    type: 'article',
  },
  {
    path: '/workbench/discover/compare-evidence-story',
    title: 'Visual Evidence Challenge | Fractals Web',
    description: 'Use a guided image-comparison challenge to identify what changed, what stayed consistent, and which visible evidence supports a careful, qualified conclusion.',
    fallback: 'Reference both inputs, describe a meaningful difference in method or appearance, and tie the conclusion back to visible evidence.',
    detail: 'A strong comparison keeps the inputs and analysis settings legible. Describe the relevant similarity or difference, identify the evidence that bears on it, and state what the comparison cannot establish. This makes the final explanation easier for another person to inspect and challenge.',
    type: 'article',
  },
  {
    path: '/workbench/discover/box-count-methods',
    title: 'Box-Counting Methods Challenge | Fractals Web',
    description: 'Define an image region, inspect box-count fit quality, compare fractal-dimension estimates, and export a reproducible record for another learner or researcher.',
    fallback: 'A useful result includes the region of interest, scale ladder, fit-quality context, and enough settings for someone else to repeat the measurement.',
    detail: 'Run the same image region through an explicit scale ladder, inspect the occupied-box trend and its fit quality, then save the methods context with the estimate. Repeating the measurement under documented choices helps reveal whether a result is stable enough to discuss or needs further investigation.',
    type: 'article',
  },
  {
    path: '/workbench/discover/tumor-safety-audit',
    title: 'AI Claim Safety Challenge | Fractals Web',
    description: 'Review an AI image overlay with evidence-first, non-diagnostic language; separate visible observations from interpretation in this educational safety challenge.',
    fallback: 'This educational exercise separates visible overlay evidence from interpretation and does not diagnose, predict outcomes, or recommend treatment.',
    detail: 'Review what an overlay visibly marks and how confident the demonstration reports itself to be, then practice wording an observation without converting it into a clinical conclusion. The exercise is designed to teach claim boundaries: AI output and a morphology measurement can motivate research questions, not medical decisions.',
    type: 'article',
  },
  {
    path: '/workbench/box-count',
    title: 'Box Counter | Fractals Web',
    description: 'Estimate fractal dimension from an image region using repeatable box counting; inspect occupied boxes and fit quality, export a reproducible methods record.',
    fallback: 'Inspect the occupied-box trend and fit-quality evidence alongside the estimate; a single number without its method is not a complete result.',
    detail: 'Select a region of interest, apply box counting across visible scales, and review the fitted relationship before interpreting an estimated dimension. Exported context preserves the region, scale ladder, and quality indicators so a comparison can be repeated rather than relying on a number alone.',
    type: 'website',
  },
  {
    path: '/workbench/compare',
    title: 'Image Compare | Fractals Web',
    description: 'Compare matched images with the same preprocessing and box-count scales; inspect complexity differences, fit quality, limitations, and an evidence-led summary.',
    fallback: 'Use matched inputs and consistent settings, then report what the comparison supports as well as the limitations that keep it from overclaiming.',
    detail: 'Keep image preparation and measurement choices comparable before interpreting a difference. The comparison view brings fit-quality indicators and a concise evidence summary into the same workflow, helping users distinguish a measured contrast from a conclusion that needs more data or validation.',
    type: 'website',
  },
  {
    path: '/workbench/tumor-detection',
    title: 'Tumor Detection Evidence | Fractals Web',
    description: 'Explore AI localization alongside fractal-morphology measurements in a transparent biomedical research workflow; educational only, not a diagnostic tool.',
    fallback: 'The workflow presents a candidate complementary imaging feature for research. It is not clinically validated and must not be used for diagnosis, prognosis, or treatment decisions.',
    detail: 'Use the demonstration to inspect an AI candidate region separately from a morphology measurement and to discuss what a complementary feature could contribute to a future validation study. Results are educational and exploratory; they do not establish disease status, clinical performance, or patient-specific advice.',
    type: 'website',
  },
]

const renderPage = (template, page) => {
  const canonicalUrl = `${siteUrl}${page.path}`
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    url: canonicalUrl,
    description: page.description,
    inLanguage: 'en-US',
    isPartOf: { '@type': 'WebSite', name: siteName, url: siteUrl },
  })

  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${page.title}</title>`)
  html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/i, `$1${page.description}$2`)
  html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/i, `$1${page.title}$2`)
  html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/i, `$1${page.description}$2`)
  html = html.replace(/(<meta\s+property="og:type"\s+content=")[^"]*("\s*\/?>)/i, `$1${page.type}$2`)
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/?>)/i, `$1${canonicalUrl}$2`)
  html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/?>)/i, `$1${page.title}$2`)
  html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/i, `$1${page.description}$2`)
  html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]*("\s*\/?>)/i, `$1${image}$2`)
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script type="application/ld+json">${structuredData}</script>`)

  const heading = page.title.replace(` | ${siteName}`, '')
  const sections = (page.sections ?? []).map((section) => `<section><h2>${section.heading}</h2><p>${section.content}</p></section>`).join('')
  const fallback = `<main aria-labelledby="seo-fallback-title"><h1 id="seo-fallback-title">${heading}</h1><p>${page.description}</p><p>${page.fallback}</p><p>${page.detail}</p>${sections}<p>Fractals Web is free to explore in a browser. Keep the source image, settings, measurement quality, and limitations connected to any claim you share, so the work remains understandable and reproducible.</p><p><a href="${canonicalUrl}">Open ${heading}</a></p></main>`
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${fallback}</div>`)

  return html.replace('</head>', `    <link rel="canonical" href="${canonicalUrl}" />\n  </head>`)
}

const distDir = resolve(process.cwd(), 'dist')
const template = await readFile(resolve(distDir, 'index.html'), 'utf8')

await Promise.all(pages.map(async (page) => {
  const target = resolve(distDir, page.path.slice(1), 'index.html')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, renderPage(template, page), 'utf8')
}))

console.log(`Pre-rendered route metadata for ${pages.length} public pages`)
