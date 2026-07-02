import { useState, useEffect } from 'react'
import type { NodeStyle } from '../types'

interface Props {
  nodeId: string | null
  initialStyle?: NodeStyle
  nodeType?: string
  nodeLabel?: string
  noteColor?: string
  onClose: () => void
  onChange: (nodeId: string, style: Partial<NodeStyle>, label?: string, noteColor?: string) => void
}

const PRESETS = [
  { bg: '#310056', border: '#F94500', label: 'FIRE' },
  { bg: '#23003F', border: '#BCACCE', label: 'INDIGO' },
  { bg: '#17002B', border: '#FFFDB4', label: 'VOID' },
  { bg: '#3D0070', border: '#F94500', label: 'ULTRA' },
  { bg: '#23003F', border: '#4A1878', label: 'DARK' },
  { bg: 'transparent', border: '#4A1878', label: 'GHOST' },
]

const NOTE_COLORS = ['#F94500', '#FFFDB4', '#BCACCE', '#FF6B00', '#FFD700', '#9B59FF', '#FFFFFF']

export default function StylePanel({ nodeId, initialStyle, nodeType, nodeLabel, noteColor, onClose, onChange }: Props) {
  const [style, setStyle]   = useState<NodeStyle>(initialStyle ?? {})
  const [label, setLabel]   = useState(nodeLabel ?? '')
  const [nColor, setNColor] = useState(noteColor ?? '#F94500')

  useEffect(() => { setStyle(initialStyle ?? {}) }, [nodeId])
  useEffect(() => { setLabel(nodeLabel ?? '') }, [nodeLabel])
  useEffect(() => { setNColor(noteColor ?? '#F94500') }, [noteColor])

  if (!nodeId) return null

  function update(partial: Partial<NodeStyle>) {
    const next = { ...style, ...partial }
    setStyle(next)
    onChange(nodeId!, next, label, nColor)
  }

  function commitLabel() {
    onChange(nodeId!, style, label, nColor)
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    const next = { ...style, backgroundColor: preset.bg, borderColor: preset.border }
    setStyle(next)
    onChange(nodeId!, next, label, nColor)
  }

  return (
    <div
      className="absolute right-3 top-3 z-40 w-52 bg-surface border border-border shadow-2xl overflow-hidden"
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-mono text-[10px] text-text-primary/55 uppercase tracking-[0.25em]">// STYLE</span>
        <button onClick={onClose} className="font-mono text-[11px] text-text-primary/40 hover:text-accent transition-colors">✕</button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Label */}
        <div>
          <label className="font-mono text-[10px] text-text-primary/55 block mb-1 tracking-widest">LABEL</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => { if (e.key === 'Enter') commitLabel() }}
            placeholder="node label..."
            className="nodrag w-full px-2 py-1 bg-bg border border-border font-mono text-[12px] text-text-primary outline-none focus:border-accent/40 transition-colors placeholder-text-muted"
          />
        </div>

        {/* Presets */}
        <div>
          <label className="font-mono text-[10px] text-text-primary/55 block mb-1.5 tracking-widest">PRESETS</label>
          <div className="grid grid-cols-3 gap-1">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="h-7 border font-mono text-[10px] text-text-primary/55 hover:text-text-primary transition-colors tracking-wider"
                style={{ background: p.bg, borderColor: p.border }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note color */}
        {nodeType === 'note' && (
          <div>
            <label className="font-mono text-[10px] text-text-primary/55 block mb-1.5 tracking-widest">COLOR</label>
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setNColor(c); onChange(nodeId!, style, label, c) }}
                  className="w-5 h-5 border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: c === nColor ? '#FFFDB4' : 'transparent',
                    transform: c === nColor ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Background color */}
        <div className="flex items-center justify-between">
          <label className="font-mono text-[10px] text-text-primary/55 tracking-widest">BG</label>
          <input
            type="color"
            value={style.backgroundColor ?? '#310056'}
            onChange={e => update({ backgroundColor: e.target.value })}
            className="nodrag w-7 h-6 cursor-pointer border border-border bg-transparent"
          />
        </div>

        {/* Border color */}
        <div className="flex items-center justify-between">
          <label className="font-mono text-[10px] text-text-primary/55 tracking-widest">BORDER</label>
          <input
            type="color"
            value={style.borderColor ?? '#4A1878'}
            onChange={e => update({ borderColor: e.target.value })}
            className="nodrag w-7 h-6 cursor-pointer border border-border bg-transparent"
          />
        </div>

        {/* Border width */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-mono text-[10px] text-text-primary/55 tracking-widest">WIDTH</label>
            <span className="font-mono text-[10px] text-text-primary/75">{style.borderWidth ?? 1}px</span>
          </div>
          <input
            type="range" min={0} max={6} step={1}
            value={style.borderWidth ?? 1}
            onChange={e => update({ borderWidth: Number(e.target.value) })}
            className="nodrag w-full h-1"
            style={{ accentColor: '#F94500' }}
          />
        </div>

        {/* Border radius */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-mono text-[10px] text-text-primary/55 tracking-widest">RADIUS</label>
            <span className="font-mono text-[10px] text-text-primary/75">{style.borderRadius ?? 0}px</span>
          </div>
          <input
            type="range" min={0} max={32} step={2}
            value={style.borderRadius ?? 0}
            onChange={e => update({ borderRadius: Number(e.target.value) })}
            className="nodrag w-full h-1"
            style={{ accentColor: '#F94500' }}
          />
        </div>

        {/* Opacity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-mono text-[10px] text-text-primary/55 tracking-widest">OPACITY</label>
            <span className="font-mono text-[10px] text-text-primary/75">{Math.round((style.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range" min={0.1} max={1} step={0.05}
            value={style.opacity ?? 1}
            onChange={e => update({ opacity: Number(e.target.value) })}
            className="nodrag w-full h-1"
            style={{ accentColor: '#F94500' }}
          />
        </div>
      </div>
    </div>
  )
}
