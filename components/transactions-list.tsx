"use client"

import { useEffect, useState } from "react"
import {
  ArrowDownLeft as ArrowDownLeftIcon,
  Coffee as CoffeeIcon,
  House as HouseIcon,
  ShoppingBag as ShoppingBagIcon,
  DeviceMobile as DeviceMobileIcon,
  Lightning as LightningIcon,
  Car as CarIcon,
  AirplaneTilt as AirplaneTiltIcon,
  ForkKnife as ForkKnifeIcon,
  Heart as HeartIcon,
  GameController as GameControllerIcon,
  GraduationCap as GraduationCapIcon,
  Money as MoneyIcon,
  CreditCard as CreditCardIcon,
  WarningCircle as WarningCircleIcon,
} from "@phosphor-icons/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

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
  "FOOD_AND_DRINK": ForkKnifeIcon,
  "TRANSPORTATION": CarIcon,
  "TRAVEL": AirplaneTiltIcon,
  "SHOPPING": ShoppingBagIcon,
  "ENTERTAINMENT": GameControllerIcon,
  "RENT_AND_UTILITIES": HouseIcon,
  "MEDICAL": HeartIcon,
  "EDUCATION": GraduationCapIcon,
  "TRANSFER_IN": ArrowDownLeftIcon,
  "TRANSFER_OUT": MoneyIcon,
  "INCOME": ArrowDownLeftIcon,
  "LOAN_PAYMENTS": CreditCardIcon,
  "GENERAL_MERCHANDISE": ShoppingBagIcon,
  "PERSONAL_CARE": HeartIcon,
  "GENERAL_SERVICES": LightningIcon,
  "GOVERNMENT_AND_NON_PROFIT": HouseIcon,
  "HOME_IMPROVEMENT": HouseIcon,
  "BANK_FEES": CreditCardIcon,
}

function getCategoryIcon(category: string | null | undefined): any {
  if (!category) return CreditCardIcon
  const upperCategory = category.toUpperCase()
  return categoryIcons[upperCategory] || CreditCardIcon
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
      try {
        const response = await fetch("/api/plaid/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })

        if (response.status === 404) {
          // No connected accounts
          setLoading(false)
          return
        }

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
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
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
            <WarningCircleIcon className="h-8 w-8 text-muted-foreground" weight="thin" />
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
            <CreditCardIcon className="h-8 w-8 text-muted-foreground" weight="thin" />
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
