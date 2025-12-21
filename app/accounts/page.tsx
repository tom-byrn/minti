"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  Building2,
  CreditCard,
  Wallet,
  TrendingUp,
  Loader2,
  AlertCircle,
  Plus,
  RefreshCw,
  X,
  ChevronRight,
  Utensils,
  Car,
  Plane,
  ShoppingBag,
  Gamepad2,
  Home,
  Heart,
  GraduationCap,
  ArrowDownLeft,
  Banknote,
  Zap,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlaidLink } from "@/components/plaid-link"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface PlaidAccount {
  account_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  mask: string | null
  balances: {
    available: number | null
    current: number | null
    limit: number | null
  }
}

interface PlaidTransaction {
  transaction_id: string
  name: string
  amount: number
  date: string
  category: string[] | null
  pending: boolean
  merchant_name: string | null
  account_id: string
  personal_finance_category?: {
    primary: string
    detailed: string
  } | null
}

interface AccountGroup {
  type: string
  label: string
  icon: any
  accounts: PlaidAccount[]
  totalBalance: number
}

const categoryIcons: Record<string, any> = {
  "FOOD_AND_DRINK": Utensils,
  "TRANSPORTATION": Car,
  "TRAVEL": Plane,
  "SHOPPING": ShoppingBag,
  "ENTERTAINMENT": Gamepad2,
  "RENT_AND_UTILITIES": Home,
  "MEDICAL": Heart,
  "EDUCATION": GraduationCap,
  "TRANSFER_IN": ArrowDownLeft,
  "TRANSFER_OUT": Banknote,
  "INCOME": ArrowDownLeft,
  "LOAN_PAYMENTS": CreditCard,
  "GENERAL_MERCHANDISE": ShoppingBag,
  "PERSONAL_CARE": Heart,
  "GENERAL_SERVICES": Zap,
  "GOVERNMENT_AND_NON_PROFIT": Home,
  "HOME_IMPROVEMENT": Home,
  "BANK_FEES": CreditCard,
}

