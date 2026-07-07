import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  MiniMap, useNodesState, useEdgesState, useReactFlow, useViewport,
  addEdge,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange,
} from '@xyflow/react'
import type {
  SerializedBoard, SerializedNode, SerializedEdge,
  BackgroundType, AnyNodeData, NodeStyle, ContextMenuState,
} from '../types'
import { useAutoSave } from '../hooks/useAutoSave'
import { exportBoardToPdf } from '../lib/exportPdf'
import Toolbar from './Toolbar'
import ContextMenu from './ContextMenu'
import StylePanel from './StylePanel'
import ImageNode from './nodes/ImageNode'
import VideoNode from './nodes/VideoNode'
import PDFNode from './nodes/PDFNode'
import TextNode from './nodes/TextNode'
import NoteNode from './nodes/NoteNode'
import TitleNode from './nodes/TitleNode'
import CustomEdge from './edges/CustomEdge'
import AlignmentGuides, { type Guide } from './AlignmentGuides'

// ─── Module-level canvas clipboard ───────────────────────────────────────────
let canvasClipboard: { nodes: Node[]; edges: Edge[] } | null = null

function getMediaDimensions(nodeType: string, url: string): Promise<[number, number]> {
  const MAX = 480
  if (nodeType === 'image') {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const w = img.naturalWidth || 240, h = img.naturalHeight || 200
        const r = Math.min(MAX / w, MAX / h, 1)
        resolve([Math.round(w * r), Math.round(h * r)])
      }
      img.onerror = () => resolve([240, 200])
      img.src = url
    })
  }
  if (nodeType === 'video') {
    return new Promise(resolve => {
      const v = document.createElement('video')
      v.onloadedmetadata = () => {
        const w = v.videoWidth || 280, h = v.videoHeight || 200
        const r = Math.min(MAX / w, MAX / h, 1)
        resolve([Math.round(w * r), Math.round(h * r)])
      }
      v.onerror = () => resolve([280, 200])
      v.src = url; v.load()
    })
  }
  return Promise.resolve(DEFAULT_SIZES[nodeType] ?? [200, 160])
}

const NODE_TYPES = {
  image: ImageNode,
  video: VideoNode,
  pdf: PDFNode,
  text: TextNode,
  note: NoteNode,
  title: TitleNode,
}

const EDGE_TYPES = { default: CustomEdge }

const DEFAULT_SIZES: Record<string, [number, number]> = {
  image: [240, 200],
  video: [280, 200],
  pdf: [200, 220],
  text: [260, 180],
  note: [220, 180],
}

function toRFNode(sn: SerializedNode): Node {
  return { id: sn.id, type: sn.type, position: sn.position, data: sn.data, width: sn.width, height: sn.height }
}
function fromRFNode(n: Node): SerializedNode {
  return { id: n.id, type: n.type ?? 'note', position: n.position, data: n.data as AnyNodeData, width: n.width, height: n.height }
}
function toRFEdge(se: SerializedEdge): Edge {
  return {
    id: se.id, source: se.source, target: se.target,
    sourceHandle: se.sourceHandle, targetHandle: se.targetHandle,
    label: se.label,
    style: se.data?.color ? { stroke: se.data.color, strokeWidth: se.data.strokeWidth ?? 1.5 } : undefined,
    animated: se.data?.animated,
  }
}
function fromRFEdge(e: Edge): SerializedEdge {
  return {
    id: e.id, source: e.source, target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    label: e.label as string | undefined,
  }
}

