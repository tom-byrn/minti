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
  const incomeColor = "#5eead4" // Pastel teal
  const spendingColor = "#6ee7b7" // Pastel mint green

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Your income and spending trends over the last 7 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={incomeColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={incomeColor} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="spending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={spendingColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={spendingColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Area type="monotone" dataKey="income" stroke={incomeColor} strokeWidth={2} fill="url(#income)" />
            <Area type="monotone" dataKey="spending" stroke={spendingColor} strokeWidth={2} fill="url(#spending)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: incomeColor }} />
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: spendingColor }} />
            <span className="text-muted-foreground">Spending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
