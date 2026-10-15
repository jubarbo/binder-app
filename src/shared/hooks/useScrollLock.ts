import { useEffect } from 'react'

/**
 * Locks background scrolling while a modal is open. The body keeps its
 * scrollbar width as right padding so the layout does not shift when the
 * scrollbar disappears.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return

    const { body, documentElement } = document
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [active])
}
