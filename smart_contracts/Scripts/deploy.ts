import { network } from "hardhat";

async function main() {
  console.log("Compiling and deploying DASN Ledger via Viem (ESM)...");

  const { viem } = await network.create();

  // With Viem, Hardhat handles the factory and deployment in a single, strictly-typed line
  const ledger = await viem.deployContract("DASNLedger");

  // The address is securely stored on the deployed contract object
  console.log(`SUCCESS! DASNLedger deployed to: ${ledger.address}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});