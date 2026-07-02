import { useState, useEffect, useCallback } from 'react'
import type { AppScreen, BoardMeta, VaultState } from './types'
import WelcomeScreen from './components/WelcomeScreen'
import BootScreen from './components/BootScreen'
import Sidebar from './components/Sidebar'
import BoardCanvas from './components/BoardCanvas'
import TitleBar from './components/TitleBar'
import UpdateBar from './components/UpdateBar'
import MediaLightbox, { type LightboxState } from './components/MediaLightbox'
import SettingsPanel from './components/SettingsPanel'

export default function App() {
  const [screen, setScreen]     = useState<AppScreen>('loading')
  const [vault, setVault]       = useState<VaultState | null>(null)
  const [boards, setBoards]     = useState<BoardMeta[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)
  const [exportSignal, setExportSignal] = useState(0)

  useEffect(() => {
    function onPreview(e: Event) {
      setLightbox((e as CustomEvent<LightboxState>).detail)
    }
    window.addEventListener('canvas:preview', onPreview)
    return () => window.removeEventListener('canvas:preview', onPreview)
  }, [])

  useEffect(() => {
    window.canvas.vault.initFromPrefs().then(async res => {
      if (res.valid && res.vaultPath && res.vaultName) {
        setVault({ path: res.vaultPath, name: res.vaultName })
        await loadBoards(res.lastBoardId)
        setScreen('boot')
      } else {
        setScreen('welcome')
      }
    })
  }, [])

  const loadBoards = useCallback(async (openId?: string | null) => {
    const list = await window.canvas.boards.list()
    setBoards(list)
    if (openId && list.find(b => b.id === openId)) {
      setActiveBoardId(openId)
    } else if (list.length > 0) {
      setActiveBoardId(list[0].id)
    }
  }, [])

  const onVaultReady = useCallback(async (vaultState: VaultState) => {
    setVault(vaultState)
    await loadBoards()
    setScreen('app')
  }, [loadBoards])

  const onSelectBoard = useCallback((id: string) => {
    setActiveBoardId(id)
    window.canvas.boards.setLast(id)
  }, [])

  const onCreateBoard = useCallback(async () => {
    const name = `Board ${boards.length + 1}`
    const board = await window.canvas.boards.create(name)
    setBoards(prev => [{ id: board.id, name: board.name, createdAt: board.createdAt, updatedAt: board.updatedAt, nodeCount: 0 }, ...prev])
    setActiveBoardId(board.id)
  }, [boards.length])

  const onDeleteBoard = useCallback(async (id: string) => {
    await window.canvas.boards.delete(id)
    setBoards(prev => {
      const next = prev.filter(b => b.id !== id)
      if (activeBoardId === id) {
        setActiveBoardId(next[0]?.id ?? null)
      }
      return next
    })
  }, [activeBoardId])

  const onRenameBoard = useCallback(async (id: string, name: string) => {
    await window.canvas.boards.rename(id, name)
    setBoards(prev => prev.map(b => b.id === id ? { ...b, name } : b))
  }, [])

  const onBoardMetaChange = useCallback((id: string, nodeCount: number) => {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, nodeCount } : b))
  }, [])

  // Exportar PDF desde el sidebar: activa el board (si no lo está) y dispara la señal
  const onExportBoard = useCallback((id: string) => {
    setActiveBoardId(prev => {
      if (prev !== id) window.canvas.boards.setLast(id)
      return id
    })
    setExportSignal(Date.now())
  }, [])

  const onExportHandled = useCallback(() => setExportSignal(0), [])

  if (screen === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-4 h-4 border border-accent border-t-transparent animate-spin" style={{ boxShadow: '0 0 8px rgba(249,69,0,0.4)' }} />
          <span className="font-mono text-[11px] text-text-muted tracking-widest">LOADING...</span>
        </div>
      </div>
    )
  }

  if (screen === 'welcome') {
    return <WelcomeScreen onVaultReady={onVaultReady} />
  }

  if (screen === 'boot' && vault) {
    return (
      <BootScreen
        vault={vault}
        boardCount={boards.length}
        onEnter={() => setScreen('app')}
      />
    )
  }

  const activeBoard = boards.find(b => b.id === activeBoardId)

  return (
    <>
    <MediaLightbox state={lightbox} onClose={() => setLightbox(null)} />
    <div className="w-full h-full flex flex-col">
      <TitleBar
        vaultName={vault?.name ?? 'MYND'}
        boardName={activeBoard?.name}
        nodeCount={activeBoard?.nodeCount}
      />
      <UpdateBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          boards={boards}
          activeBoardId={activeBoardId}
          onSelect={onSelectBoard}
          onCreate={onCreateBoard}
          onDelete={onDeleteBoard}
          onRename={onRenameBoard}
          onExport={onExportBoard}
        />
        <div className="flex-1 relative overflow-hidden">
          <SettingsPanel />
          {activeBoardId ? (
            <BoardCanvas
              key={activeBoardId}
              boardId={activeBoardId}
              onMetaChange={onBoardMetaChange}
              exportSignal={exportSignal}
              onExportHandled={onExportHandled}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-text-secondary">
              <div className="font-mono text-[11px] tracking-[0.3em] text-text-muted">NO BOARD ACTIVE</div>
              <div className="w-16 h-px bg-border" />
              <button
                onClick={onCreateBoard}
                className="no-drag font-mono text-[11px] tracking-widest uppercase px-5 py-2 border border-accent text-accent hover:bg-accent/10 transition-colors"
                style={{ boxShadow: '0 0 8px rgba(249,69,0,0.15)' }}
              >
                + INIT BOARD
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
