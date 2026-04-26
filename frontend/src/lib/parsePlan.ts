/**
 * lib/parsePlan.ts — Parse Claude's streamed text into structured sections.
 *
 * CONCEPT: Why parse the stream?
 * --------------------------------
 * Claude streams plain text with section markers like [TIMELINE], [DINEOUT].
 * The frontend needs to render each section differently — the timeline as
 * a visual list, Dineout as a card with a booking button, etc.
 *
 * This file extracts each section from the raw text and parses the
 * timeline into structured TimelineStep objects.
 *
 * CONCEPT: Progressive parsing
 * -----------------------------
 * We parse on every new chunk received, not just at the end.
 * This means the UI can render sections as they appear —
 * the timeline shows up while Dineout is still being written.
 *
 * The regex approach: each section starts with [MARKER] and ends
 * at the next [MARKER] or end of string.
 */

import type { ParsedPlan, TimelineStep } from '@/types'
import { EOF } from 'dns/promises'

/**
 * Extract content between two section markers.
 * e.g. getSection(text, 'DINEOUT') returns everything between
 * [DINEOUT] and the next [ marker (or end of string).
 */
function getSection(text: string, marker: string): string {
  // Also match markers that may have lost their newline before them
  // e.g. "...last sentence.[TIMELINE]\n7:30 PM..."
  const regex = new RegExp(`\\[${marker}\\]\\n?([\\s\\S]*?)(?=\\n?\\[\\w|$)`)
  const match = text.match(regex)
  return match ? match[1].trim().replace(/⏎/g, '\n').trim() : ''
}

/**
 * Parse timeline section into structured steps.
 *
 * Claude writes each step as: TIME | EMOJI | TITLE | DETAIL
 * e.g. "7:30 PM | 🍽 | Arrive at Farzi Cafe | Head to the rooftop"
 *
 * We split on | and map to TimelineStep objects.
 * Lines that don't contain | are skipped (headers, empty lines).
 */
function parseTimeline(raw: string): TimelineStep[] {
  return raw
    .split('\n')
    .filter(line => line.includes('|'))
    .map(line => {
      const parts = line.split('|').map(s => s.trim())
      return {
        time:   parts[0] || '',
        emoji:  parts[1] || '●',
        title:  parts[2] || '',
        detail: parts[3] || '',
      }
    })
    .filter(step => step.title.length > 0)
}

/**
 * Extract total cost from the [COST] section.
 * Looks for "TOTAL: ₹X,XXX" pattern.
 */
function extractTotal(costSection: string): string {
  const match = costSection.match(/TOTAL:\s*(₹[\d,]+)/)
  return match ? match[1] : ''
}

/**
 * Extract total savings from [OFFERS] section.
 * Looks for "TOTAL SAVINGS: ₹X" pattern.
 */
function extractSavings(offersSection: string): string {
  const match = offersSection.match(/TOTAL SAVINGS:\s*(₹[\d,]+)/)
  return match ? match[1] : ''
}

/**
 * Main parser — call this on every SSE chunk received.
 * Returns a ParsedPlan with whatever sections have arrived so far.
 * Incomplete sections return empty strings — the UI handles this gracefully.
 */
export function parsePlan(rawText: string): ParsedPlan {
  // Strip SSE prefixes and decode all ⏎ back to newlines globally.
  // Do this once at the top — every subsequent operation works on clean text.
  const cleaned = rawText
    .replace(/^data:\s*/gm, '')
    .replace(/⏎/g, '\n')
    .trim()

  // Extra safety — remove any ⏎ that survived (e.g. in brief path)
  const sanitize = (s: string) => s.replace(/⏎/g, '\n')

  // // Log found markers for debugging
  // const foundMarkers = cleaned.match(/\[[A-Z]+\]/g) || []
  // console.log('Found markers:', foundMarkers)

  const brief       = sanitize(getSection(cleaned, 'BRIEF'))
  const timelineRaw = sanitize(getSection(cleaned, 'TIMELINE'))
  const dineout     = sanitize(getSection(cleaned, 'DINEOUT'))
  const food        = sanitize(getSection(cleaned, 'FOOD'))
  const instamart   = sanitize(getSection(cleaned, 'INSTAMART'))
  const health      = sanitize(getSection(cleaned, 'HEALTH'))
  const offers      = sanitize(getSection(cleaned, 'OFFERS'))
  const cost        = sanitize(getSection(cleaned, 'COST'))

  return {
    brief,
    timeline:     parseTimeline(timelineRaw),
    dineout,
    food,
    instamart,
    health,
    offers,
    cost,
    totalCost:    extractTotal(cost),
    totalSavings: extractSavings(offers),
  }
}
