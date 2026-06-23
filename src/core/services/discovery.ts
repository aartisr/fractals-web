import { loadCollaborationModeration } from './collaboration.ts'
import { loadWorkbenchEvents, trackWorkbenchEvent, type WorkbenchResultCard } from './workbenchSharing.ts'

export type DiscoveryAudience = 'student' | 'educator' | 'researcher'

export type DiscoveryBookmarkKind = 'example' | 'challenge'

export type DiscoveryBookmark = {
  kind: DiscoveryBookmarkKind
  id: string
  title: string
  summary: string
  path: string
  tags: string[]
  savedAt: string
}

export type DiscoveryChallenge = {
  id: string
  title: string
  audience: DiscoveryAudience
  summary: string
  prompt: string
  successCriteria: string[]
  tags: string[]
  path: string
}

export type DiscoveryFeedItem =
  | {
      kind: 'example'
      id: string
      title: string
      summary: string
      detail: string
      path: string
      audience: DiscoveryAudience[]
      tags: string[]
      createdAt: string
      card: WorkbenchResultCard
    }
  | {
      kind: 'challenge'
      id: string
      title: string
      summary: string
      detail: string
      path: string
      audience: DiscoveryAudience[]
      tags: string[]
      createdAt: string
      challenge: DiscoveryChallenge
    }

export type DiscoveryAnalyticsSummary = {
  totalEvents: number
  moduleViews: Record<string, number>
  topEvents: Array<{ name: string; count: number }>
  exportEvents: number
  shareEvents: number
  bookmarkEvents: number
  challengeViews: number
  activeBookmarks: number
  exampleBookmarks: number
  challengeBookmarks: number
  moderationCounts: Record<'pending' | 'approved' | 'hidden', number>
}

const BOOKMARK_KEY = 'fractals-discovery-bookmarks'
const memoryStore = new Map<string, unknown>()

const DISCOVERY_MODERATORS_NOTE = 'Use approved items for public sharing and keep hidden items out of the open feed.'

export const DISCOVERY_CHALLENGES: DiscoveryChallenge[] = [
  {
    id: 'fractals-self-similarity',
    title: 'Find a self-similar detail',
    audience: 'student',
    summary: 'Zoom into a fractal boundary and explain where the same shape repeats at a new scale.',
    prompt: 'Start with Mandelbrot or Julia, find a feature that appears to repeat, and describe the evidence.',
    successCriteria: [
      'Name the region you explored',
      'Point to at least one repeated geometric feature',
      'Describe the evidence without overstating the conclusion',
    ],
    tags: ['fractals', 'zoom', 'pattern', 'student-friendly'],
    path: '/workbench/fractals',
  },
  {
    id: 'compare-evidence-story',
    title: 'Build a stronger evidence story',
    audience: 'educator',
    summary: 'Compare two artifacts and identify which one makes the clearest claim with the best evidence.',
    prompt: 'Use the compare module to explain what changed, what stayed the same, and which evidence is most convincing.',
    successCriteria: [
      'Reference both inputs',
      'Explain at least one difference in method or appearance',
      'Tie your conclusion back to visible evidence',
    ],
    tags: ['comparison', 'reasoning', 'classroom', 'rubric'],
    path: '/workbench/compare',
  },
  {
    id: 'box-count-methods',
    title: 'Measure a boundary twice',
    audience: 'researcher',
    summary: 'Record box-counting results, compare fit quality, and document how the estimate changes.',
    prompt: 'Run box counting with a clear ROI, then export the summary so someone else can reproduce it.',
    successCriteria: [
      'Document the ROI',
      'Capture fit quality or confidence',
      'Export a method snapshot with enough detail to repeat the run',
    ],
    tags: ['box-counting', 'dimension', 'reproducibility', 'methods'],
    path: '/workbench/box-count',
  },
  {
    id: 'tumor-safety-audit',
    title: 'Audit model claims for safety',
    audience: 'educator',
    summary: 'Inspect a detection output and keep the interpretation non-diagnostic and evidence-based.',
    prompt: 'Switch views, inspect confidence, and explain why the result should be framed cautiously.',
    successCriteria: [
      'Call out the visible overlay evidence',
      'Keep the language descriptive, not diagnostic',
      'Separate observation from interpretation',
    ],
    tags: ['safety', 'medical', 'moderation', 'trust'],
    path: '/workbench/tumor-detection',
  },
]

const safeWindow = () => (typeof window === 'undefined' ? null : window)

const readJson = <T>(key: string): T[] => {
  const win = safeWindow()
  if (!win) {
    const value = memoryStore.get(key)
    return Array.isArray(value) ? (value as T[]) : []
  }

  try {
    const raw = win.localStorage.getItem(key)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeJson = (key: string, value: unknown) => {
  const win = safeWindow()
  if (!win) {
    memoryStore.set(key, value)
    return
  }

  try {
    win.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage quota or privacy-mode failures.
  }
}

const countBy = (items: string[]) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1
    return acc
  }, {})

