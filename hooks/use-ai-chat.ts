'use client'

import { useChat, type UIMessage } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { useState, useCallback, useEffect, ChangeEvent, useRef } from 'react'

export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Helper to extract text content from UIMessage parts
export function getMessageText(message: UIMessage): string {
  if (!message.parts || message.parts.length === 0) {
    return ''
  }
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

// Create transport once, use ref for dynamic session ID
const createTransport = (sessionIdRef: React.MutableRefObject<string | null>) =>
  new TextStreamChatTransport({
    api: '/api/ai/chat',
    body: () => ({
      sessionId: sessionIdRef.current,
    }),
  })

export function useAIChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [input, setInput] = useState('')

  // Use ref to track session ID without recreating transport
  const sessionIdRef = useRef<string | null>(null)
  const transportRef = useRef<TextStreamChatTransport<UIMessage> | null>(null)

  // Keep ref in sync with state
  sessionIdRef.current = currentSessionId

  // Create transport only once
  if (!transportRef.current) {
    transportRef.current = createTransport(sessionIdRef)
  }

  const {
    messages,
    setMessages,
    sendMessage: chatSendMessage,
    status,
  } = useChat({
    transport: transportRef.current,
    onFinish: () => {
      // Refresh sessions after a message is complete
      fetchSessions()
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentSessionId(sessionId)
        // Convert database messages to UIMessage format with parts
        const chatMessages = data.messages.map((msg: ChatMessage) => ({
          id: msg.id,
          role: msg.role,
          parts: [{ type: 'text', text: msg.content }],
        }))
        setMessages(chatMessages)
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }, [setMessages])

  const createNewSession = useCallback(() => {
    setCurrentSessionId(null)
    setMessages([])
  }, [setMessages])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          createNewSession()
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }, [currentSessionId, createNewSession])

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      const response = await fetch(`/api/ai/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (response.ok) {
        const data = await response.json()
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? data.session : s))
        )
      }
    } catch (error) {
      console.error('Error updating session title:', error)
    }
  }, [])

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      const messageContent = input.trim()
      setInput('')

      // Create session before first message if needed
      if (!sessionIdRef.current) {
        try {
          const response = await fetch('/api/ai/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: messageContent.slice(0, 50) }),
          })
          if (response.ok) {
            const data = await response.json()
            setCurrentSessionId(data.session.id)
            // Wait for ref to be updated
            sessionIdRef.current = data.session.id
          }
        } catch (error) {
          console.error('Error creating session:', error)
          setInput(messageContent)
          return
        }
      }

      try {
        await chatSendMessage({ text: messageContent })
      } catch (error) {
        console.error('Error sending message:', error)
        setInput(messageContent)
      }
    },
    [input, isLoading, chatSendMessage]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      // Create session before first message if needed
      if (!sessionIdRef.current) {
        try {
          const response = await fetch('/api/ai/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: content.slice(0, 50) }),
          })
          if (response.ok) {
            const data = await response.json()
            setCurrentSessionId(data.session.id)
            sessionIdRef.current = data.session.id
          }
        } catch (error) {
          console.error('Error creating session:', error)
          return
        }
      }

      try {
        await chatSendMessage({ text: content })
      } catch (error) {
        console.error('Error sending message:', error)
      }
    },
    [isLoading, chatSendMessage]
  )

  // Initial fetch of sessions
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return {
    // Chat state
    messages,
    input,
    isLoading,
    handleInputChange,
    handleSubmit,
    sendMessage,

    // Session state
    sessions,
    currentSessionId,
    isLoadingSessions,

    // Session actions
    fetchSessions,
    loadSession,
    createNewSession,
    deleteSession,
    updateSessionTitle,
  }
}
