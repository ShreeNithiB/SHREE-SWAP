import { getOutputAmount } from '../lib/blockchain/src/swap';
import { parseEther, formatEther } from 'ethers';

describe('AMM Math Tests', () => {
  it('calculates correct output amount with 0.3% fee', async () => {
    // 100 ETH in reserve, 1000 SHREE in reserve
    const inputReserve = parseEther("100");
    const outputReserve = parseEther("1000");
    const inputAmount = parseEther("1"); // 1 ETH

    const output = await getOutputAmount(inputAmount.toString(), inputReserve.toString(), outputReserve.toString());
    
    // Formula: output = (inputAmount * 0.997 * outputReserve) / (inputReserve + inputAmount * 0.997)
    // = (1 * 0.997 * 1000) / (100 + 1 * 0.997)
    // = 997 / 100.997 = 9.87158...
    expect(Number(formatEther(output))).toBeCloseTo(9.8715, 4);
  });
});
