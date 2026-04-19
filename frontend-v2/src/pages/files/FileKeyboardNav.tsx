import { useEffect } from 'react'

interface Props {
  fileIds: string[]
  focusedIndex: number
  onFocusChange: (index: number) => void
  onToggleSelect: (id: string) => void
}

/** Keyboard navigation hook rendered as a component (no visual output). */
export default function FileKeyboardNav({
  fileIds,
  focusedIndex,
  onFocusChange,
  onToggleSelect,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        onFocusChange(Math.min(focusedIndex + 1, fileIds.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        onFocusChange(Math.max(focusedIndex - 1, 0))
      } else if (e.key === ' ' && fileIds[focusedIndex]) {
        e.preventDefault()
        onToggleSelect(fileIds[focusedIndex])
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [fileIds, focusedIndex, onFocusChange, onToggleSelect])

  return null
}
