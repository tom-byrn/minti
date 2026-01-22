"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  ArrowDownLeft,
  Car,
  Plane,
  ShoppingBag,
  Gamepad2,
  Home,
  Heart,
  GraduationCap,
  Banknote,
  CreditCard,
  Utensils,
  Zap,
  Loader2,
} from "lucide-react"
import type { SearchableTransaction } from "@/app/api/plaid/search/route"

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "FOOD_AND_DRINK": Utensils,
  "TRANSPORTATION": Car,
  "TRAVEL": Plane,
  "SHOPPING": ShoppingBag,
  "ENTERTAINMENT": Gamepad2,
  "RENT_AND_UTILITIES": Home,
  "MEDICAL": Heart,
  "EDUCATION": GraduationCap,
  "TRANSFER_IN": ArrowDownLeft,
  "TRANSFER_OUT": Banknote,
  "INCOME": ArrowDownLeft,
  "LOAN_PAYMENTS": CreditCard,
  "GENERAL_MERCHANDISE": ShoppingBag,
  "PERSONAL_CARE": Heart,
  "GENERAL_SERVICES": Zap,
  "GOVERNMENT_AND_NON_PROFIT": Home,
  "HOME_IMPROVEMENT": Home,
  "BANK_FEES": CreditCard,
}

function getCategoryIcon(category: string | null | undefined): React.ComponentType<{ className?: string }> {
  if (!category) return CreditCard
  const upperCategory = category.toUpperCase()
  return categoryIcons[upperCategory] || CreditCard
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatAmount(amount: number): { display: string; isIncome: boolean } {
  // Plaid returns positive for debits (money going out) and negative for credits (money coming in)
  const isIncome = amount < 0
  const absAmount = Math.abs(amount)
  return {
    display: `${isIncome ? "+" : "-"}$${absAmount.toFixed(2)}`,
    isIncome,
  }
}

interface TransactionSearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransactionSearchCommand({ open, onOpenChange }: TransactionSearchCommandProps) {
  const router = useRouter()
  const [transactions, setTransactions] = useState<SearchableTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch transactions when modal opens
  useEffect(() => {
    if (open && transactions.length === 0 && !loading) {
      const fetchTransactions = async () => {
        setLoading(true)
        setError(null)
        try {
          const response = await fetch("/api/plaid/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })

          if (response.status === 404) {
            // No connected accounts
            setLoading(false)
            return
          }

          if (!response.ok) {
            throw new Error("Failed to fetch transactions")
          }

          const data = await response.json()
          setTransactions(data.transactions)
        } catch (err) {
          console.error("Error fetching transactions:", err)
          setError("Failed to load transactions")
        } finally {
          setLoading(false)
        }
      }

      fetchTransactions()
    }
  }, [open, transactions.length, loading])

  // Reset search query when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("")
    }
  }, [open])

  // Filter transactions based on search query (client-side filtering)
  const filteredTransactions = useCallback(() => {
    if (!searchQuery.trim()) {
      return transactions.slice(0, 20) // Show first 20 recent transactions
    }

    const query = searchQuery.toLowerCase()
    return transactions.filter((t) => {
      const searchableFields = [
        t.name,
        t.merchant_name,
        t.account_name,
        t.institution_name,
        t.personal_finance_category?.primary,
      ]
      return searchableFields.some((field) => field?.toLowerCase().includes(query))
    }).slice(0, 50) // Limit to 50 results for performance
  }, [transactions, searchQuery])

  const handleSelect = (transaction: SearchableTransaction) => {
    onOpenChange(false)
    // Navigate to the account's transactions page
    router.push(`/accounts/${transaction.account_id}/transactions`)
  }

  const results = filteredTransactions()

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Transactions"
      description="Search across all your connected accounts"
    >
      <CommandInput
        placeholder="Search transactions..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <CommandEmpty>{error}</CommandEmpty>
        )}

        {!loading && !error && results.length === 0 && searchQuery && (
          <CommandEmpty>No transactions found for &quot;{searchQuery}&quot;</CommandEmpty>
        )}

        {!loading && !error && results.length === 0 && !searchQuery && (
          <CommandEmpty>No transactions available</CommandEmpty>
        )}

        {!loading && !error && results.length > 0 && (
          <CommandGroup heading={searchQuery ? "Search Results" : "Recent Transactions"}>
            {results.map((transaction) => {
              const Icon = getCategoryIcon(transaction.personal_finance_category?.primary)
              const { display: amountDisplay, isIncome } = formatAmount(transaction.amount)
              const accountBadge = transaction.institution_name
                ? `${transaction.institution_name}${transaction.account_mask ? ` ****${transaction.account_mask}` : ""}`
                : transaction.account_name

              return (
                <CommandItem
                  key={transaction.transaction_id}
                  value={`${transaction.name} ${transaction.merchant_name || ""} ${transaction.account_name}`}
                  onSelect={() => handleSelect(transaction)}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {transaction.merchant_name || transaction.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {formatDate(transaction.date)} • {accountBadge}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ml-3 ${isIncome ? "text-primary" : "text-foreground"}`}>
                    {amountDisplay}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
