/**
 * types/index.ts — Shared TypeScript types across the frontend.
 *
 * CONCEPT: Why TypeScript types matter
 * -------------------------------------
 * Types are contracts. When you define PlanRequest here and use it in
 * EventForm.tsx and api.ts, TypeScript ensures they always match.
 * If you rename a field in one place and forget the other, the compiler
 * catches it before the browser does.
 *
 * These mirror the Pydantic schemas in backend/app/schemas/ exactly.
 * When you change a backend schema, update the matching type here.
 */

export type EventType =
  | 'date'
  | 'friends'
  | 'birthday'
  | 'corporate'
  | 'house_party'
  | 'family'

export type VenueMode = 'out' | 'home' | 'hybrid'

export interface Guest {
  name?: string
  dietary_tags: string[]
}

/** Mirrors backend PlanRequest schema exactly */
export interface PlanRequest {
  event_type: EventType
  venue_mode: VenueMode
  location: string
  start_hour: number       // 10-23 (24h format)
  budget: number           // INR
  guest_count: number
  guests: Guest[]          // named guests, or empty if headcount-only
  dietary_tags: string[]   // group-level dietary restrictions
  health_focus: number     // 0-100
  notes?: string
}

/**
 * Parsed plan sections — output of parsePlan() in lib/parsePlan.ts.
 * Each field maps to a [SECTION] marker in Claude's streamed output.
 */
export interface ParsedPlan {
  brief: string
  timeline: TimelineStep[]
  dineout: string
  food: string
  instamart: string
  health: string
  offers: string
  cost: string
  totalCost: string        // extracted from cost section e.g. "₹2,557"
  totalSavings: string     // extracted from offers section
}

export interface TimelineStep {
  time: string    // e.g. "7:30 PM"
  emoji: string   // e.g. "🍽"
  title: string   // e.g. "Arrive at restaurant"
  detail: string  // e.g. "Ask for the corner table"
}

/** Stream state — tracks plan generation progress */
export type StreamStatus =
  | 'idle'        // nothing happening
  | 'streaming'   // Claude is writing
  | 'done'        // complete
  | 'error'       // something went wrong

export interface StreamState {
  status: StreamStatus
  rawText: string          // full accumulated text from SSE stream
  plan: ParsedPlan | null  // parsed once streaming is done
  error?: string
}

/** Dietary tag options shown in the UI */
export const DIETARY_TAGS = [
  'Veg', 'Vegan', 'Jain', 'Keto',
  'Gluten-Free', 'No Dairy', 'Halal', 'No Nuts',
] as const

export const EVENT_TYPES: { id: EventType; label: string; emoji: string }[] = [
  { id: 'date',        label: 'Date Night',    emoji: '🌹' },
  { id: 'friends',     label: 'Friends Night', emoji: '🥂' },
  { id: 'birthday',    label: 'Birthday',      emoji: '🎂' },
  { id: 'corporate',   label: 'Corporate',     emoji: '💼' },
  { id: 'house_party', label: 'House Party',   emoji: '🏠' },
  { id: 'family',      label: 'Family Dinner', emoji: '👨‍👩‍👧' },
]
