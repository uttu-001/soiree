/**
 * hooks/usePlanStream.ts — React hook for streaming plan generation.
 *
 * CONCEPT: Custom React hooks
 * ----------------------------
 * A hook is a reusable piece of stateful logic that lives outside a component.
 * Instead of writing stream management code inside EventForm.tsx (messy),
 * we extract it here. The component just calls:
 *
 *   const { streamState, startStream } = usePlanStream()
 *
 * And gets back the current state + a function to trigger generation.
 *
 * CONCEPT: useState + async generators
 * ---------------------------------------
 * React's useState is synchronous — it schedules a re-render.
 * Our generator is async — it yields chunks over time.
 *
 * The pattern:
 *   1. Set status to 'streaming'
 *   2. For each chunk from the generator, append to rawText (triggers re-render)
 *   3. Parse rawText into sections on each update
 *   4. Set status to 'done' when generator returns
 *
 * This means the component re-renders ~50-100 times during streaming
 * (once per chunk). React batches these efficiently in React 18.
 *
 * CONCEPT: useRef for the abort controller
 * ------------------------------------------
 * We use useRef (not useState) for the AbortController because:
 *   - We don't want changing it to trigger a re-render
 *   - We need to access the latest value in event handlers
 *   - It persists across renders without causing them
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { generatePlan } from '@/lib/api'
import { parsePlan } from '@/lib/parsePlan'
import type { PlanRequest, StreamState } from '@/types'

const INITIAL_STATE: StreamState = {
  status: 'idle',
  rawText: '',
  plan: null,
}

export function usePlanStream() {
  const [streamState, setStreamState] = useState<StreamState>(INITIAL_STATE)
  // abortRef lets us cancel an in-progress stream (e.g. user navigates away)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Start streaming a plan for the given request.
   * useCallback ensures this function reference is stable across renders
   * (important if it's passed as a prop to child components).
   */
  const startStream = useCallback(async (request: PlanRequest) => {
    // Cancel any existing stream
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // Reset to streaming state
    setStreamState({ status: 'streaming', rawText: '', plan: null })

    try {
      let accumulated = ''

      // Consume the async generator chunk by chunk
      for await (const chunk of generatePlan(request)) {
        accumulated += chunk

        // Update state on every chunk — triggers re-render
        // parsePlan() is fast (just regex), safe to call on every chunk
        console.log('RAW TEXT:', accumulated)
        setStreamState({
          status: 'streaming',
          rawText: accumulated,
          plan: parsePlan(accumulated),
        })
      }

      // Stream complete — parse final state
      setStreamState({
        status: 'done',
        rawText: accumulated,
        plan: parsePlan(accumulated),
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setStreamState(prev => ({
        ...prev,
        status: 'error',
        error: message,
      }))
    }
  }, [])

  /** Reset to initial state (e.g. user clicks "New Plan") */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStreamState(INITIAL_STATE)
  }, [])

  return { streamState, startStream, reset }
}
