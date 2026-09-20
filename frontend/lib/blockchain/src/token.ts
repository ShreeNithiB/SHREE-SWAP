import { getContracts } from "./contracts";
import { formatEther, parseEther } from "ethers";

export const getSHBalance = async (address: string): Promise<string> => {
  try {
    const { shreeTokenRO } = await getContracts();
    const balance = await shreeTokenRO.balanceOf(address);
    return formatEther(balance);
  } catch (error) {
    console.error("Failed to get SH balance:", error);
    return "0";
  }
};

export const getETHBalance = async (address: string): Promise<string> => {
  try {
    const { provider } = await getContracts();
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (error) {
    console.error("Failed to get ETH balance:", error);
    return "0";
  }
};

export const approveSH = async (amount: string): Promise<any> => {
  const { shreeToken, shreeSwap } = await getContracts();
  const tx = await shreeToken.approve(await shreeSwap.getAddress(), parseEther(amount));
  return tx;
};

export const checkAllowance = async (owner: string): Promise<string> => {
  try {
    const { shreeTokenRO, shreeSwapRO } = await getContracts();
    const allowance = await shreeTokenRO.allowance(owner, await shreeSwapRO.getAddress());
    return formatEther(allowance);
  } catch (error) {
    return "0";
  }
};
