'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ArrowDownUp, ArrowRight, Check, ChevronDown, ExternalLink, Info, Menu, Plus, Settings, ShieldCheck, Wallet, X, Loader2, LogOut } from 'lucide-react'
import { setBlockchainConfig, getSHBalance, getETHBalance, getReserves, getExpectedOutput, swapSHForETH, swapETHForSH, getPrices, getTotalLiquidity, getUserLiquidity, addLiquidity, removeLiquidity, approveSH, checkAllowance, getRecentEvents, AppEvent } from '@/lib/blockchain/src'
import { formatEther } from 'ethers'

setBlockchainConfig(
  process.env.NEXT_PUBLIC_SHREE_TOKEN_ADDRESS || "",
  process.env.NEXT_PUBLIC_SHREE_SWAP_ADDRESS || ""
);

const WOLF_IMAGE = '/images/shree-wolf.png'
const SOURCE_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kouiDVbVwM3ws2oTMxcnFqZn4Inh9K.png'

import { SwapCard } from '@/components/SwapCard'
import { LiquidityCard } from '@/components/LiquidityCard'
import { TokenomicsCard } from '@/components/TokenomicsCard'
import { CompareCard } from '@/components/CompareCard'
import { SIWEButton } from '@/components/SIWEButton'
import { useSIWE } from '@/lib/SIWEContext'

function TxStatus({ state, hash }: { state: string, hash: string }) {
  if (state === 'idle') return null;
  return (
    <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: '#ffffff0a', fontSize: '0.85rem' }}>
      {state === 'preparing' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Preparing transaction...</div>}
      {state === 'confirming' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Please confirm in MetaMask...</div>}
      {state === 'pending' && <div><Loader2 size={14} style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }}/> Transaction pending on Sepolia...</div>}
      {state === 'success' && <div style={{ color: '#4ade80' }}><Check size={14} style={{ display: 'inline', marginRight: '8px' }}/> Transaction confirmed!</div>}
      {state === 'failed' && <div style={{ color: '#f87171' }}><X size={14} style={{ display: 'inline', marginRight: '8px' }}/> Transaction failed.</div>}
      
      {hash && (
        <div style={{ marginTop: '0.5rem' }}>
          <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" style={{ color: '#a78bfa', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}>
            View on Etherscan <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  )
}

function NetworkBadge() {
  return <div className="network-badge"><span className="network-dot" /> Ethereum Sepolia <ChevronDown size={13} /></div>
}

function Header({ page, setPage }: { page: string; setPage: (page: string) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { address: account, isLoggedIn, signOut } = useSIWE()
  
  return <header className="header"><div className="header-inner">
    <button className="brand" onClick={() => setPage('swap')}><span className="brand-mark"><Image src={SOURCE_IMAGE} alt="Shree wolf logo" width={34} height={34} /></span><span>SHREE <em>SWAP</em></span></button>
    <nav className={mobileOpen ? 'nav mobile-visible' : 'nav'}>
      {['swap', 'compare', 'liquidity', 'transactions', 'tokenomics'].map(item => <button key={item} className={page === item ? 'nav-link active' : 'nav-link'} onClick={() => { setPage(item); setMobileOpen(false) }}>{item[0].toUpperCase() + item.slice(1)}</button>)}
      <a href="https://docs.google.com/forms/d/e/1FAIpQLSdversRrNDrKDFXqrrvgvVahtjNYwmLiey3EguqkyDo1-OSOQ/viewform?usp=header" target="_blank" rel="noreferrer" className="nav-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>Feedback <ExternalLink size={14} /></a>
    </nav>
    <div className="header-actions"><NetworkBadge /><div style={{display: 'flex', gap: '8px', alignItems: 'center'}}><SIWEButton />{isLoggedIn && <button className="icon-button" onClick={signOut} aria-label="Disconnect wallet" title="Disconnect wallet" style={{background: '#ffffff1a', color: '#ff6b6b'}}><LogOut size={16} /></button>}</div><button className="menu-button" aria-label="Toggle menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
  </div></header>
}

function TokenInput({ label, token, balance, value, onChange, disabled }: { label: string; token: string; balance: string; value?: string; onChange?: (v: string) => void; disabled?: boolean }) {
  return <div className="token-input"><div className="token-label"><span>{label}</span><span>Balance: {balance}</span></div><div className="token-row"><input aria-label={label} inputMode="decimal" placeholder="0.00" value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled} /><button className="token-select"><Image src={token === 'SHREE' ? SOURCE_IMAGE : '/eth.svg'} alt="" width={25} height={25} />{token}<ChevronDown size={15} /></button></div></div>
}

