import { memo, useRef, useState, useEffect, useCallback } from 'react'
import { type NodeProps, useReactFlow } from '@xyflow/react'
import type { MediaNodeData } from '../../types'
import NodeShell from './NodeShell'

function VideoNode({ data, selected, width, height, id }: NodeProps & { data: MediaNodeData; width?: number; height?: number }) {
  const videoRef       = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const { updateNode } = useReactFlow()

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

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = parseFloat(localStorage.getItem('app-volume') ?? '1')
    const onVol = (e: Event) => { v.volume = (e as CustomEvent<number>).detail }
    window.addEventListener('app:volume', onVol)
    return () => window.removeEventListener('app:volume', onVol)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0.001
    if (v.videoWidth && v.videoHeight) {
      const MAX = 480
      const r = Math.min(MAX / v.videoWidth, MAX / v.videoHeight, 1)
      updateNode(id, {
        width:  Math.round(v.videoWidth  * r),
        height: Math.round(v.videoHeight * r),
      })
    }
  }, [id, updateNode])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    const v = videoRef.current
    if (v) v.currentTime = 0.001
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (playing) {
      v.pause()
      setPlaying(false)
      v.currentTime = 0.001
    } else {
      v.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [playing])

  function openFullscreen(e: React.MouseEvent) {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('canvas:preview', {
      detail: { url, type: 'video', fileName: data.fileName }
    }))
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 280} height={height ?? 200}
      minWidth={120} minHeight={80} innerStyle={innerStyle} innerClassName="flex flex-col">

      <div
        className="relative flex-1 overflow-hidden"
        onClick={handleClick}
        onDoubleClick={openFullscreen}
        onMouseDown={e => e.preventDefault()}
        style={{ cursor: 'pointer' }}
      >
        <video
          ref={videoRef}
          src={url}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ pointerEvents: 'none' }}
          preload="metadata"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div className="w-10 h-10 border border-accent/40 bg-bg/50 backdrop-blur-sm flex items-center justify-center"
              style={{ boxShadow: '0 0 10px rgba(249,69,0,0.15)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#F94500">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {data.label && (
        <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary truncate border-t border-border/50 flex-shrink-0">
          {data.label}
        </div>
      )}
    </NodeShell>
  )
}

export default memo(VideoNode)
