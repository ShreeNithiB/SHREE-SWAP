import React, { useState, useEffect } from 'react';
import { ArrowRight, Activity, ArrowDownUp } from 'lucide-react';
import { getPrices, getReserves, getExpectedOutput } from '@/lib/blockchain/src';
import { formatEther, parseEther } from 'ethers';

export function CompareCard() {
  const [amountIn, setAmountIn] = useState('1');
  const [isSHForETH, setIsSHForETH] = useState(false);
  const [shreeSwapOut, setShreeSwapOut] = useState('--');
  
  // Mock external prices based on actual AMM price
  const [binanceOut, setBinanceOut] = useState('--');
  const [uniswapOut, setUniswapOut] = useState('--');

  useEffect(() => {
    async function fetchComparison() {
      if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
        setShreeSwapOut('--');
        setBinanceOut('--');
        setUniswapOut('--');
        return;
      }
      try {
        const out = await getExpectedOutput(amountIn, isSHForETH);
        setShreeSwapOut(parseFloat(out).toFixed(4));
        
        // Mock external sources based on a slightly worse price (so ShreeSwap looks good!)
        // Or just randomize slightly around it
        const baseOut = parseFloat(out);
        setBinanceOut((baseOut * 0.995).toFixed(4)); // 0.5% worse
        setUniswapOut((baseOut * 0.991).toFixed(4)); // 0.9% worse

      } catch (e) {
        console.error(e);
      }
    }
    
    fetchComparison();
    const interval = setInterval(fetchComparison, 10000);
    return () => clearInterval(interval);
  }, [amountIn, isSHForETH]);

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Compare Prices</h2>
        <button 
          onClick={() => setIsSHForETH(!isSHForETH)}
          style={{ background: '#ffffff1a', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isSHForETH ? 'SHREE → ETH' : 'ETH → SHREE'}
          <ArrowDownUp size={14} />
        </button>
      </div>
      
      <div className="card-body">
        <p style={{ color: '#999', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Compare SHREE Swap's on-chain execution with other popular exchanges. 
          Our constant-product AMM provides competitive rates.
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#999' }}>Amount to Swap ({isSHForETH ? 'SHREE' : 'ETH'})</label>
          <input 
            type="number" 
            value={amountIn} 
            onChange={(e) => setAmountIn(e.target.value)}
            style={{ width: '100%', padding: '1rem', background: '#000', border: '1px solid #ffffff1a', borderRadius: '8px', color: '#fff', fontSize: '1.1rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* SHREE Swap (Best) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, rgba(167, 139, 250, 0.1) 0%, transparent 100%)', border: '1px solid #a78bfa55', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#a78bfa', color: '#000', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                S
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>SHREE Swap</div>
                <div style={{ fontSize: '0.8rem', color: '#4ade80' }}>Best Price</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{shreeSwapOut}</div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>{isSHForETH ? 'ETH' : 'SHREE'}</div>
            </div>
          </div>

          {/* Binance Mock */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff0a', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#f3ba2f', color: '#000', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                B
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Binance (Mock)</div>
                <div style={{ fontSize: '0.8rem', color: '#999' }}>Centralized</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#999' }}>{binanceOut}</div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>{isSHForETH ? 'ETH' : 'SHREE'}</div>
            </div>
          </div>

          {/* Uniswap Mock */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff0a', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#ff007a', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                U
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Uniswap V3 (Mock)</div>
                <div style={{ fontSize: '0.8rem', color: '#999' }}>Decentralized</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#999' }}>{uniswapOut}</div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>{isSHForETH ? 'ETH' : 'SHREE'}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
