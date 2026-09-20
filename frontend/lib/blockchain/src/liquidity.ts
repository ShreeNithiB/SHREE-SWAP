import { getContracts } from "./contracts";
import { formatEther, parseEther } from "ethers";

export const addLiquidity = async (amountSH: string, amountETH: string): Promise<any> => {
  const { shreeSwap } = await getContracts();
  const tx = await shreeSwap.addLiquidity(parseEther(amountSH), { value: parseEther(amountETH) });
  return tx;
};

export const removeLiquidity = async (liquidityShares: string): Promise<any> => {
  const { shreeSwap } = await getContracts();
  const tx = await shreeSwap.removeLiquidity(parseEther(liquidityShares));
  return tx;
};

export const getUserLiquidity = async (address: string): Promise<string> => {
  try {
    const { shreeSwapRO } = await getContracts();
    const shares = await shreeSwapRO.liquidity(address);
    return formatEther(shares);
  } catch (error) {
    return "0";
  }
};

export const getTotalLiquidity = async (): Promise<string> => {
  try {
    const { shreeSwapRO } = await getContracts();
    const total = await shreeSwapRO.totalLiquidity();
    return formatEther(total);
  } catch (error) {
    return "0";
  }
};
