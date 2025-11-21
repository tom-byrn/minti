import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from "@/components/dashboard-header"
import { AccountsOverview } from "@/components/accounts-overview"
import { TransactionsList } from "@/components/transactions-list"
import { SpendingChart } from "@/components/spending-chart"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      <div className="relative z-10">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 lg:px-8">
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-serif font-semibold text-foreground">Welcome back, {user.email?.split('@')[0]}</h1>
              <p className="text-lg text-muted-foreground">Here's your financial overview</p>
            </div>
            <AccountsOverview />
            <SpendingChart />
            <TransactionsList />
          </div>
        </main>
      </div>
    </div>
  )
}
