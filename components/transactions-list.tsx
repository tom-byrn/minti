"use client"

import { useEffect, useState } from "react"
import {
  ArrowDownLeft,
  Coffee,
  Home,
  ShoppingBag,
  Smartphone,
  Zap,
  Car,
  Plane,
  Utensils,
  Heart,
  Gamepad2,
  GraduationCap,
  Banknote,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PlaidTransaction {
  transaction_id: string
  name: string
  amount: number
  date: string
  category: string[] | null
  pending: boolean
  merchant_name: string | null
  personal_finance_category?: {
    primary: string
    detailed: string
  } | null
}

interface Transaction {
  id: string
  name: string
  category: string
  amount: number
  date: string
  icon: any
  status: "completed" | "pending"
}

const categoryIcons: Record<string, any> = {
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

function getCategoryIcon(category: string | null | undefined): any {
  if (!category) return CreditCard
  const upperCategory = category.toUpperCase()
  return categoryIcons[upperCategory] || CreditCard
}

function formatCategory(category: string | null | undefined): string {
  if (!category) return "Other"
  return category
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      const accessToken = localStorage.getItem("plaid_access_token")
      if (!accessToken) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/plaid/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken }),
        })

        if (response.status === 202) {
          setError("Transactions are being synced. Please check back in a moment.")
          setLoading(false)
          return
        }

        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }

        const data = await response.json()

        const formattedTransactions: Transaction[] = data.transactions.map((t: PlaidTransaction) => ({
          id: t.transaction_id,
          name: t.merchant_name || t.name,
          category: formatCategory(t.personal_finance_category?.primary || t.category?.[0]),
          amount: -t.amount, // Plaid returns positive for debits, we want negative
          date: formatDate(t.date),
          icon: getCategoryIcon(t.personal_finance_category?.primary || t.category?.[0]),
          status: t.pending ? "pending" : "completed",
        }))

        setTransactions(formattedTransactions)
      } catch (err) {
        console.error("Error fetching transactions:", err)
        setError("Failed to load transactions")
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Recent Transactions</CardTitle>
          <CardDescription className="text-base">Your latest account activity and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Recent Transactions</CardTitle>
          <CardDescription className="text-base">Your latest account activity and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Recent Transactions</CardTitle>
          <CardDescription className="text-base">Your latest account activity and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Recent Transactions</CardTitle>
        <CardDescription className="text-base">Your latest account activity and transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const Icon = transaction.icon
              const isIncome = transaction.amount > 0

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:bg-card hover:shadow-md hover:border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-base">{transaction.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-muted-foreground">{transaction.category}</p>
                        <span className="text-muted-foreground/50">•</span>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {transaction.status === "pending" && (
                      <Badge variant="outline" className="text-sm border-border/50">
                        Pending
                      </Badge>
                    )}
                    <p className={`text-xl font-semibold font-serif ${isIncome ? "text-primary" : "text-foreground"}`}>
                      {isIncome ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
