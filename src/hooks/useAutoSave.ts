import { useRef, useEffect, useCallback } from 'react'
import type { SerializedBoard } from '../types'

type GetBoard = () => SerializedBoard | null

export function useAutoSave(getBoard: GetBoard, delay = 1500) {
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()
  const getBoardRef = useRef(getBoard)
  getBoardRef.current = getBoard

  const saveNow = useCallback(async () => {
    const board = getBoardRef.current()
    if (!board) return
    try { await window.canvas.boards.save(board) } catch { /* silent */ }
  }, [])

  const schedulesSave = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(saveNow, delay)
  }, [saveNow, delay])

  useEffect(() => {
    window.addEventListener('beforeunload', saveNow)
    return () => {
      clearTimeout(timerRef.current)
      window.removeEventListener('beforeunload', saveNow)
    }
  }, [saveNow])

  return { schedulesSave, saveNow }
}
