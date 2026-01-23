"use client"

import { useEffect, useState, useCallback } from "react"
import { CreditCard, DollarSign, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ReconnectBankCard } from "@/components/reconnect-bank-card"

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
  const [hasConnectedAccount, setHasConnectedAccount] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/plaid/balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (response.status === 404) {
        // No connected accounts
        setHasConnectedAccount(false)
        return
      }

      if (!response.ok) {
        setError("Your bank connection has expired. Please reconnect your account.")
        setHasConnectedAccount(false)
        return
      }

      setHasConnectedAccount(true)

      if (data.accounts) {
        const formattedAccounts: Account[] = [
          {
            name: "Total Balance",
            amount: `$${data.totalBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            icon: DollarSign,
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
    } catch (err) {
      console.error("Error fetching balance:", err)
      setError("Failed to connect to your bank. Please try again.")
      setHasConnectedAccount(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const handlePlaidSuccess = () => {
    setError(null)
    fetchBalance()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Total Balance Card */}
        <Card className="border-border/50 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-14 w-64 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Skeleton Accounts List */}
        <div className="space-y-3">
          <div className="h-6 w-32 bg-muted-foreground/20 rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Card key={i} className="border-border/50 bg-card/60 backdrop-blur">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-muted-foreground/20 animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted-foreground/20 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-8 w-24 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!hasConnectedAccount) {
    return <ReconnectBankCard onSuccess={handlePlaidSuccess} error={error} />
  }

  const totalBalance = accounts[0]
  const individualAccounts = accounts.slice(1)

  return (
    <div className="space-y-6">
      {/* Hero Total Balance Card */}
      {totalBalance && (
        <Card className="border-border/50 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Total Balance
              </p>
              <div className="text-6xl font-bold font-serif text-foreground">
                {totalBalance.amount}
              </div>
              <p className="text-sm text-muted-foreground">
                Across {individualAccounts.length} {individualAccounts.length === 1 ? 'account' : 'accounts'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Accounts List */}
      {individualAccounts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Your Accounts</h3>
          <div className="space-y-2">
            {individualAccounts.map((account) => {
              const Icon = account.icon
              return (
                <Card key={account.name} className="transition-all hover:shadow-md hover:border-primary/20 border-border/50 bg-card/60 backdrop-blur">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{account.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {account.icon === CreditCard ? 'Credit' : account.icon === TrendingUp ? 'Savings' : 'Checking'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-serif text-foreground">{account.amount}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
