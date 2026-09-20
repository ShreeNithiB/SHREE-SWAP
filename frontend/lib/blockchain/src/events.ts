import { getContracts } from "./contracts";
import { formatEther } from "ethers";

export interface SwapEvent {
  user: string;
  amountIn: string;
  amountOut: string;
  isSHForETH: boolean;
  transactionHash: string;
  blockNumber: number;
}

export const getRecentSwaps = async (): Promise<SwapEvent[]> => {
  try {
    const { shreeSwapRO } = await getContracts();
    const filter = shreeSwapRO.filters.Swap();
    // In a real app we'd paginate or use an indexer, here we query the latest blocks
    // Note: MetaMask/RPC might restrict block ranges on Testnets
    const events = await shreeSwapRO.queryFilter(filter, -1000, "latest");
    
    return events.map((event: any) => ({
      user: event.args[0],
      amountIn: formatEther(event.args[1]),
      amountOut: formatEther(event.args[2]),
      isSHForETH: event.args[3],
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
    })).reverse();
  } catch (error) {
    console.error("Failed to fetch swap events:", error);
    return [];
  }
};
