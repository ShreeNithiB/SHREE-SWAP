import { getProvider } from "./provider";
import { config } from "./config";

export const connectWallet = async (): Promise<string> => {
  const provider = getProvider();
  if (!provider) throw new Error("MetaMask is not installed.");
  
  try {
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts || accounts.length === 0) throw new Error("No accounts found.");

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== config.sepoliaChainId) {
      try {
        await provider.send("wallet_switchEthereumChain", [
          { chainId: "0x" + config.sepoliaChainId.toString(16) },
        ]);
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          throw new Error("Please add Sepolia to your MetaMask network list.");
        }
        throw new Error("Failed to switch to Sepolia network.");
      }
    }

    return accounts[0];
  } catch (error: any) {
    if (error.code === -32002 || (error.error && error.error.code === -32002)) {
      throw new Error("A MetaMask connection request is already pending. Please open MetaMask and approve or reject it.");
    }
    
    // Check for specific wallet errors like Brave Wallet's "Unable to find any account for 60"
    const errorMsg = error.message || (error.error && error.error.message) || "";
    if (errorMsg.includes("Unable to find any account for 60")) {
      throw new Error("Wallet is locked or not fully set up. If you are using Brave Browser, please disable the built-in Brave Wallet in settings or unlock it, and try again.");
    }

    // Attempt to extract the innermost useful message
    if (error.error && error.error.message) {
      throw new Error(error.error.message);
    }
    throw error;
  }
};

export const getConnectedAccount = async (): Promise<string | null> => {
  const provider = getProvider();
  if (!provider) return null;

  try {
    const accounts = await provider.send("eth_accounts", []);
    return accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    return null;
  }
};
