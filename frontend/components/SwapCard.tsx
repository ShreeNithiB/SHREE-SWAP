'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ArrowDownUp, ArrowRight, Settings, ShieldCheck, Loader2, Check, X, ExternalLink } from 'lucide-react'
import { swapSHForETH, swapETHForSH, getExpectedOutput, addTokenToMetaMask, checkAllowance, approveSH } from '@/lib/blockchain/src'

const SOURCE_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kouiDVbVwM3ws2oTMxcnFqZn4Inh9K.png'

function TokenInput({ label, token, balance, value, onChange, disabled }: { label: string; token: string; balance: string; value?: string; onChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="token-input">
      <div className="token-label">
        <span>{label}</span>
        <span>Balance: {balance}</span>
      </div>
      <div className="token-row">
        <input 
          aria-label={label} 
          inputMode="decimal" 
          placeholder="0.00" 
          value={value} 
          onChange={e => onChange?.(e.target.value)} 
          disabled={disabled} 
        />
        <button className="token-select">
          <Image src={token === 'SHREE' ? SOURCE_IMAGE : '/eth.svg'} alt="" width={25} height={25} />
          {token}
        </button>
      </div>
    </div>
  )
}

function TxStatus({ state, hash }: { state: string, hash: string }) {
  if (state === 'idle') return null;
  return (
    <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: '#ffffff0a', fontSize: '0.85rem' }}>
      {state === 'preparing' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Preparing transaction...</div>}
      {state === 'approving' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Approving SHREE in MetaMask...</div>}
      {state === 'confirming' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Please confirm swap in MetaMask...</div>}
      {state === 'pending' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Transaction pending on Sepolia...</div>}
      {state === 'success' && <div style={{ color: '#4ade80' }}><Check size={14} style={{ display: 'inline', marginRight: '8px' }}/> Transaction confirmed!</div>}
      {state === 'failed' && <div style={{ color: '#f87171' }}><X size={14} style={{ display: 'inline', marginRight: '8px' }}/> Transaction failed.</div>}
      
      {hash && (
        <div style={{ marginTop: '0.5rem' }}>
          <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer" style={{ color: '#a78bfa', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}>
            View on Etherscan <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  )
}

