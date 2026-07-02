import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface LightboxState {
  url: string
  type: 'image' | 'video'
  fileName?: string
}

interface Props {
  state: LightboxState | null
  onClose: () => void
}

export default function MediaLightbox({ state, onClose }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!state) return
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [state, handleKey])

  if (!state) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-8 h-8 border border-border flex items-center justify-center font-mono text-text-muted hover:text-accent hover:border-accent/40 transition-all"
      >
        ✕
      </button>

      {/* Filename */}
      {state.fileName && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-text-muted tracking-[0.2em] uppercase">
          {state.fileName}
        </div>
      )}

      {/* Media */}
      <div
        className="max-w-[92vw] max-h-[88vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {state.type === 'image' ? (
          <img
            src={state.url}
            alt={state.fileName ?? ''}
            className="max-w-full max-h-[88vh] object-contain shadow-2xl"
            draggable={false}
            style={{ border: '1px solid rgba(249,69,0,0.1)' }}
          />
        ) : (
          <video
            src={state.url}
            controls
            autoPlay
            className="max-w-full max-h-[88vh] shadow-2xl"
          />
        )}
      </div>
    </div>,
    document.body
  )
}
