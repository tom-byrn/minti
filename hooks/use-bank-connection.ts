'use client'

import { useState, useEffect, useCallback } from 'react'

interface BankConnectionState {
  isConnected: boolean
  isLoading: boolean
  error: string | null
  checkConnection: () => Promise<void>
}

export function useBankConnection(): BankConnectionState {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkConnection = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/plaid/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.status === 404) {
        // No connected accounts
        setIsConnected(false)
        setError('No bank account connected')
        return
      }

      if (response.status === 401) {
        // Not authenticated
        setIsConnected(false)
        setError('Please log in to continue')
        return
      }

      if (!response.ok) {
        setIsConnected(false)
        setError('Your bank connection has expired. Please reconnect your account.')
        return
      }

      setIsConnected(true)
      setError(null)
    } catch (err) {
      console.error('Error checking bank connection:', err)
      setIsConnected(false)
      setError('Failed to check bank connection')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return {
    isConnected,
    isLoading,
    error,
    checkConnection,
  }
}
