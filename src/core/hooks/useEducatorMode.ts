import { useEffect, useState } from 'react'

const EDUCATOR_MODE_KEY = 'fractals-workbench-educator-mode'

const readInitialEducatorMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  const url = new URL(window.location.href)
  const classroom = url.searchParams.get('classroom')
  if (classroom === '1' || classroom === 'true') {
    return true
  }

  try {
    return window.localStorage.getItem(EDUCATOR_MODE_KEY) === '1'
  } catch {
    return false
  }
}

export function useEducatorMode() {
  const [educatorMode, setEducatorMode] = useState(readInitialEducatorMode)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(EDUCATOR_MODE_KEY, educatorMode ? '1' : '0')
      const url = new URL(window.location.href)
      if (educatorMode) {
        url.searchParams.set('classroom', '1')
      } else {
        url.searchParams.delete('classroom')
      }
      window.history.replaceState({}, '', url)
    } catch {
      // Ignore persistence issues.
    }
  }, [educatorMode])

  return { educatorMode, setEducatorMode }
}

