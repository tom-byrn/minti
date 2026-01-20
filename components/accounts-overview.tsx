"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CreditCard, DollarSign, TrendingUp, Loader2 } from "lucide-react"
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
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = async (accessToken: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/plaid/balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: accessToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        localStorage.removeItem("plaid_access_token")
        setError("Your bank connection has expired. Please reconnect your account.")
        setHasAccessToken(false)
        return
      }

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
      localStorage.removeItem("plaid_access_token")
      setError("Failed to connect to your bank. Please try again.")
      setHasAccessToken(false)
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
    setError(null)
    setHasAccessToken(true)
    fetchBalance(accessToken)
  }

  if (!hasAccessToken) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Card className="max-w-md w-full border-border/50 shadow-lg bg-card/80 backdrop-blur">
          <CardHeader className="space-y-3">
            {error ? (
              <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            ) : (
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            )}
            <CardTitle className="text-center font-serif text-3xl">
              {error ? "Reconnect Your Bank" : "Connect Your Bank Account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <p className="text-center text-base text-muted-foreground leading-relaxed">
              {error || "Connect your bank account with Plaid to view your real-time balance and transactions in one beautiful place."}
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
