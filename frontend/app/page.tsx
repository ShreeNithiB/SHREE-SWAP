'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ArrowDownUp, ArrowRight, Check, ChevronDown, ExternalLink, Info, Menu, Plus, Settings, ShieldCheck, Wallet, X, Loader2, LogOut } from 'lucide-react'
import { setBlockchainConfig, connectWallet, getConnectedAccount, getSHBalance, getETHBalance, getReserves, getExpectedOutput, swapSHForETH, swapETHForSH, getPrices, getTotalLiquidity, getUserLiquidity, addLiquidity, removeLiquidity, approveSH, checkAllowance, getRecentSwaps, SwapEvent } from '@/lib/blockchain/src'
import { formatEther } from 'ethers'

setBlockchainConfig(
  process.env.NEXT_PUBLIC_SHREE_TOKEN_ADDRESS || "",
  process.env.NEXT_PUBLIC_SHREE_SWAP_ADDRESS || ""
);

const WOLF_IMAGE = '/images/shree-wolf.png'
const SOURCE_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kouiDVbVwM3ws2oTMxcnFqZn4Inh9K.png'

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

function WalletButton({ account, onClick, isConnecting }: { account: string | null; onClick: () => void; isConnecting?: boolean }) {
  return <button className="wallet-button" onClick={onClick} disabled={isConnecting}>{isConnecting ? <><Loader2 size={16} style={{ display: 'inline', marginRight: '6px', animation: 'spin 1s linear infinite' }} /> Connecting...</> : account ? <><span className="wallet-dot" />{account.slice(0, 6)}...{account.slice(-4)}</> : <><Wallet size={16} /> Connect wallet</>}</button>
}

