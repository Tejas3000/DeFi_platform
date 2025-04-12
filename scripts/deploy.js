const hre = require("hardhat");

async function main() {
  // Deploy DynamicLendingPool
  const DynamicLendingPool = await hre.ethers.getContractFactory(
    "DynamicLendingPool"
  );
  const pool = await DynamicLendingPool.deploy();
  await pool.deployed();

  console.log("DynamicLendingPool deployed to:", pool.address);

  // For testing purposes, we can also deploy mock contracts
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK");
    await mockToken.deployed();
    console.log("MockERC20 deployed to:", mockToken.address);

    const MockPriceFeed = await hre.ethers.getContractFactory("MockPriceFeed");
    const mockPriceFeed = await MockPriceFeed.deploy();
    await mockPriceFeed.deployed();
    console.log("MockPriceFeed deployed to:", mockPriceFeed.address);

    // Add the mock token as an asset to the lending pool
    const tx = await pool.addAsset(
      "MTK",
      mockToken.address,
      mockPriceFeed.address,
      200, // 2% base interest rate
      7500, // 75% collateral factor
      18 // decimals
    );
    await tx.wait();
    console.log("Mock token added as an asset");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
