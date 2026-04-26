'use client'
interface Props { content: string; totalCost: string }
export function CostCard({ content, totalCost }: Props) {
  return (
    <div className="animate-fade-up rounded-2xl border border-white/6 bg-white/2 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
        <span className="text-[10px] font-medium tracking-[2px] uppercase text-ink-500">
          Cost Breakdown
        </span>
        {totalCost && (
          <span className="ml-auto font-mono text-base font-medium text-coral-400">
            {totalCost}
          </span>
        )}
      </div>
      <pre className="p-5 text-sm text-ink-300 whitespace-pre-wrap font-sans leading-relaxed">
        {content.replace(/⏎/g, '\n')}
      </pre>
    </div>
  )
}
