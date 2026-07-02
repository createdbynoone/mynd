import { useState, useEffect } from 'react'
import type { UpdateStatus } from '../types'

export default function UpdateBar() {
  const [status, setStatus] = useState<UpdateStatus>({ phase: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const off = window.canvas.app.onUpdateStatus(s => {
      setStatus(s as UpdateStatus)
      setDismissed(false)
    })
    return off
  }, [])

  if (status.phase === 'idle' || dismissed) return null

  return (
    <div className="no-drag flex items-center gap-3 px-4 py-1.5 bg-surface border-b border-border font-mono text-[10px] text-text-secondary tracking-wide">

      {status.phase === 'available' && (
        <>
          <span className="text-accent text-glow">↓</span>
          <span>DOWNLOADING UPDATE v{(status as { version: string }).version}...</span>
          <button onClick={() => setDismissed(true)} className="ml-auto text-text-muted hover:text-text-secondary">✕</button>
        </>
      )}

      {status.phase === 'downloading' && (
        <>
          <div className="w-24 h-1 bg-border overflow-hidden flex-shrink-0">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${(status as { pct: number }).pct}%`, background: '#F94500', boxShadow: '0 0 6px rgba(249,69,0,0.5)' }}
            />
          </div>
          <span className="tabular-nums">{(status as { pct: number }).pct}%</span>
        </>
      )}

      {status.phase === 'installing' && (
        <span>INSTALLING... APP WILL RESTART</span>
      )}

      {status.phase === 'ready' && (
        <span className="text-accent">UPDATE INSTALLED. RESTARTING...</span>
      )}

      {status.phase === 'error' && (
        <>
          <span className="text-danger">ERR: {(status as { message: string }).message}</span>
          <button onClick={() => setDismissed(true)} className="ml-auto text-text-muted hover:text-text-secondary">✕</button>
        </>
      )}

    </div>
  )
}
