# SHREE SWAP Architecture Specification

This document details the internal architecture, component interactions, and execution flows within the SHREE SWAP decentralized exchange.

## 1. Top-Level Design

The application is structured as a strict three-tier monorepo:

- **`frontend/`**: The Next.js application containing the UI logic, state management, and the integrated `lib/blockchain/` utility layer that communicates directly with MetaMask and the Ethereum Sepolia RPC via `ethers.js`.
- **`backend/`**: A reserved placeholder directory. Currently, there is no centralized backend server. All persistent state is managed on-chain.
- **`blocknode/`**: The Hardhat development environment containing the Solidity smart contracts, compilation artifacts, and deployment scripts.

## 2. Core Operational Flows

### 2.1 Wallet Connection Sequence

The wallet connection procedure includes safeguards to prevent duplicate requests and handle MetaMask state errors gracefully.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant MetaMask
    
    User->>Frontend: Clicks "Connect Wallet"
    Frontend->>Frontend: Set isConnecting = true
    Frontend->>MetaMask: eth_requestAccounts
    
    alt Connection Pending (Error -32002)
        MetaMask-->>Frontend: Error -32002 (Request already pending)
        Frontend-->>User: Show alert: "Open MetaMask to approve"
    else Connection Rejected
        MetaMask-->>Frontend: Error 4001 (User rejected)
        Frontend-->>Frontend: Reset isConnecting = false
    else Success
        MetaMask-->>Frontend: Returns Accounts array
        Frontend->>MetaMask: Listen to 'accountsChanged'
        Frontend->>MetaMask: Listen to 'chainChanged'
        Frontend-->>User: Display Connected Wallet State
    end
```

### 2.2 Swap Transaction Sequence (SHREE -> ETH)

When a user trades their SHREE tokens for ETH, the system requires two transactions if the AMM contract does not already have an adequate allowance.

```mermaid
sequenceDiagram
    participant User
    participant UI as Frontend (Next.js)
    participant Ethers as ethers.js Wrapper
    participant Token as SHREE Token Contract
    participant AMM as ShreeSwap Contract
    
    User->>UI: Enter 100 SHREE to swap
    UI->>Ethers: getExpectedOutput(100 SHREE)
    Ethers->>AMM: read getSHReserve(), getETHReserve()
    AMM-->>UI: Returns estimated output
    UI-->>User: Show Output amount
    
    User->>UI: Click Swap
    UI->>Ethers: checkAllowance(User, AMM)
    Ethers->>Token: read allowance()
    
    alt Allowance < 100 SHREE
        Token-->>Ethers: Returns 0
        UI-->>User: Prompt "Approve SHREE"
        User->>UI: Sign Approval
        UI->>Ethers: approveSH(100)
        Ethers->>Token: execute approve()
        Token-->>UI: Approval confirmed
    end
    
    UI-->>User: Prompt "Confirm Swap"
    User->>UI: Sign Swap
    UI->>Ethers: swapSHForETH(100)
    Ethers->>AMM: execute swapSHForETH()
    AMM->>Token: transferFrom(User, AMM, 100)
    AMM->>User: internal call{value: output}(ETH)
    AMM-->>Ethers: Emits Swap Event
    Ethers-->>UI: Transaction Confirmed
    UI-->>User: Success Notification
```

### 2.3 Liquidity Provision Sequence

Adding liquidity establishes the pricing ratio and mints liquidity pool (LP) shares to the provider.

```mermaid
sequenceDiagram
    participant Provider
    participant UI
    participant Token as SHREE Contract
    participant AMM as ShreeSwap Contract
    
    Provider->>UI: Inputs 10 ETH + 10,000 SHREE
    UI->>Token: execute approve() (if needed)
    Token-->>UI: Approval confirmed
    
    UI->>AMM: execute addLiquidity() {value: 10 ETH}
    
    alt totalLiquidity == 0 (Initial Provision)
        AMM->>AMM: Shares = msg.value
    else totalLiquidity > 0
        AMM->>AMM: Shares = min(ethRatio, shRatio)
    end
    
    AMM->>Token: transferFrom(Provider, AMM, 10,000 SHREE)
    AMM->>AMM: Mint LP Shares to Provider
    AMM-->>UI: Emits LiquidityAdded Event
    UI-->>Provider: Success Notification & Updated Balances
```

## 3. Mathematical Specifications

### Swap Execution
The AMM operates on the constant product formula: $x \times y = k$.
To account for the `0.3%` fee, the exact integer math implemented in Solidity is:
$$Output = \frac{Input \times 997 \times OutputReserve}{(InputReserve \times 1000) + (Input \times 997)}$$

### Liquidity Shares
For secondary liquidity providers, LP shares are minted proportionally to the reserves they add to the pool. To prevent dilution attacks, the contract takes the minimum ratio of the two assets deposited:
$$Shares = \min\left(\frac{Input_{ETH} \times TotalShares}{Reserve_{ETH}}, \frac{Input_{SHREE} \times TotalShares}{Reserve_{SHREE}}\right)$$

## 4. Contract State Management

### Reentrancy Protection
The `ShreeSwap.sol` contract extensively utilizes OpenZeppelin's `ReentrancyGuard`. The `nonReentrant` modifier is applied to:
- `addLiquidity`
- `removeLiquidity`
- `swapSHForETH`
- `swapETHForSH`

This prevents cross-function reentrancy attacks, specifically protecting the `call{value: ...}("")` invocations when sending ETH back to users.
