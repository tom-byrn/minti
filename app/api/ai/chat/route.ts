import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getSystemPrompt } from '@/lib/ai/system-prompt'
import { getFinancialContext } from '@/lib/ai/financial-context'

export const maxDuration = 30

const CLAUDE_MODEL_NAME = 'claude-haiku-4-5-20251001'

// Helper to extract text from message (handles both old content format and new parts format)
function getMessageContent(message: { content?: string; parts?: Array<{ type: string; text?: string }> }): string {
  if (message.content) {
    return message.content
  }
  if (message.parts) {
    return message.parts
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text)
      .join('')
  }
  return ''
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, sessionId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages are required', { status: 400 })
    }

    if (!sessionId) {
      return new Response('Session ID is required', { status: 400 })
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return new Response('Session not found', { status: 404 })
    }

    // Get the latest user message to save
    const latestMessage = messages[messages.length - 1]
    if (latestMessage?.role === 'user') {
      const content = getMessageContent(latestMessage)
      if (content) {
        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId,
          role: 'user',
          content: content,
        })
      }
    }

    // Update session updated_at
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    // Convert messages to format expected by AI SDK
    const formattedMessages = messages.map((msg: { role: string; content?: string; parts?: Array<{ type: string; text?: string }> }) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: getMessageContent(msg),
    }))

    // Get financial context for personalized responses
    const financialContext = await getFinancialContext(user.id)
    const systemPrompt = getSystemPrompt(financialContext)

    // Stream the response
    const result = streamText({
      model: anthropic(CLAUDE_MODEL_NAME),
      system: systemPrompt,
      messages: formattedMessages,
      onFinish: async ({ text }) => {
        // Save assistant message to database
        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: text,
        })
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
