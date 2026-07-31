'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { AdAccount } from '@/lib/meta'

interface AccountContextValue {
  accounts: AdAccount[]
  selectedAccount: AdAccount | null
  setSelectedAccount: (account: AdAccount) => void
  isLoadingAccounts: boolean
  error: string | null
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [selectedAccount, setSelectedAccountState] = useState<AdAccount | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoadingAccounts(true)
    fetch('/api/meta/accounts')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setAccounts(data.accounts)
        if (data.accounts.length > 0) setSelectedAccountState(data.accounts[0])
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoadingAccounts(false))
  }, [])

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccount,
        setSelectedAccount: setSelectedAccountState,
        isLoadingAccounts,
        error,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccounts() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccounts must be used within AccountProvider')
  return ctx
}
