"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
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
  CreditCard,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"

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

interface PlaidAccount {
  account_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  mask: string | null
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

function formatCategory(category: string | null | undefined): string {
  if (!category) return "Other"
  return category
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
}

type SortField = "date" | "amount" | "name" | "category"
type SortDirection = "asc" | "desc"

export default function TransactionsPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.accountId as string

  const [transactions, setTransactions] = useState<PlaidTransaction[]>([])
  const [account, setAccount] = useState<PlaidAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Filtering
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [transactionType, setTransactionType] = useState<string>("all")

  // Get unique categories from transactions
  const categories = useMemo(() => {
    const cats = new Set<string>()
    transactions.forEach(t => {
      const cat = t.personal_finance_category?.primary || t.category?.[0]
      if (cat) cats.add(cat)
    })
    return Array.from(cats).sort()
  }, [transactions])

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        (t.merchant_name?.toLowerCase().includes(query)) ||
        (t.name.toLowerCase().includes(query))
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => {
        const cat = t.personal_finance_category?.primary || t.category?.[0]
        return cat === categoryFilter
      })
    }

    // Transaction type filter (income/expense)
    if (transactionType === "income") {
      filtered = filtered.filter(t => t.amount < 0)
    } else if (transactionType === "expense") {
      filtered = filtered.filter(t => t.amount > 0)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case "amount":
          comparison = a.amount - b.amount
          break
        case "name":
          comparison = (a.merchant_name || a.name).localeCompare(b.merchant_name || b.name)
          break
        case "category":
          const catA = a.personal_finance_category?.primary || a.category?.[0] || ""
          const catB = b.personal_finance_category?.primary || b.category?.[0] || ""
          comparison = catA.localeCompare(catB)
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [transactions, searchQuery, categoryFilter, transactionType, sortField, sortDirection])

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + rowsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, transactionType, rowsPerPage])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch transactions
        const response = await fetch("/api/plaid/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })

        if (response.status === 404) {
          setError("No bank connection found")
          setLoading(false)
          return
        }

        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }

        const data = await response.json()

        // Filter transactions for this account
        const accountTransactions = data.transactions.filter(
          (t: PlaidTransaction) => t.account_id === accountId
        )
        setTransactions(accountTransactions)

        // Find the account info
        const accountInfo = data.accounts?.find(
          (a: PlaidAccount) => a.account_id === accountId
        )
        setAccount(accountInfo || null)

      } catch (err) {
        console.error("Error fetching transactions:", err)
        setError("Failed to load transactions")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === "asc"
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />
  }

  const clearFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
    setTransactionType("all")
  }

  const hasActiveFilters = searchQuery || categoryFilter !== "all" || transactionType !== "all"

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

  if (error) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        <div className="relative z-10">
          <DashboardHeader />
          <main className="container mx-auto px-4 py-8 lg:px-8">
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-lg text-muted-foreground">{error}</p>
              <Button asChild>
                <Link href="/accounts">Back to Accounts</Link>
              </Button>
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
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-xl">
                <Link href="/accounts">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-serif font-semibold text-foreground">
                  {account?.name || "Account"} Transactions
                </h1>
                <p className="text-muted-foreground capitalize">
                  {account?.subtype || account?.type} {account?.mask ? `••••${account.mask}` : ""}
                </p>
              </div>
            </div>

            {/* Filters Card */}
            <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Filters</CardTitle>
                  </div>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                      <X className="h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>

                  {/* Category Filter */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px] bg-background/50">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {formatCategory(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Transaction Type Filter */}
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger className="w-[150px] bg-background/50">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Rows Per Page */}
                  <Select value={rowsPerPage.toString()} onValueChange={(v) => setRowsPerPage(Number(v))}>
                    <SelectTrigger className="w-[130px] bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="border-border/50 bg-card/80 backdrop-blur shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-serif text-2xl">Transactions</CardTitle>
                    <CardDescription className="text-base">
                      {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""} found
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {paginatedTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-3" />
                    <p className="text-lg">No transactions found</p>
                    {hasActiveFilters && (
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-border/50 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-[120px]">
                              <Button
                                variant="ghost"
                                className="gap-1 -ml-3 font-medium"
                                onClick={() => handleSort("date")}
                              >
                                Date
                                {getSortIcon("date")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                className="gap-1 -ml-3 font-medium"
                                onClick={() => handleSort("name")}
                              >
                                Description
                                {getSortIcon("name")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                className="gap-1 -ml-3 font-medium"
                                onClick={() => handleSort("category")}
                              >
                                Category
                                {getSortIcon("category")}
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              <Button
                                variant="ghost"
                                className="gap-1 -mr-3 font-medium"
                                onClick={() => handleSort("amount")}
                              >
                                Amount
                                {getSortIcon("amount")}
                              </Button>
                            </TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTransactions.map((transaction) => {
                            const Icon = getCategoryIcon(
                              transaction.personal_finance_category?.primary || transaction.category?.[0]
                            )
                            const isIncome = transaction.amount < 0
                            const category = transaction.personal_finance_category?.primary || transaction.category?.[0]

                            return (
                              <TableRow key={transaction.transaction_id}>
                                <TableCell className="font-medium text-muted-foreground">
                                  {formatDate(transaction.date)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
                                      <Icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <span className="font-medium">
                                      {transaction.merchant_name || transaction.name}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatCategory(category)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-semibold font-serif text-base ${
                                    isIncome ? "text-primary" : "text-foreground"
                                  }`}>
                                    {isIncome ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {transaction.pending ? (
                                    <Badge variant="outline" className="text-xs">
                                      Pending
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                                      Completed
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-6">
                      <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="h-8 w-8"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="h-8 w-8"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1 px-2">
                          <span className="text-sm font-medium">{currentPage}</span>
                          <span className="text-sm text-muted-foreground">of</span>
                          <span className="text-sm font-medium">{totalPages || 1}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="h-8 w-8"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage >= totalPages}
                          className="h-8 w-8"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
