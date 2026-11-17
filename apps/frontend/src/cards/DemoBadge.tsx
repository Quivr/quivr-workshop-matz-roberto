const DEFAULT_NOTE = 'Fictional demo data, not real Quivr users.'

/** Small "DEMO" pill for cards that show simulated data. Hover shows the note. */
export function DemoBadge({ note = DEFAULT_NOTE }: { note?: string }) {
  return (
    <span
      title={note}
      aria-label={`Demo data: ${note}`}
      className="bg-love/15 text-love-text ring-love/30 inline-flex shrink-0 cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ring-1"
    >
      <span aria-hidden>✦</span>
      Demo
    </span>
  )
}
