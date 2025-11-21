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
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Card className="max-w-md w-full border-border/50 shadow-lg bg-card/80 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-center font-serif text-3xl">Connect Your Bank Account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <p className="text-center text-base text-muted-foreground leading-relaxed">
              Connect your bank account with Plaid to view your real-time balance and transactions in one beautiful place.
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
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {accounts.map((account) => {
        const Icon = account.icon
        return (
          <Card key={account.name} className="transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground leading-tight min-h-[2.5rem] flex items-center">
                {account.name}
              </CardTitle>
              <div className={`h-10 w-10 rounded-xl ${account.color.replace('text-', 'bg-')}/10 flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${account.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-balance font-serif">{account.amount}</div>
              {account.change && (
                <div className="mt-2 flex items-center gap-1.5 text-sm flex-wrap">
                  {account.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4 text-accent flex-shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive flex-shrink-0" />
                  )}
                  <span className={account.trend === "up" ? "text-accent font-medium" : "text-destructive font-medium"}>{account.change}</span>
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
