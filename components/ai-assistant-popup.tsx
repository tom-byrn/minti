"use client"

import { useEffect, useRef } from "react"
import { Bot, ChevronLeft, MessageSquarePlus, Send, Sparkles, Trash2, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAIChat, getMessageText } from "@/hooks/use-ai-chat"
import { Markdown } from "@/components/markdown"
import { cn } from "@/lib/utils"
import { useState } from "react"

const suggestedQuestions = ["What's my spending trend?", "Create a budget plan", "Analyze my expenses"]

interface AIAssistantPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function AIAssistantPopup({ isOpen, onClose }: AIAssistantPopupProps) {
  const {
    messages,
    input,
    isLoading,
    handleInputChange,
    handleSubmit,
    sendMessage,
    sessions,
    currentSessionId,
    isLoadingSessions,
    loadSession,
    createNewSession,
    deleteSession,
  } = useAIChat()

  const [showSessions, setShowSessions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div className="fixed bottom-4 right-4 z-50 w-[400px] max-w-[calc(100vw-2rem)]">
        <Card className="flex h-[600px] max-h-[calc(100vh-2rem)] flex-col shadow-2xl bg-background border-border/50">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showSessions ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowSessions(false)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">
                    {showSessions ? "Chat History" : "AI Financial Assistant"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {showSessions ? "Select a conversation" : "Ask about your finances"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!showSessions && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowSessions(true)}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-0">
            {showSessions ? (
              // Sessions List
              <div className="flex flex-1 flex-col">
                <div className="border-b border-border p-3">
                  <Button
                    onClick={() => {
                      createNewSession()
                      setShowSessions(false)
                    }}
                    className="w-full gap-2"
                    variant="outline"
                    size="sm"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    New Chat
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {isLoadingSessions ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : sessions.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No conversations yet
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className={cn(
                              "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer",
                              currentSessionId === session.id
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => {
                              loadSession(session.id)
                              setShowSessions(false)
                            }}
                          >
                            <div className="flex-1 truncate">
                              <p className="truncate font-medium">{session.title}</p>
                              <p className="text-xs opacity-60">
                                {formatDate(session.updated_at)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteSession(session.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              // Chat View
              <>
                <ScrollArea className="flex-1 overflow-hidden">
                  <div className="space-y-4 py-4 px-4">
                    {messages.length === 0 && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[85%] rounded-lg bg-muted px-4 py-2 text-foreground">
                          <p className="text-sm leading-relaxed">
                            Hi! I&apos;m Minti, your AI financial assistant. I can help you
                            analyze your spending, create budgets, and answer questions about
                            your finances. How can I help you today?
                          </p>
                        </div>
                      </div>
                    )}
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10">
                              <Bot className="h-4 w-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-2 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {message.role === "assistant" ? (
                            <Markdown content={getMessageText(message)} className="text-sm" />
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {getMessageText(message)}
                            </p>
                          )}
                        </div>
                        {message.role === "user" && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-2">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.3s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.15s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-foreground" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {messages.length === 0 && (
                  <div className="space-y-2 px-4">
                    <p className="text-xs text-muted-foreground">Suggested questions:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((question) => (
                        <Button
                          key={question}
                          variant="outline"
                          size="sm"
                          className="bg-transparent text-xs"
                          onClick={() => handleSuggestedQuestion(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-border p-4">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      placeholder="Ask about your finances..."
                      value={input}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
