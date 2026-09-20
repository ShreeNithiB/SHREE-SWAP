export const config = {
  sepoliaChainId: 11155111,
  _shreeTokenAddress: "",
  _shreeSwapAddress: "",
  rpcUrl: "https://rpc.sepolia.org",
  
  get shreeTokenAddress() {
    if (!this._shreeTokenAddress || !this._shreeTokenAddress.startsWith("0x")) {
      throw new Error("Configuration Error: ShreeToken address is missing or invalid. Did you call setBlockchainConfig?");
    }
    return this._shreeTokenAddress;
  },
  get shreeSwapAddress() {
    if (!this._shreeSwapAddress || !this._shreeSwapAddress.startsWith("0x")) {
      throw new Error("Configuration Error: ShreeSwap address is missing or invalid. Did you call setBlockchainConfig?");
    }
    return this._shreeSwapAddress;
  }
};

export const setBlockchainConfig = (tokenAddress: string, swapAddress: string) => {
  config._shreeTokenAddress = tokenAddress;
  config._shreeSwapAddress = swapAddress;
};
