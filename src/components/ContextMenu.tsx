import { useEffect, useRef } from 'react'
import type { ContextMenuState } from '../types'
import { Icon } from './icons'

interface Props {
  menu: ContextMenuState
  onClose: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onEditLabel: (id: string) => void
  onBringToFront: (id: string) => void
  onSendToBack: (id: string) => void
  onOpenStyle: (id: string) => void
  onCopy: (id: string) => void
  onPaste: () => void
  onShowInFinder?: (id: string) => void
}

export default function ContextMenu({
  menu, onClose, onDelete, onDuplicate, onEditLabel, onBringToFront, onSendToBack,
  onOpenStyle, onCopy, onPaste, onShowInFinder,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const style: React.CSSProperties = {
    position: 'fixed',
    left: menu.x,
    top: menu.y,
    zIndex: 9999,
  }

  function item(icon: React.ReactNode, label: string, onClick: () => void, opts?: { danger?: boolean; kbd?: string }) {
    return (
      <button
        key={label}
        onClick={() => { onClick(); onClose() }}
        className={`w-full px-3 py-1.5 text-left font-mono text-[11px] tracking-wide transition-colors flex items-center gap-2 ${
          opts?.danger
            ? 'text-danger/70 hover:text-danger hover:bg-danger/10'
            : 'text-text-secondary hover:text-accent hover:bg-accent/[0.06]'
        }`}
      >
        <span className="flex-shrink-0 flex items-center opacity-80">{icon}</span>
        <span className="flex-1">{label}</span>
        {opts?.kbd && <span className="text-[9px] opacity-40 tabular-nums">{opts.kbd}</span>}
      </button>
    )
  }

  const isMedia = menu.nodeType === 'image' || menu.nodeType === 'video'

  return (
    <div
      ref={ref}
      style={style}
      className="bg-surface border border-border shadow-2xl py-1 min-w-[176px]"
    >
      {item(<Icon.Label size={12} />, 'EDIT LABEL', () => onEditLabel(menu.nodeId))}
      {item(<Icon.Style size={12} />, 'STYLE', () => onOpenStyle(menu.nodeId))}
      <div className="border-t border-border/50 my-1" />
      {item(<Icon.Copy size={12} />, 'COPY', () => onCopy(menu.nodeId), { kbd: '⌘C' })}
      {item(<Icon.Paste size={12} />, 'PASTE', () => onPaste(), { kbd: '⌘V' })}
      {item(<Icon.Duplicate size={12} />, 'DUPLICATE', () => onDuplicate(menu.nodeId), { kbd: '⌘D' })}
      <div className="border-t border-border/50 my-1" />
      {item(<Icon.Front size={12} />, 'BRING TO FRONT', () => onBringToFront(menu.nodeId))}
      {item(<Icon.Back size={12} />, 'SEND TO BACK', () => onSendToBack(menu.nodeId))}
      {isMedia && onShowInFinder && (
        <>
          <div className="border-t border-border/50 my-1" />
          {item(<Icon.Finder size={12} />, 'SHOW IN FINDER', () => onShowInFinder(menu.nodeId))}
        </>
      )}
      <div className="border-t border-border/50 my-1" />
      {item(<Icon.Trash size={12} />, 'DELETE', () => onDelete(menu.nodeId), { danger: true, kbd: '⌫' })}
    </div>
  )
}
