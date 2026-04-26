/**
 * lib/api.ts — API client for the FastAPI backend.
 *
 * CONCEPT: Centralised API layer
 * --------------------------------
 * All fetch() calls live here, not scattered in components.
 * This means:
 *   - One place to change the base URL
 *   - One place to add auth headers when we build login
 *   - Components stay clean — they call generatePlan(), not fetch()
 *
 * CONCEPT: Streaming with ReadableStream
 * ----------------------------------------
 * The plan generation endpoint returns a Server-Sent Events stream.
 * We can't use a normal await response.json() here — the response
 * never "completes" in the traditional sense, it keeps sending chunks.
 *
 * Instead we use response.body.getReader() to read the stream
 * chunk by chunk. Each chunk is a Uint8Array (raw bytes) that we
 * decode to a string, then extract SSE data values from.
 *
 * SSE format reminder:
 *   "data: some text\n\n"   ← one event
 *   "data: [DONE]\n\n"      ← end signal
 *
 * We strip the "data: " prefix from each line to get the content.
 */

import type { PlanRequest } from '@/types'

const API_BASE = '/api/v1'  // proxied to FastAPI via next.config.js rewrites

/**
 * Generate an event plan via streaming SSE.
 *
 * This is an async generator — the caller uses `for await` to receive
 * each text chunk as it arrives from Claude:
 *
 *   for await (const chunk of generatePlan(request)) {
 *     setRawText(prev => prev + chunk)
 *   }
 *
 * The generator yields raw text chunks (not SSE-formatted).
 * It returns when the stream ends ([DONE] received) or errors.
 *
 * @param request - PlanRequest object with all event config
 * @yields text chunks from Claude's streaming response
 */
export async function* generatePlan(request: PlanRequest): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE}/plans/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('Response body is null — streaming not supported')
  }

  // ReadableStream reader — reads raw bytes from the SSE stream
  const reader = response.body.getReader()
  // TextDecoder converts Uint8Array bytes → UTF-8 string
  // 'utf-8' handles Indian characters (₹, etc.) correctly
  const decoder = new TextDecoder('utf-8')

  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()

      // Stream closed by server
      if (done) break

      // Decode bytes → string
      // stream: true means the decoder handles multi-byte chars
      // split across chunks (e.g. ₹ is 3 bytes, might arrive in 2 chunks)
      const chunk = decoder.decode(value, { stream: true })

// Buffer incomplete SSE messages across chunks.
      // Problem: a single chunk may contain half a message e.g. "data: Far"
      // with the rest "zi Cafe\n\n" arriving in the next chunk.
      // Solution: accumulate into buffer, only process complete messages
      // which are delimited by double newline \n\n per SSE spec.
      buffer += chunk
      const parts = buffer.split('\n\n')

      // Last element may be an incomplete message — keep it in buffer
      // pop() removes and returns the last element
      buffer = parts.pop() ?? ''

for (const part of parts) {
        // Split into lines and process each one
        const lines = part.split('\n')
        const dataLines = lines.filter(l => l.startsWith('data: '))
        if (dataLines.length === 0) continue

        // Join all data lines, preserving newlines between them
        // This keeps section markers like [TIMELINE] on their own line
        // Restore newlines we encoded as ⏎ on the backend
        const content = dataLines.map(l => l.slice(6)).join('\n')

        // [DONE] is our sentinel — streaming complete
        if (content.trim() === '[DONE]') return

        // [ERROR] prefix means something went wrong on the backend
        if (content.startsWith('[ERROR]')) throw new Error(content.slice(8))

        // Yield complete message content to the caller
        if (content.trim()) yield content + '\n'
      }
    }
  } finally {
    // Always release the reader lock, even if an error occurs
    reader.releaseLock()
  }
}

/**
 * Create and save an event to the database.
 * Returns the created event with its generated ID.
 */
export async function createEvent(payload: PlanRequest): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE}/events/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Failed to create event: ${response.status}`)
  return response.json()
}