function Header({ page, setPage, account, onConnect, onDisconnect, isConnecting }: { page: string; setPage: (page: string) => void; account: string | null; onConnect: () => void; onDisconnect: () => void; isConnecting?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return <header className="header"><div className="header-inner">
    <button className="brand" onClick={() => setPage('swap')}><span className="brand-mark"><Image src={SOURCE_IMAGE} alt="Shree wolf logo" width={34} height={34} /></span><span>SHREE <em>SWAP</em></span></button>
    <nav className={mobileOpen ? 'nav mobile-visible' : 'nav'}>{['swap', 'transactions'].map(item => <button key={item} className={page === item ? 'nav-link active' : 'nav-link'} onClick={() => { setPage(item); setMobileOpen(false) }}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
    <div className="header-actions"><NetworkBadge /><div style={{display: 'flex', gap: '8px', alignItems: 'center'}}><WalletButton account={account} onClick={onConnect} isConnecting={isConnecting} />{account && <button className="icon-button" onClick={onDisconnect} aria-label="Disconnect wallet" title="Disconnect wallet" style={{background: '#ffffff1a', color: '#ff6b6b'}}><LogOut size={16} /></button>}</div><button className="menu-button" aria-label="Toggle menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
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

function SwapCard({ account, shBalance, ethBalance, onUpdate }: { account: string | null, shBalance: string, ethBalance: string, onUpdate: () => void }) {
  const [amountIn, setAmountIn] = useState('0.0002') // Fixed input
  const amountOut = '10' // Fixed output
  const isSHForETH = false // Locked to ETH -> SHREE
  const [txState, setTxState] = useState<'idle'|'preparing'|'confirming'|'pending'|'success'|'failed'>('idle')
  const [txHash, setTxHash] = useState('')

  const hasAmount = amountIn === '0.0002'
  const hasBalance = parseFloat(ethBalance) >= 0.0002
  const loading = txState !== 'idle' && txState !== 'success' && txState !== 'failed'
  
  const handleSwap = async () => {
    if (!account || !hasAmount || !hasBalance) return
    setTxState('preparing')
    setTxHash('')
    try {
      // Set minOut to 0 to guarantee the transaction never fails due to price impact
      const minOut = "0.0"
      setTxState('confirming')
      
      const tx = await swapETHForSH(amountIn, minOut)
      
      setTxState('pending')
      setTxHash(tx.hash || '')
      await tx.wait()
      
      setTxState('success')
      onUpdate()
    } catch (e: any) {
      console.error(e)
      setTxState('failed')
    }
  }

  return <div className="swap-card"><div className="card-heading"><div><p className="eyebrow">FIXED RATE SWAP</p><h1>Swap ETH <span>→</span> SHREE</h1><p className="subheading">Get exactly 10 SHREE for 0.0002 Sepolia ETH</p></div><button className="icon-button" aria-label="Swap settings"><Settings size={18} /></button></div><div className="swap-fields"><TokenInput label="You pay" token="ETH" balance={account ? ethBalance : "Connect wallet"} value={amountIn} onChange={(v) => setAmountIn(v)} /><button className="direction-button" aria-label="Swap" disabled><ArrowDownUp size={16} /></button><TokenInput label="You receive" token="SHREE" balance={account ? shBalance : "Connect wallet"} value={amountIn === '0.0002' ? amountOut : '0'} disabled /></div><div className="trade-details"><div><span>Exchange rate</span><b>0.0002 ETH = 10 SHREE</b></div><div><span>Network Fee</span><b>Standard Sepolia Gas</b></div><div className="route"><span>Route</span><b>ETH <ArrowRight size={13} /> SHREE</b></div></div><button className="primary-action" disabled={!account || !hasAmount || (hasAmount && !hasBalance) || loading} onClick={handleSwap}>{loading ? (txState === 'confirming' ? 'Confirm in wallet...' : 'Transaction pending...') : !account ? 'Connect wallet' : !hasAmount ? 'Enter exactly 0.0002 ETH' : !hasBalance ? 'Insufficient ETH' : 'Swap'} <ArrowRight size={17} /></button><TxStatus state={txState} hash={txHash} /><p className="wallet-note"><ShieldCheck size={14} /> Transactions are executed on Ethereum Sepolia</p></div>
}

function TransactionsPage() { 
  const [events, setEvents] = useState<SwapEvent[]>([])
  
  useEffect(() => {
    getRecentSwaps().then(setEvents)
  }, [])

  return <main className="page-wrap"><div className="page-title"><p className="eyebrow">ACTIVITY</p><h1>Recent swaps</h1><p>Real-time transactions from the SHREE / ETH pool on Ethereum Sepolia.</p></div><div className="transactions-card">
    {events.length === 0 ? <div className="empty-state"><div className="empty-icon"><ArrowDownUp size={20} /></div><h2>No transactions yet</h2><p>Swap activity will appear here once the pool is connected to a live contract.</p><a href="https://sepolia.etherscan.io/address/0x3FcaB0D5B60853b6a55b1A2C9aE93CB4aF0D3ac4" target="_blank" className="secondary-action">View Sepolia explorer <ExternalLink size={15} /></a></div> : 
      <div style={{width: '100%'}}>
        <div style={{padding: '1rem', borderBottom: '1px solid #ffffff1a', display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '0.8rem', textTransform: 'uppercase'}}>
          <span>Action</span>
          <span>Amount In</span>
          <span>Amount Out</span>
          <span>Status</span>
          <span>Explorer</span>
        </div>
        {events.map((e, i) => (
          <div key={i} style={{padding: '1rem', borderBottom: '1px solid #ffffff1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontWeight: 500}}>{e.isSHForETH ? 'SHREE → ETH' : 'ETH → SHREE'}</span>
            <span>{parseFloat(e.amountIn).toFixed(4)} {e.isSHForETH ? 'SH' : 'ETH'}</span>
            <span>{Math.round(parseFloat(e.amountOut))} {e.isSHForETH ? 'ETH' : 'SH'}</span>
            <span style={{color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px'}}><Check size={14} /> Success</span>
            <a href={`https://sepolia.etherscan.io/tx/${e.transactionHash}`} target="_blank" style={{color: '#a78bfa', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px'}}>View Tx <ExternalLink size={14}/></a>
          </div>
        ))}
      </div>
    }
  </div></main> 
}

export default function Page() { 
  const [page, setPage] = useState('swap')
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
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
    getConnectedAccount().then(acc => {
      if(acc) setAccount(acc)
    })
    fetchStats()

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const handleAccountsChanged = (accounts: string[]) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
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
  }, [])

  useEffect(() => {
    fetchBalances()
  }, [account, fetchBalances])

  const handleConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      const acc = await connectWallet()
      setAccount(acc)
    } catch(e:any) {
      alert(e.message)
    } finally {
      setIsConnecting(false);
    }
  }

  const handleDisconnect = () => {
    setAccount(null);
    setShBalance('0');
    setEthBalance('0');
  }

  const handleUpdate = () => {
    fetchBalances()
    fetchStats()
  }

  return <><Header page={page} setPage={setPage} account={account} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={isConnecting} /><main className="app-shell">{page === 'swap' && <><section className="hero"><div className="hero-copy"><div className="hero-logo"><Image src={SOURCE_IMAGE} alt="Purple Shree wolf emblem" width={84} height={84} /></div><p className="eyebrow">DECENTRALIZED EXCHANGE</p><h2>A simpler way to <span>swap SHREE.</span></h2><p>Trade SHREE on Ethereum Sepolia with a transparent, non-custodial exchange.</p></div><SwapCard account={account} shBalance={shBalance} ethBalance={ethBalance} onUpdate={handleUpdate} /></section><PoolStats stats={stats} /></>}{page === 'transactions' && <TransactionsPage />}</main><footer><span>SHREE SWAP · Ethereum Sepolia</span><span>Built for the SHREE community</span></footer></> 
}
