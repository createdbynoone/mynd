import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Menu, net } from 'electron'
import { join, sep } from 'path'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync,
  unlinkSync, createWriteStream, renameSync, statSync, createReadStream,
} from 'fs'
import { createHash, randomUUID } from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { homedir } from 'os'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater
const execFileAsync = promisify(execFile)

// ─── Icon styles ──────────────────────────────────────────────────────────────
const ICON_STYLES = ['Default', 'Dark', 'ClearLight', 'ClearDark', 'TintedLight', 'TintedDark'] as const
type IconStyle = typeof ICON_STYLES[number]

function getIconPath(style: string): string {
  const file = `Icon-macOS-${style}-1024@1x.png`
  if (app.isPackaged) return join(process.resourcesPath, 'icons', file)
  return join(__dirname, '../../build/icons', file)
}

function applyDockIcon(style: string): void {
  if (process.platform !== 'darwin') return
  try {
    const icon = nativeImage.createFromPath(getIconPath(style))
    if (!icon.isEmpty()) app.dock.setIcon(icon)
  } catch { /* ignore */ }
}

function buildAppMenu(): void {
  const prefs = loadPrefs()
  const iconSubmenu: Electron.MenuItemConstructorOptions[] = ICON_STYLES.map(style => ({
    label: style,
    type: 'radio' as const,
    checked: (prefs.iconStyle as string) === style,
    click: () => {
      savePrefs({ ...loadPrefs(), iconStyle: style as IconStyle })
      applyDockIcon(style)
      buildAppMenu()
    },
  }))

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'App Icon', submenu: iconSubmenu },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PREFS_FILE      = 'mynd-prefs.json'
const VAULT_MANIFEST  = 'vault.json'
const BOARDS_DIR      = 'boards'
const BOARDS_INDEX    = 'boards/index.json'
const ATTACHMENTS_DIR = 'attachments'

// ─── MIME / node-type maps ────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  pdf: 'application/pdf',
  txt: 'text/plain', md: 'text/markdown',
}
const NODE_TYPE_MAP: Record<string, string> = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image',
  'image/webp': 'image', 'image/svg+xml': 'image',
  'video/mp4': 'video', 'video/quicktime': 'video', 'video/webm': 'video',
  'video/x-matroska': 'video', 'video/x-msvideo': 'video',
  'application/pdf': 'pdf',
  'text/plain': 'text', 'text/markdown': 'text',
}

function getMime(ext: string): string {
  return MIME[ext.toLowerCase()] ?? 'application/octet-stream'
}
function getNodeType(mime: string): string {
  return NODE_TYPE_MAP[mime] ?? 'file'
}

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null
let vaultPath: string | null = null
let mediaServerPort = 0
let mediaServer: Server | null = null
// Token por sesión: solo el renderer (que lo recibe via preload) puede pedir archivos
const MEDIA_TOKEN = randomUUID()

// Los ids de board se usan en rutas de archivo — solo UUIDs válidos
const SAFE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function assertSafeId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !SAFE_ID.test(id)) throw new Error('Invalid board id')
}

