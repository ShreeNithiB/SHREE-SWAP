import { getContracts } from "./contracts";
import { formatEther } from "ethers";

export interface AppEvent {
  type: 'swap' | 'add_liquidity' | 'remove_liquidity';
  user: string;
  amountIn?: string;
  amountOut?: string;
  isSHForETH?: boolean;
  amountSH?: string;
  amountETH?: string;
  liquidityShares?: string;
  transactionHash: string;
  blockNumber: number;
}

export const getRecentEvents = async (): Promise<AppEvent[]> => {
  try {
    const { shreeSwapRO } = await getContracts();
    const swapFilter = shreeSwapRO.filters.Swap();
    const addFilter = shreeSwapRO.filters.LiquidityAdded();
    const removeFilter = shreeSwapRO.filters.LiquidityRemoved();
    
    // In a real app we'd paginate or use an indexer, here we query the latest blocks
    // Note: MetaMask/RPC might restrict block ranges on Testnets
    const [swapEvents, addEvents, removeEvents] = await Promise.all([
      shreeSwapRO.queryFilter(swapFilter, -1000, "latest").catch(() => []),
      shreeSwapRO.queryFilter(addFilter, -1000, "latest").catch(() => []),
      shreeSwapRO.queryFilter(removeFilter, -1000, "latest").catch(() => [])
    ]);
    
    const parsedSwaps = swapEvents.map((e: any) => ({
      type: 'swap' as const,
      user: e.args[0],
      amountIn: formatEther(e.args[1]),
      amountOut: formatEther(e.args[2]),
      isSHForETH: e.args[3],
      transactionHash: e.transactionHash,
      blockNumber: e.blockNumber,
    }));

    const parsedAdds = addEvents.map((e: any) => ({
      type: 'add_liquidity' as const,
      user: e.args[0],
      amountSH: formatEther(e.args[1]),
      amountETH: formatEther(e.args[2]),
      liquidityShares: formatEther(e.args[3]),
      transactionHash: e.transactionHash,
      blockNumber: e.blockNumber,
    }));

    const parsedRemoves = removeEvents.map((e: any) => ({
      type: 'remove_liquidity' as const,
      user: e.args[0],
      amountSH: formatEther(e.args[1]),
      amountETH: formatEther(e.args[2]),
      liquidityShares: formatEther(e.args[3]),
      transactionHash: e.transactionHash,
      blockNumber: e.blockNumber,
    }));

    const allEvents = [...parsedSwaps, ...parsedAdds, ...parsedRemoves];
    return allEvents.sort((a, b) => b.blockNumber - a.blockNumber); // Descending order
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return [];
  }
};
