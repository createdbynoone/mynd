import type { BackgroundType } from '../types'
import { Icon } from './icons'

type Tool = 'select' | 'pan'

const CANVAS_BG_PRESETS = [
  { value: '#23003F', label: 'Indigo' },
  { value: '#17002B', label: 'Deep' },
  { value: '#2D0050', label: 'Purple' },
  { value: '#1A001A', label: 'Void' },
  { value: '#0A0020', label: 'Abyss' },
]

const BG_OPTIONS: { value: BackgroundType; label: string }[] = [
  { value: 'dots',  label: '·' },
  { value: 'lines', label: '╌' },
  { value: 'cross', label: '+' },
  { value: 'none',  label: '○' },
]

interface Props {
  tool: Tool
  background: BackgroundType
  bgColor: string
  onToolChange: (t: Tool) => void
  onBackgroundChange: (b: BackgroundType) => void
  onBgColorChange: (c: string) => void
  onAddTitle: () => void
  onAddNote: () => void
  onAddText: () => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onExportPdf: () => void
  exporting: boolean
}

export default function Toolbar({
  tool, background, bgColor,
  onToolChange, onBackgroundChange, onBgColorChange,
  onAddTitle, onAddNote, onAddText,
  zoom, onZoomIn, onZoomOut, onZoomFit,
  onExportPdf, exporting,
}: Props) {
  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-surface border border-border px-2 py-1.5 no-drag"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 1px rgba(249,69,0,0.12)' }}
    >
      {/* [ TOOL ] */}
      <Label>TOOL</Label>
      <ToolBtn active={tool === 'select'} onClick={() => onToolChange('select')} title="Select (V)">
        <Icon.Select size={13} color={tool === 'select' ? '#F94500' : undefined} />
      </ToolBtn>
      <ToolBtn active={tool === 'pan'} onClick={() => onToolChange('pan')} title="Pan (H)">
        <Icon.Pan size={13} color={tool === 'pan' ? '#F94500' : undefined} />
      </ToolBtn>

      <Divider />

      {/* [ ADD ] */}
      <Label>ADD</Label>
      <ToolBtn onClick={onAddTitle} title="Add Title (T)">
        <Icon.Title size={13} />
      </ToolBtn>
      <ToolBtn onClick={onAddNote} title="Add Note (N)">
        <Icon.Note size={13} />
      </ToolBtn>
      <ToolBtn onClick={onAddText} title="Add Text Block">
        <Icon.Text size={13} />
      </ToolBtn>

      <Divider />

      {/* [ GRID ] */}
      <Label>GRID</Label>
      <div className="flex gap-0.5">
        {BG_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onBackgroundChange(opt.value)}
            title={`Grid: ${opt.value}`}
            className={`w-7 h-7 text-sm flex items-center justify-center transition-colors font-mono ${
              background === opt.value
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'text-text-primary/60 hover:text-text-primary hover:bg-white/[0.05]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Divider />

      {/* [ BG ] canvas color */}
      <Label>BG</Label>
      <div className="flex items-center gap-1">
        {CANVAS_BG_PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => onBgColorChange(p.value)}
            title={p.label}
            className="w-5 h-5 border transition-all hover:scale-110 active:scale-95"
            style={{
              backgroundColor: p.value,
              borderColor: bgColor === p.value ? '#F94500' : '#4A1878',
              boxShadow: bgColor === p.value ? '0 0 6px rgba(249,69,0,0.5)' : 'none',
            }}
          />
        ))}
        {/* Custom color picker */}
        <label className="relative w-5 h-5 border border-border hover:border-accent/30 cursor-pointer transition-colors flex items-center justify-center" title="Custom color">
          <input
            type="color"
            value={bgColor}
            onChange={e => onBgColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <Icon.Plus size={9} strokeWidth={2.5} className="text-text-primary/60" />
        </label>
      </div>

      <Divider />

      {/* [ ZOOM ] */}
      <Label>ZOOM</Label>
      <ToolBtn onClick={onZoomOut} title="Zoom out (-)">
        <Icon.ZoomOut size={11} />
      </ToolBtn>
      <button
        onClick={onZoomFit}
        className="px-1.5 h-7 font-mono text-[11px] text-text-primary/70 hover:text-accent transition-colors min-w-[42px] text-center tabular-nums tracking-wide"
        title="Fit view (F)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolBtn onClick={onZoomIn} title="Zoom in (+)">
        <Icon.ZoomIn size={11} />
      </ToolBtn>

      <Divider />

      {/* [ EXPORT ] */}
      <Label>EXPORT</Label>
      <button
        onClick={onExportPdf}
        disabled={exporting}
        title="Export board as PDF (⌘E)"
        className={`h-7 px-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] transition-colors ${
          exporting
            ? 'text-accent cursor-wait'
            : 'text-text-primary/60 hover:text-accent hover:bg-accent/[0.06]'
        }`}
      >
        {exporting ? <Icon.Spinner size={12} /> : <Icon.Export size={12} />}
        PDF
      </button>
    </div>
  )
}

function ToolBtn({ children, active, onClick, title }: {
  children: React.ReactNode; active?: boolean; onClick: () => void; title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center transition-colors ${
        active ? 'bg-accent/10 text-accent' : 'text-text-primary/60 hover:text-text-primary hover:bg-white/[0.05]'
      }`}
      style={active ? { boxShadow: 'inset 0 0 0 1px rgba(249,69,0,0.2)' } : undefined}
    >
      {children}
    </button>
  )
}

function Divider() { return <div className="w-px h-5 bg-border mx-1" /> }

function Label({ children }: { children: string }) {
  return <span className="font-mono text-[9px] text-text-primary/45 tracking-[0.2em] px-1 select-none">{children}</span>
}
