const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DynamicLendingPool", function () {
  let DynamicLendingPool;
  let pool;
  let owner;
  let addr1;
  let addr2;
  let MockERC20;
  let mockToken;
  let MockPriceFeed;
  let mockPriceFeed;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20
    MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MTK");
    await mockToken.waitForDeployment();

    // Deploy mock price feed
    MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy();
    await mockPriceFeed.waitForDeployment();

    // Deploy DynamicLendingPool
    DynamicLendingPool = await ethers.getContractFactory("DynamicLendingPool");
    pool = await DynamicLendingPool.deploy();
    await pool.waitForDeployment();
  });

  describe("Asset Management", function () {
    it("Should add a new asset correctly", async function () {
      const symbol = "MTK";
      const baseInterestRate = 200; // 2%
      const collateralFactor = 7500; // 75%
      const decimals = 18;

      await pool.addAsset(
        symbol,
        await mockToken.getAddress(),
        await mockPriceFeed.getAddress(),
        baseInterestRate,
        collateralFactor,
        decimals
      );

      const assetDetails = await pool.getAssetDetails(symbol);
      expect(assetDetails[0]).to.equal(await mockToken.getAddress());
      expect(assetDetails[1]).to.equal(0n);
      expect(assetDetails[2]).to.equal(0n);
    });
  });

  describe("Lending Operations", function () {
    beforeEach(async function () {
      // Add asset with 0% interest rate for predictable tests
      await pool.addAsset(
        "MTK",
        await mockToken.getAddress(),
        await mockPriceFeed.getAddress(),
        0, // 0% base rate for predictable tests
        7500, // 75% collateral factor
        18
      );

      // Approve tokens
      await mockToken.approve(await pool.getAddress(), ethers.parseEther("1000"));
    });

    it("Should deposit tokens correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      
      await expect(pool.deposit("MTK", depositAmount))
        .to.emit(pool, "Deposit")
        .withArgs(await owner.getAddress(), "MTK", depositAmount);

      const position = await pool.getUserPosition(await owner.getAddress(), "MTK");
      expect(position[0]).to.equal(depositAmount); // deposited amount
      expect(position[1]).to.equal(0n); // borrowed amount
      expect(position[2]).to.equal(0n); // interest due
    });

    it("Should borrow tokens correctly", async function () {
      // First deposit collateral
      const depositAmount = ethers.parseEther("100");
      await pool.deposit("MTK", depositAmount);

      // Then borrow
      const borrowAmount = ethers.parseEther("50"); // 50% LTV
      await expect(pool.borrow("MTK", borrowAmount))
        .to.emit(pool, "Borrow")
        .withArgs(await owner.getAddress(), "MTK", borrowAmount);

      const position = await pool.getUserPosition(await owner.getAddress(), "MTK");
      expect(position[0]).to.equal(depositAmount);
      expect(position[1]).to.equal(borrowAmount);
    });

    it("Should fail to borrow if insufficient collateral", async function () {
      // Deposit 100 tokens
      await pool.deposit("MTK", ethers.parseEther("100"));

      // Try to borrow more than allowed by collateral factor
      const borrowAmount = ethers.parseEther("90"); // 90% LTV > 75% collateral factor
      await expect(pool.borrow("MTK", borrowAmount))
        .to.be.revertedWith("Borrow would cause unhealthy position");
    });

    it("Should repay borrowed tokens correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      const borrowAmount = ethers.parseEther("50");
      
      // Deposit and borrow in the same block
      await pool.deposit("MTK", depositAmount);
      await pool.borrow("MTK", borrowAmount);
      
      // Repay immediately
      await pool.repay("MTK", borrowAmount);

      // Check final position
      const finalPosition = await pool.getUserPosition(await owner.getAddress(), "MTK");
      expect(finalPosition[0]).to.equal(depositAmount); // deposit unchanged
      expect(finalPosition[1]).to.equal(0n); // borrowed amount should be 0
      expect(finalPosition[2]).to.equal(0n); // no interest due
    });

    it("Should withdraw deposited tokens correctly", async function () {
      // First deposit
      await pool.deposit("MTK", ethers.parseEther("100"));
      
      // Then withdraw
      await expect(pool.withdraw("MTK", ethers.parseEther("50")))
        .to.emit(pool, "Withdraw")
        .withArgs(await owner.getAddress(), "MTK", ethers.parseEther("50"));

      const position = await pool.getUserPosition(await owner.getAddress(), "MTK");
      expect(position[0]).to.equal(ethers.parseEther("50")); // half of deposit withdrawn
    });

    it("Should fail to withdraw if it would make position unhealthy", async function () {
      // Setup: Deposit and borrow
      await pool.deposit("MTK", ethers.parseEther("100"));
      await pool.borrow("MTK", ethers.parseEther("50"));
      
      // Try to withdraw too much collateral
      await expect(pool.withdraw("MTK", ethers.parseEther("40")))
        .to.be.revertedWith("Withdrawal would cause unhealthy position");
      
      // Position should remain unchanged
      const position = await pool.getUserPosition(await owner.getAddress(), "MTK");
      expect(position[0]).to.equal(ethers.parseEther("100"));
      expect(position[1]).to.equal(ethers.parseEther("50"));
    });

    it("Should accrue interest over time", async function () {
      // Add a new asset with 5% interest rate specifically for this test
      const symbol = "INT2";
      await pool.addAsset(
        symbol,
        await mockToken.getAddress(),
        await mockPriceFeed.getAddress(),
        500, // 5% base rate
        7500,
        18
      );

      // Approve and deposit with the new asset
      await mockToken.approve(await pool.getAddress(), ethers.parseEther("1000"));
      await pool.deposit(symbol, ethers.parseEther("100"));
      await pool.borrow(symbol, ethers.parseEther("50"));
      
      // Move time forward by 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      // Check position
      const position = await pool.getUserPosition(await owner.getAddress(), symbol);
      expect(position[2]).to.be.gt(0n); // Should have accrued interest
    });

    describe("Interest Rate Tests", function () {
      it("Should accrue interest over time with non-zero rate", async function () {
        // Add a new asset with 5% interest rate
        const symbol = "INT";
        await pool.addAsset(
          symbol,
          await mockToken.getAddress(),
          await mockPriceFeed.getAddress(),
          500, // 5% base rate
          7500,
          18
        );

        // Approve and deposit
        await mockToken.approve(await pool.getAddress(), ethers.parseEther("1000"));
        await pool.deposit(symbol, ethers.parseEther("100"));
        await pool.borrow(symbol, ethers.parseEther("50"));

        // Move time forward by 1 year
        await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        // Check position
        const position = await pool.getUserPosition(await owner.getAddress(), symbol);
        expect(position[2]).to.be.gt(0n); // Should have accrued interest
      });
    });
  });
});
