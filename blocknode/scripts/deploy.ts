import { ethers, network } from "hardhat";

async function main() {
  console.log("Starting deployment on network:", network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  console.log("Deploying SHREE token...");
  const shree = await ethers.deployContract("SHREE");
  await shree.waitForDeployment();
  const shreeAddress = await shree.getAddress();
  console.log("SHREE Token deployed to:", shreeAddress);

  console.log("Deploying ShreeSwap...");
  const shreeSwap = await ethers.deployContract("ShreeSwap", [shreeAddress]);
  await shreeSwap.waitForDeployment();
  const shreeSwapAddress = await shreeSwap.getAddress();
  console.log("SHREE Swap deployed to:", shreeSwapAddress);

  console.log("=====================================");
  console.log("SHREE Token:", shreeAddress);
  console.log("SHREE Swap:", shreeSwapAddress);
  console.log("Network:", network.name === "sepolia" ? "Ethereum Sepolia" : network.name);
  
  if (network.name === "sepolia") {
    console.log(`Explorer (Token): https://sepolia.etherscan.io/address/${shreeAddress}`);
    console.log(`Explorer (Swap): https://sepolia.etherscan.io/address/${shreeSwapAddress}`);
  }
  console.log("=====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
