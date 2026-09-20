# Swap Mechanics

SHREE SWAP uses a constant-product Automated Market Maker (AMM) model, inspired by Uniswap V2.

## Core Formula
The AMM maintains the invariant:
`x * y = k`

Where:
- `x` is the reserve of SHREE (SH) tokens.
- `y` is the reserve of ETH.
- `k` is the constant product.

## Initial Liquidity
When the first liquidity provider deposits SH and ETH, they determine the initial exchange rate. 
The liquidity shares minted are equal to the deposited ETH amount.

## Swap Output Calculation
When a user swaps an asset, they increase one reserve and decrease the other, maintaining `k`.
Given an input amount and a 0.3% fee, the output is calculated as:

```
inputWithFee = inputAmount * 997
numerator = inputWithFee * outputReserve
denominator = (inputReserve * 1000) + inputWithFee
outputAmount = numerator / denominator
```

## Slippage
Slippage occurs when the execution price differs from the quoted price due to other transactions or the size of the trade relative to the pool.
The frontend implements a 1% minimum output slippage protection. The transaction reverts if the received output is below the expected amount minus slippage.
