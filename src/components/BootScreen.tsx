import { useState, useEffect, useRef } from 'react'
import type { VaultState } from '../types'

interface Props {
  vault: VaultState
  boardCount: number
  onEnter: () => void
}

export default function BootScreen({ vault, boardCount, onEnter }: Props) {
  const [lines, setLines]     = useState<string[]>([])
  const [ready, setReady]     = useState(false)
  const [exiting, setExiting] = useState(false)
  const [cursorOn, setCursorOn] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setCursorOn(v => !v), 530)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let cancelled = false

    window.canvas.app.getVersion().then(v => {
      if (cancelled) return

      const sequence = [
        `MYND_OS v${v} — BOOT SEQUENCE INITIATED`,
        `SCANNING MEMORY VAULT...........................OK`,
        `VAULT: "${vault.name}"`,
        `BOARD INDEX: ${boardCount} ENTR${boardCount === 1 ? 'Y' : 'IES'} LOADED...............OK`,
        `RENDERER: ACTIVE`,
        `CANVAS ENGINE: READY`,
        `ALL SYSTEMS NOMINAL`,
      ]
      const delays = [260, 350, 220, 400, 240, 200, 320]
      let i = 0
      let timer: ReturnType<typeof setTimeout>

      function step() {
        if (cancelled) return
        if (i >= sequence.length) {
          timer = setTimeout(() => { if (!cancelled) setReady(true) }, 500)
          return
        }
        const line = sequence[i]
        if (line !== undefined) setLines(prev => [...prev, line])
        i++
        timer = setTimeout(step, delays[i - 1] ?? 260)
      }

      timer = setTimeout(step, 300)
    })

    return () => { cancelled = true }
  }, [])

  function handleEnter() {
    setExiting(true)
    setTimeout(onEnter, 450)
  }

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center bg-bg relative overflow-hidden transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(249,69,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(249,69,0,0.025) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-px pointer-events-none z-10"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(249,69,0,0.15) 20%, rgba(249,69,0,0.4) 50%, rgba(249,69,0,0.15) 80%, transparent)', animation: 'h-scan 5s linear infinite' }}
      />

      {/* Corner brackets */}
      <div className="absolute top-12 left-12 w-20 h-20 border-t-2 border-l-2 border-accent/25" />
      <div className="absolute top-12 right-12 w-20 h-20 border-t-2 border-r-2 border-accent/25" />
      <div className="absolute bottom-12 left-12 w-20 h-20 border-b-2 border-l-2 border-accent/25" />
      <div className="absolute bottom-12 right-12 w-20 h-20 border-b-2 border-r-2 border-accent/25" />

      <span className="absolute top-12 left-14 font-mono text-[8px] text-accent/20 tracking-widest mt-1">SYS::BOOT</span>
      <span className="absolute top-12 right-14 font-mono text-[8px] text-accent/20 tracking-widest mt-1 text-right">0xBBEF1F</span>
      <span className="absolute bottom-12 left-14 font-mono text-[8px] text-accent/20 tracking-widest mb-1">MYND_OS</span>
      <span className="absolute bottom-12 right-14 font-mono text-[8px] text-accent/20 tracking-widest mb-1 text-right">MEM::AUTH</span>

      <div className="no-drag relative z-10 w-full max-w-xl px-10 flex flex-col gap-7">
        {/* Logo */}
        <div className="flex flex-col gap-1.5">
          <div
            className="font-display text-[62px] leading-none text-accent tracking-widest"
            style={{ textShadow: '0 0 30px rgba(249,69,0,0.45), 0 0 70px rgba(249,69,0,0.12)' }}
          >
            MYND
          </div>
          <div className="font-mono text-[10px] text-text-secondary tracking-[0.4em] uppercase">
            PERSONAL MIND VAULT
          </div>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center">
          <div className="flex-1 h-px bg-border" />
          <div className="w-3 h-3 border border-border rotate-45 -mx-1.5 flex-shrink-0 bg-bg" />
        </div>

        {/* Boot log */}
        <div className="font-mono text-[11.5px] space-y-1.5 min-h-[154px]">
          {lines.map((line, i) => {
            if (!line) return null
            const hasOK   = line.endsWith('OK')
            const base    = hasOK ? line.slice(0, -2) : line
            const isLast  = i === lines.length - 1
            const isVault = line.startsWith('VAULT:')
            return (
              <div key={i} className="flex items-baseline gap-2 leading-snug animate-fade-up">
                <span className="text-accent/25 select-none flex-shrink-0">&gt;</span>
                <span className={hasOK || isVault ? 'text-text-primary' : isLast && !ready ? 'text-accent' : 'text-text-secondary'}>
                  {base}
                </span>
                {hasOK && <span className="text-accent font-bold">OK</span>}
              </div>
            )
          })}
          {!ready && lines.length > 0 && (
            <div className="flex items-center gap-2 h-5">
              <span className="text-accent/25">&gt;</span>
              <span className="text-accent" style={{ opacity: cursorOn ? 1 : 0 }}>_</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full flex items-center">
          <div className="flex-1 h-px bg-border" />
          <div className="w-3 h-3 border border-border rotate-45 -mx-1.5 flex-shrink-0 bg-bg" />
        </div>

        {/* Enter button */}
        <div className={`transition-all duration-500 ${ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
          <button
            onClick={handleEnter}
            className="group w-full flex items-center justify-center gap-4 px-8 py-4 border border-accent text-accent font-mono text-[12px] tracking-[0.35em] uppercase hover:bg-accent/[0.08] active:scale-[0.99] transition-all"
            style={{ boxShadow: '0 0 24px rgba(249,69,0,0.12), inset 0 0 24px rgba(249,69,0,0.03)' }}
          >
            <span className="text-accent/40 group-hover:text-accent transition-colors text-lg">[</span>
            ENTER SYSTEM
            <span className="text-accent/40 group-hover:text-accent transition-colors text-lg">]</span>
          </button>
        </div>
      </div>
    </div>
  )
}
