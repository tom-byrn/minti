"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2, AlertCircle } from "lucide-react"

interface PlaidTransaction {
  transaction_id: string
  amount: number
  date: string
  personal_finance_category?: {
    primary: string
  } | null
}

interface MonthlyData {
  month: string
  spending: number
  income: number
}

function processTransactions(transactions: PlaidTransaction[]): MonthlyData[] {
  const monthlyMap = new Map<string, { spending: number; income: number }>()

  // Get last 6 months
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthKey = date.toLocaleDateString("en-US", { month: "short" })
    months.push(monthKey)
    monthlyMap.set(monthKey, { spending: 0, income: 0 })
  }

  transactions.forEach((t) => {
    const date = new Date(t.date)
    const monthKey = date.toLocaleDateString("en-US", { month: "short" })

    if (monthlyMap.has(monthKey)) {
      const current = monthlyMap.get(monthKey)!
      // Plaid: positive amount = money leaving account (spending)
      // Plaid: negative amount = money entering account (income)
      if (t.amount > 0) {
        current.spending += t.amount
      } else {
        current.income += Math.abs(t.amount)
      }
      monthlyMap.set(monthKey, current)
    }
  })

  return months.map((month) => ({
    month,
    spending: Math.round(monthlyMap.get(month)?.spending || 0),
    income: Math.round(monthlyMap.get(month)?.income || 0),
  }))
}

export function SpendingChart() {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const incomeColor = "#6ee7b7" // Mint green
  const spendingColor = "#4ade80" // Vibrant green

  useEffect(() => {
    const fetchTransactions = async () => {
      const accessToken = localStorage.getItem("plaid_access_token")
      if (!accessToken) {
        setLoading(false)
        return
      }

      try {
        // Fetch last 6 months of transactions
        const endDate = new Date().toISOString().split("T")[0]
        const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        const response = await fetch("/api/plaid/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            start_date: startDate,
            end_date: endDate,
          }),
        })

        if (response.status === 202) {
          setError("Transactions are being synced...")
          setLoading(false)
          return
        }

        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }

        const result = await response.json()
        const processedData = processTransactions(result.transactions)
        setData(processedData)
      } catch (err) {
        console.error("Error fetching transactions for chart:", err)
        setError("Failed to load chart data")
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
          <CardTitle className="font-serif text-2xl">Financial Overview</CardTitle>
          <CardDescription className="text-base">Your income and spending trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[320px]">
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
          <CardTitle className="font-serif text-2xl">Financial Overview</CardTitle>
          <CardDescription className="text-base">Your income and spending trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[320px] gap-3">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Financial Overview</CardTitle>
          <CardDescription className="text-base">Your income and spending trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[320px] gap-3">
            <p className="text-muted-foreground">Connect your bank to see your financial trends</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Financial Overview</CardTitle>
        <CardDescription className="text-base">Your income and spending trends over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={incomeColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={incomeColor} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="spending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={spendingColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={spendingColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="month" className="text-sm" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis className="text-sm" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `$${value}`} />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
              contentStyle={{
                backgroundColor: "rgba(220, 252, 231, 0.95)",
                color: "#1f2937",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                borderRadius: "12px",
                fontSize: "14px",
                padding: "8px 12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Area type="monotone" dataKey="income" stroke={incomeColor} strokeWidth={2.5} fill="url(#income)" name="Income" />
            <Area type="monotone" dataKey="spending" stroke={spendingColor} strokeWidth={2.5} fill="url(#spending)" name="Spending" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-6 flex items-center justify-center gap-8 text-base">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: incomeColor }} />
            <span className="text-muted-foreground font-medium">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: spendingColor }} />
            <span className="text-muted-foreground font-medium">Spending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
