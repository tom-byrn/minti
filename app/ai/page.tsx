"use client"

import { useState } from "react"
import { Bot, Send, Sparkles } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AIPopupProvider } from "@/components/ai-popup-provider"

type Message = {
  id: number
  role: "user" | "assistant"
  content: string
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hi! I'm your AI financial assistant. I can help you analyze your spending, create budgets, answer questions about your finances, and provide personalized financial advice. How can I help you today?",
  },
]

const suggestedQuestions = [
  "What's my spending trend?",
  "Create a budget plan",
  "Analyze my expenses",
  "How can I save more money?",
  "What are my biggest expenses?",
  "Show me investment opportunities",
]

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: messages.length + 2,
        role: "assistant",
        content:
          "Based on your recent transactions, I can see you've spent $5,800 this month. Your largest expense category is Housing at $2,100, followed by Shopping at $1,389. You're on track with your budget, but I'd recommend reducing discretionary spending by 15% to meet your savings goal. Would you like me to create a detailed savings plan for you?",
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <AIPopupProvider hidePopup>
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 via-mint-50 to-cyan-50">
        <DashboardHeader />

        <main className="container mx-auto flex flex-1 flex-col px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Financial Assistant</h1>
                <p className="text-sm text-muted-foreground">Get personalized financial insights and advice</p>
              </div>
            </div>

            {/* Chat Container */}
            <div className="flex flex-1 flex-col rounded-lg border border-border bg-card shadow-sm">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="leading-relaxed">{message.content}</p>
                      </div>
                      {message.role === "user" && (
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Bot className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-3">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.3s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Suggested Questions */}
              {messages.length === 1 && (
                <div className="border-t border-border p-4">
                  <p className="mb-3 text-sm text-muted-foreground">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question) => (
                      <Button
                        key={question}
                        variant="outline"
                        size="sm"
                        className="bg-transparent"
                        onClick={() => handleSuggestedQuestion(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="border-t border-border p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask me anything about your finances..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon" className="h-10 w-10">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AIPopupProvider>
  )
}
