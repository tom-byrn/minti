"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { GoalWithProgress } from "@/lib/goals/types"

interface ContributeDialogProps {
  goal: GoalWithProgress | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onContribute: (goalId: string, amount: number) => Promise<void>
}

export function ContributeDialog({ goal, open, onOpenChange, onContribute }: ContributeDialogProps) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount('')
    }
  }, [open])

  const handleContribute = async () => {
    if (!goal) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return
    }

    setSaving(true)
    try {
      await onContribute(goal.id, parsedAmount)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const quickAmounts = [25, 50, 100, 250, 500]

  if (!goal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Add Contribution</DialogTitle>
          <DialogDescription>
            Add money toward your "{goal.name}" goal.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center mb-6">
            <div className="text-sm text-muted-foreground mb-1">Current Progress</div>
            <div className="text-3xl font-bold font-serif">
              {formatCurrency(goal.currentAmount)}
              <span className="text-lg text-muted-foreground font-normal">
                {' '}/ {formatCurrency(goal.targetAmount)}
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all rounded-full"
                style={{
                  width: `${goal.progress.percentage}%`,
                  backgroundColor: goal.color || '#7DB87D',
                }}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Contribution Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 text-lg"
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="flex-1 min-w-[60px]"
                >
                  ${quickAmount}
                </Button>
              ))}
            </div>

            {goal.progress.remaining > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(goal.progress.remaining.toString())}
                className="w-full"
              >
                Complete Goal ({formatCurrency(goal.progress.remaining)})
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleContribute} disabled={saving || !amount}>
            {saving ? 'Adding...' : 'Add Contribution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
