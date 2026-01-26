"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BillingPeriod, SubscriptionInput } from "@/lib/subscriptions/types"

interface AddSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (subscription: SubscriptionInput) => Promise<void>
}

const billingPeriodOptions: { value: BillingPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

export function AddSubscriptionDialog({ open, onOpenChange, onAdd }: AddSubscriptionDialogProps) {
  const [merchantName, setMerchantName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [nextChargeDate, setNextChargeDate] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setMerchantName('')
    setDisplayName('')
    setCategory('')
    setAmount('')
    setBillingPeriod('monthly')
    setNextChargeDate('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const handleAdd = async () => {
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return
    }

    setSaving(true)
    try {
      await onAdd({
        merchantName,
        displayName: displayName || null,
        category: category || null,
        amount: parsedAmount,
        billingPeriod,
        nextChargeDate: nextChargeDate || null,
        source: 'manual',
      })
      resetForm()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Add Subscription</DialogTitle>
          <DialogDescription>
            Manually add a subscription that wasn't automatically detected.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="merchantName">Merchant Name *</Label>
            <Input
              id="merchantName"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="e.g., Netflix"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="displayName">Display Name (optional)</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Family Netflix Plan"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category (optional)</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Entertainment"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="billingPeriod">Billing Period *</Label>
              <Select value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {billingPeriodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nextChargeDate">Next Charge Date (optional)</Label>
            <Input
              id="nextChargeDate"
              type="date"
              value={nextChargeDate}
              onChange={(e) => setNextChargeDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={saving || !merchantName || !amount}>
            {saving ? 'Adding...' : 'Add Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
