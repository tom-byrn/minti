"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { month: "Jan", spending: 4200, income: 6500 },
  { month: "Feb", spending: 3800, income: 6500 },
  { month: "Mar", spending: 5100, income: 7200 },
  { month: "Apr", spending: 4600, income: 6800 },
  { month: "May", spending: 5400, income: 7500 },
  { month: "Jun", spending: 4900, income: 7000 },
  { month: "Jul", spending: 5800, income: 8200 },
]

export function SpendingChart() {
  const incomeColor = "#6ee7b7" // Mint green
  const spendingColor = "#4ade80" // Vibrant green

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Financial Overview</CardTitle>
        <CardDescription className="text-base">Your income and spending trends over the last 7 months</CardDescription>
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
            <YAxis className="text-sm" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
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
            <Area type="monotone" dataKey="income" stroke={incomeColor} strokeWidth={2.5} fill="url(#income)" />
            <Area type="monotone" dataKey="spending" stroke={spendingColor} strokeWidth={2.5} fill="url(#spending)" />
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
