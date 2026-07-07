import { contextBridge, ipcRenderer, webUtils } from 'electron'

const { port: mediaPort, token: mediaToken }: { port: number; token: string } = ipcRenderer.sendSync('media-server-info')
console.log(`[preload] mediaPort=${mediaPort}`)

contextBridge.exposeInMainWorld('canvas', {
  vault: {
    initFromPrefs:  ()                          => ipcRenderer.invoke('vault:init-from-prefs'),
    openDialog:     ()                          => ipcRenderer.invoke('vault:open-dialog'),
    create:         (path: string)              => ipcRenderer.invoke('vault:create', path),
    open:           (path: string)              => ipcRenderer.invoke('vault:open', path),
    getPath:        ()                          => ipcRenderer.invoke('vault:get-path'),
  },
  boards: {
    list:           ()                          => ipcRenderer.invoke('boards:list'),
    load:           (id: string)                => ipcRenderer.invoke('boards:load', id),
    save:           (board: unknown)            => ipcRenderer.invoke('boards:save', board),
    create:         (name: string)              => ipcRenderer.invoke('boards:create', name),
    delete:         (id: string)                => ipcRenderer.invoke('boards:delete', id),
    rename:         (id: string, name: string)  => ipcRenderer.invoke('boards:rename', { id, name }),
    setLast:        (id: string)                => ipcRenderer.invoke('boards:set-last', id),
  },
  files: {
    import:         (path: string)              => ipcRenderer.invoke('files:import', path),
    importBuffer:   (name: string, data: Uint8Array) => ipcRenderer.invoke('files:import-buffer', { name, data }),
    // Electron ≥32 eliminó File.path — esta es la única vía para obtener la ruta de un drop
    pathForFile:    (file: File)                => { try { return webUtils.getPathForFile(file) } catch { return '' } },
    openExternal:   (rel: string)               => ipcRenderer.invoke('files:open-external', rel),
    showInFinder:   (rel: string)               => ipcRenderer.invoke('files:show-in-finder', rel),
    exportPdf:      (fileName: string, data: Uint8Array) => ipcRenderer.invoke('files:export-pdf', { fileName, data }),
    localUrl:       (rel: string)               => {
      const encoded = rel.split('/').map(encodeURIComponent).join('/')
      return `http://127.0.0.1:${mediaPort}/${encoded}?t=${mediaToken}`
    },
  },
  app: {
    getVersion:     ()                          => ipcRenderer.invoke('get-version'),
    checkForUpdates:()                          => ipcRenderer.invoke('update:check'),
    onUpdateStatus: (cb: (s: unknown) => void)  => {
      ipcRenderer.on('update-status', (_e, s) => cb(s))
      return () => ipcRenderer.removeAllListeners('update-status')
    },
  },
})
