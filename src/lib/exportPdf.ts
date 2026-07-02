import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react'

export type ExportResult = 'saved' | 'canceled' | 'empty'

// Lado máximo del PNG intermedio: mantiene nitidez sin explotar memoria
const MAX_SIDE = 4096
const PADDING = 0.06

export async function exportBoardToPdf(opts: {
  nodes: Node[]
  boardName: string
  bgColor: string
}): Promise<ExportResult> {
  const { nodes, boardName, bgColor } = opts
  if (!nodes.length) return 'empty'

  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!viewportEl) throw new Error('Canvas not ready')

  const bounds = getNodesBounds(nodes)
  const scale = Math.max(0.4, Math.min(2, MAX_SIDE / bounds.width, MAX_SIDE / bounds.height))
  const width  = Math.round(bounds.width  * scale * (1 + PADDING * 2))
  const height = Math.round(bounds.height * scale * (1 + PADDING * 2))
  const viewport = getViewportForBounds(bounds, width, height, 0.05, 4, PADDING)

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: bgColor,
    width,
    height,
    pixelRatio: Math.min(2, (MAX_SIDE * 2) / Math.max(width, height)),
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
    filter: el => !(el instanceof Element && (
      el.classList?.contains('react-flow__minimap') ||
      el.classList?.contains('react-flow__controls') ||
      el.classList?.contains('react-flow__resize-control') ||
      el.classList?.contains('react-flow__handle')
    )),
  })

  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling'],
    compress: true,
  })
  pdf.setProperties({ title: boardName, creator: 'MYND' })
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)

  const data = new Uint8Array(pdf.output('arraybuffer'))
  const safeName = (boardName.trim() || 'board').replace(/[/\\:]/g, '-')
  const res = await window.canvas.files.exportPdf(`${safeName}.pdf`, data)
  return res.saved ? 'saved' : 'canceled'
}
