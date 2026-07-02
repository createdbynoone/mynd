import { useState, useEffect } from 'react'
import type { VaultState } from '../types'

interface Props {
  onVaultReady: (vault: VaultState) => void
}

export default function WelcomeScreen({ onVaultReady }: Props) {
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursorOn, setCursorOn] = useState(true)
  const [version, setVersion] = useState('')

  useEffect(() => { window.canvas.app.getVersion().then(setVersion) }, [])
  useEffect(() => {
    const t = setInterval(() => setCursorOn(v => !v), 530)
    return () => clearInterval(t)
  }, [])

  async function handleCreate() {
    setError(null)
    const path = await window.canvas.vault.openDialog()
    if (!path) return
    setLoading(true)
    try {
      const { vaultName } = await window.canvas.vault.create(path)
      onVaultReady({ path, name: vaultName })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleOpen() {
    setError(null)
    const path = await window.canvas.vault.openDialog()
    if (!path) return
    setLoading(true)
    try {
      const res = await window.canvas.vault.open(path)
      if (!res.valid) {
        setError('ERR: Not a valid MYND vault. Use INIT to create one.')
        return
      }
      onVaultReady({ path, name: res.vaultName ?? 'My MYND' })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="drag-region w-full h-full flex flex-col items-center justify-center bg-bg relative overflow-hidden">

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(249,69,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(249,69,0,0.025) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-px pointer-events-none z-10"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(249,69,0,0.12) 20%, rgba(249,69,0,0.35) 50%, rgba(249,69,0,0.12) 80%, transparent)', animation: 'h-scan 6s linear infinite' }}
      />

      {/* Corner brackets */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-accent/20" />
      <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-accent/20" />
      <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-accent/20" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-accent/20" />

      {/* Corner annotations */}
      <span className="absolute top-10 left-12 font-mono text-[8px] text-accent/20 tracking-widest mt-1">NO VAULT</span>
      {version && (
        <span className="absolute top-10 right-12 font-mono text-[8px] text-accent/20 tracking-widest mt-1">v{version}</span>
      )}
      <span className="absolute bottom-10 left-12 font-mono text-[8px] text-accent/20 tracking-widest mb-1">MYND_OS</span>
      <span className="absolute bottom-10 right-12 font-mono text-[8px] text-accent/20 tracking-widest mb-1 text-right">INIT:REQUIRED</span>

      <div className="no-drag flex flex-col gap-8 max-w-sm w-full px-8 relative z-10">

        {/* Logo block */}
        <div className="flex flex-col gap-2">
          <div
            className="font-display text-[70px] leading-none text-accent tracking-widest"
            style={{ textShadow: '0 0 25px rgba(249,69,0,0.45), 0 0 60px rgba(249,69,0,0.12)' }}
          >
            MYND
          </div>
          <div className="font-mono text-[10px] text-text-secondary tracking-[0.38em] uppercase">
            PERSONAL MIND VAULT<span style={{ opacity: cursorOn ? 1 : 0 }} className="text-accent">_</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-[9px] text-text-muted tracking-[0.35em]">SELECT OPERATION</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="group w-full flex items-center gap-3 px-5 py-4 border border-accent text-accent font-mono text-[11px] tracking-[0.25em] uppercase hover:bg-accent/[0.08] active:scale-[0.99] transition-all disabled:opacity-40"
            style={{ boxShadow: '0 0 16px rgba(249,69,0,0.1), inset 0 0 16px rgba(249,69,0,0.02)' }}
          >
            <span className="text-accent/50 group-hover:text-accent transition-colors font-display text-[18px] leading-none">+</span>
            <div className="flex flex-col gap-0.5 text-left">
              <span>INIT NEW VAULT</span>
              <span className="font-mono text-[9px] text-accent/40 tracking-widest normal-case">Create a new memory vault</span>
            </div>
          </button>

          <button
            onClick={handleOpen}
            disabled={loading}
            className="group w-full flex items-center gap-3 px-5 py-4 border border-border text-text-secondary font-mono text-[11px] tracking-[0.25em] uppercase hover:border-accent/30 hover:text-text-primary active:scale-[0.99] transition-all disabled:opacity-40"
          >
            <span className="text-text-muted group-hover:text-accent transition-colors font-mono text-[14px] leading-none">{'>'}</span>
            <div className="flex flex-col gap-0.5 text-left">
              <span>LOAD EXISTING</span>
              <span className="font-mono text-[9px] text-text-muted tracking-widest normal-case">Open an existing vault folder</span>
            </div>
          </button>
        </div>

        {error && (
          <div className="border border-danger/30 px-4 py-2.5 bg-danger/5">
            <p className="font-mono text-[10px] text-danger tracking-wide">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 border border-accent border-t-transparent animate-spin" style={{ boxShadow: '0 0 6px rgba(249,69,0,0.3)' }} />
            <span className="font-mono text-[10px] text-text-muted tracking-widest">PROCESSING...</span>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-4">
          <p className="font-mono text-[9px] text-text-muted leading-relaxed tracking-wide">
            // LOCAL STORAGE — NO CLOUD — NO SYNC<br />
            // BOARDS SAVED AS JSON FILES ON DISK
          </p>
        </div>
      </div>
    </div>
  )
}
