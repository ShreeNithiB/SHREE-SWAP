import { ethers } from "hardhat";

const SHREE_TOKEN = process.env.NEXT_PUBLIC_SHREE_TOKEN_ADDRESS || "0xA063919ef242fC6eD54E39AB1BFA397d19f5BE78";
const SHREE_SWAP = process.env.NEXT_PUBLIC_SHREE_SWAP_ADDRESS || "0x3FcaB0D5B60853b6a55b1A2C9aE93CB4aF0D3ac4";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const shree = await ethers.getContractAt("IERC20", SHREE_TOKEN);
  const swap = await ethers.getContractAt("ShreeSwap", SHREE_SWAP);

  const myLiquidity = await swap.liquidity(deployer.address);
  if (myLiquidity > 0n) {
    console.log("Removing existing small liquidity...");
    const tx = await swap.removeLiquidity(myLiquidity);
    await tx.wait();
  }

  const targetETH = ethers.parseEther("1.0");
  const targetSH = 50160451354062186559679n; 

  console.log(`Approving massive liquidity...`);
  const approveTx = await shree.approve(SHREE_SWAP, targetSH);
  await approveTx.wait();

  console.log(`Adding 1 ETH and 50,160 SH...`);
  const addTx = await swap.addLiquidity(targetSH, { value: targetETH });
  await addTx.wait();

  console.log("Massive liquidity added!");
}

main().catch(console.error);
