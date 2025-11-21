"use client"

import { ArrowDownLeft, Coffee, Home, ShoppingBag, Smartphone, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const transactions = [
  {
    id: 1,
    name: "Starbucks Coffee",
    category: "Food & Dining",
    amount: -12.5,
    date: "2 hours ago",
    icon: Coffee,
    status: "completed",
  },
  {
    id: 2,
    name: "Salary Deposit",
    category: "Income",
    amount: 5420.0,
    date: "Today",
    icon: ArrowDownLeft,
    status: "completed",
  },
  {
    id: 3,
    name: "Amazon Purchase",
    category: "Shopping",
    amount: -89.99,
    date: "Yesterday",
    icon: ShoppingBag,
    status: "completed",
  },
  {
    id: 4,
    name: "Electric Bill",
    category: "Utilities",
    amount: -145.3,
    date: "2 days ago",
    icon: Zap,
    status: "completed",
  },
  {
    id: 5,
    name: "Rent Payment",
    category: "Housing",
    amount: -2100.0,
    date: "3 days ago",
    icon: Home,
    status: "completed",
  },
  {
    id: 6,
    name: "Apple Store",
    category: "Electronics",
    amount: -1299.0,
    date: "5 days ago",
    icon: Smartphone,
    status: "pending",
  },
]

export function TransactionsList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest account activity and transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const Icon = transaction.icon
              const isIncome = transaction.amount > 0

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isIncome ? "bg-accent/10" : "bg-muted"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isIncome ? "text-accent" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-medium">{transaction.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">{transaction.category}</p>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {transaction.status === "pending" && (
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    )}
                    <p className={`text-lg font-semibold ${isIncome ? "text-accent" : "text-foreground"}`}>
                      {isIncome ? "+" : ""}
                      {transaction.amount.toFixed(2)}
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
