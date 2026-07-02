import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react'
import type { TitleNodeData } from '../../types'

const SIZE_PRESETS = [
  { label: 'H1', size: 40 },
  { label: 'H2', size: 28 },
  { label: 'H3', size: 20 },
]

function TitleNode({ data, selected, width, height, id }: NodeProps & { data: TitleNodeData; width?: number; height?: number }) {
  const { updateNodeData } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(data.content ?? '')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fontSize = data.fontSize ?? 32

  useEffect(() => { if (!editing) setDraft(data.content ?? '') }, [data.content, editing])
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { content: draft })
  }, [id, draft, updateNodeData])

  const setSize = useCallback((size: number) => {
    updateNodeData(id, { fontSize: size })
  }, [id, updateNodeData])

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{
        width:  width  ?? 400,
        height: height ?? 80,
        background: 'transparent',
        border: selected ? '1px dashed rgba(249,69,0,0.35)' : '1px dashed transparent',
      }}
      onDoubleClick={() => !editing && setEditing(true)}
    >
      <NodeResizer minWidth={120} minHeight={36} isVisible={selected} />

      <Handle type="source" position={Position.Top}    id="top"    />
      <Handle type="source" position={Position.Right}  id="right"  />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left}   id="left"   />

      {/* Size picker */}
      {selected && !editing && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-surface border border-border px-1 py-0.5 z-20 nodrag nopan"
          onMouseDown={e => e.stopPropagation()}
        >
          {SIZE_PRESETS.map(({ label, size }) => (
            <button
              key={label}
              onClick={e => { e.stopPropagation(); setSize(size) }}
              className={`px-2 py-0.5 font-mono text-[10px] transition-colors ${
                fontSize === size ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {editing ? (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
            if (e.key === 'Escape') commit()
          }}
          style={{ fontSize, lineHeight: 1.15 }}
          className="nodrag nopan nowheel w-full h-full resize-none bg-transparent text-center font-display text-text-primary outline-none px-2"
          spellCheck={false}
        />
      ) : (
        <div
          style={{ fontSize, lineHeight: 1.15, textShadow: data.content ? '0 0 20px rgba(249,69,0,0.1)' : undefined }}
          className="w-full h-full flex items-center justify-center text-center font-display text-text-primary px-2 cursor-text leading-tight overflow-hidden"
        >
          {data.content || (
            <span className="text-text-muted/50 font-normal" style={{ fontSize: Math.min(fontSize * 0.5, 14) }}>
              // double-click for title
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(TitleNode)
