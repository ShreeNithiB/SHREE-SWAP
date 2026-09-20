import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const isSepolia = process.argv.includes("sepolia");
if (isSepolia && (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY)) {
  console.error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in packages/contracts/.env");
  process.exit(1);
}

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/dummy",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};

export default config;
