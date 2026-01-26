"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MergedSubscription, BillingPeriod } from "@/lib/subscriptions/types"

interface SubscriptionEditDialogProps {
  subscription: MergedSubscription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (subscription: MergedSubscription, updates: {
    merchantName: string
    displayName: string | null
    category: string | null
    amount: number
    billingPeriod: BillingPeriod
    nextChargeDate: string | null
  }) => Promise<void>
}

const billingPeriodOptions: { value: BillingPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

export function SubscriptionEditDialog({ subscription, open, onOpenChange, onSave }: SubscriptionEditDialogProps) {
  const [merchantName, setMerchantName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [nextChargeDate, setNextChargeDate] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset form when subscription changes
  const resetForm = () => {
    if (subscription) {
      setMerchantName(subscription.merchantName)
      setDisplayName(subscription.displayName || '')
      setCategory(subscription.category || '')
      setAmount(subscription.amount.toString())
      setBillingPeriod(subscription.billingPeriod)
      setNextChargeDate(subscription.nextChargeDate || '')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const handleSave = async () => {
    if (!subscription) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return
    }

    setSaving(true)
    try {
      await onSave(subscription, {
        merchantName,
        displayName: displayName || null,
        category: category || null,
        amount: parsedAmount,
        billingPeriod,
        nextChargeDate: nextChargeDate || null,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  if (!subscription) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Subscription</DialogTitle>
          <DialogDescription>
            Update the details for this subscription. Changes will be saved to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="merchantName">Merchant Name</Label>
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
              <Label htmlFor="amount">Amount</Label>
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
              <Label htmlFor="billingPeriod">Billing Period</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !merchantName || !amount}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
