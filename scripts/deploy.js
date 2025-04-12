const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function updateEnvFile(contractAddress) {
  const envPath = path.join(__dirname, "..", ".env");
  let envConfig = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";

  if (envConfig.includes("CONTRACT_ADDRESS=")) {
    envConfig = envConfig.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envConfig += `\nCONTRACT_ADDRESS=${contractAddress}`;
  }

  fs.writeFileSync(envPath, envConfig);
}

async function updateFrontendConfig(contracts) {
  const configPath = path.join(
    __dirname,
    "..",
    "project",
    "src",
    "config",
    "contracts.ts"
  );
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configContent = `
export const CONTRACTS = {
  DYNAMIC_LENDING_POOL: '${contracts.pool}',
  MOCK_TOKEN: '${
    contracts.mockToken || "0x0000000000000000000000000000000000000000"
  }',
  MOCK_PRICE_FEED: '${
    contracts.mockPriceFeed || "0x0000000000000000000000000000000000000000"
  }'
};

export const CONTRACT_ABIS = {
  DYNAMIC_LENDING_POOL: require('../../../artifacts/contracts/DynamicLendingPool.sol/DynamicLendingPool.json').abi,
  MOCK_TOKEN: require('../../../artifacts/contracts/mocks/MockERC20.sol/MockERC20.json').abi,
  MOCK_PRICE_FEED: require('../../../artifacts/contracts/mocks/MockPriceFeed.sol/MockPriceFeed.json').abi
};`;

  fs.writeFileSync(configPath, configContent);
}

async function main() {
  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy DynamicLendingPool
    const DynamicLendingPool = await hre.ethers.getContractFactory(
      "DynamicLendingPool"
    );
    const pool = await DynamicLendingPool.deploy();
    await pool.waitForDeployment(); // Use waitForDeployment instead of deployed()

    const poolAddress = await pool.getAddress(); // Get deployed contract address
    console.log("DynamicLendingPool deployed to:", poolAddress);

    // Update configuration files with pool address
    await updateEnvFile(poolAddress);

    const contracts = { pool: poolAddress };

    // For testing purposes, deploy mock contracts on test networks
    if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
      const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
      const mockToken = await MockERC20.deploy("Mock Token", "MTK");
      await mockToken.waitForDeployment();

      const mockTokenAddress = await mockToken.getAddress();
      console.log("MockERC20 deployed to:", mockTokenAddress);
      contracts.mockToken = mockTokenAddress;

      const MockPriceFeed = await hre.ethers.getContractFactory(
        "MockPriceFeed"
      );
      const mockPriceFeed = await MockPriceFeed.deploy();
      await mockPriceFeed.waitForDeployment();

      const mockPriceFeedAddress = await mockPriceFeed.getAddress();
      console.log("MockPriceFeed deployed to:", mockPriceFeedAddress);
      contracts.mockPriceFeed = mockPriceFeedAddress;

      // Add the mock token as an asset to the lending pool
      const tx = await pool.addAsset(
        "MTK",
        mockTokenAddress,
        mockPriceFeedAddress,
        200, // 2% base interest rate
        7500, // 75% collateral factor
        18 // decimals
      );
      await tx.wait();
      console.log("Mock token added as an asset");
    }

    // Update frontend configuration with all contract addresses
    await updateFrontendConfig(contracts);
    console.log("Configuration files updated successfully");
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
