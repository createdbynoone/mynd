import { memo, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { MediaNodeData } from '../../types'
import NodeShell from './NodeShell'

function ImageNode({ data, selected, width, height, id }: NodeProps & { data: MediaNodeData; width?: number; height?: number }) {
  const [imgError, setImgError] = useState(false)
  const url = window.canvas.files.localUrl(data.filePath)

  const innerStyle: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? 'transparent',
    borderColor:  data.nodeStyle?.borderColor ?? (selected ? '#F94500' : '#4A1878'),
    borderWidth:  data.nodeStyle?.borderWidth ?? 1,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 0,
    opacity:      data.nodeStyle?.opacity ?? 1,
    boxShadow: selected ? '0 0 10px rgba(249,69,0,0.15)' : undefined,
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 240} height={height ?? 200}
      minWidth={100} minHeight={80} innerStyle={innerStyle} innerClassName="flex flex-col">

      <div className="flex-1 overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-text-muted bg-surface">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="1" /><circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="font-mono text-[9px] text-text-muted">{data.fileName}</span>
          </div>
        ) : (
          <img
            src={url}
            alt={data.fileName}
            onError={() => setImgError(true)}
            onDoubleClick={() => window.dispatchEvent(new CustomEvent('canvas:preview', {
              detail: { url, type: 'image', fileName: data.fileName }
            }))}
            draggable={false}
            className="w-full h-full object-cover cursor-zoom-in"
          />
        )}
      </div>

      {data.label && (
        <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary truncate border-t border-border/50 bg-bg/80 backdrop-blur-sm flex-shrink-0">
          {data.label}
        </div>
      )}
    </NodeShell>
  )
}

export default memo(ImageNode)
