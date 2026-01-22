"use client"

import { useBankConnection } from "@/hooks/use-bank-connection"
import { ReconnectBankCard } from "@/components/reconnect-bank-card"
import { Loader2 } from "lucide-react"

export function BankConnectionChecker({ children }: { children: React.ReactNode }) {
  const { isConnected, isLoading, error, checkConnection } = useBankConnection()

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isConnected || error) {
    return <ReconnectBankCard onSuccess={checkConnection} error={error} />
  }

  return <>{children}</>
}
