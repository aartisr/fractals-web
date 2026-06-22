import { useEffect, useState } from 'react'

export function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let active = true

    if (!file) {
      queueMicrotask(() => {
        if (active) {
          setUrl('')
        }
      })
      return () => {
        active = false
      }
    }

    const nextUrl = URL.createObjectURL(file)
    queueMicrotask(() => {
      if (active) {
        setUrl(nextUrl)
      }
    })

    return () => {
      active = false
      URL.revokeObjectURL(nextUrl)
    }
  }, [file])

  return url
}
