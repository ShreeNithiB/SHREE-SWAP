# Backend

This directory is the designated placeholder for the backend layer of SHREE SWAP.

Currently, the SHREE SWAP application operates entirely via smart contracts (on-chain AMM) and the client-side Next.js frontend (ethers.js integration). 

## Intended Responsibilities
If a backend is developed in the future, it should handle:
- **Indexing swap events:** Reading and storing transaction history to prevent querying the blockchain directly for all UI states.
- **Off-chain analytics:** Calculating real-time charts, daily volume, and liquidity depth.
- **User profiles:** Optional centralized features such as user preferences.

*Note: No active server APIs exist in the current implementation.*
