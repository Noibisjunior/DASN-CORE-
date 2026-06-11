import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

const alchemySepoliaUrl = process.env.ALCHEMY_SEPOLIA_URL;
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!alchemySepoliaUrl) {
  throw new Error("ALCHEMY_SEPOLIA_URL is not set in smart_contracts/.env");
}

if (!deployerPrivateKey) {
  throw new Error("DEPLOYER_PRIVATE_KEY is not set in smart_contracts/.env");
}

const config = defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      url: alchemySepoliaUrl,
      accounts: [deployerPrivateKey],
    },
  },
});

export default config;