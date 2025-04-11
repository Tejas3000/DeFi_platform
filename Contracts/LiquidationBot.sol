// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface ILendingPool {
    function collateralBalance(address) external view returns (uint);
    function debtBalance(address) external view returns (uint);
}

contract LiquidationBot {
    AggregatorV3Interface public priceFeed;
    ILendingPool public pool;

    constructor(address _feed, address _pool) {
        priceFeed = AggregatorV3Interface(_feed);
        pool = ILendingPool(_pool);
    }

    function getLatestPrice() public view returns (int) {
        (, int price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    function checkAndLiquidate(address user) public {
        int price = getLatestPrice();
        uint ethPrice = uint(price);
        uint collateral = pool.collateralBalance(user);
        uint debt = pool.debtBalance(user);
        uint usdValue = (collateral * ethPrice) / 1e18;

        if (usdValue < debt) {
            // Simulate liquidation trigger
            // Call repay or seize collateral manually from bot
        }
    }

    receive() external payable {}
}
