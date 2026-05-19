require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // BNB Smart Chain Testnet
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gas: 5000000,
      gasPrice: 10000000000, // 10 Gwei
    },
    // Polygon Mumbai Testnet (deprecated — Polygon shut Mumbai down in 2024)
    mumbai: {
      url: process.env.POLYGON_TESTNET_RPC || "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gas: 5000000,
      gasPrice: 10000000000, // 10 Gwei
    },
    // Polygon Amoy Testnet (current testnet, replaced Mumbai)
    amoy: {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      // Let hardhat estimate gas/gasPrice — the public RPC sometimes rejects
      // hard-coded values above the current base fee.
    },
    // BNB Smart Chain Mainnet (for future production)
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC || "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gas: 5000000,
      gasPrice: 5000000000, // 5 Gwei
    },
    // Polygon Mainnet (for future production)
    polygon: {
      url: process.env.POLYGON_MAINNET_RPC || "https://polygon-rpc.com",
      chainId: 137,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gas: 5000000,
      gasPrice: 30000000000, // 30 Gwei
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || ""
    }
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};
