"use client"

import { useEffect, useRef } from "react"
import { Robot as RobotIcon, ChatCircleDots as ChatCircleDotsIcon, PaperPlaneTilt as PaperPlaneTiltIcon, Trash as TrashIcon } from "@phosphor-icons/react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AIPopupProvider } from "@/components/ai-popup-provider"
import { Markdown } from "@/components/markdown"
import { useAIChat, getMessageText } from "@/hooks/use-ai-chat"
import { cn } from "@/lib/utils"
import { BankConnectionChecker } from "@/components/bank-connection-checker"

const suggestedQuestions = [
  "What's my spending trend?",
  "Create a budget plan",
  "Analyze my expenses",
  "How can I save more money?",
]

export default function AIPage() {
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

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <AIPopupProvider hidePopup>
      <div className="flex h-screen flex-col bg-background">
        <DashboardHeader />

        <BankConnectionChecker>
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card/50 lg:flex lg:flex-col">

          <div className="p-3">
            <Button
              onClick={createNewSession}
              className="w-full gap-2"
              variant="outline"
            >
              <ChatCircleDotsIcon className="h-4 w-4" weight="thin" />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
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
                    onClick={() => loadSession(session.id)}
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
                      <TrashIcon className="h-3 w-3" weight="thin" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex flex-1 flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Welcome message */}
              {messages.length === 0 && (
                <>
                  <div className="flex gap-4">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        <RobotIcon className="h-5 w-5 text-primary" weight="thin" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg bg-muted px-4 py-3 text-foreground">
                      <p className="leading-relaxed">
                        Hi! I&apos;m Minti, your AI financial assistant. I can help you
                        analyze your spending, create budgets, answer questions about
                        your finances, and provide personalized financial advice. How
                        can I help you today?
                      </p>
                    </div>
                  </div>

                  {/* Suggested Questions */}
                  <div className="ml-14">
                    <p className="mb-3 text-sm text-muted-foreground">
                      Try asking:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((question) => (
                        <Button
                          key={question}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestedQuestion(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        <RobotIcon className="h-5 w-5 text-primary" weight="thin" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <Markdown content={getMessageText(message)} />
                    ) : (
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {getMessageText(message)}
                      </p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10">
                      <RobotIcon className="h-5 w-5 text-primary" weight="thin" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-3">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/50" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-background p-4">
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
              <Input
                placeholder="Ask me anything about your finances..."
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                <PaperPlaneTiltIcon className="h-4 w-4" weight="thin" />
              </Button>
            </form>
          </div>
        </main>
          </div>
        </BankConnectionChecker>
      </div>
    </AIPopupProvider>
  )
}
