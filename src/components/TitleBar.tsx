interface Props {
  vaultName: string
  boardName?: string
  nodeCount?: number
}

export default function TitleBar({ vaultName, boardName, nodeCount }: Props) {
  return (
    <div
      className="drag-region h-10 flex items-center border-b border-border flex-shrink-0 relative bg-surface"
      style={{ paddingLeft: 80, paddingRight: 12 }}
    >
      {/* Left: brand + vault */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className="font-display text-[20px] leading-none text-accent tracking-widest"
            style={{ textShadow: '0 0 12px rgba(249,69,0,0.5)' }}
          >
            MYND
          </span>
          <span className="font-mono text-[7px] text-accent/40 tracking-[0.2em] mt-0.5">OS</span>
        </div>
        <span className="font-mono text-[10px] text-border select-none">│</span>
        <span className="font-mono text-[10px] text-text-primary/60 tracking-[0.15em] truncate max-w-[120px]">
          {vaultName}
        </span>
      </div>

      {/* Center: active board */}
      {boardName && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          <span className="font-mono text-[10px] text-text-primary/40 select-none">//</span>
          <span className="font-mono text-[11px] text-text-primary tracking-[0.12em] uppercase truncate max-w-[220px]">
            {boardName}
          </span>
        </div>
      )}

      {/* Right: live indicator + node count */}
      <div className="ml-auto flex items-center gap-4 flex-shrink-0">
        {nodeCount !== undefined && (
          <span className="font-mono text-[10px] text-text-primary/45 tracking-[0.15em] tabular-nums">
            {nodeCount} NODE{nodeCount !== 1 ? 'S' : ''}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot"
          />
          <span className="font-mono text-[8px] text-accent/40 tracking-[0.2em]">LIVE</span>
        </div>
      </div>
    </div>
  )
}