function startMediaServer(): Promise<void> {
  return new Promise<void>((resolve) => {
    mediaServer = createServer((req, res) => {
      if (!vaultPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
        res.end('No vault')
        return
      }

      try {
        const url  = new URL(req.url!, 'http://localhost')

        if (url.searchParams.get('t') !== MEDIA_TOKEN) {
          res.writeHead(403, { 'Access-Control-Allow-Origin': '*' })
          res.end('Forbidden')
          return
        }

        const rel  = decodeURIComponent(url.pathname.slice(1))
        const abs  = join(vaultPath, rel)

        if (rel.includes('..') || !abs.startsWith(vaultPath + sep)) {
          res.writeHead(403, { 'Access-Control-Allow-Origin': '*' })
          res.end()
          return
        }
        if (!existsSync(abs)) {
          res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
          res.end('Not found')
          return
        }

        const stat  = statSync(abs)
        if (stat.isDirectory()) {
          res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
          res.end('Not a file')
          return
        }
        const total = stat.size
        const mime  = getMime((abs.split('.').pop() ?? '').toLowerCase())
        const cors  = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        }

        function pipeWithErrorHandler(stream: ReturnType<typeof createReadStream>) {
          stream.on('error', (err: NodeJS.ErrnoException) => {
            process.stderr.write(`[media-server] stream error: ${err.message}\n`)
            if (!res.headersSent) {
              res.writeHead(500, { 'Access-Control-Allow-Origin': '*' })
              res.end('Stream error')
            } else {
              res.destroy()
            }
          })
          stream.pipe(res)
        }

        const rangeHeader = req.headers.range
        if (rangeHeader) {
          const [, s = '0', e = ''] = rangeHeader.match(/bytes=(\d*)-(\d*)/) ?? []
          const start     = parseInt(s, 10) || 0
          const end       = e ? parseInt(e, 10) : total - 1
          const chunkSize = end - start + 1
          res.writeHead(206, {
            ...cors,
            'Content-Range':  `bytes ${start}-${end}/${total}`,
            'Content-Length': chunkSize,
            'Content-Type':   mime,
            'Accept-Ranges':  'bytes',
          })
          pipeWithErrorHandler(createReadStream(abs, { start, end }))
        } else {
          res.writeHead(200, {
            ...cors,
            'Content-Length': total,
            'Content-Type':   mime,
            'Accept-Ranges':  'bytes',
          })
          pipeWithErrorHandler(createReadStream(abs))
        }
      } catch (err) {
        process.stderr.write(`[media-server] handler error: ${err}\n`)
        if (!res.headersSent) {
          res.writeHead(500, { 'Access-Control-Allow-Origin': '*' })
          res.end('Error')
        }
      }
    })

    mediaServer.on('error', (err) => {
      process.stderr.write(`[media-server] listen error: ${err.message}\n`)
      resolve()
    })
    mediaServer.listen(0, '127.0.0.1', () => {
      mediaServerPort = (mediaServer!.address() as AddressInfo).port
      process.stdout.write(`[media-server] listening on port ${mediaServerPort}\n`)
      resolve()
    })
  })
}

// ─── Prefs ────────────────────────────────────────────────────────────────────
interface Prefs {
  vaultPath: string | null
  lastBoardId: string | null
  iconStyle?: IconStyle
  windowBounds?: { x: number; y: number; width: number; height: number }
}

function prefsFilePath(): string {
  return join(app.getPath('userData'), PREFS_FILE)
}
function loadPrefs(): Prefs {
  try {
    if (existsSync(prefsFilePath())) {
      return JSON.parse(readFileSync(prefsFilePath(), 'utf-8'))
    }
  } catch { /* empty */ }
  return { vaultPath: null, lastBoardId: null }
}
function savePrefs(prefs: Prefs): void {
  writeFileSync(prefsFilePath(), JSON.stringify(prefs, null, 2))
}

// ─── Vault helpers ────────────────────────────────────────────────────────────
function vaultFile(rel: string): string {
  return join(vaultPath!, rel)
}