export function SwapCard({ account, shBalance, ethBalance, stats, onUpdate }: { account: string | null, shBalance: string, ethBalance: string, stats: any, onUpdate: () => void }) {
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [isSHForETH, setIsSHForETH] = useState(false)
  const [slippage, setSlippage] = useState('0.5')
  const [showSettings, setShowSettings] = useState(false)
  
  const [txState, setTxState] = useState<'idle'|'preparing'|'approving'|'confirming'|'pending'|'success'|'failed'>('idle')
  const [txHash, setTxHash] = useState('')

  const loading = txState !== 'idle' && txState !== 'success' && txState !== 'failed'

  // Update output amount dynamically
  useEffect(() => {
    const updateOutput = async () => {
      if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
        setAmountOut('')
        return
      }
      const expected = await getExpectedOutput(amountIn, isSHForETH)
      setAmountOut(expected)
    }
    const debounce = setTimeout(updateOutput, 300)
    return () => clearTimeout(debounce)
  }, [amountIn, isSHForETH])

  const handleToggle = () => {
    setIsSHForETH(!isSHForETH)
    setAmountIn('')
    setAmountOut('')
  }

  const handleSwap = async () => {
    if (!account || !amountIn || !amountOut) return
    setTxState('preparing')
    setTxHash('')
    
    try {
      const parsedSlippage = parseFloat(slippage) / 100
      const minOut = (parseFloat(amountOut) * (1 - parsedSlippage)).toFixed(18)
      
      if (isSHForETH) {
        // Need to check allowance first for SHREE
        const hasAllowance = await checkAllowance(account, amountIn)
        if (!hasAllowance) {
          setTxState('approving')
          const approveTx = await approveSH(amountIn)
          await approveTx.wait()
        }
        setTxState('confirming')
        const tx = await swapSHForETH(amountIn, minOut)
        setTxState('pending')
        setTxHash(tx.hash)
        await tx.wait()
      } else {
        setTxState('confirming')
        const tx = await swapETHForSH(amountIn, minOut)
        setTxState('pending')
        setTxHash(tx.hash)
        await tx.wait()
        
        // Prompt to add SHREE to metamask after receiving it
        await addTokenToMetaMask()
      }
      
      setTxState('success')
      setAmountIn('')
      setAmountOut('')
      onUpdate()
    } catch (e: any) {
      console.error(e)
      setTxState('failed')
    }
  }

  // Calculate Price Impact
  let priceImpact = "0.00"
  if (amountIn && amountOut && parseFloat(amountIn) > 0 && stats.shReserve && stats.ethReserve) {
    const spotPrice = isSHForETH ? (parseFloat(stats.ethReserve) / parseFloat(stats.shReserve)) : (parseFloat(stats.shReserve) / parseFloat(stats.ethReserve))
    const executionPrice = parseFloat(amountOut) / parseFloat(amountIn)
    
    if (spotPrice > 0) {
      const diff = spotPrice - executionPrice
      const impact = (diff / spotPrice) * 100
      priceImpact = Math.max(0, impact).toFixed(2)
    }
  }

  const hasBalance = isSHForETH ? parseFloat(shBalance) >= parseFloat(amountIn || '0') : parseFloat(ethBalance) >= parseFloat(amountIn || '0')

  return (
    <div className="swap-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">DECENTRALIZED EXCHANGE</p>
          <h1>Swap {isSHForETH ? 'SHREE → ETH' : 'ETH → SHREE'}</h1>
          <p className="subheading">Automated Market Maker (AMM)</p>
        </div>
        <div style={{position: 'relative'}}>
          <button className="icon-button" aria-label="Swap settings" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={18} />
          </button>
          {showSettings && (
            <div style={{position: 'absolute', right: 0, top: '40px', background: '#1e1e24', padding: '1rem', borderRadius: '8px', zIndex: 10, width: '200px', border: '1px solid #ffffff1a'}}>
              <p style={{fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff'}}>Slippage Tolerance</p>
              <div style={{display: 'flex', gap: '8px'}}>
                {['0.1', '0.5', '1.0'].map(val => (
                  <button key={val} onClick={() => {setSlippage(val); setShowSettings(false)}} style={{flex: 1, padding: '4px', background: slippage === val ? '#a78bfa' : '#ffffff1a', color: slippage === val ? '#000' : '#fff', borderRadius: '4px', fontSize: '0.8rem', border: 'none', cursor: 'pointer'}}>{val}%</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="swap-fields">
        <TokenInput 
          label="You pay" 
          token={isSHForETH ? 'SHREE' : 'ETH'} 
          balance={account ? (isSHForETH ? shBalance : ethBalance) : "Connect wallet"} 
          value={amountIn} 
          onChange={setAmountIn} 
        />
        <div style={{textAlign: 'center', margin: '-10px 0', zIndex: 5, position: 'relative'}}>
          <button aria-label="Swap direction" onClick={handleToggle} style={{margin: '0 auto', background: '#2d2d3d', color: '#fff', border: '4px solid #16161a', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}>
            <ArrowDownUp size={16} />
          </button>
        </div>
        <TokenInput 
          label="You receive" 
          token={isSHForETH ? 'ETH' : 'SHREE'} 
          balance={account ? (isSHForETH ? ethBalance : shBalance) : "Connect wallet"} 
          value={amountOut} 
          disabled 
        />
      </div>

      {amountOut && (
        <div className="trade-details">
          <div><span>Rate</span><b>1 {isSHForETH ? 'SHREE' : 'ETH'} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)} {isSHForETH ? 'ETH' : 'SHREE'}</b></div>
          <div>
            <span style={{display: 'flex', gap: '4px', alignItems: 'center'}}>Price Impact <span title="Price impact is the difference between the current pool price and the effective execution price caused by this trade." style={{cursor: 'help', borderBottom: '1px dotted #999'}}>?</span></span>
            <b style={{color: parseFloat(priceImpact) > 5 ? '#f87171' : parseFloat(priceImpact) > 1 ? '#fbbf24' : '#fff'}}>{priceImpact}%</b>
          </div>
          <div><span>Swap Fee</span><b>0.30%</b></div>
          <div><span>Minimum Received</span><b>{(parseFloat(amountOut) * (1 - parseFloat(slippage)/100)).toFixed(6)} {isSHForETH ? 'ETH' : 'SHREE'}</b></div>
          <div><span>Slippage Tolerance</span><b>{slippage}%</b></div>
        </div>
      )}

      <button className="primary-action" disabled={!account || !amountIn || !amountOut || !hasBalance || loading} onClick={handleSwap}>
        {loading ? (
          txState === 'approving' ? 'Approving...' : txState === 'confirming' ? 'Confirm in wallet...' : 'Transaction pending...'
        ) : !account ? (
          'Connect wallet'
        ) : !amountIn ? (
          'Enter an amount'
        ) : !hasBalance ? (
          `Insufficient ${isSHForETH ? 'SHREE' : 'ETH'}`
        ) : (
          'Swap'
        )} 
        <ArrowRight size={17} />
      </button>

      <TxStatus state={txState} hash={txHash} />
      <p className="wallet-note"><ShieldCheck size={14} /> Transactions are executed on Ethereum Sepolia</p>
    </div>
  )
}
