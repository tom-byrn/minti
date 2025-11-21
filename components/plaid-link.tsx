"use client"

import { useCallback, useEffect, useState } from "react"
import { usePlaidLink } from "react-plaid-link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface PlaidLinkProps {
  onSuccess?: (accessToken: string) => void
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

        const data = await response.json()

        // Store access token in localStorage (NOT recommended for production)
        localStorage.setItem("plaid_access_token", data.access_token)

        if (onSuccess) {
          onSuccess(data.access_token)
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
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Connecting...
        </>
      ) : (
        "Connect Bank Account"
      )}
    </Button>
  )
}
