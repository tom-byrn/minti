"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownLeft as ArrowDownLeftIcon,
  Car as CarIcon,
  AirplaneTilt as AirplaneTiltIcon,
  ShoppingBag as ShoppingBagIcon,
  GameController as GameControllerIcon,
  House as HouseIcon,
  Heart as HeartIcon,
  GraduationCap as GraduationCapIcon,
  Money as MoneyIcon,
  CreditCard as CreditCardIcon,
  ForkKnife as ForkKnifeIcon,
  Lightning as LightningIcon,
  SpinnerGap as SpinnerGapIcon,
  Funnel as FunnelIcon,
  CaretDown as CaretDownIcon,
  CaretLeft as CaretLeftIcon,
  CaretRight as CaretRightIcon,
  X as XIcon,
} from "@phosphor-icons/react"
import type { SearchableTransaction } from "@/app/api/plaid/search/route"

const categoryIcons: Record<string, any> = {
  "FOOD_AND_DRINK": ForkKnifeIcon,
  "TRANSPORTATION": CarIcon,
  "TRAVEL": AirplaneTiltIcon,
  "SHOPPING": ShoppingBagIcon,
  "ENTERTAINMENT": GameControllerIcon,
  "RENT_AND_UTILITIES": HouseIcon,
  "MEDICAL": HeartIcon,
  "EDUCATION": GraduationCapIcon,
  "TRANSFER_IN": ArrowDownLeftIcon,
  "TRANSFER_OUT": MoneyIcon,
  "INCOME": ArrowDownLeftIcon,
  "LOAN_PAYMENTS": CreditCardIcon,
  "GENERAL_MERCHANDISE": ShoppingBagIcon,
  "PERSONAL_CARE": HeartIcon,
  "GENERAL_SERVICES": LightningIcon,
  "GOVERNMENT_AND_NON_PROFIT": HouseIcon,
  "HOME_IMPROVEMENT": HouseIcon,
  "BANK_FEES": CreditCardIcon,
}

