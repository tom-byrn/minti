"use client"

import { useCallback, useEffect, useState } from "react"
import { usePlaidLink } from "react-plaid-link"
import { Button } from "@/components/ui/button"
import { SpinnerGap as SpinnerGapIcon } from "@phosphor-icons/react"

interface PlaidLinkProps {
  onSuccess?: () => void
}

export function PlaidLink({ onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const createLinkToken = async () => {
      try {
        const response = await fetch("/api/plaid/create-link-token", {
          method: "POST",
        })
        const data = await response.json()
        setLinkToken(data.link_token)
      } catch (error) {
        console.error("Error creating link token:", error)
      }
    }

    createLinkToken()
  }, [])

  const onSuccessCallback = useCallback(
    async (public_token: string) => {
      setLoading(true)
      try {
        const response = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ public_token }),
        })

        if (!response.ok) {
          throw new Error("Failed to exchange token")
        }

        // Token is securely stored in Supabase Vault by the server
        if (onSuccess) {
          onSuccess()
        }
      } catch (error) {
        console.error("Error exchanging public token:", error)
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  const config = {
    token: linkToken,
    onSuccess: onSuccessCallback,
  }

  const { open, ready } = usePlaidLink(config)

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading}
      size="lg"
      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all rounded-xl font-medium"
    >
      {loading ? (
        <>
          <SpinnerGapIcon className="mr-2 h-5 w-5 animate-spin" weight="thin" />
          Connecting...
        </>
      ) : (
        "Connect Bank Account"
      )}
    </Button>
  )
}
