import { Contract, BrowserProvider } from "ethers";
import { config } from "./config";
import { getProvider } from "./provider";

const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const shreeSwapAbi = [
  "function getSHReserve() view returns (uint256)",
  "function getETHReserve() view returns (uint256)",
  "function getSHPrice() view returns (uint256)",
  "function getETHPrice() view returns (uint256)",
  "function liquidity(address) view returns (uint256)",
  "function totalLiquidity() view returns (uint256)",
  "function addLiquidity(uint256 _amountSH) payable returns (uint256)",
  "function removeLiquidity(uint256 _liquidityShares) returns (uint256, uint256)",
  "function swapSHForETH(uint256 _amountSH, uint256 _minAmountETH) returns (uint256)",
  "function swapETHForSH(uint256 _minAmountSH) payable returns (uint256)",
  "function getOutputAmount(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) pure returns (uint256)",
  "event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool isSHForETH)",
  "event LiquidityAdded(address indexed provider, uint256 amountSH, uint256 amountETH, uint256 liquidityShares)",
  "event LiquidityRemoved(address indexed provider, uint256 amountSH, uint256 amountETH, uint256 liquidityShares)"
];

export const getContracts = async () => {
  const provider = getProvider();
  if (!provider) throw new Error("No provider available");
  
  const signer = await provider.getSigner();

  const shreeToken = new Contract(config.shreeTokenAddress, erc20Abi, signer);
  const shreeSwap = new Contract(config.shreeSwapAddress, shreeSwapAbi, signer);
  const shreeTokenRO = new Contract(config.shreeTokenAddress, erc20Abi, provider);
  const shreeSwapRO = new Contract(config.shreeSwapAddress, shreeSwapAbi, provider);

  return { shreeToken, shreeSwap, shreeTokenRO, shreeSwapRO, signer, provider };
};
