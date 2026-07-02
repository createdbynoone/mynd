import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { MediaNodeData } from '../../types'
import NodeShell from './NodeShell'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function PDFNode({ data, selected, width, height, id }: NodeProps & { data: MediaNodeData; width?: number; height?: number }) {
  const innerStyle: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? '#310056',
    borderColor:  data.nodeStyle?.borderColor ?? (selected ? '#F94500' : '#4A1878'),
    borderWidth:  data.nodeStyle?.borderWidth ?? 1,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 0,
    opacity:      data.nodeStyle?.opacity ?? 1,
    boxShadow: selected ? '0 0 10px rgba(249,69,0,0.15)' : undefined,
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 200} height={height ?? 220}
      minWidth={140} minHeight={160} innerStyle={innerStyle} innerClassName="flex flex-col">

      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer group"
        onDoubleClick={() => window.canvas.files.openExternal(data.filePath)}
      >
        <div className="relative">
          <svg width="48" height="64" viewBox="0 0 48 64" fill="none">
            <rect width="48" height="64" rx="1" fill="#2A0049" stroke="#4A1878" strokeWidth="1" />
            <path d="M32 0v14h14L32 0z" fill="#4A1878" />
            <path d="M32 0v14h14" fill="none" stroke="#2A2A3A" strokeWidth="1" />
            <text x="6" y="46" fontFamily="Share Tech Mono,monospace" fontWeight="700" fontSize="11" fill="#F94500" letterSpacing="0.5">PDF</text>
          </svg>
        </div>

        <div className="text-center">
          <p className="font-mono text-[11px] text-text-primary line-clamp-2 leading-tight">
            {data.fileName}
          </p>
          <p className="font-mono text-[10px] text-text-muted mt-1">{formatSize(data.fileSize)}</p>
        </div>

        <div className="flex items-center gap-1 font-mono text-[9px] text-text-muted group-hover:text-accent transition-colors tracking-wide">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
          DBL-CLICK TO OPEN
        </div>
      </div>

      {data.label && (
        <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary truncate border-t border-border/50 flex-shrink-0">
          {data.label}
        </div>
      )}
    </NodeShell>
  )
}

export default memo(PDFNode)
