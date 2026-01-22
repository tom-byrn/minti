"use client"

import { useState, useEffect } from "react"
import { CreditCard, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlaidLink } from "@/components/plaid-link"

interface BankAccount {
  name: string
  type: string
  mask: string
}

export default function AccountsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [hasBankConnection, setHasBankConnection] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchBankDetails = async () => {
    try {
      const response = await fetch("/api/plaid/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (response.status === 404) {
        setHasBankConnection(false)
        setLoading(false)
        return
      }

      if (response.ok) {
        setHasBankConnection(true)
        const data = await response.json()
        if (data.accounts) {
          setBankAccounts(
            data.accounts.map((acc: any) => ({
              name: acc.name,
              type: acc.type,
              mask: acc.mask || "****",
            }))
          )
        }
      } else {
        setHasBankConnection(false)
      }
    } catch {
      setHasBankConnection(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBankDetails()
  }, [])

  const handleBankReconnect = () => {
    // TODO: Implement server-side disconnect
    setHasBankConnection(false)
    setBankAccounts([])
  }

  const handlePlaidSuccess = async () => {
    fetchBankDetails()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold mb-2">Accounts</h2>
        <p className="text-muted-foreground">Manage your connected bank accounts</p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            Connected Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : hasBankConnection && bankAccounts.length > 0 ? (
            <div className="space-y-3">
              {bankAccounts.map((account, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-border/50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{account.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {account.type} ••••{account.mask}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-primary" />
              </div>
              <p className="text-center text-muted-foreground text-lg">
                No bank account connected
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5 shadow-lg">
        <CardContent className="pt-6">
          {hasBankConnection ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Change Bank Account</h3>
                <p className="text-sm text-muted-foreground">
                  Disconnect your current bank account and connect a new one.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleBankReconnect}
              >
                Disconnect & Reconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Connect Bank Account</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your bank account to start tracking your finances.
                </p>
              </div>
              <PlaidLink onSuccess={handlePlaidSuccess} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