function initVaultDirs(path: string): void {
  for (const dir of [path, join(path, BOARDS_DIR), join(path, ATTACHMENTS_DIR)]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  const mf = join(path, VAULT_MANIFEST)
  if (!existsSync(mf)) {
    writeFileSync(mf, JSON.stringify({ version: '1.0', name: 'My MYND', createdAt: new Date().toISOString() }, null, 2))
  }
  const idx = join(path, BOARDS_INDEX)
  if (!existsSync(idx)) {
    writeFileSync(idx, JSON.stringify({ boards: [] }, null, 2))
  }
}

function isValidVault(path: string): boolean {
  return existsSync(join(path, VAULT_MANIFEST))
}

function getVaultMeta(path: string): { name: string } {
  try {
    return JSON.parse(readFileSync(join(path, VAULT_MANIFEST), 'utf-8'))
  } catch {
    return { name: 'My MYND' }
  }
}

// ─── Board index helpers ──────────────────────────────────────────────────────
interface BoardMeta {
  id: string; name: string; createdAt: string; updatedAt: string; nodeCount: number
}
interface BoardIndex { boards: BoardMeta[] }

function loadBoardIndex(): BoardIndex {
  try {
    return JSON.parse(readFileSync(vaultFile(BOARDS_INDEX), 'utf-8'))
  } catch {
    return { boards: [] }
  }
}
function saveBoardIndex(idx: BoardIndex): void {
  writeFileSync(vaultFile(BOARDS_INDEX), JSON.stringify(idx, null, 2))
}

// ─── File import ──────────────────────────────────────────────────────────────
interface ImportResult {
  relativePath: string; fileName: string; mimeType: string; fileSize: number;
  nodeType: string; content?: string; thumbnailRelPath?: string
}

async function generateVideoThumbnail(videoAbsPath: string, thumbAbsPath: string): Promise<boolean> {
  if (existsSync(thumbAbsPath)) return true
  const dir  = thumbAbsPath.split('/').slice(0, -1).join('/')
  const base = videoAbsPath.split('/').pop()!
  try {
    await execFileAsync('qlmanage', ['-t', '-s', '600', '-o', dir, videoAbsPath], { timeout: 8000 })
    const qlOut = join(dir, base + '.png')
    if (existsSync(qlOut)) { renameSync(qlOut, thumbAbsPath); return true }
  } catch { /* qlmanage failed or timed out */ }
  return false
}

async function importFileToVault(sourcePath: string): Promise<ImportResult> {
  if (!vaultPath) throw new Error('No vault open')
  if (!existsSync(sourcePath)) throw new Error('File not found')

  const buffer = readFileSync(sourcePath)
  const hash   = createHash('sha256').update(buffer).digest('hex').slice(0, 16)
  const ext    = (sourcePath.split('.').pop() ?? 'bin').toLowerCase()
  const stored = `${hash}.${ext}`
  const dest   = join(vaultPath, ATTACHMENTS_DIR, stored)

  if (!existsSync(dest)) writeFileSync(dest, buffer)

  const originalName = sourcePath.split('/').pop() ?? stored
  const mimeType     = getMime(ext)
  const nodeType     = getNodeType(mimeType)

  const result: ImportResult = {
    relativePath: `${ATTACHMENTS_DIR}/${stored}`,
    fileName: originalName,
    mimeType,
    fileSize: buffer.length,
    nodeType,
  }

  if (nodeType === 'text') {
    result.content = buffer.toString('utf-8').slice(0, 60000)
  }

  if (nodeType === 'video') {
    const thumbStored = `${hash}_thumb.png`
    const thumbAbs    = join(vaultPath, ATTACHMENTS_DIR, thumbStored)
    const ok = await generateVideoThumbnail(dest, thumbAbs)
    if (ok) result.thumbnailRelPath = `${ATTACHMENTS_DIR}/${thumbStored}`
  }

  return result
}

// ─── Auto-update ─────────────────────────────────────────────────────────────
function pushUpdate(status: unknown): void {
  mainWindow?.webContents.send('update-status', status)
}

async function downloadWithProgress(url: string, dest: string, onPct: (n: number) => void): Promise<void> {
  const response = await net.fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const total = parseInt(response.headers.get('content-length') ?? '0', 10)
  let received = 0
  await new Promise<void>((resolve, reject) => {
    const file = createWriteStream(dest)
    file.on('error', reject)
    file.on('finish', resolve)
    const reader = response.body!.getReader()
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { file.end(); break }
          file.write(Buffer.from(value))
          received += value.length
          if (total > 0) onPct(Math.round(received / total * 100))
        }
      } catch (err) { file.destroy(err as Error); reject(err) }
    }
    pump()
  })
}

async function installFromDmg(dmgPath: string): Promise<void> {
  const { stdout } = await execFileAsync('hdiutil', ['attach', dmgPath, '-nobrowse', '-plist'])
  const mountMatch = stdout.match(/<key>mount-point<\/key>\s*<string>([^<]+)<\/string>/)
  if (!mountMatch) throw new Error('DMG mount point not found')
  const mountPoint = mountMatch[1].trim()
  try {
    const appDir = readdirSync(mountPoint).find(f => f.endsWith('.app'))
    if (!appDir) throw new Error('No .app in DMG')
    await execFileAsync('ditto', [join(mountPoint, appDir), join('/Applications', appDir)])
    pushUpdate({ phase: 'ready', version: '' })
    setTimeout(() => { app.relaunch(); app.quit() }, 1500)
  } finally {
    execFileAsync('hdiutil', ['detach', mountPoint, '-quiet', '-force']).catch(() => {})
  }
}

function setupAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.logger = null

  let updating = false

  autoUpdater.on('update-available', async (info) => {
    if (updating) return
    updating = true

    pushUpdate({ phase: 'available', version: info.version })

    const arch     = process.arch === 'arm64' ? '-arm64' : ''
    const filename = `MYND-${info.version}${arch}.dmg`
    const dmgUrl   = `https://github.com/createdbynoone/mynd/releases/download/v${info.version}/${filename}`
    const dmgPath  = join(app.getPath('temp'), filename)

    try {
      await downloadWithProgress(dmgUrl, dmgPath, pct => pushUpdate({ phase: 'downloading', pct }))
      pushUpdate({ phase: 'installing' })
      await installFromDmg(dmgPath)
    } catch (err) {
      updating = false
      pushUpdate({ phase: 'error', message: String((err as Error).message ?? err) })
      const desktopPath = join(homedir(), 'Desktop', filename)
      try {
        await downloadWithProgress(dmgUrl, desktopPath, () => {})
        await shell.openPath(desktopPath)
      } catch { /* ignore */ }
    }
  })

  autoUpdater.on('error', err => pushUpdate({ phase: 'error', message: String(err?.message ?? err) }))

  mainWindow!.webContents.once('did-finish-load', () => {
    setTimeout(() => autoUpdater.checkForUpdates(), 3000)
  })
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow(): void {
  const prefs = loadPrefs()
  const b = prefs.windowBounds

  mainWindow = new BrowserWindow({
    width:  b?.width  ?? 1440,
    height: b?.height ?? 920,
    x: b?.x, y: b?.y,
    minWidth: 900, minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#23003F',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      zoomFactor: 1.43,
    },
  })

  mainWindow.on('close', () => {
    if (!mainWindow) return
    const bounds = mainWindow.getBounds()
    savePrefs({ ...loadPrefs(), windowBounds: bounds })
  })

  mainWindow.webContents.on('will-navigate', e => e.preventDefault())
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('console-message', (event) => {
    const { level, message } = event
    if (level === 'warning' || level === 'error' || message.includes('[VideoNode]') || message.includes('[preload]')) {
      process.stdout.write(`[renderer:${level}] ${message}\n`)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }

app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus() }
})

