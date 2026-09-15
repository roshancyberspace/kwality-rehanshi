import { useEffect } from 'react'

let openModalsCount = 0
let originalOverflow = ''
let originalHtmlOverflow = ''
let originalPaddingRight = ''

export const lockBodyScroll = () => {
  if (typeof document === 'undefined') return
  openModalsCount += 1
  if (openModalsCount === 1) {
    originalOverflow = document.body.style.overflow
    originalHtmlOverflow = document.documentElement.style.overflow
    originalPaddingRight = document.body.style.paddingRight
    
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    document.documentElement.classList.add('modal-open')
    
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }
  }
}

export const unlockBodyScroll = () => {
  if (typeof document === 'undefined') return
  openModalsCount = Math.max(0, openModalsCount - 1)
  if (openModalsCount === 0) {
    document.body.style.overflow = originalOverflow || ''
    document.documentElement.style.overflow = originalHtmlOverflow || ''
    document.body.style.paddingRight = originalPaddingRight || ''
    document.body.classList.remove('modal-open')
    document.documentElement.classList.remove('modal-open')
  }
}

export const useBodyScrollLock = (isLocked = true) => {
  useEffect(() => {
    if (!isLocked) return undefined
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [isLocked])
}