function getCategoryIcon(category: string | null | undefined): any {
  if (!category) return CreditCardIcon
  const upperCategory = category.toUpperCase()
  return categoryIcons[upperCategory] || CreditCardIcon
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatAmount(amount: number): { display: string; isIncome: boolean } {
  // Plaid returns positive for debits (money going out) and negative for credits (money coming in)
  const isIncome = amount < 0
  const absAmount = Math.abs(amount)
  return {
    display: `${isIncome ? "+" : "-"}$${absAmount.toFixed(2)}`,
    isIncome,
  }
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

interface TransactionSearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Filters {
  categories: string[]
  accounts: string[]
  transactionType: 'all' | 'income' | 'expense'
}

interface UniqueAccount {
  id: string
  name: string
  mask: string | null
  institution: string | null
}

export function TransactionSearchCommand({ open, onOpenChange }: TransactionSearchCommandProps) {
  const router = useRouter()
  const [transactions, setTransactions] = useState<SearchableTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter and pagination state
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    accounts: [],
    transactionType: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Fetch transactions when modal opens
  useEffect(() => {
    if (open && transactions.length === 0 && !loading) {
      const fetchTransactions = async () => {
        setLoading(true)
        setError(null)
        try {
          const response = await fetch("/api/plaid/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })

          if (response.status === 404) {
            // No connected accounts
            setLoading(false)
            return
          }

          if (!response.ok) {
            throw new Error("Failed to fetch transactions")
          }

          const data = await response.json()
          setTransactions(data.transactions)
        } catch (err) {
          console.error("Error fetching transactions:", err)
          setError("Failed to load transactions")
        } finally {
          setLoading(false)
        }
      }

      fetchTransactions()
    }
  }, [open, transactions.length, loading])

  // Reset search query and filters when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setFilters({ categories: [], accounts: [], transactionType: 'all' })
      setCurrentPage(1)
    }
  }, [open])

  // Extract unique categories from transactions
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>()
    transactions.forEach(t => {
      if (t.personal_finance_category?.primary) {
        categories.add(t.personal_finance_category.primary)
      }
    })
    return Array.from(categories).sort()
  }, [transactions])

  // Extract unique accounts from transactions
  const uniqueAccounts = useMemo(() => {
    const accountMap = new Map<string, UniqueAccount>()
    transactions.forEach(t => {
      if (!accountMap.has(t.account_id)) {
        accountMap.set(t.account_id, {
          id: t.account_id,
          name: t.account_name || 'Unknown Account',
          mask: t.account_mask || null,
          institution: t.institution_name || null
        })
      }
    })
    return Array.from(accountMap.values())
  }, [transactions])

  // Filter transactions based on search query and filters
  const filteredTransactions = useMemo(() => {
    let result = transactions

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((t) => {
        const searchableFields = [
          t.name,
          t.merchant_name,
          t.account_name,
          t.institution_name,
          t.personal_finance_category?.primary,
        ]
        return searchableFields.some((field) => field?.toLowerCase().includes(query))
      })
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      result = result.filter(t =>
        t.personal_finance_category?.primary &&
        filters.categories.includes(t.personal_finance_category.primary)
      )
    }

    // Apply account filter
    if (filters.accounts.length > 0) {
      result = result.filter(t => filters.accounts.includes(t.account_id))
    }

    // Apply transaction type filter
    if (filters.transactionType === 'income') {
      result = result.filter(t => t.amount < 0) // Negative = income in Plaid
    } else if (filters.transactionType === 'expense') {
      result = result.filter(t => t.amount > 0) // Positive = expense in Plaid
    }

    return result
  }, [transactions, searchQuery, filters])

  // Paginated results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredTransactions.slice(startIndex, startIndex + pageSize)
  }, [filteredTransactions, currentPage, pageSize])

  const totalPages = Math.ceil(filteredTransactions.length / pageSize)

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filters])

  // Toggle category filter
  const toggleCategoryFilter = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }, [])

  // Toggle account filter
  const toggleAccountFilter = useCallback((accountId: string) => {
    setFilters(prev => ({
      ...prev,
      accounts: prev.accounts.includes(accountId)
        ? prev.accounts.filter(a => a !== accountId)
        : [...prev.accounts, accountId]
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({ categories: [], accounts: [], transactionType: 'all' })
  }, [])

  const hasActiveFilters = filters.categories.length > 0 || filters.accounts.length > 0 || filters.transactionType !== 'all'

  const handleSelect = (transaction: SearchableTransaction) => {
    onOpenChange(false)
    // Navigate to the account's transactions page
    router.push(`/accounts/${transaction.account_id}/transactions`)
  }

  // Format account display for dropdown and badges
  const getAccountDisplay = (account: UniqueAccount) => {
    if (account.institution && account.mask) {
      return `${account.institution} ****${account.mask}`
    }
    if (account.institution) {
      return account.institution
    }
    if (account.mask) {
      return `${account.name} ****${account.mask}`
    }
    return account.name
  }

  // Get account display for badges by ID
  const getAccountDisplayById = (accountId: string) => {
    const account = uniqueAccounts.find(a => a.id === accountId)
    return account ? getAccountDisplay(account) : accountId
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Transactions"
      description="Search across all your connected accounts"
      className="sm:max-w-2xl border-0 shadow-2xl"
    >
      <CommandInput
        placeholder="Search transactions..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />

      {/* Filter Bar */}
      {!loading && !error && transactions.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <FunnelIcon className="h-4 w-4 text-muted-foreground shrink-0" weight="thin" />

          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                Category
                {filters.categories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {filters.categories.length}
                  </Badge>
                )}
                <CaretDownIcon className="h-3 w-3" weight="thin" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueCategories.map(category => {
                const Icon = getCategoryIcon(category)
                return (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={filters.categories.includes(category)}
                    onCheckedChange={() => toggleCategoryFilter(category)}
                  >
                    <Icon className="h-4 w-4 mr-2 text-muted-foreground" weight="thin" />
                    {formatCategory(category)}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Account Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                Account
                {filters.accounts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {filters.accounts.length}
                  </Badge>
                )}
                <CaretDownIcon className="h-3 w-3" weight="thin" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
              <DropdownMenuLabel>Accounts</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueAccounts.map(account => (
                <DropdownMenuCheckboxItem
                  key={account.id}
                  checked={filters.accounts.includes(account.id)}
                  onCheckedChange={() => toggleAccountFilter(account.id)}
                >
                  {getAccountDisplay(account)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                {filters.transactionType === 'all' ? 'All Types' :
                  filters.transactionType === 'income' ? 'Income' : 'Expenses'}
                <CaretDownIcon className="h-3 w-3" weight="thin" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Transaction Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={filters.transactionType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value as Filters['transactionType'] }))}
              >
                <DropdownMenuRadioItem value="all">All Types</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="income">Income</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="expense">Expenses</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b">
          {filters.categories.map(category => (
            <Badge
              key={category}
              variant="secondary"
              className="gap-1 pr-1 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleCategoryFilter(category)}
            >
              {formatCategory(category)}
              <XIcon className="h-3 w-3" weight="bold" />
            </Badge>
          ))}
          {filters.accounts.map(accountId => (
            <Badge
              key={accountId}
              variant="secondary"
              className="gap-1 pr-1 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleAccountFilter(accountId)}
            >
              {getAccountDisplayById(accountId)}
              <XIcon className="h-3 w-3" weight="bold" />
            </Badge>
          ))}
          {filters.transactionType !== 'all' && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => setFilters(prev => ({ ...prev, transactionType: 'all' }))}
            >
              {filters.transactionType === 'income' ? 'Income' : 'Expenses'}
              <XIcon className="h-3 w-3" weight="bold" />
            </Badge>
          )}
        </div>
      )}

      <CommandList className="max-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <SpinnerGapIcon className="h-6 w-6 animate-spin text-muted-foreground" weight="thin" />
          </div>
        )}

        {!loading && error && (
          <CommandEmpty>{error}</CommandEmpty>
        )}

        {!loading && !error && filteredTransactions.length === 0 && (searchQuery || hasActiveFilters) && (
          <CommandEmpty>
            No transactions found
            {searchQuery && ` for "${searchQuery}"`}
            {hasActiveFilters && " with current filters"}
          </CommandEmpty>
        )}

        {!loading && !error && transactions.length === 0 && !searchQuery && (
          <CommandEmpty>No transactions available</CommandEmpty>
        )}

        {!loading && !error && paginatedResults.length > 0 && (
          <CommandGroup heading={
            <div className="flex justify-between items-center w-full pr-2">
              <span>{searchQuery || hasActiveFilters ? "Results" : "Recent Transactions"}</span>
              <span className="text-muted-foreground font-normal">
                ({filteredTransactions.length} found)
              </span>
            </div>
          }>
            {paginatedResults.map((transaction) => {
              const Icon = getCategoryIcon(transaction.personal_finance_category?.primary)
              const { display: amountDisplay, isIncome } = formatAmount(transaction.amount)
              const accountBadge = transaction.institution_name
                ? `${transaction.institution_name}${transaction.account_mask ? ` ****${transaction.account_mask}` : ""}`
                : transaction.account_name

              return (
                <CommandItem
                  key={transaction.transaction_id}
                  value={`${transaction.name} ${transaction.merchant_name || ""} ${transaction.account_name}`}
                  onSelect={() => handleSelect(transaction)}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" weight="thin" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {transaction.merchant_name || transaction.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {formatDate(transaction.date)} • {accountBadge}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ml-3 ${isIncome ? "text-primary" : "text-foreground"}`}>
                    {amountDisplay}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>

      {/* Pagination */}
      {!loading && !error && filteredTransactions.length > pageSize && (
        <div className="flex items-center justify-between px-3 py-2 border-t text-sm text-muted-foreground">
          <span>
            {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <CaretLeftIcon className="h-4 w-4" weight="thin" />
            </Button>
            <span className="text-xs px-2">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <CaretRightIcon className="h-4 w-4" weight="thin" />
            </Button>
          </div>
        </div>
      )}
    </CommandDialog>
  )
}