app.whenReady().then(async () => {
  await startMediaServer()

  ipcMain.on('media-server-info', (event) => { event.returnValue = { port: mediaServerPort, token: MEDIA_TOKEN } })

  buildAppMenu()
  applyDockIcon(loadPrefs().iconStyle ?? 'Default')
  createWindow()
  setupAutoUpdater()

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ─── IPC — Vault ─────────────────────────────────────────────────────────────
ipcMain.handle('vault:init-from-prefs', () => {
  const p = loadPrefs()
  if (p.vaultPath && isValidVault(p.vaultPath)) {
    vaultPath = p.vaultPath
    const { name } = getVaultMeta(p.vaultPath)
    return { valid: true, vaultPath: p.vaultPath, vaultName: name, lastBoardId: p.lastBoardId }
  }
  return { valid: false, vaultPath: null, vaultName: null, lastBoardId: null }
})

ipcMain.handle('vault:open-dialog', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Select MYND Vault Folder' })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle('vault:create', (_e, path: string) => {
  if (typeof path !== 'string' || path.includes('..')) throw new Error('Invalid path')
  initVaultDirs(path)
  vaultPath = path
  savePrefs({ ...loadPrefs(), vaultPath: path })
  return { vaultName: getVaultMeta(path).name }
})

ipcMain.handle('vault:open', (_e, path: string) => {
  if (typeof path !== 'string' || path.includes('..')) throw new Error('Invalid path')
  if (!isValidVault(path)) return { valid: false }
  vaultPath = path
  savePrefs({ ...loadPrefs(), vaultPath: path })
  return { valid: true, vaultName: getVaultMeta(path).name }
})

ipcMain.handle('vault:get-path', () => vaultPath ?? '')

// ─── IPC — Boards ─────────────────────────────────────────────────────────────
ipcMain.handle('boards:list', () => {
  if (!vaultPath) return []
  return loadBoardIndex().boards
})

ipcMain.handle('boards:load', (_e, id: string) => {
  if (!vaultPath) throw new Error('No vault')
  assertSafeId(id)
  const p = vaultFile(`${BOARDS_DIR}/${id}.json`)
  if (!existsSync(p)) throw new Error('Board not found: ' + id)
  return JSON.parse(readFileSync(p, 'utf-8'))
})

ipcMain.handle('boards:save', (_e, board: BoardMeta & Record<string, unknown>) => {
  if (!vaultPath) throw new Error('No vault')
  assertSafeId(board?.id)
  const p = vaultFile(`${BOARDS_DIR}/${board.id}.json`)
  let name = String(board.name ?? 'Untitled')
  if (existsSync(p)) {
    try { name = JSON.parse(readFileSync(p, 'utf-8')).name || name } catch {}
  }
  writeFileSync(p, JSON.stringify({ ...board, name }, null, 2))
  const idx = loadBoardIndex()
  const existingMeta = idx.boards.find(b => b.id === board.id)
  const meta: BoardMeta = {
    id: board.id,
    name: existingMeta?.name || name,
    createdAt: String(board.createdAt ?? new Date().toISOString()),
    updatedAt: String(board.updatedAt ?? new Date().toISOString()),
    nodeCount: Array.isArray(board.nodes) ? board.nodes.length : 0,
  }
  const i = idx.boards.findIndex(b => b.id === board.id)
  if (i >= 0) idx.boards[i] = meta; else idx.boards.push(meta)
  saveBoardIndex(idx)
})

ipcMain.handle('boards:create', (_e, name: string) => {
  if (!vaultPath) throw new Error('No vault')
  const id  = randomUUID()
  const now = new Date().toISOString()
  const board = { id, name, createdAt: now, updatedAt: now, nodeCount: 0, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, background: 'dots' }
  writeFileSync(vaultFile(`${BOARDS_DIR}/${id}.json`), JSON.stringify(board, null, 2))
  const idx = loadBoardIndex()
  idx.boards.unshift({ id, name, createdAt: now, updatedAt: now, nodeCount: 0 })
  saveBoardIndex(idx)
  savePrefs({ ...loadPrefs(), lastBoardId: id })
  return board
})

ipcMain.handle('boards:delete', (_e, id: string) => {
  if (!vaultPath) throw new Error('Invalid')
  assertSafeId(id)
  const p = vaultFile(`${BOARDS_DIR}/${id}.json`)
  if (existsSync(p)) unlinkSync(p)
  const idx = loadBoardIndex()
  idx.boards = idx.boards.filter(b => b.id !== id)
  saveBoardIndex(idx)
})

ipcMain.handle('boards:rename', (_e, { id, name }: { id: string; name: string }) => {
  if (!vaultPath) throw new Error('Invalid')
  assertSafeId(id)
  const p = vaultFile(`${BOARDS_DIR}/${id}.json`)
  if (existsSync(p)) {
    const board = JSON.parse(readFileSync(p, 'utf-8'))
    board.name = name; board.updatedAt = new Date().toISOString()
    writeFileSync(p, JSON.stringify(board, null, 2))
  }
  const idx = loadBoardIndex()
  const b = idx.boards.find(b => b.id === id)
  if (b) { b.name = name; b.updatedAt = new Date().toISOString() }
  saveBoardIndex(idx)
})

ipcMain.handle('boards:set-last', (_e, id: string) => {
  savePrefs({ ...loadPrefs(), lastBoardId: id })
})

// ─── IPC — Files ──────────────────────────────────────────────────────────────
ipcMain.handle('files:import', async (_e, sourcePath: string) => {
  if (typeof sourcePath !== 'string' || sourcePath.includes('..')) throw new Error('Invalid path')
  return importFileToVault(sourcePath)
})

ipcMain.handle('files:open-external', (_e, relativePath: string) => {
  if (!vaultPath || typeof relativePath !== 'string') throw new Error('Invalid')
  return shell.openPath(join(vaultPath, relativePath))
})

ipcMain.handle('files:show-in-finder', (_e, relativePath: string) => {
  if (!vaultPath || typeof relativePath !== 'string') throw new Error('Invalid')
  shell.showItemInFolder(join(vaultPath, relativePath))
})

ipcMain.handle('files:export-pdf', async (_e, { fileName, data }: { fileName: string; data: Uint8Array }) => {
  if (typeof fileName !== 'string' || !(data instanceof Uint8Array)) throw new Error('Invalid')
  const safeName = fileName.replace(/[/\\:]/g, '-')
  const r = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export Board as PDF',
    defaultPath: join(app.getPath('desktop'), safeName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (r.canceled || !r.filePath) return { saved: false }
  writeFileSync(r.filePath, Buffer.from(data))
  shell.showItemInFolder(r.filePath)
  return { saved: true, path: r.filePath }
})

// ─── IPC — App ────────────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('update:check', () => autoUpdater.checkForUpdates())
