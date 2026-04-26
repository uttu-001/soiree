'use client'
interface Props { content: string }
export function InstamartCard({ content }: Props) {
  return (
    <div className="animate-fade-up rounded-2xl border border-emerald-500/15 bg-emerald-500/3 overflow-hidden">
      <div className="px-5 py-3 border-b border-emerald-500/10 flex items-center gap-2">
        <span className="text-[10px] font-medium tracking-[2px] uppercase text-emerald-600/70">
          Instamart Cart
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10
          border border-emerald-500/20 text-emerald-500/70">INSTAMART API</span>
      </div>
      <pre className="p-5 text-sm text-ink-300 whitespace-pre-wrap font-sans leading-relaxed">
        {content.replace(/⏎/g, '\n')}
      </pre>
    </div>
  )
}
