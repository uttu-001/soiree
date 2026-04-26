'use client'
interface Props { content: string }
export function FoodCard({ content }: Props) {
  return (
    <div className="animate-fade-up rounded-2xl border border-coral-500/15 bg-coral-500/3 overflow-hidden">
      <div className="px-5 py-3 border-b border-coral-500/10 flex items-center gap-2">
        <span className="text-[10px] font-medium tracking-[2px] uppercase text-coral-500/70">
          Food Delivery
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-coral-500/10
          border border-coral-500/20 text-coral-500/70">FOOD API</span>
      </div>
      <pre className="p-5 text-sm text-ink-300 whitespace-pre-wrap font-sans leading-relaxed">
        {content.replace(/⏎/g, '\n')}
      </pre>
    </div>
  )
}
