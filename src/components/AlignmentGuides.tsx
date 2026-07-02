import { useViewport } from '@xyflow/react'

export interface Guide {
  type: 'h' | 'v'
  pos: number
}

export default function AlignmentGuides({ guides }: { guides: Guide[] }) {
  const { x, y, zoom } = useViewport()
  if (!guides.length) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 4 }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {guides.map((g, i) =>
          g.type === 'v' ? (
            <line key={i}
              x1={g.pos * zoom + x} y1={0}
              x2={g.pos * zoom + x} y2="100%"
              stroke="#F94500" strokeWidth={1} strokeDasharray="5 3" opacity={0.5}
            />
          ) : (
            <line key={i}
              x1={0} y1={g.pos * zoom + y}
              x2="100%" y2={g.pos * zoom + y}
              stroke="#F94500" strokeWidth={1} strokeDasharray="5 3" opacity={0.5}
            />
          )
        )}
      </svg>
    </div>
  )
}
