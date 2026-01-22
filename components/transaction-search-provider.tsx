"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { TransactionSearchCommand } from "./transaction-search-command"

interface TransactionSearchContextType {
  isOpen: boolean
  openSearch: () => void
  closeSearch: () => void
  toggleSearch: () => void
}

const TransactionSearchContext = createContext<TransactionSearchContextType | undefined>(undefined)

export function useTransactionSearch() {
  const context = useContext(TransactionSearchContext)
  if (!context) {
    throw new Error("useTransactionSearch must be used within TransactionSearchProvider")
  }
  return context
}

interface TransactionSearchProviderProps {
  children: ReactNode
}

export function TransactionSearchProvider({ children }: TransactionSearchProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openSearch = useCallback(() => setIsOpen(true), [])
  const closeSearch = useCallback(() => setIsOpen(false), [])
  const toggleSearch = useCallback(() => setIsOpen((prev) => !prev), [])

  // Keyboard shortcut: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        toggleSearch()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggleSearch])

  return (
    <TransactionSearchContext.Provider value={{ isOpen, openSearch, closeSearch, toggleSearch }}>
      {children}
      <TransactionSearchCommand open={isOpen} onOpenChange={setIsOpen} />
    </TransactionSearchContext.Provider>
  )
}