function PoolStats({ stats }: { stats: any }) {
  return <section className="pool-overview"><div className="section-kicker">POOL OVERVIEW <span><span className="live-dot" /> Sepolia testnet</span></div><div className="pool-grid">{[
    ['SHREE reserve', stats.shReserve], 
    ['ETH reserve', stats.ethReserve], 
    ['Current price', stats.shPrice ? `1 SHREE = ${stats.shPrice} ETH` : '--'], 
    ['24h volume', '--'], 
    ['Liquidity', stats.totalLiquidity]
  ].map(([label, value]) => <div className="pool-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
}

// SwapCard has been moved to @/components/SwapCard

function TransactionsPage() { 
  const [events, setEvents] = useState<AppEvent[]>([])
  
  useEffect(() => {
    getRecentEvents().then(setEvents)
  }, [])

  return <main className="page-wrap"><div className="page-title"><p className="eyebrow">ACTIVITY</p><h1>Recent transactions</h1><p>Real-time swap and liquidity events from the SHREE / ETH pool on Ethereum Sepolia.</p></div><div className="transactions-card">
    {events.length === 0 ? <div className="empty-state"><div className="empty-icon"><ArrowDownUp size={20} /></div><h2>No transactions yet</h2><p>Swap activity will appear here once the pool is connected to a live contract.</p><a href="https://sepolia.etherscan.io/address/0x3FcaB0D5B60853b6a55b1A2C9aE93CB4aF0D3ac4" target="_blank" className="secondary-action">View Sepolia explorer <ExternalLink size={15} /></a></div> : 
      <div style={{width: '100%'}}>
        <div style={{padding: '1rem', borderBottom: '1px solid #ffffff1a', display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '0.8rem', textTransform: 'uppercase'}}>
          <span style={{width: '150px'}}>Action</span>
          <span style={{flex: 1}}>Details</span>
          <span style={{width: '100px', textAlign: 'center'}}>Status</span>
          <span style={{width: '100px', textAlign: 'right'}}>Explorer</span>
        </div>
        {events.map((e, i) => (
          <div key={i} style={{padding: '1rem', borderBottom: '1px solid #ffffff1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontWeight: 500, width: '150px', color: e.type === 'swap' ? '#fff' : e.type === 'add_liquidity' ? '#a78bfa' : '#f87171'}}>
              {e.type === 'swap' ? (e.isSHForETH ? 'Swap SHREE → ETH' : 'Swap ETH → SHREE') : 
               e.type === 'add_liquidity' ? 'Add Liquidity' : 'Remove Liquidity'}
            </span>
            <span style={{flex: 1, color: '#999', fontSize: '0.9rem'}}>
              {e.type === 'swap' ? `${parseFloat(e.amountIn!).toFixed(4)} ${e.isSHForETH ? 'SH' : 'ETH'} for ${parseFloat(e.amountOut!).toFixed(4)} ${e.isSHForETH ? 'ETH' : 'SH'}` : 
               `${parseFloat(e.amountETH!).toFixed(4)} ETH and ${parseFloat(e.amountSH!).toFixed(2)} SHREE`}
            </span>
            <span style={{width: '100px', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}><Check size={14} /> Success</span>
            <a href={`https://sepolia.etherscan.io/tx/${e.transactionHash}`} target="_blank" style={{width: '100px', textAlign: 'right', color: '#a78bfa', textDecoration: 'underline', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px'}}>Tx <ExternalLink size={14}/></a>
          </div>
        ))}
      </div>
    }
  </div></main> 
}

export default function Page() { 
  const [page, setPage] = useState('swap')
  const { address: account } = useSIWE()
  const [shBalance, setShBalance] = useState('0')
  const [ethBalance, setEthBalance] = useState('0')
  const [stats, setStats] = useState<any>({ shReserve: '--', ethReserve: '--', shPrice: '--', totalLiquidity: '--' })

  const fetchBalances = useCallback(async () => {
    if (account) {
      const sh = await getSHBalance(account)
      const eth = await getETHBalance(account)
      setShBalance(parseFloat(sh).toFixed(4))
      setEthBalance(parseFloat(eth).toFixed(4))
    }
  }, [account])

  const fetchStats = useCallback(async () => {
    const res = await getReserves()
    const p = await getPrices()
    const tl = await getTotalLiquidity()
    setStats({
      shReserve: res.sh !== '0' ? parseFloat(res.sh).toFixed(2) : '--',
      ethReserve: res.eth !== '0' ? parseFloat(res.eth).toFixed(4) : '--',
      shPrice: p.shPrice !== '0' ? parseFloat(p.shPrice).toFixed(6) : '--',
      totalLiquidity: tl !== '0' ? parseFloat(tl).toFixed(2) : '--'
    })
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchBalances()
    const interval = setInterval(() => {
      fetchBalances()
      fetchStats()
    }, 12000)
    return () => clearInterval(interval)
  }, [account, fetchBalances, fetchStats])



  const handleUpdate = () => {
    fetchBalances()
    fetchStats()
  }

  return <><Header page={page} setPage={setPage} /><main className="app-shell">{page === 'swap' && <><section className="hero"><div className="hero-copy"><div className="hero-logo"><Image src={SOURCE_IMAGE} alt="Purple Shree wolf emblem" width={84} height={84} /></div><p className="eyebrow">DECENTRALIZED EXCHANGE</p><h2>A simpler way to <span>swap SHREE.</span></h2><p>Trade SHREE on Ethereum Sepolia with a transparent, non-custodial exchange.</p></div><SwapCard account={account} shBalance={shBalance} ethBalance={ethBalance} stats={stats} onUpdate={handleUpdate} /></section><PoolStats stats={stats} /></>}{page === 'liquidity' && <><section className="hero"><div className="hero-copy"><div className="hero-logo"><Image src={SOURCE_IMAGE} alt="Purple Shree wolf emblem" width={84} height={84} /></div><p className="eyebrow">LIQUIDITY PROVIDER</p><h2>Provide liquidity and <span>earn fees.</span></h2><p>Earn a 0.30% fee on all trades proportional to your share of the pool.</p></div><LiquidityCard account={account} shBalance={shBalance} ethBalance={ethBalance} stats={stats} onUpdate={handleUpdate} /></section><PoolStats stats={stats} /></>}{page === 'transactions' && <TransactionsPage />}{page === 'tokenomics' && <main className="page-wrap"><TokenomicsCard /></main>}{page === 'compare' && <main className="page-wrap"><CompareCard /></main>}</main><footer><span>SHREE SWAP · Ethereum Sepolia</span><span>Built for the SHREE community</span></footer></> 
}
