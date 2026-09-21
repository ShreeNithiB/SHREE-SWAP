import React, { useEffect, useState } from 'react';
import { getContracts } from '@/lib/blockchain/src';
import { formatEther } from 'ethers';
import { ExternalLink, PieChart, TrendingUp, Layers, Activity } from 'lucide-react';

export function TokenomicsCard() {
  const [supply, setSupply] = useState<string>('--');
  
  useEffect(() => {
    async function fetchTotalSupply() {
      try {
        const { shreeTokenRO } = await getContracts();
        const ts = await shreeTokenRO.totalSupply();
        setSupply(formatEther(ts));
      } catch (error) {
        console.error("Failed to fetch total supply:", error);
      }
    }
    fetchTotalSupply();
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h2>SHREE Tokenomics</h2>
      </div>
      <div className="card-body">
        <p style={{ color: '#999', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          SHREE is a utility and governance token powering the decentralized ecosystem. 
          Its fixed supply ensures predictable mechanics while the automated market maker 
          provides constant liquidity.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#ffffff0a', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ color: '#a78bfa', marginBottom: '0.5rem' }}><Activity size={20} /></div>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.25rem' }}>Total Supply</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {supply !== '--' ? parseFloat(supply).toLocaleString() : '--'} SHREE
            </div>
          </div>
          
          <div style={{ background: '#ffffff0a', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ color: '#a78bfa', marginBottom: '0.5rem' }}><Layers size={20} /></div>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.25rem' }}>Network</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Ethereum Sepolia</div>
          </div>

          <div style={{ background: '#ffffff0a', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ color: '#a78bfa', marginBottom: '0.5rem' }}><TrendingUp size={20} /></div>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.25rem' }}>Swap Fee</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>0.30%</div>
          </div>

          <div style={{ background: '#ffffff0a', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ color: '#a78bfa', marginBottom: '0.5rem' }}><PieChart size={20} /></div>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.25rem' }}>Liquidity Lock</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Automated</div>
          </div>
        </div>

        <div style={{ background: '#ffffff0a', padding: '1rem', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 500 }}>Contract Addresses</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #ffffff1a' }}>
            <span style={{ color: '#999' }}>SHREE Token</span>
            <a href={`https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_SHREE_TOKEN_ADDRESS}`} target="_blank" style={{ color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {process.env.NEXT_PUBLIC_SHREE_TOKEN_ADDRESS?.slice(0, 6)}...{process.env.NEXT_PUBLIC_SHREE_TOKEN_ADDRESS?.slice(-4)}
              <ExternalLink size={14} />
            </a>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span style={{ color: '#999' }}>SHREE Swap AMM</span>
            <a href={`https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_SHREE_SWAP_ADDRESS}`} target="_blank" style={{ color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {process.env.NEXT_PUBLIC_SHREE_SWAP_ADDRESS?.slice(0, 6)}...{process.env.NEXT_PUBLIC_SHREE_SWAP_ADDRESS?.slice(-4)}
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
