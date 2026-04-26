'use client'
interface Props { content: string; totalSavings: string }
export function OffersCard({ content, totalSavings }: Props) {
  return (
    <div className="animate-fade-up rounded-2xl border border-white/6 bg-white/2 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
        <span className="text-[10px] font-medium tracking-[2px] uppercase text-ink-500">
          Offers & Savings
        </span>
        {totalSavings && (
          <span className="ml-auto text-sm font-mono text-emerald-400">{totalSavings} saved</span>
        )}
      </div>
      <pre className="p-5 text-sm text-ink-300 whitespace-pre-wrap font-sans leading-relaxed">
        {content.replace(/⏎/g, '\n')}
      </pre>
    </div>
  )
}
