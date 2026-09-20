import { getContracts } from "./contracts";
import { formatEther, parseEther } from "ethers";

export const getReserves = async (): Promise<{ sh: string, eth: string }> => {
  try {
    const { shreeSwapRO } = await getContracts();
    const sh = await shreeSwapRO.getSHReserve();
    const eth = await shreeSwapRO.getETHReserve();
    return { sh: formatEther(sh), eth: formatEther(eth) };
  } catch (error) {
    return { sh: "0", eth: "0" };
  }
};

export const getExpectedOutput = async (amountIn: string, isSHForETH: boolean): Promise<string> => {
  try {
    if (!amountIn || parseFloat(amountIn) <= 0) return "0";
    const { shreeSwapRO } = await getContracts();
    const sh = await shreeSwapRO.getSHReserve();
    const eth = await shreeSwapRO.getETHReserve();
    
    if (parseFloat(formatEther(sh)) === 0 || parseFloat(formatEther(eth)) === 0) return "0";

    const parsedIn = parseEther(amountIn);
    
    if (isSHForETH) {
      const out = await shreeSwapRO.getOutputAmount(parsedIn, sh, eth);
      return formatEther(out);
    } else {
      const out = await shreeSwapRO.getOutputAmount(parsedIn, eth, sh);
      return formatEther(out);
    }
  } catch (error) {
    return "0";
  }
};

export const swapSHForETH = async (amountSH: string, minAmountETH: string): Promise<any> => {
  const { shreeSwap } = await getContracts();
  const tx = await shreeSwap.swapSHForETH(parseEther(amountSH), parseEther(minAmountETH));
  return tx;
};

export const swapETHForSH = async (amountETH: string, minAmountSH: string): Promise<any> => {
  const { shreeSwap } = await getContracts();
  const tx = await shreeSwap.swapETHForSH(parseEther(minAmountSH), { value: parseEther(amountETH) });
  return tx;
};

export const getPrices = async (): Promise<{ shPrice: string, ethPrice: string }> => {
  try {
    const { shreeSwapRO } = await getContracts();
    const shPrice = await shreeSwapRO.getSHPrice();
    const ethPrice = await shreeSwapRO.getETHPrice();
    return { shPrice: formatEther(shPrice), ethPrice: formatEther(ethPrice) };
  } catch (error) {
    return { shPrice: "0", ethPrice: "0" };
  }
};
