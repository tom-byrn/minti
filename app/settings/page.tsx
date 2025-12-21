"use client"

import { useState, useEffect } from "react"
import { User, Building2, CreditCard, AlertCircle, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlaidLink } from "@/components/plaid-link"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type SettingsTab = "details" | "banking"

interface UserDetails {
  name: string
  email: string
}

interface BankAccount {
  name: string
  type: string
  mask: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("details")
  const [user, setUser] = useState<UserDetails | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [hasBankConnection, setHasBankConnection] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserDetails = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUser({
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
        })
      }
    }

    const fetchBankDetails = async () => {
      const accessToken = localStorage.getItem("plaid_access_token")
      if (accessToken) {
        setHasBankConnection(true)
        try {
          const response = await fetch("/api/plaid/balance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: accessToken }),
          })

          if (response.ok) {
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
            localStorage.removeItem("plaid_access_token")
          }
        } catch {
          setHasBankConnection(false)
        }
      }
      setLoading(false)
    }

    fetchUserDetails()
    fetchBankDetails()
  }, [])

  const handleBankReconnect = () => {
    localStorage.removeItem("plaid_access_token")
    setHasBankConnection(false)
    setBankAccounts([])
  }

  const handlePlaidSuccess = async (accessToken: string) => {
    setHasBankConnection(true)
    try {
      const response = await fetch("/api/plaid/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      })

      if (response.ok) {
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
      }
    } catch (err) {
      console.error("Error fetching bank details:", err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <h1 className="font-serif text-3xl font-semibold mb-6">Settings</h1>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("details")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeTab === "details"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-5 w-5" />
                <span className="font-medium">Account Details</span>
              </button>
              <button
                onClick={() => setActiveTab("banking")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeTab === "banking"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Banking</span>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 max-w-2xl">
            {activeTab === "details" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl font-semibold mb-2">Account Details</h2>
                  <p className="text-muted-foreground">Manage your account information</p>
                </div>
                <Card className="border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-primary" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {user ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Name</label>
                          <p className="mt-1 text-lg font-medium">{user.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="mt-1 text-lg font-medium">{user.email}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Loading...</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "banking" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl font-semibold mb-2">Banking</h2>
                  <p className="text-muted-foreground">Manage your connected bank accounts</p>
                </div>

                <Card className="border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="h-5 w-5 text-primary" />
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
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <CreditCard className="h-6 w-6 text-primary" />
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
                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                        <p className="text-center text-muted-foreground text-lg">
                          No bank account connected
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-destructive/30 bg-destructive/5">
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
