"use client"

import { useState, useEffect } from "react"
import { Target, Loader2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { BudgetProfile } from "@/lib/database.types"

export default function BudgetPage() {
  const [profile, setProfile] = useState<BudgetProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [occupation, setOccupation] = useState("")
  const [annualIncome, setAnnualIncome] = useState("")
  const [savingsGoalYearly, setSavingsGoalYearly] = useState("")
  const [financialGoals, setFinancialGoals] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Fetch or create budget profile
        let { data: budgetProfile, error } = await supabase
          .from("budget_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (error && error.code === "PGRST116") {
          // Profile doesn't exist, create it
          const { data: newProfile } = await supabase
            .from("budget_profiles")
            .insert({ user_id: user.id })
            .select()
            .single()
          budgetProfile = newProfile
        }

        if (budgetProfile) {
          setProfile(budgetProfile)
          setOccupation(budgetProfile.occupation || "")
          setAnnualIncome(budgetProfile.annual_income?.toString() || "")
          setSavingsGoalYearly(budgetProfile.savings_goal_yearly?.toString() || "")
          setFinancialGoals(budgetProfile.financial_goals || "")
        }
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("budget_profiles")
      .update({
        occupation: occupation || null,
        annual_income: annualIncome ? parseFloat(annualIncome) : null,
        savings_goal_yearly: savingsGoalYearly ? parseFloat(savingsGoalYearly) : null,
        financial_goals: financialGoals || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)

    if (error) {
      toast.error("Failed to save budget profile")
    } else {
      setProfile({
        ...profile,
        occupation: occupation || null,
        annual_income: annualIncome ? parseFloat(annualIncome) : null,
        savings_goal_yearly: savingsGoalYearly ? parseFloat(savingsGoalYearly) : null,
        financial_goals: financialGoals || null,
      })
      toast.success("Budget profile saved successfully")
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:28px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        <div className="relative z-10">
          <DashboardHeader />
          <main className="container mx-auto px-4 py-8 lg:px-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <div className="space-y-2">
              <h1 className="text-4xl font-serif font-semibold text-foreground">Budget</h1>
              <p className="text-lg text-muted-foreground">
                Set your financial goals and context to help the AI Assistant provide personalized advice
              </p>
            </div>

            <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  Financial Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g., Software Engineer, Teacher, Freelancer"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="annualIncome">Annual Income</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="annualIncome"
                        type="number"
                        value={annualIncome}
                        onChange={(e) => setAnnualIncome(e.target.value)}
                        placeholder="75,000"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="savingsGoalYearly">Yearly Savings Goal</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="savingsGoalYearly"
                        type="number"
                        value={savingsGoalYearly}
                        onChange={(e) => setSavingsGoalYearly(e.target.value)}
                        placeholder="15,000"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financialGoals">Financial Goals & Notes</Label>
                  <Textarea
                    id="financialGoals"
                    value={financialGoals}
                    onChange={(e) => setFinancialGoals(e.target.value)}
                    placeholder="Describe your financial goals, plans, or any context that would help the AI provide better advice. For example: saving for a house down payment, paying off student loans, building an emergency fund, retirement planning, etc."
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    This information helps the AI Assistant understand your financial situation and provide personalized recommendations.
                  </p>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
