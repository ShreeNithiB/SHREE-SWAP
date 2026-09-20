import { ethers } from "hardhat";

const SHREE_TOKEN = process.env.NEXT_PUBLIC_SHREE_TOKEN_ADDRESS || "0xA063919ef242fC6eD54E39AB1BFA397d19f5BE78";
const SHREE_SWAP = process.env.NEXT_PUBLIC_SHREE_SWAP_ADDRESS || "0x3FcaB0D5B60853b6a55b1A2C9aE93CB4aF0D3ac4";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const shree = await ethers.getContractAt("IERC20", SHREE_TOKEN);
  const swap = await ethers.getContractAt("ShreeSwap", SHREE_SWAP);

  // 1. Check current liquidity
  const totalLiquidity = await swap.totalLiquidity();
  console.log("Current total liquidity shares:", ethers.formatEther(totalLiquidity));

  const myLiquidity = await swap.liquidity(deployer.address);
  console.log("My liquidity shares:", ethers.formatEther(myLiquidity));

  // If there is liquidity, try to remove it so we can set an exact ratio
  if (myLiquidity > 0n) {
    console.log("Removing existing liquidity...");
    const tx = await swap.removeLiquidity(myLiquidity);
    await tx.wait();
    console.log("Existing liquidity removed.");
  }

  const remaining = await swap.totalLiquidity();
  if (remaining > 0n) {
    console.log("WARNING: There is still liquidity in the pool from other users!");
  }

  // 2. Add exact liquidity
  // We want EXACTLY 0.01 ETH and 511.504513540621865597 SH
  const targetETH = ethers.parseEther("0.01");
  const targetSH = 511504513540621865597n; // from our precise calculation

  console.log(`Approving ${ethers.formatEther(targetSH)} SH...`);
  const approveTx = await shree.approve(SHREE_SWAP, targetSH);
  await approveTx.wait();

  console.log(`Adding liquidity: ${ethers.formatEther(targetETH)} ETH and ${ethers.formatEther(targetSH)} SH...`);
  const addTx = await swap.addLiquidity(targetSH, { value: targetETH });
  await addTx.wait();

  console.log("Liquidity added successfully!");

  // Verify
  const ethReserve = await swap.getETHReserve();
  const shReserve = await swap.getSHReserve();
  console.log("New ETH Reserve:", ethers.formatEther(ethReserve));
  console.log("New SH Reserve:", ethers.formatEther(shReserve));

  // Verify the exact output for 0.0002 ETH
  const inputAmount = ethers.parseEther("0.0002");
  const expectedOutput = await swap.getOutputAmount(inputAmount, ethReserve, shReserve);
  console.log("Expected output for 0.0002 ETH:", ethers.formatEther(expectedOutput));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
