# Deployment Guide

## Prerequisites
- Node.js and `pnpm` installed.
- A MetaMask wallet with Sepolia ETH.
- An Infura or Alchemy RPC URL for Sepolia.

## 1. Environment Setup
Create a `.env` file in the root folder based on `.env.example`:
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key
SHREE_TOKEN_ADDRESS=
SHREE_SWAP_ADDRESS=
```

## 2. Deploy Contracts
From the root of the workspace, run:
```bash
pnpm deploy:sepolia
```
This will compile the Hardhat contracts and deploy them to the Sepolia testnet.

## 3. Configure Frontend
Once deployed, copy the output addresses and update your `.env` file (or provide them via `NEXT_PUBLIC_` environment variables in the frontend):
```
NEXT_PUBLIC_SHREE_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_SHREE_SWAP_ADDRESS=0x...
```

## 4. Run Frontend
Start the Next.js app locally to test:
```bash
pnpm dev
```
Navigate to `http://localhost:3000`.
