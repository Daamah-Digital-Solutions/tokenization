/**
 * Deploy ONLY the PropertyContractFactory, reusing the existing
 * RealEstateToken / RentalIncomeDistributor templates from the latest
 * deployment file. Cheaper than a full redeploy when only the factory
 * source changed.
 *
 * Usage: npx hardhat run scripts/deploy_factory_only.js --network bscTestnet
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const latestFile = path.join(deploymentsDir, `${networkName}-latest.json`);
  if (!fs.existsSync(latestFile)) {
    throw new Error(`No prior deployment found at ${latestFile}. Run deploy.js first.`);
  }

  const prior = JSON.parse(fs.readFileSync(latestFile));
  const tokenTemplateAddress = prior.contracts.RealEstateTokenTemplate;
  const distributorTemplateAddress = prior.contracts.RentalIncomeDistributorTemplate;
  const platformTreasury = prior.contracts.PlatformTreasury;

  console.log("Reusing templates:");
  console.log("  RealEstateTokenTemplate:", tokenTemplateAddress);
  console.log("  RentalIncomeDistributorTemplate:", distributorTemplateAddress);
  console.log("  PlatformTreasury:", platformTreasury);

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), hre.network.config.chainId === 97 ? "tBNB" : "ETH");

  console.log("\nDeploying patched PropertyContractFactory...");
  const Factory = await hre.ethers.getContractFactory("PropertyContractFactory");
  const factory = await Factory.deploy(tokenTemplateAddress, distributorTemplateAddress, platformTreasury);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("New PropertyContractFactory:", factoryAddress);

  // Update the latest deployment file in place.
  const updated = {
    ...prior,
    network: networkName,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ...prior.contracts,
      PropertyContractFactory: factoryAddress,
    },
    notes: "Factory redeployed with activateProperty idempotency patch.",
  };
  fs.writeFileSync(latestFile, JSON.stringify(updated, null, 2));
  const stampFile = path.join(deploymentsDir, `${networkName}-${Date.now()}.json`);
  fs.writeFileSync(stampFile, JSON.stringify(updated, null, 2));
  console.log("\nDeployment file updated:", latestFile);
  console.log("Backend update:");
  console.log(`   CONTRACT_FACTORY_ADDRESS=${factoryAddress}`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
