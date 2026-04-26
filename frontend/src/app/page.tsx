/**
 * app/page.tsx — Home page (route: /)
 *
 * CONCEPT: Next.js page files
 * ----------------------------
 * Any file named page.tsx inside app/ becomes a route.
 * app/page.tsx        → /
 * app/plan/page.tsx   → /plan
 *
 * 'use client' makes this a Client Component — it runs in the browser,
 * which is required for useState, event handlers, and streaming.
 * Without it, Next.js treats it as a Server Component (no browser APIs).
 *
 * PAGE STRUCTURE:
 * Left column  → EventForm (user fills in event config)
 * Right column → PlanStream (renders the streaming AI plan)
 *
 * State lives here (the parent) and flows down as props.
 * This is called "lifting state up" — the pattern where shared state
 * lives in the nearest common ancestor of all components that need it.
 */

'use client'

import { useState } from 'react'
import { EventForm } from '@/components/event/EventForm'
import { PlanStream } from '@/components/plan/PlanStream'
import { usePlanStream } from '@/hooks/usePlanStream'
import type { PlanRequest } from '@/types'

export default function Home() {
  const { streamState, startStream, reset } = usePlanStream()
  const [lastRequest, setLastRequest] = useState<PlanRequest | null>(null)

  function handleSubmit(request: PlanRequest) {
    setLastRequest(request)
    startStream(request)
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-10 py-6 border-b border-white/5">
        <div className="w-2 h-2 rounded-full bg-coral-500 animate-pulse-slow" />
        <span className="font-display text-xl tracking-wide">Soirée</span>
        <span className="ml-auto text-xs tracking-widest uppercase text-ink-500">
          Powered by Swiggy MCP
        </span>
      </header>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-[400px_1fr] overflow-hidden">
        {/* Left — Event configuration */}
        <aside className="border-r border-white/5 overflow-y-auto p-8">
          <EventForm
            onSubmit={handleSubmit}
            isLoading={streamState.status === 'streaming'}
          />
        </aside>

        {/* Right — Plan output */}
        <section className="overflow-y-auto p-10">
          <PlanStream
            streamState={streamState}
            onReset={reset}
            eventData={lastRequest ? (lastRequest as unknown as Record<string, unknown>) : {}}
          />
        </section>
      </div>
    </main>
  )
}
