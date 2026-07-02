import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useReactFlow, type NodeProps } from '@xyflow/react'
import type { NoteNodeData } from '../../types'
import NodeShell from './NodeShell'

function NoteNode({ data, selected, width, height, id }: NodeProps & { data: NoteNodeData; width?: number; height?: number }) {
  const { updateNodeData } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(data.content ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (!editing) setDraft(data.content ?? '') }, [data.content, editing])
  useEffect(() => { if (editing) textareaRef.current?.focus() }, [editing])

  const commitEdit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { content: draft })
  }, [id, draft, updateNodeData])

  const innerStyle: React.CSSProperties = {
    background:   data.nodeStyle?.backgroundColor ?? '#310056',
    borderColor:  data.nodeStyle?.borderColor ?? '#F94500',
    borderWidth:  data.nodeStyle?.borderWidth ?? 2,
    borderStyle:  'solid',
    borderRadius: data.nodeStyle?.borderRadius ?? 0,
    opacity:      data.nodeStyle?.opacity ?? 1,
    boxShadow: selected ? '0 0 0 1px #F94500, 0 0 12px rgba(249,69,0,0.2)' : undefined,
  }

  return (
    <NodeShell id={id} selected={selected} width={width ?? 240} height={height ?? 200}
      minWidth={140} minHeight={100} innerStyle={innerStyle} innerClassName="flex flex-col">

      {data.label && (
        <div className="px-3 pt-2.5 pb-1 font-display text-[18px] leading-none tracking-widest truncate flex-shrink-0 border-b border-white/[0.06]"
          style={{ color: '#FFFDB4' }}>
          {data.label}
        </div>
      )}

      <div className="flex-1 overflow-hidden" onDoubleClick={() => setEditing(true)}>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Escape') commitEdit()
            }}
            className="nodrag nopan nowheel w-full h-full resize-none bg-transparent px-3 py-2.5 font-display text-[17px] outline-none leading-snug"
            style={{ color: '#FFFDB4' }}
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full px-3 py-2.5 font-display text-[17px] leading-snug whitespace-pre-wrap overflow-hidden cursor-text"
            style={{ color: '#FFFDB4' }}>
            {data.content || (
              <span style={{ color: 'rgba(255,253,180,0.4)' }}>// double-click to write</span>
            )}
          </div>
        )}
      </div>
    </NodeShell>
  )
}

export default memo(NoteNode)
