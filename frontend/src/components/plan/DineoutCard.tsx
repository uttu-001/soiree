'use client'
interface Props { content: string }
export function DineoutCard({ content }: Props) {
  return (
    <div className="animate-fade-up rounded-2xl border border-amber-500/15 bg-amber-500/3 overflow-hidden">
      <div className="px-5 py-3 border-b border-amber-500/10 flex items-center gap-2">
        <span className="text-[10px] font-medium tracking-[2px] uppercase text-amber-600/70">
          Dineout Reservation
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10
          border border-amber-500/20 text-amber-500/70">DINEOUT API</span>
      </div>
      <pre className="p-5 text-sm text-ink-300 whitespace-pre-wrap font-sans leading-relaxed">
        {content.replace(/⏎/g, '\n')}
      </pre>
    </div>
  )
}
