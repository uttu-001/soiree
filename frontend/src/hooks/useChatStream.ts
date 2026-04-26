/**
 * hooks/useChatStream.ts — React hook for follow-up chat streaming.
 *
 * CONCEPT: Why a separate hook from usePlanStream?
 * --------------------------------------------------
 * Plan generation is a one-shot stream — fires once, completes.
 * Chat is multi-turn — each message adds to history, streams a reply,
 * then waits for the next message.
 *
 * State managed here:
 *   messages[]     — full conversation history (user + assistant turns)
 *   isStreaming    — true while assistant is writing
 *   currentReply   — the assistant's reply being streamed right now
 *
 * CONCEPT: Conversation history
 * --------------------------------
 * Each message sent to the backend includes the full history so
 * Claude has context. Without history, "make it more romantic"
 * would have no reference point.
 *
 * History format matches Anthropic's messages array:
 *   [{role: "user", content: "..."}, {role: "assistant", content: "..."}]
 */

'use client'

import { useState, useCallback } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  currentReply: string
  error: string | null
}

const INITIAL_STATE: ChatState = {
  messages: [],
  isStreaming: false,
  currentReply: '',
  error: null,
}

export function useChatStream(eventData: Record<string, unknown>) {
  const [state, setState] = useState<ChatState>(INITIAL_STATE)

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || state.isStreaming) return

    // Add user message to history immediately — good UX
    const userMsg: ChatMessage = { role: 'user', content: userMessage }
    const updatedHistory = [...state.messages, userMsg]

    setState(prev => ({
      ...prev,
      messages: updatedHistory,
      isStreaming: true,
      currentReply: '',
      error: null,
    }))

    try {
      // Build conversation history in Anthropic format
      // excluding the current user message (backend adds it)
      const history = state.messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/v1/plans/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMessage,
          event_data: eventData,
          conversation_history: history,
        }),
      })

      if (!response.ok) throw new Error(`Chat error: ${response.status}`)
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let fullReply = ''

      // Stream the assistant reply
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const lines = part.split('\n').filter(l => l.startsWith('data: '))
          if (!lines.length) continue
          const content = lines.map(l => l.slice(6)).join('\n').replace(/⏎/g, '\n')
          if (content.trim() === '[DONE]') break
          if (content.startsWith('[ERROR]')) throw new Error(content.slice(8))
          if (content.trim()) {
            fullReply += content
            setState(prev => ({ ...prev, currentReply: fullReply }))
          }
        }
      }

      reader.releaseLock()

      // Add completed assistant reply to history
      const assistantMsg: ChatMessage = { role: 'assistant', content: fullReply }
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isStreaming: false,
        currentReply: '',
      }))

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        isStreaming: false,
        currentReply: '',
        error: message,
      }))
    }
  }, [state.messages, state.isStreaming, eventData])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { ...state, sendMessage, reset }
}