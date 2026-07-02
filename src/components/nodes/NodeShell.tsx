import { Handle, Position, NodeResizer } from '@xyflow/react'

interface NodeShellProps {
  id?: string
  selected: boolean
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  children: React.ReactNode
  innerStyle?: React.CSSProperties
  innerClassName?: string
}

export default function NodeShell({
  selected, width, height,
  minWidth = 100, minHeight = 80,
  children, innerStyle, innerClassName = '',
}: NodeShellProps) {
  return (
    <div style={{ width, height, position: 'relative' }}>
      <NodeResizer minWidth={minWidth} minHeight={minHeight} isVisible={selected} />

      <Handle type="source" position={Position.Top}    id="top"    />
      <Handle type="source" position={Position.Right}  id="right"  />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left}   id="left"   />

      <div className={`absolute inset-0 overflow-hidden ${innerClassName}`} style={innerStyle}>
        {children}
      </div>
    </div>
  )
}
