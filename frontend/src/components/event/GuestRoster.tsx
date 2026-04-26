/**
 * components/event/GuestRoster.tsx — Guest management component.
 *
 * Supports two modes:
 *   1. Headcount only — a simple number input (guest_count)
 *   2. Named guests — add names with per-person dietary tags
 *
 * The user switches between modes with a toggle.
 * In headcount mode, guests array is empty and guest_count is used.
 * In named mode, guest_count is ignored (derived from guests.length).
 */

'use client'

import { useState } from 'react'
import type { Guest } from '@/types'
import { DIETARY_TAGS } from '@/types'

interface Props {
  guests: Guest[]
  guestCount: number
  onGuestsChange: (guests: Guest[]) => void
  onCountChange: (count: number) => void
}

export function GuestRoster({ guests, guestCount, onGuestsChange, onCountChange }: Props) {
  const [mode, setMode] = useState<'count' | 'named'>('count')
  const [newName, setNewName] = useState('')

  function addGuest() {
    if (!newName.trim()) return
    onGuestsChange([...guests, { name: newName.trim(), dietary_tags: [] }])
    setNewName('')
  }

  function removeGuest(index: number) {
    onGuestsChange(guests.filter((_, i) => i !== index))
  }

  function toggleGuestDiet(index: number, tag: string) {
    const updated = guests.map((g, i) =>
      i !== index ? g : {
        ...g,
        dietary_tags: g.dietary_tags.includes(tag)
          ? g.dietary_tags.filter(t => t !== tag)
          : [...g.dietary_tags, tag],
      }
    )
    onGuestsChange(updated)
  }

  return (
    <div className="mt-3">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        {(['count', 'named'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); if (m === 'count') onGuestsChange([]) }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all
              ${mode === m
                ? 'border-coral-500/50 text-coral-400 bg-coral-500/8'
                : 'border-white/8 text-ink-500 hover:border-white/15'
              }`}
          >
            {m === 'count' ? 'Headcount' : 'Add names'}
          </button>
        ))}
      </div>

      {mode === 'count' ? (
        /* Headcount mode — simple number input */
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onCountChange(Math.max(1, guestCount - 1))}
            className="w-8 h-8 rounded-lg border border-white/8 text-ink-300
              hover:border-white/20 transition-colors flex items-center justify-center"
          >−</button>
          <span className="font-mono text-lg w-8 text-center">{guestCount}</span>
          <button
            type="button"
            onClick={() => onCountChange(Math.min(100, guestCount + 1))}
            className="w-8 h-8 rounded-lg border border-white/8 text-ink-300
              hover:border-white/20 transition-colors flex items-center justify-center"
          >+</button>
          <span className="text-sm text-ink-500">people</span>
        </div>
      ) : (
        /* Named mode — add guests with dietary tags */
        <div className="flex flex-col gap-2">
          {/* Add guest input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGuest())}
              placeholder="Guest name"
              className="flex-1 px-3 py-2 rounded-lg bg-white/3 border border-white/8
                text-sm text-ink-200 placeholder:text-ink-600
                focus:outline-none focus:border-coral-500/40 transition-colors"
            />
            <button
              type="button"
              onClick={addGuest}
              className="px-3 py-2 rounded-lg border border-white/8 text-ink-400
                hover:border-white/20 text-sm transition-colors"
            >Add</button>
          </div>

          {/* Guest list */}
          {guests.map((guest, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{guest.name}</span>
                <button
                  type="button"
                  onClick={() => removeGuest(i)}
                  className="text-ink-600 hover:text-ink-300 text-xs transition-colors"
                >Remove</button>
              </div>
              {/* Per-guest dietary tags */}
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleGuestDiet(i, tag)}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-all
                      ${guest.dietary_tags.includes(tag)
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'border-white/8 text-ink-500 hover:border-white/15'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {guests.length === 0 && (
            <p className="text-xs text-ink-600 italic">No guests added yet</p>
          )}
        </div>
      )}
    </div>
  )
}
