import { memo, useEffect, useRef, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { MediaNodeData } from '../../types'
import NodeShell from './NodeShell'

const MAX_RETRIES = 2

function ImageNode({ data, selected, width, height, id }: NodeProps & { data: MediaNodeData; width?: number; height?: number }) {
  const [imgError, setImgError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const url = window.canvas.files.localUrl(data.filePath)
  // cache-buster en reintentos para saltar el error cacheado por Chromium
  const src = attempt > 0 ? `${url}&retry=${attempt}` : url

  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current) }, [])

  const handleError = () => {
    if (attempt < MAX_RETRIES) {
      retryTimer.current = setTimeout(() => setAttempt(a => a + 1), 350 * (attempt + 1))
    } else {
      setImgError(true)
    }
  }

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
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1 text-text-muted bg-surface cursor-pointer"
            title="Click to retry"
            onClick={() => { setImgError(false); setAttempt(a => a + 1) }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="1" /><circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="font-mono text-[9px] text-text-muted">{data.fileName}</span>
            <span className="font-mono text-[8px] text-text-muted/60 tracking-widest">CLICK TO RETRY</span>
          </div>
        ) : (
          <img
            src={src}
            alt={data.fileName}
            decoding="async"
            loading="lazy"
            onError={handleError}
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