function BoardCanvasInner({ boardId, onMetaChange, exportSignal, onExportHandled }: {
  boardId: string
  onMetaChange: (id: string, n: number) => void
  exportSignal?: number
  onExportHandled?: () => void
}) {
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, setViewport, getViewport } = useReactFlow()
  const { zoom } = useViewport()
  const [nodes, setNodes, applyNodesChanges] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [background, setBackground]   = useState<BackgroundType>('dots')
  const [bgColor, setBgColor]         = useState('#23003F')
  const [tool, setTool]               = useState<'select' | 'pan'>('select')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [stylePanelId, setStylePanelId] = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [dropping, setDropping]       = useState(false)
  const [guides, setGuides]           = useState<Guide[]>([])
  const [exporting, setExporting]     = useState(false)
  const [toast, setToast]             = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const historyRef     = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([])
  const historyIdxRef  = useRef(-1)
  const suppressHistory = useRef(false)
  const pendingSnapshot = useRef(false)

  const boardMetaRef = useRef<{ id: string; name: string; createdAt: string }>({ id: boardId, name: '', createdAt: '' })
  const nodesRef     = useRef(nodes);        nodesRef.current     = nodes
  const edgesRef     = useRef(edges);        edgesRef.current     = edges
  const bgRef        = useRef(background);   bgRef.current        = background
  const bgColorRef   = useRef(bgColor);      bgColorRef.current   = bgColor
  const getVpRef     = useRef(getViewport);  getVpRef.current     = getViewport

  useEffect(() => {
    setIsLoading(true)
    setContextMenu(null)
    setStylePanelId(null)
    historyRef.current = []
    historyIdxRef.current = -1
    window.canvas.boards.load(boardId).then(b => {
      boardMetaRef.current = { id: b.id, name: b.name, createdAt: b.createdAt }
      setNodes(b.nodes.map(toRFNode))
      setEdges(b.edges.map(toRFEdge))
      setBackground(b.background ?? 'dots')
      setBgColor(b.bgColor ?? '#23003F')
      setTimeout(() => {
        if (b.viewport && (b.viewport.zoom !== 1 || b.viewport.x !== 0 || b.viewport.y !== 0)) {
          setViewport(b.viewport)
        } else if (b.nodes.length > 0) {
          fitView({ padding: 0.2, duration: 0 })
        }
        setIsLoading(false)
      }, 100)
    }).catch(() => setIsLoading(false))
  }, [boardId])

  const getBoard = useCallback((): SerializedBoard | null => {
    const meta = boardMetaRef.current
    return {
      id: meta.id, name: meta.name, createdAt: meta.createdAt,
      updatedAt: new Date().toISOString(),
      nodeCount: nodesRef.current.length,
      nodes: nodesRef.current.map(fromRFNode),
      edges: edgesRef.current.map(fromRFEdge),
      viewport: getVpRef.current(),
      background: bgRef.current,
      bgColor: bgColorRef.current,
    }
  }, [])

  const { schedulesSave } = useAutoSave(getBoard)

  useEffect(() => {
    if (isLoading) return
    schedulesSave()
    onMetaChange(boardId, nodes.length)
  }, [nodes, edges, background, bgColor, isLoading])

  useEffect(() => {
    if (!isLoading) {
      historyRef.current = [{ nodes: [...nodesRef.current], edges: [...edgesRef.current] }]
      historyIdxRef.current = 0
    }
  }, [isLoading])

  useEffect(() => {
    if (!pendingSnapshot.current || suppressHistory.current || isLoading) return
    pendingSnapshot.current = false
    const entry = { nodes: [...nodesRef.current], edges: [...edgesRef.current] }
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
    historyRef.current.push(entry)
    if (historyRef.current.length > 80) historyRef.current.shift()
    else historyIdxRef.current++
  }, [nodes, edges, isLoading])

  const onConnect = useCallback((params: Connection) => {
    setEdges(es => addEdge(params, es))
    pendingSnapshot.current = true
  }, [])

  const onPaneClick = useCallback(() => { setContextMenu(null); setStylePanelId(null) }, [])

  const SNAP_T = 8
  const lastGuidesKey = useRef('')

  const wrappedOnEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (!suppressHistory.current && changes.some(c => c.type === 'remove')) {
      pendingSnapshot.current = true
    }
    onEdgesChange(changes)
  }, [onEdgesChange])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (!suppressHistory.current && changes.some(c => c.type === 'remove')) {
      pendingSnapshot.current = true
    }
    const modified = changes.map(change => {
      if (change.type !== 'position' || !change.position) return change

      if (!change.dragging) {
        if (lastGuidesKey.current !== '') { lastGuidesKey.current = ''; setGuides([]) }
        return change
      }

      const node = nodesRef.current.find(n => n.id === change.id)
      if (!node) return change

      const nw = node.width ?? 0, nh = node.height ?? 0
      const pos = change.position
      const nl = pos.x, nr = nl + nw, ncx = nl + nw / 2
      const nt = pos.y, nb = nt + nh, ncy = nt + nh / 2

      let snapX: number | null = null, snapY: number | null = null
      const newGuides: Guide[] = []

      for (const other of nodesRef.current) {
        if (other.id === change.id) continue
        const ow = other.width ?? 0, oh = other.height ?? 0
        const ol = other.position.x, or_ = ol + ow, ocx = ol + ow / 2
        const ot = other.position.y, ob = ot + oh, ocy = ot + oh / 2

        if (snapX === null) {
          if      (Math.abs(ncx - ocx) < SNAP_T) { snapX = ocx - nw / 2; newGuides.push({ type: 'v', pos: ocx }) }
          else if (Math.abs(nl  - ol)  < SNAP_T) { snapX = ol;            newGuides.push({ type: 'v', pos: ol }) }
          else if (Math.abs(nr  - or_) < SNAP_T) { snapX = or_ - nw;      newGuides.push({ type: 'v', pos: or_ }) }
          else if (Math.abs(nl  - or_) < SNAP_T) { snapX = or_;           newGuides.push({ type: 'v', pos: or_ }) }
          else if (Math.abs(nr  - ol)  < SNAP_T) { snapX = ol - nw;       newGuides.push({ type: 'v', pos: ol }) }
        }
        if (snapY === null) {
          if      (Math.abs(ncy - ocy) < SNAP_T) { snapY = ocy - nh / 2; newGuides.push({ type: 'h', pos: ocy }) }
          else if (Math.abs(nt  - ot)  < SNAP_T) { snapY = ot;            newGuides.push({ type: 'h', pos: ot }) }
          else if (Math.abs(nb  - ob)  < SNAP_T) { snapY = ob - nh;       newGuides.push({ type: 'h', pos: ob }) }
          else if (Math.abs(nt  - ob)  < SNAP_T) { snapY = ob;            newGuides.push({ type: 'h', pos: ob }) }
          else if (Math.abs(nb  - ot)  < SNAP_T) { snapY = ot - nh;       newGuides.push({ type: 'h', pos: ot }) }
        }
        if (snapX !== null && snapY !== null) break
      }

      const key = newGuides.map(g => `${g.type}${g.pos}`).join(',')
      if (key !== lastGuidesKey.current) { lastGuidesKey.current = key; setGuides(newGuides) }

      if (snapX === null && snapY === null) return change
      return { ...change, position: { x: snapX ?? pos.x, y: snapY ?? pos.y } }
    })

    applyNodesChanges(modified as NodeChange[])
  }, [applyNodesChanges])

  const onNodeDragStop = useCallback(() => {
    if (!suppressHistory.current) pendingSnapshot.current = true
  }, [])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    const data = node.data as any
    setContextMenu({
      nodeId: node.id,
      x: e.clientX,
      y: e.clientY,
      nodeType: node.type,
      filePath: data.filePath as string | undefined,
    })
  }, [])

  const handleDelete = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.source !== id && e.target !== id))
    pendingSnapshot.current = true
  }, [])

  const handleDuplicate = useCallback((id: string) => {
    setNodes(ns => {
      const node = ns.find(n => n.id === id)
      if (!node) return ns
      return [...ns, { ...node, id: crypto.randomUUID(), position: { x: node.position.x + 30, y: node.position.y + 30 }, selected: false, data: { ...node.data } }]
    })
    pendingSnapshot.current = true
  }, [])

  const handleBringToFront = useCallback((id: string) => {
    setNodes(ns => { const max = Math.max(0, ...ns.map(n => n.zIndex ?? 0)); return ns.map(n => n.id === id ? { ...n, zIndex: max + 1 } : n) })
  }, [])

  const handleSendToBack = useCallback((id: string) => {
    setNodes(ns => { const min = Math.min(0, ...ns.map(n => n.zIndex ?? 0)); return ns.map(n => n.id === id ? { ...n, zIndex: min - 1 } : n) })
  }, [])

  const handleStyleChange = useCallback((nodeId: string, style: Partial<NodeStyle>, label?: string, noteColor?: string) => {
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId) return n
      const d = { ...(n.data as AnyNodeData), nodeStyle: { ...(n.data as any).nodeStyle, ...style } }
      if (label !== undefined) d.label = label
      if (noteColor !== undefined) (d as any).noteColor = noteColor
      return { ...n, data: d }
    }))
    pendingSnapshot.current = true
  }, [])

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    const { nodes: n, edges: e } = historyRef.current[historyIdxRef.current]
    suppressHistory.current = true
    setNodes(n)
    setEdges(e)
    suppressHistory.current = false
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    const { nodes: n, edges: e } = historyRef.current[historyIdxRef.current]
    suppressHistory.current = true
    setNodes(n)
    setEdges(e)
    suppressHistory.current = false
  }, [setNodes, setEdges])

  const handleCopyNode = useCallback((id: string) => {
    const node = nodesRef.current.find(n => n.id === id)
    if (!node) return
    canvasClipboard = { nodes: [node], edges: [] }
  }, [])

  const doPaste = useCallback(() => {
    if (!canvasClipboard?.nodes.length) return
    const idMap = new Map<string, string>()
    canvasClipboard.nodes.forEach(n => idMap.set(n.id, crypto.randomUUID()))
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const xs = canvasClipboard.nodes.map(n => n.position.x)
    const ys = canvasClipboard.nodes.map(n => n.position.y)
    const ox = (Math.min(...xs) + Math.max(...xs)) / 2
    const oy = (Math.min(...ys) + Math.max(...ys)) / 2
    const newNodes = canvasClipboard.nodes.map(n => ({
      ...n,
      id: idMap.get(n.id)!,
      position: { x: center.x + (n.position.x - ox), y: center.y + (n.position.y - oy) },
      selected: true,
      data: { ...n.data },
    }))
    const newEdges = canvasClipboard.edges.map(ed => ({
      ...ed,
      id: crypto.randomUUID(),
      source: idMap.get(ed.source)!,
      target: idMap.get(ed.target)!,
    }))
    setNodes(ns => [...ns.map(n => ({ ...n, selected: false })), ...newNodes])
    if (newEdges.length) setEdges(es => [...es, ...newEdges])
    pendingSnapshot.current = true
  }, [screenToFlowPosition, setNodes, setEdges])

  const handleShowInFinder = useCallback((id: string) => {
    const node = nodesRef.current.find(n => n.id === id)
    if (!node) return
    const filePath = (node.data as any).filePath as string | undefined
    if (filePath) window.canvas.files.showInFinder(filePath)
  }, [])

  const addTitle = useCallback(() => {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setNodes(ns => [...ns, { id: crypto.randomUUID(), type: 'title', position: { x: pos.x - 200, y: pos.y - 40 }, data: { content: '', fontSize: 32 }, width: 400, height: 80 }])
    pendingSnapshot.current = true
  }, [screenToFlowPosition])

  const addNote = useCallback(() => {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setNodes(ns => [...ns, { id: crypto.randomUUID(), type: 'note', position: pos, data: { content: '', noteColor: '#F94500' }, width: 220, height: 180 }])
    pendingSnapshot.current = true
  }, [screenToFlowPosition])

  const addText = useCallback(() => {
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setNodes(ns => [...ns, { id: crypto.randomUUID(), type: 'text', position: pos, data: { content: '' }, width: 260, height: 180 }])
    pendingSnapshot.current = true
  }, [screenToFlowPosition])

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const exportingRef = useRef(false)
  const doExportPdf = useCallback(async () => {
    if (exportingRef.current) return
    exportingRef.current = true
    setExporting(true)
    try {
      const res = await exportBoardToPdf({
        nodes: nodesRef.current,
        boardName: boardMetaRef.current.name,
        bgColor: bgColorRef.current,
      })
      if (res === 'saved') showToast('PDF EXPORTED ✓')
      else if (res === 'empty') showToast('BOARD IS EMPTY')
    } catch {
      showToast('EXPORT FAILED')
    } finally {
      exportingRef.current = false
      setExporting(false)
    }
  }, [showToast])

  // Export solicitado desde el sidebar (App incrementa exportSignal)
  const lastSignalRef = useRef(0)
  useEffect(() => {
    if (!exportSignal || isLoading || exportSignal === lastSignalRef.current) return
    lastSignalRef.current = exportSignal
    onExportHandled?.()
    doExportPdf()
  }, [exportSignal, isLoading, doExportPdf, onExportHandled])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) redo(); else undo()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const selected = nodesRef.current.filter(n => n.selected)
        if (!selected.length) return
        const ids = new Set(selected.map(n => n.id))
        canvasClipboard = {
          nodes: selected,
          edges: edgesRef.current.filter(ed => ids.has(ed.source) && ids.has(ed.target)),
        }
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        doPaste()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        doExportPdf()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        const selected = nodesRef.current.filter(n => n.selected)
        if (!selected.length) return
        const dup = selected.map(n => ({
          ...n,
          id: crypto.randomUUID(),
          position: { x: n.position.x + 30, y: n.position.y + 30 },
          selected: true,
          data: { ...n.data },
        }))
        setNodes(ns => [...ns.map(n => ({ ...n, selected: false })), ...dup])
        pendingSnapshot.current = true
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        setNodes(ns => ns.map(n => ({ ...n, selected: true })))
        return
      }

      if (!e.metaKey && !e.ctrlKey) {
        if (e.key === 'v' || e.key === 'V') setTool('select')
        if (e.key === 'h' || e.key === 'H') setTool('pan')
        if (e.key === 't' || e.key === 'T') addTitle()
        if (e.key === 'n' || e.key === 'N') addNote()
        if (e.key === 'f' || e.key === 'F') fitView({ padding: 0.2, duration: 300 })
        if (e.key === '+' || e.key === '=') zoomIn({ duration: 200 })
        if (e.key === '-') zoomOut({ duration: 200 })
      }
      if (e.key === 'Escape') { setContextMenu(null); setStylePanelId(null) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fitView, zoomIn, zoomOut, addTitle, addNote, screenToFlowPosition, setNodes, setEdges, undo, redo, doPaste, doExportPdf])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDropping(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!wrapperRef.current?.contains(e.relatedTarget as Element)) setDropping(false)
  }, [])

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDropping(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    const basePos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const added: Node[] = []
    let failed = 0
    let offsetX = 0
    for (const file of files) {
      try {
        // Electron ≥32 ya no expone File.path: se resuelve via webUtils en preload.
        // Archivos sin ruta local (arrastrados desde navegador, etc.) se importan por buffer.
        const path = window.canvas.files.pathForFile(file)
        const imp = path
          ? await window.canvas.files.import(path)
          : await window.canvas.files.importBuffer(file.name || 'dropped-file', new Uint8Array(await file.arrayBuffer()))
        const url = window.canvas.files.localUrl(imp.relativePath)
        const [w, h] = await getMediaDimensions(imp.nodeType, url)
        added.push({
          id: crypto.randomUUID(),
          type: imp.nodeType,
          position: { x: basePos.x + offsetX, y: basePos.y },
          data: { filePath: imp.relativePath, fileName: imp.fileName, mimeType: imp.mimeType, fileSize: imp.fileSize, content: imp.content ?? '', thumbnailPath: imp.thumbnailRelPath } as AnyNodeData,
          width: w, height: h,
        })
        offsetX += w + 20
      } catch { failed++ }
    }
    if (added.length) {
      setNodes(ns => [...ns, ...added])
      pendingSnapshot.current = true
    }
    if (failed > 0) showToast(failed === files.length ? 'IMPORT FAILED' : `${failed} FILE${failed > 1 ? 'S' : ''} FAILED`)
  }, [screenToFlowPosition, showToast])

  const bgVariant = background === 'dots' ? BackgroundVariant.Dots
    : background === 'lines' ? BackgroundVariant.Lines
    : background === 'cross' ? BackgroundVariant.Cross
    : null

  const stylePanelNode = stylePanelId ? nodes.find(n => n.id === stylePanelId) : null
  const spData = stylePanelNode?.data as AnyNodeData | undefined

  return (
    <div ref={wrapperRef} className="relative w-full h-full" style={{ background: bgColor }}>
      {/* Drop overlay */}
      {dropping && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-3 border border-dashed border-accent/50 bg-accent/[0.03] flex flex-col items-center justify-center gap-3">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-accent">
              <path d="M16 4v16M8 12l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"/>
              <path d="M4 24h24" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
            </svg>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent" style={{ textShadow: '0 0 8px rgba(249,69,0,0.5)' }}>DROP TO ADD</span>
            <span className="font-mono text-[9px] text-accent/40 tracking-widest">IMG · VIDEO · PDF · TXT</span>
          </div>
        </div>
      )}

      <Toolbar
        tool={tool} background={background} bgColor={bgColor}
        onToolChange={setTool} onBackgroundChange={setBackground} onBgColorChange={setBgColor}
        onAddTitle={addTitle} onAddNote={addNote} onAddText={addText}
        zoom={zoom}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onZoomFit={() => fitView({ padding: 0.2, duration: 300 })}
        onExportPdf={doExportPdf}
        exporting={exporting}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-4 h-4 border border-accent border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty board hint */}
      {!isLoading && nodes.length === 0 && !dropping && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none gap-4">
          <span className="font-display text-[28px] text-text-primary/25 tracking-widest">EMPTY BOARD</span>
          <div className="flex flex-col items-center gap-1.5 font-mono text-[11px] text-text-secondary/50 tracking-[0.15em]">
            <span>DRAG &amp; DROP FILES — IMG · VIDEO · PDF · TXT</span>
            <span><Kbd>T</Kbd> TITLE &nbsp;·&nbsp; <Kbd>N</Kbd> NOTE &nbsp;·&nbsp; <Kbd>⌘E</Kbd> EXPORT PDF</span>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-up">
          <div
            className="bg-surface border border-accent/50 px-4 py-2 font-mono text-[11px] text-text-primary tracking-[0.2em]"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 10px rgba(249,69,0,0.15)' }}
          >
            {toast}
          </div>
        </div>
      )}

      {/* Exporting overlay */}
      {exporting && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="flex items-center gap-3 bg-surface border border-border px-5 py-3">
            <div className="w-3.5 h-3.5 border border-accent border-t-transparent animate-spin" />
            <span className="font-mono text-[11px] text-text-primary tracking-[0.2em]">RENDERING PDF...</span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={wrappedOnEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        panOnDrag={tool === 'pan' ? true : [1, 2]}
        selectionOnDrag={tool === 'select'}
        panOnScroll
        panOnScrollMode={'free' as any}
        zoomOnScroll={false}
        zoomOnPinch
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        defaultEdgeOptions={{ style: { stroke: '#4A1878', strokeWidth: 1.5 } }}
        connectionLineStyle={{ stroke: '#F94500', strokeWidth: 2, strokeDasharray: '6 3' }}
        connectionMode={'loose' as any}
        proOptions={{ hideAttribution: true }}
      >
        {bgVariant && <Background variant={bgVariant} color="#4A1878" gap={20} size={1.5} />}
        <AlignmentGuides guides={guides} />
        <MiniMap
          nodeColor="#4A1878"
          maskColor="rgba(35,0,63,0.75)"
          style={{ background: '#310056', border: '1px solid #4A1878', borderRadius: 0 }}
        />
      </ReactFlow>

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onEditLabel={id => { setStylePanelId(id); setContextMenu(null) }}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onOpenStyle={id => { setStylePanelId(id); setContextMenu(null) }}
          onCopy={handleCopyNode}
          onPaste={doPaste}
          onShowInFinder={handleShowInFinder}
        />
      )}

      {stylePanelId && spData && (
        <StylePanel
          nodeId={stylePanelId}
          initialStyle={spData.nodeStyle}
          nodeType={stylePanelNode?.type}
          nodeLabel={spData.label}
          noteColor={(spData as any).noteColor}
          onClose={() => setStylePanelId(null)}
          onChange={handleStyleChange}
        />
      )}
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-1.5 py-0.5 border border-border text-text-primary/60 text-[10px] leading-none align-middle">
      {children}
    </span>
  )
}

interface Props {
  boardId: string
  onMetaChange: (id: string, nodeCount: number) => void
  exportSignal?: number
  onExportHandled?: () => void
}

export default function BoardCanvas({ boardId, onMetaChange, exportSignal, onExportHandled }: Props) {
  return (
    <ReactFlowProvider>
      <BoardCanvasInner
        boardId={boardId}
        onMetaChange={onMetaChange}
        exportSignal={exportSignal}
        onExportHandled={onExportHandled}
      />
    </ReactFlowProvider>
  )
}
