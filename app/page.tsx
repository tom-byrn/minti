import { DashboardHeader } from "@/components/dashboard-header"
import { AccountsOverview } from "@/components/accounts-overview"
import { TransactionsList } from "@/components/transactions-list"
import { SpendingChart } from "@/components/spending-chart"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-mint-50 to-cyan-50">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 lg:px-8">
        <div className="space-y-6">
          <AccountsOverview />
          <SpendingChart />
          <TransactionsList />
        </div>
      </main>
    </div>
  )
}
