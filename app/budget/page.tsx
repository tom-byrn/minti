"use client"

import { useState, useEffect } from "react"
import { Target, Loader2, Plus, Trash2, DollarSign } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { BudgetProfile, CategoryBudget } from "@/lib/database.types"

interface CategorySpending {
  category: string
  amount: number
}

// All possible Plaid categories
const ALL_CATEGORIES = [
  "Food And Drink",
  "General Merchandise",
  "Transportation",
  "Entertainment",
  "Travel",
  "Shopping",
  "Home Improvement",
  "Medical",
  "Personal Care",
  "Rent And Utilities",
  "General Services",
  "Government And Non Profit",
  "Bank Fees",
  "Transfer Out",
]

export default function BudgetPage() {
  const [profile, setProfile] = useState<BudgetProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [occupation, setOccupation] = useState("")
  const [annualIncome, setAnnualIncome] = useState("")
  const [savingsGoalYearly, setSavingsGoalYearly] = useState("")
  const [financialGoals, setFinancialGoals] = useState("")

  // Category budgets state
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([])
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({})
  const [savingBudgets, setSavingBudgets] = useState(false)
  const [newCategory, setNewCategory] = useState("")

  useEffect(() => {
    const fetchData = async () => {
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

        // Fetch category budgets
        const { data: budgets } = await supabase
          .from("category_budgets")
          .select("*")
          .eq("user_id", user.id)

        if (budgets) {
          setCategoryBudgets(budgets)
          // Initialize input values
          const inputs: Record<string, string> = {}
          budgets.forEach(b => {
            inputs[b.category] = b.monthly_limit.toString()
          })
          setBudgetInputs(inputs)
        }

        // Fetch current month spending from analytics
        try {
          const response = await fetch('/api/plaid/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spending_period: '1m' }),
          })
          if (response.ok) {
            const data = await response.json()
            if (data.categoryBreakdown) {
              setCategorySpending(data.categoryBreakdown.map((c: { category: string; amount: number }) => ({
                category: c.category,
                amount: c.amount,
              })))
            }
          }
        } catch {
          // Silently fail - spending data is optional
        }
      }
      setLoading(false)
    }

    fetchData()
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

  const handleSaveAllBudgets = async () => {
    setSavingBudgets(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Not authenticated")
      setSavingBudgets(false)
      return
    }

    let hasError = false
    const updatedBudgets: CategoryBudget[] = [...categoryBudgets]

    for (const [category, limitStr] of Object.entries(budgetInputs)) {
      if (!limitStr || parseFloat(limitStr) <= 0) continue

      const existingBudget = categoryBudgets.find(b => b.category === category)

      if (existingBudget) {
        // Update existing
        const { error } = await supabase
          .from("category_budgets")
          .update({
            monthly_limit: parseFloat(limitStr),
            updated_at: new Date().toISOString()
          })
          .eq("id", existingBudget.id)

        if (error) {
          hasError = true
        } else {
          const idx = updatedBudgets.findIndex(b => b.id === existingBudget.id)
          if (idx !== -1) {
            updatedBudgets[idx] = { ...updatedBudgets[idx], monthly_limit: parseFloat(limitStr) }
          }
        }
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("category_budgets")
          .insert({
            user_id: user.id,
            category,
            monthly_limit: parseFloat(limitStr),
          })
          .select()
          .single()

        if (error) {
          hasError = true
        } else if (data) {
          updatedBudgets.push(data)
        }
      }
    }

    setCategoryBudgets(updatedBudgets)

    if (hasError) {
      toast.error("Some budgets failed to save")
    } else {
      toast.success("Category budgets saved")
    }

    setSavingBudgets(false)
  }

  const handleDeleteBudget = async (category: string) => {
    const existingBudget = categoryBudgets.find(b => b.category === category)
    if (!existingBudget) return

    setSavingBudgets(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("category_budgets")
      .delete()
      .eq("id", existingBudget.id)

    if (error) {
      toast.error("Failed to delete budget")
    } else {
      setCategoryBudgets(prev => prev.filter(b => b.id !== existingBudget.id))
      setBudgetInputs(prev => {
        const updated = { ...prev }
        delete updated[category]
        return updated
      })
      toast.success(`Budget for ${category} removed`)
    }

    setSavingBudgets(false)
  }

  const handleAddCategory = () => {
    if (!newCategory) return
    if (budgetInputs[newCategory] !== undefined) {
      toast.error("This category already has a budget")
      return
    }
    setBudgetInputs(prev => ({ ...prev, [newCategory]: "" }))
    setNewCategory("")
  }

  // Get categories that can still be added
  const availableCategories = ALL_CATEGORIES.filter(
    cat => budgetInputs[cat] === undefined
  )

  // Categories to display: ones with budgets + ones with spending
  const displayCategories = new Set([
    ...Object.keys(budgetInputs),
    ...categorySpending.map(s => s.category)
  ])

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

            {/* Monthly Category Budgets */}
            <Card className="border-border/50 bg-card/80 backdrop-blur shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  Monthly Category Budgets
                </CardTitle>
                <CardDescription>
                  Set spending limits for each category to track your budget on the Analytics page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new category */}
                <div className="flex gap-2">
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add a category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleAddCategory}
                    disabled={!newCategory || savingBudgets}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Category budget list */}
                {displayCategories.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No categories yet. Add a category above to set your first budget.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from(displayCategories).map(category => {
                      const spending = categorySpending.find(s => s.category === category)
                      const hasBudget = categoryBudgets.some(b => b.category === category)
                      const inputValue = budgetInputs[category] ?? ""

                      return (
                        <div
                          key={category}
                          className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{category}</div>
                            {spending && (
                              <div className="text-sm text-muted-foreground">
                                Spent this month: ${spending.amount.toLocaleString()}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative w-32">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                              <Input
                                type="number"
                                value={inputValue}
                                onChange={(e) => setBudgetInputs(prev => ({
                                  ...prev,
                                  [category]: e.target.value
                                }))}
                                placeholder="0"
                                className="pl-7"
                              />
                            </div>
                            {hasBudget && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteBudget(category)}
                                disabled={savingBudgets}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <Button onClick={handleSaveAllBudgets} disabled={savingBudgets} className="w-full sm:w-auto">
                  {savingBudgets ? (
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
