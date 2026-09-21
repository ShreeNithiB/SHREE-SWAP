'use client'

import React from 'react'
import { Wallet, Loader2 } from 'lucide-react'
import { useSIWE } from '@/lib/SIWEContext'

export function SIWEButton() {
  const { address, isLoggedIn, signIn, isConnecting } = useSIWE()

  return (
    <button className="wallet-button" onClick={signIn} disabled={isConnecting || isLoggedIn}>
      {isConnecting ? (
        <><Loader2 size={16} style={{ display: 'inline', marginRight: '6px', animation: 'spin 1s linear infinite' }} /> Connecting...</>
      ) : isLoggedIn && address ? (
        <><span className="wallet-dot" />{address.slice(0, 6)}...{address.slice(-4)}</>
      ) : (
        <><Wallet size={16} /> Sign In</>
      )}
    </button>
  )
}
