// ─── Node styles ──────────────────────────────────────────────────────────────
export interface NodeStyle {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  opacity?: number
}

// ─── Node data shapes ─────────────────────────────────────────────────────────
export interface BaseNodeData extends Record<string, unknown> {
  label?: string
  nodeStyle?: NodeStyle
  locked?: boolean
}

export interface MediaNodeData extends BaseNodeData {
  filePath: string
  fileName: string
  mimeType: string
  fileSize: number
  thumbnailPath?: string
}

export interface TextNodeData extends BaseNodeData {
  content: string
}

export interface NoteNodeData extends BaseNodeData {
  content: string
  noteColor?: string
}

export interface TitleNodeData extends BaseNodeData {
  content: string
  fontSize?: number
}

export type AnyNodeData = MediaNodeData | TextNodeData | NoteNodeData | TitleNodeData

// ─── Board serialization ──────────────────────────────────────────────────────
export interface BoardMeta {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodeCount: number
}

export interface SerializedNode {
  id: string
  type: string
  position: { x: number; y: number }
  width?: number
  height?: number
  data: AnyNodeData
}

export interface SerializedEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  data?: {
    color?: string
    strokeWidth?: number
    animated?: boolean
  }
}

export type BackgroundType = 'dots' | 'lines' | 'cross' | 'none'

export interface SerializedBoard extends BoardMeta {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  viewport: { x: number; y: number; zoom: number }
  background: BackgroundType
  bgColor?: string
}

// ─── File import ──────────────────────────────────────────────────────────────
export interface ImportResult {
  relativePath: string
  fileName: string
  mimeType: string
  fileSize: number
  nodeType: string
  content?: string
  thumbnailRelPath?: string
}

// ─── Update ───────────────────────────────────────────────────────────────────
export type UpdateStatus =
  | { phase: 'idle' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; pct: number }
  | { phase: 'installing' }
  | { phase: 'ready'; version: string }
  | { phase: 'error'; message: string }

// ─── Canvas IPC API surface ───────────────────────────────────────────────────
export interface CanvasAPI {
  vault: {
    initFromPrefs(): Promise<{ valid: boolean; vaultPath: string | null; vaultName: string | null; lastBoardId: string | null }>
    openDialog(): Promise<string | null>
    create(path: string): Promise<{ vaultName: string }>
    open(path: string): Promise<{ valid: boolean; vaultName?: string }>
    getPath(): Promise<string>
  }
  boards: {
    list(): Promise<BoardMeta[]>
    load(id: string): Promise<SerializedBoard>
    save(board: SerializedBoard): Promise<void>
    create(name: string): Promise<SerializedBoard>
    delete(id: string): Promise<void>
    rename(id: string, name: string): Promise<void>
    setLast(id: string): Promise<void>
  }
  files: {
    import(path: string): Promise<ImportResult>
    importBuffer(name: string, data: Uint8Array): Promise<ImportResult>
    pathForFile(file: File): string
    openExternal(rel: string): Promise<void>
    showInFinder(rel: string): Promise<void>
    exportPdf(fileName: string, data: Uint8Array): Promise<{ saved: boolean; path?: string }>
    localUrl(rel: string): string
  }
  app: {
    getVersion(): Promise<string>
    checkForUpdates(): Promise<void>
    onUpdateStatus(cb: (s: UpdateStatus) => void): () => void
  }
}

// ─── Context menu ─────────────────────────────────────────────────────────────
export interface ContextMenuState {
  nodeId: string
  x: number
  y: number
  nodeType?: string
  filePath?: string
}

// ─── App vault state ──────────────────────────────────────────────────────────
export type AppScreen = 'loading' | 'welcome' | 'boot' | 'app'

export interface VaultState {
  path: string
  name: string
}
