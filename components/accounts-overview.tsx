"use client"

import { useEffect, useState } from "react"
import { ArrowDownRight, ArrowUpRight, CreditCard, DollarSign, TrendingUp, Wallet, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlaidLink } from "@/components/plaid-link"

interface Account {
  name: string
  amount: string
  change?: string
  trend?: "up" | "down"
  icon: any
  color: string
}

export function AccountsOverview() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccessToken, setHasAccessToken] = useState(false)

  const fetchBalance = async (accessToken: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/plaid/balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: accessToken }),
      })

      const data = await response.json()

      if (data.accounts) {
        const formattedAccounts: Account[] = [
          {
            name: "Total Balance",
            amount: `$${data.totalBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            icon: Wallet,
            color: "text-primary",
          },
          ...data.accounts.map((account: any) => ({
            name: account.name,
            amount: `$${account.balances.current?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}`,
            icon: account.type === "credit" ? CreditCard : account.subtype === "savings" ? TrendingUp : DollarSign,
            color: account.type === "credit" ? "text-destructive" : account.subtype === "savings" ? "text-chart-2" : "text-accent",
          })),
        ]

        setAccounts(formattedAccounts)
      }
    } catch (error) {
      console.error("Error fetching balance:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const accessToken = localStorage.getItem("plaid_access_token")
    if (accessToken) {
      setHasAccessToken(true)
      fetchBalance(accessToken)
    } else {
      setLoading(false)
    }
  }, [])

  const handlePlaidSuccess = (accessToken: string) => {
    setHasAccessToken(true)
    fetchBalance(accessToken)
  }

  if (!hasAccessToken) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Connect Your Bank Account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-muted-foreground">
              Connect your bank account with Plaid to view your real-time balance and transactions.
            </p>
            <PlaidLink onSuccess={handlePlaidSuccess} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {accounts.map((account) => {
        const Icon = account.icon
        return (
          <Card key={account.name} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground leading-tight min-h-[2.5rem] flex items-center">
                {account.name}
              </CardTitle>
              <Icon className={`h-4 w-4 ${account.color} flex-shrink-0 mt-1`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-balance">{account.amount}</div>
              {account.change && (
                <div className="mt-1 flex items-center gap-1 text-xs flex-wrap">
                  {account.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-accent flex-shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive flex-shrink-0" />
                  )}
                  <span className={account.trend === "up" ? "text-accent" : "text-destructive"}>{account.change}</span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
