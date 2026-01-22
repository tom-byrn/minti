"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlaidLink } from "@/components/plaid-link"

interface ReconnectBankCardProps {
  onSuccess?: () => void
  error?: string | null
}

export function ReconnectBankCard({ onSuccess, error }: ReconnectBankCardProps) {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Reconnect Your Bank</CardTitle>
          <CardDescription>
            {error || "Your bank connection has expired. Please reconnect your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <PlaidLink onSuccess={onSuccess} />
        </CardContent>
      </Card>
    </div>
  )
}
