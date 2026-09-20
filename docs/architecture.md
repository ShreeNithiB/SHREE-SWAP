# Architecture

The SHREE SWAP decentralized exchange follows a standard Web3 application architecture.

## Overview
- **Frontend**: Next.js (React), running locally or deployed on Vercel.
- **Blockchain package**: A custom abstraction layer `packages/blockchain` using `ethers.js` to handle all contract reads and writes.
- **Wallet**: MetaMask injected into the browser via `window.ethereum`.
- **Smart Contracts**: `SHREE.sol` and `ShreeSwap.sol` deployed on Ethereum Sepolia Testnet.

## Data Flow
1. **User Action**: User initiates a swap on the frontend.
2. **Blockchain Package**: Calls `swapSHForETH()` in `ethers.js` with the user's connected signer.
3. **MetaMask**: Prompts the user to confirm the transaction.
4. **Smart Contract**: The `ShreeSwap` contract validates reserves, calculates outputs, executes token transfers, and emits a `Swap` event.
5. **Frontend Update**: The UI listens for events or refetches balances and pool statistics to reflect the new state.
