/**
 * components/event/EventForm.tsx — Main event configuration form.
 *
 * CONCEPT: Controlled components
 * --------------------------------
 * Every input is "controlled" — React state is the single source of truth.
 * When a user types in a field, onChange updates state, React re-renders,
 * and the input shows the new value. There's no separate "form state"
 * outside of React — the component state IS the form state.
 *
 * CONCEPT: Derived values
 * -------------------------
 * guest_count is derived from guests.length when guests are named,
 * otherwise it's a standalone number input. We always send the correct
 * count to the backend — the form enforces this invariant.
 */

'use client'

import { useState } from 'react'
import { GuestRoster } from './GuestRoster'
import { LocationPicker } from './LocationPicker'
import type { PlanRequest, EventType, VenueMode, Guest } from '@/types'
import { EVENT_TYPES, DIETARY_TAGS } from '@/types'

interface Props {
  onSubmit: (request: PlanRequest) => void
  isLoading: boolean
}

export function EventForm({ onSubmit, isLoading }: Props) {
  // Form state — mirrors PlanRequest fields
  const [eventType, setEventType]     = useState<EventType>('date')
  const [venueMode, setVenueMode]     = useState<VenueMode>('hybrid')
  const [location, setLocation]       = useState('')
  const [startHour, setStartHour]     = useState(20)
  const [budget, setBudget]           = useState(3000)
  const [guests, setGuests]           = useState<Guest[]>([])
  const [guestCount, setGuestCount]   = useState(2)
  const [dietaryTags, setDietaryTags] = useState<string[]>([])
  const [healthFocus, setHealthFocus] = useState(50)
  const [notes, setNotes]             = useState('')

  const hasNamedGuests = guests.length > 0
  // If guests are named, count comes from the list; else from the number input
  const effectiveGuestCount = hasNamedGuests ? guests.length : guestCount

  function toggleDiet(tag: string) {
    setDietaryTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location.trim()) return

    onSubmit({
      event_type:   eventType,
      venue_mode:   venueMode,
      location:     location.trim(),
      start_hour:   startHour,
      budget,
      guest_count:  effectiveGuestCount,
      guests,
      dietary_tags: dietaryTags,
      health_focus: healthFocus,
      notes:        notes.trim() || undefined,
    })
  }

  // Format hour to 12h display for the slider label
  const hourLabel = startHour >= 12
    ? `${startHour === 12 ? 12 : startHour - 12}:00 PM`
    : `${startHour}:00 AM`

  const healthLabel = healthFocus >= 70 ? 'Health-first'
    : healthFocus <= 30 ? 'Full indulgence'
    : 'Balanced'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">

      {/* Occasion type */}
      <div>
        <Label>Occasion</Label>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {EVENT_TYPES.map(({ id, label, emoji }) => (
            <button
              key={id}
              type="button"
              onClick={() => setEventType(id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all
                ${eventType === id
                  ? 'bg-coral-500/10 border-coral-500 text-coral-400'
                  : 'border-white/8 text-ink-300 hover:border-white/15'
                }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Venue mode */}
      <div>
        <Label>Where?</Label>
        <div className="flex mt-3 rounded-xl overflow-hidden border border-white/8">
          {(['out', 'home', 'hybrid'] as VenueMode[]).map(mode => {
            const labels = { out: '🍽 Dine Out', home: '🏠 Stay In', hybrid: '✦ Hybrid' }
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setVenueMode(mode)}
                className={`flex-1 py-2.5 text-xs font-medium transition-all
                  ${venueMode === mode
                    ? 'bg-coral-500 text-white'
                    : 'text-ink-400 hover:text-ink-200'
                  }`}
              >
                {labels[mode]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Location */}
      <div>
        <Label>Location</Label>
        <LocationPicker value={location} onChange={setLocation} />
      </div>

      {/* Guests */}
      <div>
        <Label>Guests</Label>
        <GuestRoster
          guests={guests}
          guestCount={guestCount}
          onGuestsChange={setGuests}
          onCountChange={setGuestCount}
        />
      </div>

      {/* Dietary tags */}
      <div>
        <Label>Dietary needs</Label>
        <div className="flex flex-wrap gap-2 mt-3">
          {DIETARY_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleDiet(tag)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all
                ${dietaryTags.includes(tag)
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'border-white/8 text-ink-400 hover:border-white/15'
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Budget slider */}
      <div>
        <div className="flex justify-between items-baseline mb-3">
          <Label>Total budget</Label>
          <span className="font-mono text-sm text-coral-400">
            ₹{budget.toLocaleString('en-IN')}
          </span>
        </div>
        <input
          type="range" min={500} max={15000} step={100}
          value={budget} onChange={e => setBudget(+e.target.value)}
        />
        <div className="flex justify-between text-xs text-ink-500 mt-1">
          <span>₹500</span><span>₹15,000</span>
        </div>
      </div>

      {/* Start time slider */}
      <div>
        <div className="flex justify-between items-baseline mb-3">
          <Label>Start time</Label>
          <span className="font-mono text-sm text-coral-400">{hourLabel}</span>
        </div>
        <input
          type="range" min={12} max={23} step={1}
          value={startHour} onChange={e => setStartHour(+e.target.value)}
        />
        <div className="flex justify-between text-xs text-ink-500 mt-1">
          <span>12 PM</span><span>11 PM</span>
        </div>
      </div>

      {/* Health focus slider */}
      <div>
        <div className="flex justify-between items-baseline mb-3">
          <Label>Vibe</Label>
          <span className="text-xs text-ink-400">{healthLabel}</span>
        </div>
        <input
          type="range" min={0} max={100} step={5}
          value={healthFocus} onChange={e => setHealthFocus(+e.target.value)}
        />
        <div className="flex justify-between text-xs text-ink-500 mt-1">
          <span>Indulgent</span><span>Healthy</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label>Anything else?</Label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. 'It's our anniversary' or 'One guest is allergic to nuts'"
          rows={2}
          className="w-full mt-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8
            text-sm text-ink-200 placeholder:text-ink-600 resize-none
            focus:outline-none focus:border-coral-500/40 transition-colors"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !location.trim()}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-coral-600 to-coral-500
          text-white text-sm font-medium tracking-wide
          hover:from-coral-500 hover:to-coral-400 transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:shadow-lg hover:shadow-coral-500/20 hover:-translate-y-0.5
          active:translate-y-0"
      >
        {isLoading ? 'Planning your evening...' : '✦ Plan My Event'}
      </button>

    </form>
  )
}

// Small reusable label component — keeps JSX clean
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium tracking-[2px] uppercase text-ink-500">
      {children}
    </span>
  )
}
