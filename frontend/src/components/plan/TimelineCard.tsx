'use client'
import type { TimelineStep } from '@/types'

interface Props { steps: TimelineStep[] }

export function TimelineCard({ steps }: Props) {
  return (
    <div className="animate-fade-up rounded-2xl border border-white/6 bg-white/2 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
        <span className="text-[10px] font-medium tracking-[2px] uppercase text-ink-500">
          Evening Timeline
        </span>
      </div>
      <div className="p-5 flex flex-col gap-0">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4 relative pb-5 last:pb-0">
            {/* Vertical connector line */}
            {i < steps.length - 1 && (
              <div className="absolute left-[18px] top-8 bottom-0 w-px bg-white/6" />
            )}
            {/* Emoji dot */}
            <div className="w-9 h-9 rounded-full border border-white/10 bg-white/3
              flex items-center justify-center text-base flex-shrink-0 z-10">
              {step.emoji}
            </div>
            <div className="flex-1 pt-1">
              <div className="text-[10px] text-ink-600 tracking-wide mb-0.5">{step.time}</div>
              <div className="text-sm font-medium text-ink-100">{step.title}</div>
              <div className="text-xs text-ink-500 mt-0.5 leading-relaxed">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
