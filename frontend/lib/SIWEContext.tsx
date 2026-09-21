'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiweMessage } from 'siwe';
import { getConnectedAccount, connectWallet, getSigner } from '@/lib/blockchain/src';
import { getAddress } from 'ethers';

interface SIWEContextType {
  address: string | null;
  isLoggedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isConnecting: boolean;
}

const SIWEContext = createContext<SIWEContextType>({
  address: null,
  isLoggedIn: false,
  signIn: async () => {},
  signOut: async () => {},
  isConnecting: false,
});

export const useSIWE = () => useContext(SIWEContext);

export const SIWEProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/siwe?action=me');
      const data = await res.json();
      if (data.isLoggedIn && data.address) {
        setAddress(data.address);
        setIsLoggedIn(true);
      } else {
        setAddress(null);
        setIsLoggedIn(false);
      }
    } catch (e) {
      console.error('Failed to check session', e);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          signOut();
        } else if (address && accounts[0].toLowerCase() !== address.toLowerCase()) {
          signOut();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);

      return () => {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [address]);

  // Session timer (30 minutes expiry)
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      checkSession(); // Re-validate session with backend
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Auto logout after 30 mins
    const timeout = setTimeout(() => {
      alert("Session expired. Please sign in again.");
      signOut();
    }, 30 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isLoggedIn]);

  const signIn = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      // 1. Ensure wallet is connected in MM
      const currentAcc = await connectWallet();
      
      // 2. Fetch nonce from our backend
      const nonceRes = await fetch('/api/siwe?action=nonce');
      const { nonce } = await nonceRes.json();

      // 3. Create SIWE message
      const signer = await getSigner();
      const chainId = await signer.provider?.getNetwork().then(n => Number(n.chainId));
      
      const domain = window.location.host;
      const origin = window.location.origin;

      const checksummedAddress = getAddress(currentAcc);

      const message = new SiweMessage({
        domain,
        address: checksummedAddress,
        statement: 'Sign in to SHREE SWAP to access your account.',
        uri: origin,
        version: '1',
        chainId: chainId || 11155111,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins
      });

      const messageToSign = message.prepareMessage();
      
      // 4. Sign message
      const signature = await signer.signMessage(messageToSign);

      // 5. Verify on backend
      const verifyRes = await fetch('/api/siwe?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSign, signature })
      });

      if (!verifyRes.ok) {
        throw new Error('Error verifying session');
      }

      setAddress(currentAcc);
      setIsLoggedIn(true);

    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to sign in');
      signOut();
    } finally {
      setIsConnecting(false);
    }
  };

  const signOut = async () => {
    setIsConnecting(true);
    try {
      await fetch('/api/siwe?action=logout', { method: 'POST' });
      setAddress(null);
      setIsLoggedIn(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SIWEContext.Provider value={{ address, isLoggedIn, signIn, signOut, isConnecting }}>
      {children}
    </SIWEContext.Provider>
  );
};
