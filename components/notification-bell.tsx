"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Bell as BellIcon,
  Warning as WarningIcon,
  CreditCard as CreditCardIcon,
  Target as TargetIcon,
  TrendUp as TrendUpIcon,
  Money as MoneyIcon,
  PiggyBank as PiggyBankIcon,
  Check as CheckIcon,
  Checks as ChecksIcon,
  Trophy as TrophyIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Alert, AlertType } from "@/lib/database.types"

function getAlertIcon(type: AlertType) {
  switch (type) {
    case 'budget_warning':
    case 'budget_exceeded':
      return WarningIcon
    case 'subscription_renewal':
    case 'subscription_price_change':
      return CreditCardIcon
    case 'goal_at_risk':
      return TargetIcon
    case 'goal_achieved':
      return TrophyIcon
    case 'unusual_spending':
      return TrendUpIcon
    case 'income_received':
      return MoneyIcon
    case 'savings_rate_drop':
      return PiggyBankIcon
    default:
      return BellIcon
  }
}

function getAlertColor(type: AlertType, priority: string) {
  if (type === 'goal_achieved' || type === 'income_received') {
    return 'text-green-600 bg-green-50'
  }
  if (priority === 'high') {
    return 'text-red-600 bg-red-50'
  }
  if (priority === 'medium') {
    return 'text-amber-600 bg-amber-50'
  }
  return 'text-blue-600 bg-blue-50'
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'yesterday'
  return `${diffDay}d ago`
}

export function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }, [])

  const generateAlerts = useCallback(async () => {
    try {
      await fetch('/api/alerts/generate', { method: 'POST' })
      await fetchAlerts()
    } catch (error) {
      console.error('Error generating alerts:', error)
    }
  }, [fetchAlerts])

  useEffect(() => {
    // Fetch existing alerts immediately, then generate new ones in background
    fetchAlerts()
    generateAlerts()
  }, [fetchAlerts, generateAlerts])

  const unreadCount = alerts.filter((a) => !a.read).length

  const markAsRead = async (alertIds: string[]) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds, action: 'read' }),
      })
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (alertIds.includes(a.id) ? { ...a, read: true } : a))
        )
      }
    } catch (error) {
      console.error('Error marking alerts as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [], action: 'read_all' }),
      })
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const dismissAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [alertId] }),
      })
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      }
    } catch (error) {
      console.error('Error dismissing alert:', error)
    }
  }

  const handleAlertClick = (alert: Alert) => {
    if (!alert.read) {
      markAsRead([alert.id])
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 hover:text-primary rounded-xl">
          <BellIcon className="h-5 w-5" weight="thin" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-base font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChecksIcon className="h-3.5 w-3.5" weight="thin" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <BellIcon className="h-8 w-8 text-muted-foreground/50 mb-2" weight="thin" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              We&apos;ll alert you about budgets, goals, and spending
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border/50">
              {alerts.map((alert) => {
                const Icon = getAlertIcon(alert.type)
                const colorClass = getAlertColor(alert.type, alert.priority)

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                      !alert.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" weight="thin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!alert.read ? 'font-medium' : 'text-muted-foreground'}`}>
                          {alert.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            dismissAlert(alert.id)
                          }}
                          className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                          title="Dismiss"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {alert.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {alert.created_at ? timeAgo(alert.created_at) : ''}
                      </p>
                    </div>
                    {!alert.read && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
