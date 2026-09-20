'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ArrowDownUp, ArrowRight, Check, ChevronDown, ExternalLink, Info, Menu, Plus, Settings, ShieldCheck, Wallet, X, Loader2 } from 'lucide-react'
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

function Header({ page, setPage, account, onConnect, isConnecting }: { page: string; setPage: (page: string) => void; account: string | null; onConnect: () => void; isConnecting?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return <header className="header"><div className="header-inner">
    <button className="brand" onClick={() => setPage('swap')}><span className="brand-mark"><Image src={SOURCE_IMAGE} alt="Shree wolf logo" width={34} height={34} /></span><span>SHREE <em>SWAP</em></span></button>
    <nav className={mobileOpen ? 'nav mobile-visible' : 'nav'}>{['swap', 'liquidity', 'transactions'].map(item => <button key={item} className={page === item ? 'nav-link active' : 'nav-link'} onClick={() => { setPage(item); setMobileOpen(false) }}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
    <div className="header-actions"><NetworkBadge /><WalletButton account={account} onClick={onConnect} isConnecting={isConnecting} /><button className="menu-button" aria-label="Toggle menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
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
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [isSHForETH, setIsSHForETH] = useState(true)
  const [allowance, setAllowance] = useState('0')
  const [txState, setTxState] = useState<'idle'|'preparing'|'confirming'|'pending'|'success'|'failed'>('idle')
  const [txHash, setTxHash] = useState('')

  useEffect(() => {
    if (account) {
      checkAllowance(account).then(setAllowance)
    }
  }, [account])

  useEffect(() => {
    if (amountIn && parseFloat(amountIn) > 0) {
      const delay = setTimeout(() => {
        getExpectedOutput(amountIn, isSHForETH).then(setAmountOut)
      }, 300)
      return () => clearTimeout(delay)
    } else {
      setAmountOut('')
    }
  }, [amountIn, isSHForETH])

  const hasAmount = amountIn.trim().length > 0 && parseFloat(amountIn) > 0
  const needsApproval = isSHForETH && parseFloat(allowance) < parseFloat(amountIn || '0')
  const bal = isSHForETH ? shBalance : ethBalance
  const hasBalance = parseFloat(bal) >= parseFloat(amountIn || '0')
  const loading = txState !== 'idle' && txState !== 'success' && txState !== 'failed'
  
  const handleSwap = async () => {
    if (!account || !hasAmount || !hasBalance) return
    setTxState('preparing')
    setTxHash('')
    try {
      if (needsApproval) {
        setTxState('confirming')
        const tx = await approveSH(amountIn)
        setTxState('pending')
        setTxHash(tx.hash || '')
        await tx.wait()
        setAllowance(amountIn)
        setTxState('idle')
      } else {
        const slippage = 0.99 // 1% slippage for simplicity
        const minOut = (parseFloat(amountOut) * slippage).toFixed(18)
        setTxState('confirming')
        let tx;
        if (isSHForETH) {
          tx = await swapSHForETH(amountIn, minOut)
        } else {
          tx = await swapETHForSH(amountIn, minOut)
        }
        setTxState('pending')
        setTxHash(tx.hash || '')
        await tx.wait()
        
        setAmountIn('')
        setAmountOut('')
        setTxState('success')
        onUpdate()
      }
    } catch (e: any) {
      console.error(e)
      setTxState('failed')
    }
  }

  return <div className="swap-card"><div className="card-heading"><div><p className="eyebrow">SHREE / ETH</p><h1>Swap SHREE <span>↔</span> ETH</h1><p className="subheading">Trade SHREE tokens on Ethereum Sepolia</p></div><button className="icon-button" aria-label="Swap settings"><Settings size={18} /></button></div><div className="swap-fields"><TokenInput label="You pay" token={isSHForETH ? "SHREE" : "ETH"} balance={account ? (isSHForETH ? shBalance : ethBalance) : "Connect wallet"} value={amountIn} onChange={setAmountIn} /><button className="direction-button" aria-label="Reverse swap" onClick={() => setIsSHForETH(!isSHForETH)}><ArrowDownUp size={16} /></button><TokenInput label="You receive" token={!isSHForETH ? "SHREE" : "ETH"} balance={account ? (!isSHForETH ? shBalance : ethBalance) : "Connect wallet"} value={amountOut} disabled /></div><div className="trade-details"><div><span>Exchange rate</span><b>{amountOut ? `1 ${isSHForETH ? 'SHREE' : 'ETH'} = ${(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)} ${!isSHForETH ? 'SHREE' : 'ETH'}` : '--'}</b></div><div><span>Minimum received</span><b>{amountOut ? (parseFloat(amountOut) * 0.99).toFixed(6) : '--'}</b></div><div><span>Price impact</span><b>{'< 1%'}</b></div><div><span>LP fee</span><b>0.3%</b></div><div className="route"><span>Route</span><b>{isSHForETH ? 'SHREE' : 'ETH'} <ArrowRight size={13} /> {!isSHForETH ? 'SHREE' : 'ETH'}</b></div></div><button className="primary-action" disabled={!account || (hasAmount && !hasBalance) || loading} onClick={handleSwap}>{loading ? (txState === 'confirming' ? 'Confirm in wallet...' : 'Transaction pending...') : !account ? 'Connect wallet' : !hasAmount ? 'Enter amount' : !hasBalance ? 'Insufficient balance' : needsApproval ? 'Approve SHREE' : 'Swap'} <ArrowRight size={17} /></button><TxStatus state={txState} hash={txHash} /><p className="wallet-note"><ShieldCheck size={14} /> Transactions are executed on Ethereum Sepolia</p></div>
}

function LiquidityPage({ account, shBalance, ethBalance, onUpdate }: any) {
  const [shAmount, setShAmount] = useState('')
  const [ethAmount, setEthAmount] = useState('')
  const [allowance, setAllowance] = useState('0')
  const [userLiq, setUserLiq] = useState('0')
  const [price, setPrice] = useState('0')
  const [txState, setTxState] = useState<'idle'|'preparing'|'confirming'|'pending'|'success'|'failed'>('idle')
  const [txHash, setTxHash] = useState('')

  useEffect(() => {
    if (account) {
      checkAllowance(account).then(setAllowance)
      getUserLiquidity(account).then(setUserLiq)
      getPrices().then(p => setPrice(p.shPrice))
    }
  }, [account])

  const needsApproval = parseFloat(allowance) < parseFloat(shAmount || '0')
  const hasAmount = shAmount && ethAmount
  const loading = txState !== 'idle' && txState !== 'success' && txState !== 'failed'

  const handleAdd = async () => {
    setTxState('preparing')
    setTxHash('')
    try {
      if (needsApproval) {
        setTxState('confirming')
        const tx = await approveSH(shAmount)
        setTxState('pending')
        setTxHash(tx.hash || '')
        await tx.wait()
        setAllowance(shAmount)
        setTxState('idle')
      } else {
        setTxState('confirming')
        const tx = await addLiquidity(shAmount, ethAmount)
        setTxState('pending')
        setTxHash(tx.hash || '')
        await tx.wait()
        setTxState('success')
        onUpdate()
      }
    } catch(e:any) {
      console.error(e)
      setTxState('failed')
    }
  }

  const handleRemove = async () => {
    setTxState('confirming')
    setTxHash('')
    try {
      const tx = await removeLiquidity(userLiq)
      setTxState('pending')
      setTxHash(tx.hash || '')
      await tx.wait()
      setTxState('success')
      onUpdate()
      getUserLiquidity(account).then(setUserLiq)
    } catch(e:any) {
      console.error(e)
      setTxState('failed')
    }
  }

  return <main className="page-wrap"><div className="page-title"><p className="eyebrow">LIQUIDITY</p><h1>SHREE / ETH Liquidity Pool</h1><p>Provide liquidity and earn a share of trading fees.</p></div><div className="liquidity-layout"><div className="liquidity-card"><div className="card-heading"><div><p className="eyebrow">ADD LIQUIDITY</p><h2>Deposit assets</h2></div><button className="icon-button"><Info size={18} /></button></div><TokenInput label="SHREE amount" token="SHREE" balance={account ? shBalance : "Connect wallet"} value={shAmount} onChange={setShAmount} /><TokenInput label="ETH amount" token="ETH" balance={account ? ethBalance : "Connect wallet"} value={ethAmount} onChange={setEthAmount} /><div className="deposit-summary"><div><span>Pool share</span><b>--</b></div><div><span>Current price</span><b>{price !== '0' ? `1 SHREE = ${price} ETH` : '--'}</b></div></div><button className="primary-action" disabled={!account || !hasAmount || loading} onClick={handleAdd}>{loading ? 'Pending...' : !account ? 'Connect wallet' : needsApproval ? 'Approve SHREE' : 'Add Liquidity'} <ArrowRight size={17} /></button><TxStatus state={txState} hash={txHash} /></div><div className="pool-panel"><p className="eyebrow">YOUR POSITION</p><h2>{userLiq !== '0' ? `${userLiq} LP Tokens` : 'Nothing deposited yet'}</h2><p>Connect your wallet to view your position and add liquidity to the SHREE / ETH pool.</p>
  {!account && <button className="secondary-action">Connect wallet <Wallet size={16} /></button>}
  <div className="remove-box"><span>Remove liquidity</span><button disabled={userLiq === '0' || loading} onClick={handleRemove}>{loading ? '...' : <Plus size={16} />} Manage position</button></div></div></div></main>
}

function TransactionsPage() { 
  const [events, setEvents] = useState<SwapEvent[]>([])
  
  useEffect(() => {
    getRecentSwaps().then(setEvents)
  }, [])

  return <main className="page-wrap"><div className="page-title"><p className="eyebrow">ACTIVITY</p><h1>Recent swaps</h1><p>Transactions from the SHREE / ETH pool on Ethereum Sepolia.</p></div><div className="transactions-card">
    {events.length === 0 ? <div className="empty-state"><div className="empty-icon"><ArrowDownUp size={20} /></div><h2>No transactions yet</h2><p>Swap activity will appear here once the pool is connected to a live contract.</p><button className="secondary-action">View Sepolia explorer <ExternalLink size={15} /></button></div> : 
      <div style={{width: '100%'}}>
        {events.map((e, i) => (
          <div key={i} style={{padding: '1rem', borderBottom: '1px solid #ffffff1a', display: 'flex', justifyContent: 'space-between'}}>
            <span>{e.isSHForETH ? 'SHREE -> ETH' : 'ETH -> SHREE'}</span>
            <span>{e.amountIn} -> {e.amountOut}</span>
            <a href={`https://sepolia.etherscan.io/tx/${e.transactionHash}`} target="_blank" style={{color: '#999'}}>{e.transactionHash.slice(0, 10)}...</a>
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

  const handleUpdate = () => {
    fetchBalances()
    fetchStats()
  }

  return <><Header page={page} setPage={setPage} account={account} onConnect={handleConnect} isConnecting={isConnecting} /><main className="app-shell">{page === 'swap' && <><section className="hero"><div className="hero-copy"><div className="hero-logo"><Image src={SOURCE_IMAGE} alt="Purple Shree wolf emblem" width={84} height={84} /></div><p className="eyebrow">DECENTRALIZED EXCHANGE</p><h2>A simpler way to <span>swap SHREE.</span></h2><p>Trade SHREE on Ethereum Sepolia with a transparent, non-custodial exchange.</p></div><SwapCard account={account} shBalance={shBalance} ethBalance={ethBalance} onUpdate={handleUpdate} /></section><PoolStats stats={stats} /></>}{page === 'liquidity' && <LiquidityPage account={account} shBalance={shBalance} ethBalance={ethBalance} onUpdate={handleUpdate} />}{page === 'transactions' && <TransactionsPage />}</main><footer><span>SHREE SWAP · Ethereum Sepolia</span><span>Built for the SHREE community</span></footer></> 
}
