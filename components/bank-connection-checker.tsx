"use client"

import { useBankConnection } from "@/hooks/use-bank-connection"
import { ReconnectBankCard } from "@/components/reconnect-bank-card"
import { SpinnerGap as SpinnerGapIcon } from "@phosphor-icons/react"

export function BankConnectionChecker({ children }: { children: React.ReactNode }) {
  const { isConnected, isLoading, error, checkConnection } = useBankConnection()

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <SpinnerGapIcon className="h-8 w-8 animate-spin text-muted-foreground" weight="thin" />
      </div>
    )
  }

  if (!isConnected || error) {
    return <ReconnectBankCard onSuccess={checkConnection} error={error} />
  }

  return <>{children}</>
}
