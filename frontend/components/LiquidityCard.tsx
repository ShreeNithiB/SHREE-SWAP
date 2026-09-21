'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, ArrowRight, Settings, ShieldCheck, Loader2, Check, X, ExternalLink, ArrowDownToLine, ArrowDownUp } from 'lucide-react'
import { addLiquidity, removeLiquidity, getExpectedOutput, checkAllowance, approveSH, getTotalLiquidity, getUserLiquidity, getReserves } from '@/lib/blockchain/src'
import { formatEther } from 'ethers'

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
        <button className="token-select" disabled>
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
      {state === 'approving' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Approving SHREE...</div>}
      {state === 'confirming' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Please confirm in MetaMask...</div>}
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

export function LiquidityCard({ account, shBalance, ethBalance, stats, onUpdate }: { account: string | null, shBalance: string, ethBalance: string, stats: any, onUpdate: () => void }) {
  const [tab, setTab] = useState<'add'|'remove'>('add')
  const [amountETH, setAmountETH] = useState('')
  const [amountSH, setAmountSH] = useState('')
  const [lastEdited, setLastEdited] = useState<'ETH'|'SH'>('ETH')
  const [removePercent, setRemovePercent] = useState('25')
  const [isETHFirst, setIsETHFirst] = useState(true)
  
  const [userLP, setUserLP] = useState('0')
  const [totalLP, setTotalLP] = useState('0')
  
  const [txState, setTxState] = useState<'idle'|'preparing'|'approving'|'confirming'|'pending'|'success'|'failed'>('idle')
  const [txHash, setTxHash] = useState('')

  const loading = txState !== 'idle' && txState !== 'success' && txState !== 'failed'

  const fetchLP = async () => {
    if (account) {
      const uLP = await getUserLiquidity(account)
      setUserLP(uLP)
    }
    const tLP = await getTotalLiquidity()
    setTotalLP(tLP)
  }

  useEffect(() => {
    fetchLP()
  }, [account, txState]) // Refresh LP stats when txState changes (success)

  // Two-way calculation based on pool ratio
  useEffect(() => {
    if (tab !== 'add') return;
    
    const ethRes = parseFloat(stats.ethReserve || '0');
    const shRes = parseFloat(stats.shReserve || '0');
    
    if (ethRes > 0 && shRes > 0) {
      if (lastEdited === 'ETH') {
        if (!amountETH || isNaN(Number(amountETH)) || Number(amountETH) <= 0) {
          setAmountSH('');
        } else {
          const needed = parseFloat(amountETH) * (shRes / ethRes);
          setAmountSH(needed.toFixed(18));
        }
      } else if (lastEdited === 'SH') {
        if (!amountSH || isNaN(Number(amountSH)) || Number(amountSH) <= 0) {
          setAmountETH('');
        } else {
          const needed = parseFloat(amountSH) * (ethRes / shRes);
          setAmountETH(needed.toFixed(18));
        }
      }
    }
  }, [amountETH, amountSH, stats.ethReserve, stats.shReserve, tab, lastEdited])

  const handleAdd = async () => {
    if (!account || !amountETH || !amountSH) return
    setTxState('preparing')
    setTxHash('')
    
    try {
      const hasAllowance = await checkAllowance(account, amountSH)
      if (!hasAllowance) {
        setTxState('approving')
        const approveTx = await approveSH(amountSH)
        await approveTx.wait()
      }
      setTxState('confirming')
      const tx = await addLiquidity(amountSH, amountETH)
      setTxState('pending')
      setTxHash(tx.hash)
      await tx.wait()
      setTxState('success')
      setAmountETH('')
      setAmountSH('')
      onUpdate()
    } catch (e: any) {
      console.error(e)
      setTxState('failed')
    }
  }

  const handleRemove = async () => {
    if (!account || parseFloat(userLP) === 0) return
    setTxState('preparing')
    setTxHash('')
    
    try {
      const sharesToRemove = (parseFloat(userLP) * (parseFloat(removePercent) / 100)).toFixed(18)
      setTxState('confirming')
      const tx = await removeLiquidity(sharesToRemove)
      setTxState('pending')
      setTxHash(tx.hash)
      await tx.wait()
      setTxState('success')
      onUpdate()
    } catch (e: any) {
      console.error(e)
      setTxState('failed')
    }
  }

  const hasETHBalance = parseFloat(ethBalance) >= parseFloat(amountETH || '0')
  const hasSHBalance = parseFloat(shBalance) >= parseFloat(amountSH || '0')
  
  let poolShare = "0.00"
  if (parseFloat(totalLP) > 0) {
    poolShare = ((parseFloat(userLP) / parseFloat(totalLP)) * 100).toFixed(4)
  }

  return (
    <div className="swap-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">LIQUIDITY POOL</p>
          <h1>Manage Liquidity</h1>
          <p className="subheading">Provide liquidity to earn 0.30% swap fees.</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', background: '#1e1e24', padding: '4px', borderRadius: '8px' }}>
        <button style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none', background: tab === 'add' ? '#ffffff1a' : 'transparent', color: tab === 'add' ? '#fff' : '#999', fontWeight: 600, cursor: 'pointer' }} onClick={() => setTab('add')}>Add Liquidity</button>
        <button style={{ flex: 1, padding: '8px', borderRadius: '4px', border: 'none', background: tab === 'remove' ? '#ffffff1a' : 'transparent', color: tab === 'remove' ? '#fff' : '#999', fontWeight: 600, cursor: 'pointer' }} onClick={() => setTab('remove')}>Remove Liquidity</button>
      </div>

      {tab === 'add' ? (
        <>
          <div className="swap-fields">
            {isETHFirst ? (
              <TokenInput label="Deposit" token="ETH" balance={account ? ethBalance : "Connect wallet"} value={amountETH} onChange={(val) => { setLastEdited('ETH'); setAmountETH(val); }} />
            ) : (
              <TokenInput label="Deposit" token="SHREE" balance={account ? shBalance : "Connect wallet"} value={amountSH} onChange={(val) => { setLastEdited('SH'); setAmountSH(val); }} />
            )}
            <div style={{textAlign: 'center', margin: '-10px 0', zIndex: 5, position: 'relative'}}>
              <button aria-label="Swap direction" onClick={() => setIsETHFirst(!isETHFirst)} style={{margin: '0 auto', background: '#2d2d3d', color: '#fff', border: '4px solid #16161a', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}>
                <ArrowDownUp size={16} />
              </button>
            </div>
            {isETHFirst ? (
              <TokenInput label="Deposit" token="SHREE" balance={account ? shBalance : "Connect wallet"} value={amountSH} onChange={(val) => { setLastEdited('SH'); setAmountSH(val); }} />
            ) : (
              <TokenInput label="Deposit" token="ETH" balance={account ? ethBalance : "Connect wallet"} value={amountETH} onChange={(val) => { setLastEdited('ETH'); setAmountETH(val); }} />
            )}
          </div>

          <div className="trade-details">
            <div><span>Current Pool Ratio</span><b>{parseFloat(stats.ethReserve || '0') > 0 ? `1 ETH = ${parseFloat(stats.shPrice).toFixed(2)} SHREE` : 'Pool is empty. Set initial ratio.'}</b></div>
            <div><span>Your Pool Share</span><b>{poolShare}%</b></div>
            <div><span>Your LP Tokens</span><b>{parseFloat(userLP).toFixed(6)}</b></div>
          </div>

          <button className="primary-action" disabled={!account || !amountETH || !hasETHBalance || !hasSHBalance || loading} onClick={handleAdd}>
            {loading ? (
              txState === 'approving' ? 'Approving...' : txState === 'confirming' ? 'Confirm in wallet...' : 'Transaction pending...'
            ) : !account ? (
              'Connect wallet'
            ) : !amountETH ? (
              'Enter an amount'
            ) : !hasETHBalance ? (
              'Insufficient ETH'
            ) : !hasSHBalance ? (
              'Insufficient SHREE'
            ) : (
              'Add Liquidity'
            )} 
          </button>
        </>
      ) : (
        <>
          <div className="swap-fields" style={{ padding: '2rem 1rem', background: '#1e1e24', borderRadius: '12px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '3rem', margin: '0 0 1rem 0', color: '#fff' }}>{removePercent}%</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['25', '50', '75', '100'].map(val => (
                <button key={val} onClick={() => setRemovePercent(val)} style={{ flex: 1, padding: '8px', background: removePercent === val ? '#a78bfa' : '#ffffff1a', color: removePercent === val ? '#000' : '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{val}%</button>
              ))}
            </div>
          </div>
          
          <div className="trade-details">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Pooled ETH to receive</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image src="/eth.svg" alt="" width={16} height={16} />
                <b>{parseFloat(totalLP) > 0 ? ( (parseFloat(userLP) * (parseFloat(removePercent) / 100)) / parseFloat(totalLP) * parseFloat(stats.ethReserve) ).toFixed(6) : '0.00'}</b>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Pooled SHREE to receive</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image src={SOURCE_IMAGE} alt="" width={16} height={16} />
                <b>{parseFloat(totalLP) > 0 ? ( (parseFloat(userLP) * (parseFloat(removePercent) / 100)) / parseFloat(totalLP) * parseFloat(stats.shReserve) ).toFixed(2) : '0.00'}</b>
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #ffffff1a', margin: '1rem 0' }} />
            <div><span>Your Pool Share</span><b>{poolShare}%</b></div>
            <div><span>Your LP Tokens</span><b>{parseFloat(userLP).toFixed(6)}</b></div>
          </div>

          <button className="primary-action" disabled={!account || parseFloat(userLP) === 0 || loading} onClick={handleRemove}>
            {loading ? (
              txState === 'confirming' ? 'Confirm in wallet...' : 'Transaction pending...'
            ) : !account ? (
              'Connect wallet'
            ) : parseFloat(userLP) === 0 ? (
              'No liquidity to remove'
            ) : (
              'Remove Liquidity'
            )} 
          </button>
        </>
      )}

      <TxStatus state={txState} hash={txHash} />
      <p className="wallet-note"><ShieldCheck size={14} /> Transactions are executed on Ethereum Sepolia</p>
    </div>
  )
}
