// ─── MYND icon set ────────────────────────────────────────────────────────────
// Íconos stroke consistentes (24x24 viewBox, strokeWidth 1.8, esquinas rectas)
// Uso: <Icon.Select size={14} /> — hereda currentColor

interface IconProps {
  size?: number
  strokeWidth?: number
  className?: string
  color?: string
}

function base({ size = 14, strokeWidth = 1.8, className, color }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color ?? 'currentColor',
    strokeWidth,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
    className,
  }
}

export const Icon = {
  Select: (p: IconProps) => (
    <svg {...base(p)} fill={p.color ?? 'currentColor'} stroke="none">
      <path d="M4 3l16 9-8 2-4 9L4 3z" />
    </svg>
  ),
  Pan: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V8a2 2 0 00-4 0v3M14 11V7a2 2 0 00-4 0v4M10 11V9a2 2 0 00-4 0v5a7 7 0 007 7h1a6 6 0 006-6v-2a2 2 0 00-4 0" />
    </svg>
  ),
  Title: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 6h16M12 6v13M8 19h8" />
    </svg>
  ),
  Note: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M3 3h18v12l-6 6H3V3z" />
      <path d="M15 21v-6h6" />
    </svg>
  ),
  Text: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M4 6h16M4 12h10M4 18h16" />
    </svg>
  ),
  ZoomIn: (p: IconProps) => (
    <svg {...base({ strokeWidth: 2, ...p })}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ZoomOut: (p: IconProps) => (
    <svg {...base({ strokeWidth: 2, ...p })}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Export: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.6, ...p })}>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 15v6h16v-6" />
    </svg>
  ),
  Search: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.8, ...p })}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg {...base({ strokeWidth: 2, ...p })}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Board: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <rect x="3" y="3" width="18" height="18" />
      <path d="M3 9h18M9 9v12" />
    </svg>
  ),
  Rename: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M17 3l4 4L8 20H4v-4L17 3z" />
    </svg>
  ),
  Trash: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  Duplicate: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <rect x="8" y="8" width="13" height="13" />
      <path d="M5 16H3V3h13v2" />
    </svg>
  ),
  Copy: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <rect x="9" y="9" width="12" height="12" />
      <path d="M5 15H3V3h12v2" />
    </svg>
  ),
  Paste: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M9 4h6v3H9zM15 4h4v17H5V4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  ),
  Front: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <rect x="9" y="9" width="12" height="12" fill="currentColor" fillOpacity="0.25" />
      <rect x="3" y="3" width="12" height="12" />
    </svg>
  ),
  Back: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <rect x="3" y="3" width="12" height="12" fill="currentColor" fillOpacity="0.25" />
      <rect x="9" y="9" width="12" height="12" />
    </svg>
  ),
  Style: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2.5-1.5H18a3 3 0 003-3c0-5-4-9-9-9z" />
      <circle cx="7.5" cy="11" r="0.5" fill="currentColor" /><circle cx="10" cy="7.5" r="0.5" fill="currentColor" /><circle cx="14.5" cy="7.5" r="0.5" fill="currentColor" />
    </svg>
  ),
  Label: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M3 12l9-9h9v9l-9 9-9-9z" />
      <circle cx="16.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Finder: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M3 6h6l2 2h10v12H3V6z" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg {...base({ strokeWidth: 2.5, ...p })}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Close: (p: IconProps) => (
    <svg {...base({ strokeWidth: 2, ...p })}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Warning: (p: IconProps) => (
    <svg {...base({ strokeWidth: 1.5, ...p })}>
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 10v4M12 17v.5" />
    </svg>
  ),
  Spinner: (p: IconProps) => (
    <svg {...base({ strokeWidth: 2, ...p })} className={`animate-spin ${p.className ?? ''}`}>
      <path d="M12 3a9 9 0 019 9" />
    </svg>
  ),
}
