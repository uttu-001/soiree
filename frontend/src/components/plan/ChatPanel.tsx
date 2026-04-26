/**
 * components/plan/ChatPanel.tsx — Follow-up chat for refining the plan.
 *
 * Appears below the plan after generation completes (status=done).
 * Lets users refine the plan conversationally:
 *   "make it more romantic"
 *   "switch to Italian cuisine"
 *   "we added a vegan guest"
 *   "suggest cocktail pairings"
 *
 * CONCEPT: Controlled input with Enter to send
 * ---------------------------------------------
 * The textarea is controlled (value tied to React state).
 * Enter sends the message, Shift+Enter adds a newline.
 * This is standard chat UX — mirrors WhatsApp, Slack etc.
 *
 * CONCEPT: Auto-scroll to latest message
 * ----------------------------------------
 * useRef on the messages container lets us call scrollIntoView()
 * whenever a new message arrives. Without this, the user would
 * have to manually scroll down to see new replies.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useChatStream, ChatMessage } from '@/hooks/useChatStream'

interface Props {
  eventData: Record<string, unknown>
}

export function ChatPanel({ eventData }: Props) {
  const [input, setInput] = useState('')
  const { messages, isStreaming, currentReply, error, sendMessage } = useChatStream(eventData)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentReply])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
    setInput('')
  }

  const showChat = messages.length > 0 || isStreaming

  return (
    <div className="mt-6 border-t border-white/5 pt-6">

      {/* Section label */}
      <div className="text-[10px] font-medium tracking-[2px] uppercase text-ink-500 mb-4">
        Refine your plan
      </div>

      {/* Suggestion chips — quick actions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            'Make it more romantic',
            'Switch to Italian cuisine',
            'Suggest cocktail pairings',
            'We added a vegan guest',
            'Reduce budget by ₹500',
          ].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => { sendMessage(suggestion); }}
              className="text-xs px-3 py-1.5 rounded-full border border-white/8
                text-ink-400 hover:border-coral-500/30 hover:text-coral-400
                transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Message history */}
      {showChat && (
        <div className="flex flex-col gap-4 mb-4 max-h-80 overflow-y-auto">
          {messages.map((msg, i) => (
            <Message key={i} message={msg} />
          ))}

          {/* Streaming reply — shown while assistant is typing */}
          {isStreaming && currentReply && (
            <Message
              message={{ role: 'assistant', content: currentReply }}
              isStreaming
            />
          )}

          {/* Loading indicator — before first token arrives */}
          {isStreaming && !currentReply && (
            <div className="flex gap-2 items-center">
              <div className="w-6 h-6 rounded-full bg-coral-500/10 border border-coral-500/20
                flex items-center justify-center text-xs text-coral-400">✦</div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-coral-500/40"
                    style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-coral-400">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything — 'make it more romantic', 'switch to Italian'..."
          rows={1}
          disabled={isStreaming}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/3 border border-white/8
            text-sm text-ink-200 placeholder:text-ink-600 resize-none
            focus:outline-none focus:border-coral-500/40 transition-colors
            disabled:opacity-40"
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-coral-500/10 border border-coral-500/20
            text-coral-400 text-sm hover:bg-coral-500/15 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↑
        </button>
      </div>

      <p className="text-[10px] text-ink-600 mt-2">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}

// Individual message bubble
function Message({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center
        text-xs flex-shrink-0 border
        ${isUser
          ? 'bg-white/5 border-white/10 text-ink-400'
          : 'bg-coral-500/10 border-coral-500/20 text-coral-400'
        }`}>
        {isUser ? '↑' : '✦'}
      </div>

      {/* Content */}
      <div className={`max-w-sm px-3 py-2 rounded-xl text-sm leading-relaxed
        ${isUser
          ? 'bg-white/5 border border-white/8 text-ink-300 rounded-tr-none'
          : 'bg-coral-500/5 border border-coral-500/10 text-ink-200 rounded-tl-none'
        } ${isStreaming ? 'streaming-cursor' : ''}`}>
        {message.content}
      </div>
    </div>
  )
}