function getCategoryIcon(category: string | null | undefined): any {
  if (!category) return CreditCard
  const upperCategory = category.toUpperCase()
  return categoryIcons[upperCategory] || CreditCard
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getAccountIcon(type: string, subtype: string | null) {
  if (type === "credit") return CreditCard
  if (subtype === "savings") return TrendingUp
  return Wallet
}

function getAccountTypeLabel(type: string): string {
  switch (type) {
    case "depository":
      return "Bank Accounts"
    case "credit":
      return "Credit Cards"
    case "investment":
      return "Investments"
    case "loan":
      return "Loans"
    default:
      return "Other Accounts"
  }
}

function getAccountTypeIcon(type: string) {
  switch (type) {
    case "depository":
      return Building2
    case "credit":
      return CreditCard
    case "investment":
      return TrendingUp
    case "loan":
      return Wallet
    default:
      return Wallet
  }
}

function groupAccountsByType(accounts: PlaidAccount[]): AccountGroup[] {
  const groups = new Map<string, PlaidAccount[]>()

  accounts.forEach((account) => {
    const type = account.type
    if (!groups.has(type)) {
      groups.set(type, [])
    }
    groups.get(type)!.push(account)
  })

  const sortOrder = ["depository", "credit", "investment", "loan"]

  return Array.from(groups.entries())
    .sort((a, b) => {
      const aIndex = sortOrder.indexOf(a[0])
      const bIndex = sortOrder.indexOf(b[0])
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    })
    .map(([type, accts]) => ({
      type,
      label: getAccountTypeLabel(type),
      icon: getAccountTypeIcon(type),
      accounts: accts,
      totalBalance: accts.reduce((sum, a) => sum + (a.balances.current || 0), 0),
    }))
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<PlaidAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasConnection, setHasConnection] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<PlaidAccount | null>(null)
  const [accountTransactions, setAccountTransactions] = useState<PlaidTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)

  const fetchAccounts = async (showRefresh = false) => {
    const accessToken = localStorage.getItem("plaid_access_token")
    if (!accessToken) {
      setLoading(false)
      setHasConnection(false)
      return
    }

    setHasConnection(true)
    if (showRefresh) setRefreshing(true)

    try {
      const response = await fetch("/api/plaid/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      })

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          localStorage.removeItem("plaid_access_token")
          setHasConnection(false)
          setError("Your bank connection has expired. Please reconnect.")
        } else {
          throw new Error("Failed to fetch accounts")
        }
        return
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching accounts:", err)
      setError("Failed to load accounts")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchAccountTransactions = async (accountId: string) => {
    const accessToken = localStorage.getItem("plaid_access_token")
    if (!accessToken) return

    setLoadingTransactions(true)
    try {
      const response = await fetch("/api/plaid/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      })

      if (response.ok) {
        const data = await response.json()
        const filtered = data.transactions.filter((t: PlaidTransaction) => t.account_id === accountId)
        setAccountTransactions(filtered)
      }
    } catch (err) {
      console.error("Error fetching transactions:", err)
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handlePlaidSuccess = (accessToken: string) => {
    setHasConnection(true)
    setError(null)
    setShowAddAccount(false)
    fetchAccounts()
  }

  const handleRefresh = () => {
    fetchAccounts(true)
  }

  const handleAccountClick = (account: PlaidAccount) => {
    setSelectedAccount(account)
    setAccountTransactions([])
    fetchAccountTransactions(account.account_id)
  }

  const handleDisconnect = () => {
    localStorage.removeItem("plaid_access_token")
    setHasConnection(false)
    setAccounts([])
    setSelectedAccount(null)
  }

  // Calculate summary
  const totalAssets = accounts
    .filter((a) => a.type === "depository" || a.type === "investment")
    .reduce((sum, a) => sum + (a.balances.current || 0), 0)

  const totalLiabilities = accounts
    .filter((a) => a.type === "credit" || a.type === "loan")
    .reduce((sum, a) => sum + (a.balances.current || 0), 0)

  const netWorth = totalAssets - totalLiabilities

  const accountGroups = groupAccountsByType(accounts)

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        <div className="relative z-10">
          <DashboardHeader />
          <main className="container mx-auto px-4 py-8 lg:px-8">
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      <div className="relative z-10">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 lg:px-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-serif font-semibold text-foreground">Accounts</h1>
                <p className="text-lg text-muted-foreground">Manage your connected bank accounts</p>
              </div>
              {hasConnection && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              )}
            </div>

            {/* No connection state */}
            {!hasConnection && (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Card className="max-w-md w-full border-border/50 shadow-lg bg-card/80 backdrop-blur">
                  <CardHeader className="space-y-3">
                    {error ? (
                      <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                      </div>
                    ) : (
                      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <CardTitle className="text-center font-serif text-3xl">
                      {error ? "Reconnect Required" : "Connect Your Bank"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-6">
                    <p className="text-center text-base text-muted-foreground leading-relaxed">
                      {error || "Connect your bank accounts to view balances, track spending, and manage your finances."}
                    </p>
                    <PlaidLink onSuccess={handlePlaidSuccess} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Connected state */}
            {hasConnection && !error && (
              <>
                {/* Net Worth Summary */}
                <div className="grid gap-5 sm:grid-cols-3">
                  <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-base">Total Assets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold font-serif text-primary">
                        ${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-base">Total Liabilities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold font-serif text-destructive">
                        ${totalLiabilities.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm border-primary/30">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-base">Net Worth</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-3xl font-bold font-serif ${netWorth >= 0 ? "text-primary" : "text-destructive"}`}>
                        ${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Account Groups */}
                {accountGroups.map((group) => {
                  const GroupIcon = group.icon
                  return (
                    <div key={group.type} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <GroupIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-serif font-semibold">{group.label}</h2>
                            <p className="text-sm text-muted-foreground">
                              {group.accounts.length} account{group.accounts.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <p className="text-xl font-semibold font-serif">
                          ${Math.abs(group.totalBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {group.accounts.map((account) => {
                          const AccountIcon = getAccountIcon(account.type, account.subtype)
                          const isCredit = account.type === "credit"
                          const utilization = isCredit && account.balances.limit
                            ? (account.balances.current || 0) / account.balances.limit * 100
                            : null

                          return (
                            <Card
                              key={account.account_id}
                              className="border-border/50 bg-card/80 backdrop-blur shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
                              onClick={() => handleAccountClick(account)}
                            >
                              <CardContent className="pt-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                      isCredit ? "bg-destructive/10" : "bg-primary/10"
                                    }`}>
                                      <AccountIcon className={`h-6 w-6 ${isCredit ? "text-destructive" : "text-primary"}`} />
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground">{account.name}</p>
                                      <p className="text-sm text-muted-foreground capitalize">
                                        {account.subtype || account.type} {account.mask ? `••••${account.mask}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-sm text-muted-foreground">Current Balance</span>
                                    <span className={`text-2xl font-bold font-serif ${isCredit ? "text-destructive" : "text-foreground"}`}>
                                      {isCredit ? "-" : ""}${Math.abs(account.balances.current || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>

                                  {account.balances.available !== null && !isCredit && (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-sm text-muted-foreground">Available</span>
                                      <span className="text-base font-medium text-muted-foreground">
                                        ${account.balances.available.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}

                                  {isCredit && account.balances.limit && (
                                    <>
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-muted-foreground">Credit Limit</span>
                                        <span className="text-base font-medium text-muted-foreground">
                                          ${account.balances.limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      {utilization !== null && (
                                        <div className="pt-2">
                                          <div className="flex justify-between text-sm mb-1">
                                            <span className="text-muted-foreground">Utilization</span>
                                            <span className={utilization > 30 ? "text-destructive" : "text-primary"}>
                                              {utilization.toFixed(0)}%
                                            </span>
                                          </div>
                                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                utilization > 30 ? "bg-destructive" : "bg-primary"
                                              }`}
                                              style={{ width: `${Math.min(utilization, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Add Account Card */}
                <Card
                  className="border-dashed border-2 border-border/50 bg-transparent hover:bg-card/50 transition-all cursor-pointer"
                  onClick={() => setShowAddAccount(true)}
                >
                  <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-muted-foreground">Add Another Account</p>
                      <p className="text-sm text-muted-foreground/70">Connect more banks to see all your finances</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Disconnect Section */}
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Disconnect All Accounts</h3>
                        <p className="text-sm text-muted-foreground">
                          Remove your bank connection from Minti
                        </p>
                      </div>
                      <Button variant="destructive" onClick={handleDisconnect}>
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Account Details Dialog */}
      <Dialog open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          {selectedAccount && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    selectedAccount.type === "credit" ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    {(() => {
                      const Icon = getAccountIcon(selectedAccount.type, selectedAccount.subtype)
                      return <Icon className={`h-6 w-6 ${selectedAccount.type === "credit" ? "text-destructive" : "text-primary"}`} />
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="font-serif text-2xl">{selectedAccount.name}</DialogTitle>
                    <DialogDescription className="capitalize">
                      {selectedAccount.subtype || selectedAccount.type} {selectedAccount.mask ? `••••${selectedAccount.mask}` : ""}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Balance Info */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className={`text-2xl font-bold font-serif ${selectedAccount.type === "credit" ? "text-destructive" : "text-foreground"}`}>
                    {selectedAccount.type === "credit" ? "-" : ""}${Math.abs(selectedAccount.balances.current || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {selectedAccount.balances.available !== null && selectedAccount.type !== "credit" && (
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold font-serif text-foreground">
                      ${selectedAccount.balances.available.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {selectedAccount.type === "credit" && selectedAccount.balances.limit && (
                  <div>
                    <p className="text-sm text-muted-foreground">Credit Limit</p>
                    <p className="text-2xl font-bold font-serif text-foreground">
                      ${selectedAccount.balances.limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {/* Transactions */}
              <div className="flex-1 overflow-hidden">
                <h3 className="font-medium mb-3">Recent Transactions</h3>
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : accountTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mb-2" />
                    <p>No transactions found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {accountTransactions.map((transaction) => {
                        const Icon = getCategoryIcon(transaction.personal_finance_category?.primary || transaction.category?.[0])
                        const isIncome = transaction.amount < 0

                        return (
                          <div
                            key={transaction.transaction_id}
                            className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                isIncome ? "bg-primary/10" : "bg-muted/50"
                              }`}>
                                <Icon className={`h-5 w-5 ${isIncome ? "text-primary" : "text-muted-foreground"}`} />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{transaction.merchant_name || transaction.name}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {transaction.pending && (
                                <Badge variant="outline" className="text-xs">Pending</Badge>
                              )}
                              <p className={`font-semibold ${isIncome ? "text-primary" : "text-foreground"}`}>
                                {isIncome ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* View All Transactions Button */}
              <DialogFooter className="border-t pt-4">
                <Button asChild className="w-full gap-2">
                  <Link href={`/accounts/${selectedAccount.account_id}/transactions`}>
                    View All Transactions
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Connect a Bank Account</DialogTitle>
            <DialogDescription>
              Link another bank account to see all your finances in one place.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              You'll be redirected to securely connect your bank through Plaid.
            </p>
            <PlaidLink onSuccess={handlePlaidSuccess} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
