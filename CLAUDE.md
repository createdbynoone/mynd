# MYND — Claude Code Context

Electron mind map app macOS. Vault local (JSON), canvas ReactFlow, UI cyberpunk indigo.

## Dev
```bash
npm run dev        # dev con HMR
npm run build      # producción (electron-builder)
```

## Stack
- Electron + electron-vite | React 18 + TS | Tailwind v3 | @xyflow/react
- electron-builder | electron-updater custom (hdiutil+ditto+relaunch)

## Paleta (estricta — no cambiar sin instrucción explícita)
| Token | Hex | Uso |
|---|---|---|
| bg | `#23003F` | Fondo principal |
| surface | `#310056` | Panels, nodos |
| border | `#4A1878` | Bordes UI |
| accent | `#F94500` | Active, accent, bordes nodos |
| text-primary | `#FFFDB4` | Texto principal |
| text-secondary | `#BCACCE` | Texto secundario |

## Tipografías
- `font-display` (VT323) → logo MYND, títulos de nodos, contenido de notas
- `font-mono` (JetBrains Mono) → UI: toolbar, sidebar, labels

## Electron config (main.ts)
- Zoom adaptativo (v1.2.0): `applyAdaptiveZoom` — 1.43 en pantallas ≥1440pt, baja proporcional hasta 1.0 en ventanas angostas (diseño base ~1007px CSS); se aplica en did-finish-load y resize (debounce 120ms)
- `panOnScroll: true` + `zoomOnScroll: false` — dos dedos = pan, pinch = zoom
- `backgroundColor: '#23003F'`

## Import de archivos (v1.2.0)
- Drag & drop: `File.path` NO existe en Electron ≥32 — usar `window.canvas.files.pathForFile(file)` (webUtils en preload); si no hay ruta local (drop desde navegador), fallback `files:import-buffer` (cap 512MB)
- Formatos imagen: jpg/jpeg/jfif/png/gif/webp/svg/avif/bmp/ico + heic/heif/tif/tiff (estos 4 se convierten a PNG con `sips` al importar porque Chromium no los decodifica)
- Extensión desconocida → detección por magic bytes (`sniffImageExt`)
- ImageNode: 2 reintentos automáticos con cache-buster + placeholder "CLICK TO RETRY"

## UI responsive (v1.2.0)
- Toolbar: ResizeObserver sobre el canvas — oculta labels de sección bajo 900px, `max-w` + overflow-x-auto (`.no-scrollbar`) como último recurso
- TitleBar: nombre de board centrado con `max-w-[min(220px,24vw)]`

## Íconos Dock
- Dev: `applyDockIcon()` en whenReady() carga `build/icons/Icon-macOS-Default-1024@1x.png`
- Producción: `build/icon.icns`
- Para actualizar pack: copiar a `build/icons/Icon-macOS-{style}-1024@1x.png` y regenerar `icon.icns` con sips+iconutil

## Estructura vault
```
vault/
  vault.json          # metadata: name, version
  boards/
    index.json        # BoardMeta[]
    {uuid}.json       # SerializedBoard (nodes, edges, viewport, bgColor)
  attachments/        # {sha256hash}.{ext}
```

## Nodos disponibles
`title` | `note` | `text` | `image` | `video` | `pdf`

## Export PDF (por board)
- `src/lib/exportPdf.ts` — html-to-image (toPng del `.react-flow__viewport`) + jsPDF (página = tamaño imagen, px_scaling)
- IPC `files:export-pdf` en main: save dialog (default Desktop) + reveal en Finder
- Triggers: botón EXPORT/PDF en toolbar, ⌘E, o menú contextual del sidebar (via `exportSignal` prop en BoardCanvas)
- CSP: connect-src incluye fonts.googleapis/gstatic para que html-to-image embeba VT323

## Íconos UI
- `src/components/icons.tsx` — set compartido stroke 24x24 (`<Icon.Select/>`, `Icon.Export`, etc.). Usar siempre este set, no SVGs inline nuevos.

## Seguridad (v1.1.0 + v1.2.0)
- v1.2.0: `resolveInVault()` anti-traversal en files:open-external/show-in-finder; Range inválido → 416; import-buffer valida tipo/tamaño y sanitiza nombre
- Media server: token por sesión (`?t=UUID`) obligatorio + chequeo path-traversal con separador; 403 sin token
- IPC boards: ids validados contra regex UUID estricto (`assertSafeId`) antes de tocar rutas
- `setWindowOpenHandler` deny + `will-navigate` prevented
- Sin secretos en código; GH_TOKEN solo por env en publish.sh
- Electron 43 (vulns runtime resueltas); `uuid` npm eliminado → `crypto.randomUUID`
- npm audit restante: solo tooling de build (esbuild/vite dev server, tar en electron-builder) — no se distribuye
- Media server escucha solo en 127.0.0.1 — no accesible desde otras máquinas/IPs

## Distribución (app sin firmar)
- Build sin firma de código Apple Developer (`0 valid identities found`) — igual que el resto de apps del usuario
- DMG descargado desde GitHub queda en cuarentena de macOS → Gatekeeper bloquea apertura a terceros ("no se puede abrir" / "está dañado", mensaje engañoso)
- Workaround gratis: click derecho → Abrir, o Ajustes → Privacidad y Seguridad → "Abrir de todas formas", o `xattr -cr /Applications/MYND.app`
- Solución real pendiente: firmar + notarizar con Apple Developer Program ($99/año)

## Release
- Repo: `createdbynoone/mynd` (público — requerido para auto-update sin token)
- `GH_TOKEN=$(gh auth token) bash scripts/publish.sh` — builds arm64+x64, sube dmg/zip/blockmaps/latest-mac.yml

## Atajos de teclado
V select · H pan · T título · N nota · F fit · +/- zoom · ⌘E export PDF · ⌘C/⌘V copy/paste · ⌘D duplicar · ⌘A select all · ⌘Z/⇧⌘Z undo/redo

## Reglas de desarrollo
- Siempre usar los colores de la paleta exacta (no inventar intermedios)
- Nodos de texto/nota: fondo `#310056`, borde `#F94500` 2px, font VT323, texto `#FFFDB4`
- No agregar scanlines ni overlays CSS globales (se ven sobre imágenes)
- Para íconos nuevos: siempre matar la app y reiniciar para que el Dock refresque
