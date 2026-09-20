import { ethers, BrowserProvider } from "ethers";

export const getProvider = (): BrowserProvider | null => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};
