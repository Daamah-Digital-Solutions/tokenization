const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=================================");
  console.log("Capimax Smart Contracts Deployment");
  console.log("=================================\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "wei\n");

  // Multi-sig owners for contract governance
  const multiSigOwners = [
    deployer.address,
    // Add more owners here for production
  ];
  const requiredConfirmations = 1; // Adjust for production

  // Platform treasury address (use deployer for testnet)
  const platformTreasury = deployer.address;

  console.log("Step 1: Deploying RealEstateToken template...");
  const RealEstateToken = await hre.ethers.getContractFactory("RealEstateToken");
  const realEstateTokenTemplate = await RealEstateToken.deploy();
  await realEstateTokenTemplate.waitForDeployment();
  const tokenTemplateAddress = await realEstateTokenTemplate.getAddress();
  console.log("✅ RealEstateToken template deployed to:", tokenTemplateAddress);

  console.log("\nStep 2: Deploying RentalIncomeDistributor template...");
  const RentalIncomeDistributor = await hre.ethers.getContractFactory("RentalIncomeDistributor");
  const rentalDistributorTemplate = await RentalIncomeDistributor.deploy();
  await rentalDistributorTemplate.waitForDeployment();
  const distributorTemplateAddress = await rentalDistributorTemplate.getAddress();
  console.log("✅ RentalIncomeDistributor template deployed to:", distributorTemplateAddress);

  console.log("\nStep 3: Deploying PropertyContractFactory...");
  const PropertyContractFactory = await hre.ethers.getContractFactory("PropertyContractFactory");
  const factory = await PropertyContractFactory.deploy(
    tokenTemplateAddress,
    distributorTemplateAddress,
    platformTreasury
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ PropertyContractFactory deployed to:", factoryAddress);

  console.log("\n=================================");
  console.log("Deployment Summary");
  console.log("=================================");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("\nContract Addresses:");
  console.log("-------------------");
  console.log("RealEstateToken Template:", tokenTemplateAddress);
  console.log("RentalIncomeDistributor Template:", distributorTemplateAddress);
  console.log("PropertyContractFactory:", factoryAddress);
  console.log("Platform Treasury:", platformTreasury);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      RealEstateTokenTemplate: tokenTemplateAddress,
      RentalIncomeDistributorTemplate: distributorTemplateAddress,
      PropertyContractFactory: factoryAddress,
      PlatformTreasury: platformTreasury
    },
    configuration: {
      multiSigOwners: multiSigOwners,
      requiredConfirmations: requiredConfirmations,
      deploymentFee: "0.01",
      platformFeeRate: 250 // 2.5%
    }
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Deployment info saved to:", deploymentFile);

  // Save latest deployment
  const latestFile = path.join(deploymentsDir, `${hre.network.name}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Latest deployment saved to:", latestFile);

  console.log("\n=================================");
  console.log("Next Steps");
  console.log("=================================");
  console.log("1. Verify contracts on block explorer:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${tokenTemplateAddress}`);
  console.log(`   npx hardhat verify --network ${hre.network.name} ${distributorTemplateAddress}`);
  console.log(`   npx hardhat verify --network ${hre.network.name} ${factoryAddress} ${tokenTemplateAddress} ${distributorTemplateAddress} ${platformTreasury}`);
  console.log("\n2. Update backend .env with contract addresses:");
  console.log(`   CONTRACT_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`   REAL_ESTATE_TOKEN_TEMPLATE=${tokenTemplateAddress}`);
  console.log(`   RENTAL_DISTRIBUTOR_TEMPLATE=${distributorTemplateAddress}`);
  console.log("\n3. Test deployment by creating a test property");
  console.log("\n=================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