const uniqueBy = <T,>(items: T[], selector: (item: T) => string) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = selector(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export const loadDiscoveryBookmarks = () => readJson<DiscoveryBookmark>(BOOKMARK_KEY)

export const clearDiscoveryBookmarks = () => {
  const win = safeWindow()
  if (!win) {
    memoryStore.delete(BOOKMARK_KEY)
    return
  }

  try {
    win.localStorage.removeItem(BOOKMARK_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export const isDiscoveryBookmarked = (kind: DiscoveryBookmarkKind, id: string) =>
  loadDiscoveryBookmarks().some((bookmark) => bookmark.kind === kind && bookmark.id === id)

export const toggleDiscoveryBookmark = (
  input: Omit<DiscoveryBookmark, 'savedAt'>,
) => {
  const bookmarks = loadDiscoveryBookmarks()
  const existingIndex = bookmarks.findIndex((bookmark) => bookmark.kind === input.kind && bookmark.id === input.id)

  if (existingIndex >= 0) {
    const next = bookmarks.filter((bookmark) => !(bookmark.kind === input.kind && bookmark.id === input.id))
    writeJson(BOOKMARK_KEY, next)
    trackWorkbenchEvent('discovery_bookmark_removed', {
      kind: input.kind,
      id: input.id,
      title: input.title,
    })
    return { bookmarked: false, bookmarks: next }
  }

  const next = [
    {
      ...input,
      savedAt: new Date().toISOString(),
    },
    ...bookmarks,
  ]

  writeJson(BOOKMARK_KEY, next.slice(0, 100))
  trackWorkbenchEvent('discovery_bookmarked', {
    kind: input.kind,
    id: input.id,
    title: input.title,
  })
  return { bookmarked: true, bookmarks: next }
}

export const buildDiscoveryFeed = (cards: WorkbenchResultCard[]) => {
  const exampleItems: DiscoveryFeedItem[] = cards.map((card) => ({
    kind: 'example',
    id: card.id,
    title: card.title,
    summary: card.summary,
    detail: card.detail,
    path: card.sourcePath ?? '/workbench/fractals',
    audience: card.kind === 'tumor-detection' ? ['educator', 'researcher'] : ['student', 'educator', 'researcher'],
    tags: card.tags,
    createdAt: card.createdAt,
    card,
  }))

  const challengeItems: DiscoveryFeedItem[] = DISCOVERY_CHALLENGES.map((challenge, index) => ({
    kind: 'challenge',
    id: challenge.id,
    title: challenge.title,
    summary: challenge.summary,
    detail: challenge.prompt,
    path: challenge.path,
    audience: [challenge.audience],
    tags: challenge.tags,
    createdAt: new Date(Date.UTC(2026, 0, 1, 12, index, 0)).toISOString(),
    challenge,
  }))

  return [...exampleItems, ...challengeItems].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'example' ? -1 : 1
    }

    return right.createdAt.localeCompare(left.createdAt)
  })
}

export const buildDiscoveryAnalytics = (
  input: {
    cards: WorkbenchResultCard[]
    bookmarks: DiscoveryBookmark[]
  } = {
    cards: [],
    bookmarks: [],
  },
): DiscoveryAnalyticsSummary => {
  const events = loadWorkbenchEvents()
  const eventNames = events.map((event) => event.name)
  const moduleViews = countBy(
    events
      .filter((event) => event.name === 'module_viewed')
      .map((event) => String(event.payload?.module ?? event.payload?.path ?? 'unknown')),
  )

  const topEvents = Object.entries(countBy(eventNames))
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)

  const moderationCounts = input.cards.reduce<DiscoveryAnalyticsSummary['moderationCounts']>(
    (acc, card) => {
      const moderation = loadCollaborationModeration({
        kind: 'card',
        id: card.id,
        title: card.title,
        module: card.kind,
      })
      acc[moderation.status] += 1
      return acc
    },
    { pending: 0, approved: 0, hidden: 0 },
  )

  const challengeViews = events.filter((event) => event.name === 'discovery_challenge_opened').length
  const bookmarkEvents = events.filter((event) => event.name === 'discovery_bookmarked' || event.name === 'discovery_bookmark_removed').length
  const exportEvents = events.filter((event) => event.name.endsWith('_exported')).length
  const shareEvents = events.filter((event) => event.name.includes('shared') || event.name.includes('copied') || event.name.includes('saved')).length

  return {
    totalEvents: events.length,
    moduleViews,
    topEvents,
    exportEvents,
    shareEvents,
    bookmarkEvents,
    challengeViews,
    activeBookmarks: input.bookmarks.length,
    exampleBookmarks: input.bookmarks.filter((bookmark) => bookmark.kind === 'example').length,
    challengeBookmarks: input.bookmarks.filter((bookmark) => bookmark.kind === 'challenge').length,
    moderationCounts,
  }
}

export const buildDiscoveryFeedMarkdown = (items: DiscoveryFeedItem[]) =>
  [
    '# Fractals Web Discovery Feed',
    '',
    ...items.map((item) =>
      item.kind === 'example'
        ? `- Example: ${item.title} | ${item.summary} | ${item.tags.join(', ')}`
        : `- Challenge: ${item.title} | ${item.summary} | ${item.tags.join(', ')}`,
    ),
  ].join('\n')

export const buildChallengeMarkdown = (challenge: DiscoveryChallenge) =>
  [
    `# ${challenge.title}`,
    '',
    `Audience: ${challenge.audience}`,
    '',
    challenge.summary,
    '',
    challenge.prompt,
    '',
    'Success criteria:',
    ...challenge.successCriteria.map((criterion) => `- ${criterion}`),
    '',
    `Path: ${challenge.path}`,
    '',
    DISCOVERY_MODERATORS_NOTE,
  ].join('\n')

export const buildBookmarkLabel = (bookmark: DiscoveryBookmark) => `${bookmark.title} · ${bookmark.kind}`

export const uniqueDiscoveryBookmarks = (bookmarks: DiscoveryBookmark[]) => uniqueBy(bookmarks, (bookmark) => `${bookmark.kind}:${bookmark.id}`)
