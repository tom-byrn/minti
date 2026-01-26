"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { House as HouseIcon, Car as CarIcon, Airplane as AirplaneIcon, Backpack as BackpackIcon, GraduationCap as GraduationCapIcon, Heart as HeartIcon, Gift as GiftIcon, Briefcase as BriefcaseIcon, FirstAid as FirstAidIcon, PiggyBank as PiggyBankIcon } from "@phosphor-icons/react"
import type { GoalInput, GoalWithProgress } from "@/lib/goals/types"
import { GOAL_COLORS, GOAL_ICONS } from "@/lib/goals/types"

const iconComponents: Record<string, typeof HouseIcon> = {
  House: HouseIcon,
  Car: CarIcon,
  Airplane: AirplaneIcon,
  Backpack: BackpackIcon,
  GraduationCap: GraduationCapIcon,
  Heart: HeartIcon,
  Gift: GiftIcon,
  Briefcase: BriefcaseIcon,
  FirstAid: FirstAidIcon,
  PiggyBank: PiggyBankIcon,
}

interface GoalFormDialogProps {
  goal?: GoalWithProgress | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (goal: GoalInput) => Promise<void>
}

export function GoalFormDialog({ goal, open, onOpenChange, onSave }: GoalFormDialogProps) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState<string>(GOAL_COLORS[0].value)
  const [icon, setIcon] = useState<string>(GOAL_ICONS[0])
  const [saving, setSaving] = useState(false)

  const isEditing = !!goal

  useEffect(() => {
    if (open) {
      if (goal) {
        setName(goal.name)
        setTargetAmount(goal.targetAmount.toString())
        setCurrentAmount(goal.currentAmount.toString())
        setDeadline(goal.deadline || '')
        setCategory(goal.category || '')
        setColor(goal.color || GOAL_COLORS[0].value)
        setIcon(goal.icon || GOAL_ICONS[0])
      } else {
        setName('')
        setTargetAmount('')
        setCurrentAmount('')
        setDeadline('')
        setCategory('')
        setColor(GOAL_COLORS[0].value)
        setIcon(GOAL_ICONS[0])
      }
    }
  }, [open, goal])

  const handleSave = async () => {
    const parsedTarget = parseFloat(targetAmount)
    const parsedCurrent = currentAmount ? parseFloat(currentAmount) : 0

    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      return
    }

    setSaving(true)
    try {
      await onSave({
        name,
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        deadline: deadline || null,
        category: category || null,
        color,
        icon,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEditing ? 'Edit Goal' : 'Create New Goal'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this financial goal.'
              : 'Set a financial goal to track your progress toward saving for something important.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Goal Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Emergency Fund, Vacation, New Car"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="targetAmount">Target Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="targetAmount"
                  type="number"
                  step="1"
                  min="1"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="pl-7"
                  placeholder="10,000"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currentAmount">Current Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="currentAmount"
                  type="number"
                  step="1"
                  min="0"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="deadline">Target Date (optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Savings, Travel"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-primary'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_ICONS.map((iconName) => {
                const IconComponent = iconComponents[iconName]
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      icon === iconName
                        ? 'bg-primary/20 text-primary ring-2 ring-primary'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                    title={iconName}
                  >
                    <IconComponent className="h-5 w-5" weight="thin" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name || !targetAmount}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
