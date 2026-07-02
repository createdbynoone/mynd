import { useState, useRef, useEffect } from 'react'
import type { BoardMeta } from '../types'
import { Icon } from './icons'

interface Props {
  boards: BoardMeta[]
  activeBoardId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onExport: (id: string) => void
}

interface CtxMenu { id: string; x: number; y: number }

export default function Sidebar({ boards, activeBoardId, onSelect, onCreate, onDelete, onRename, onExport }: Props) {
  const [search, setSearch]         = useState('')
  const [ctxMenu, setCtxMenu]       = useState<CtxMenu | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal]   = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (renamingId) renameRef.current?.select() }, [renamingId])
  useEffect(() => { setConfirmDelete(false) }, [ctxMenu?.id])

  const filtered = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  function openCtxMenu(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    setCtxMenu({ id, x: e.clientX, y: e.clientY })
    setConfirmDelete(false)
  }

  function closeCtxMenu() {
    setCtxMenu(null)
    setConfirmDelete(false)
  }

  function startRename(id: string, currentName: string) {
    closeCtxMenu(); setRenamingId(id); setRenameVal(currentName)
  }

  function commitRename(id: string) {
    const trimmed = renameVal.trim()
    if (trimmed) onRename(id, trimmed)
    setRenamingId(null)
  }

  return (
    <div
      className="w-56 h-full flex flex-col border-r border-border bg-surface flex-shrink-0 relative"
      onClick={closeCtxMenu}
    >
      {/* Corner brackets */}
      <div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-accent/15 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-accent/15 pointer-events-none" />

      {/* Section header */}
      <div className="px-3 pt-3 pb-2 border-b border-border flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-primary/50">[ BOARDS ]</span>
        <div className="flex-1 h-px bg-border" />
        <span className="font-mono text-[10px] text-text-primary/50 tabular-nums">{String(boards.length).padStart(2, '0')}</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-primary/40 select-none flex items-center">
            <Icon.Search size={11} />
          </span>
          <input
            type="text"
            placeholder="SEARCH"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="no-drag w-full pl-7 pr-2 py-1.5 bg-bg border border-border text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent/30 transition-colors font-mono tracking-[0.12em]"
          />
        </div>
      </div>

      {/* Board list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-4 py-6 font-mono text-[10px] text-text-primary/45 text-center tracking-widest">
            {search ? '// NO MATCH' : '// EMPTY'}
          </div>
        ) : (
          filtered.map((board, idx) => {
            const isActive = board.id === activeBoardId
            return (
              <div
                key={board.id}
                onClick={() => onSelect(board.id)}
                onContextMenu={e => openCtxMenu(e, board.id)}
                className={`group relative flex items-center cursor-pointer transition-all border-l-2 ${
                  isActive
                    ? 'bg-accent/[0.06] border-accent'
                    : 'hover:bg-white/[0.025] border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" style={{ boxShadow: '0 0 6px rgba(249,69,0,0.6)' }} />
                )}

                <div className="flex-1 flex items-center gap-0 px-3 py-2.5 min-w-0">
                  <span className={`font-mono text-[10px] tabular-nums flex-shrink-0 w-5 ${isActive ? 'text-accent/60' : 'text-text-primary/45'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className={`flex-shrink-0 w-4 flex items-center justify-center font-mono text-[8px] ${isActive ? 'text-accent' : 'text-transparent'}`}>■</span>

                  <div className="flex-1 min-w-0">
                    {renamingId === board.id ? (
                      <input
                        ref={renameRef}
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={() => commitRename(board.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename(board.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        onClick={e => e.stopPropagation()}
                        className="no-drag w-full bg-bg border border-accent/40 px-1.5 py-0.5 font-mono text-[11px] text-text-primary outline-none tracking-wide"
                      />
                    ) : (
                      <span
                        onDoubleClick={e => { e.stopPropagation(); startRename(board.id, board.name) }}
                        className={`font-mono text-[11px] tracking-[0.06em] truncate block ${isActive ? 'text-accent' : 'text-text-primary/80 group-hover:text-text-primary transition-colors'}`}
                      >
                        {board.name}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`font-mono text-[10px] tabular-nums flex-shrink-0 pr-3 ${isActive ? 'text-accent/50' : 'text-text-primary/45'}`}>
                  {board.nodeCount}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* New board */}
      <div className="border-t border-border p-2">
        <button
          onClick={onCreate}
          className="no-drag w-full flex items-center justify-center gap-2 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-text-primary/50 hover:text-accent hover:bg-accent/[0.05] transition-colors border border-transparent hover:border-accent/20"
        >
          <Icon.Plus size={11} />
          INIT NEW BOARD
        </button>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-surface border border-border py-1 min-w-[168px] shadow-2xl"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <CtxItem
            icon={<Icon.Rename size={12} />}
            label="RENAME"
            onClick={() => startRename(ctxMenu.id, boards.find(b => b.id === ctxMenu.id)?.name ?? '')}
          />
          <CtxItem
            icon={<Icon.Export size={12} />}
            label="EXPORT PDF"
            onClick={() => { onExport(ctxMenu.id); closeCtxMenu() }}
          />
          <div className="border-t border-border my-1" />
          {confirmDelete ? (
            <button
              onClick={() => { onDelete(ctxMenu.id); closeCtxMenu() }}
              className="w-full px-3 py-1.5 text-left font-mono text-[11px] flex items-center gap-2 text-danger bg-danger/10 hover:bg-danger/20 transition-colors tracking-widest"
            >
              <Icon.Warning size={12} />
              CONFIRM DELETE?
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full px-3 py-1.5 text-left font-mono text-[11px] flex items-center gap-2 text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors tracking-widest"
            >
              <Icon.Trash size={12} />
              DELETE
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CtxItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-1.5 text-left font-mono text-[11px] flex items-center gap-2 text-text-primary/70 hover:text-accent hover:bg-accent/[0.05] transition-colors tracking-widest"
    >
      {icon}
      {label}
    </button>
  )
}
