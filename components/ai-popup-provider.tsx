"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { AIAssistantPopup } from "./ai-assistant-popup"

interface AIPopupContextType {
  isOpen: boolean
  openPopup: () => void
  closePopup: () => void
  togglePopup: () => void
}

const AIPopupContext = createContext<AIPopupContextType | undefined>(undefined)

export function useAIPopup() {
  const context = useContext(AIPopupContext)
  if (!context) {
    throw new Error("useAIPopup must be used within AIPopupProvider")
  }
  return context
}

interface AIPopupProviderProps {
  children: ReactNode
  hidePopup?: boolean
}

export function AIPopupProvider({ children, hidePopup = false }: AIPopupProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openPopup = () => setIsOpen(true)
  const closePopup = () => setIsOpen(false)
  const togglePopup = () => setIsOpen((prev) => !prev)

  return (
    <AIPopupContext.Provider value={{ isOpen, openPopup, closePopup, togglePopup }}>
      {children}
      {!hidePopup && <AIAssistantPopup isOpen={isOpen} onClose={closePopup} />}
    </AIPopupContext.Provider>
  )
}
