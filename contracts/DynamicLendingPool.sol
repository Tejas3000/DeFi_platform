// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title DynamicLendingPool
 * @dev A lending pool that supports dynamic interest rates based on asset volatility
 */
contract DynamicLendingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event AssetAdded(
        string symbol,
        address tokenAddress,
        address priceFeed,
        uint256 baseInterestRate,
        uint256 collateralFactor
    );
    event AssetUpdated(
        string symbol,
        uint256 baseInterestRate,
        uint256 collateralFactor
    );
    event Deposit(address indexed user, string symbol, uint256 amount);
    event Withdraw(address indexed user, string symbol, uint256 amount);
    event Borrow(address indexed user, string symbol, uint256 amount);
    event Repay(
        address indexed user,
        string symbol,
        uint256 amount,
        uint256 interest
    );
    event Liquidated(
        address indexed user,
        string symbol,
        uint256 amount,
        address liquidator
    );
    event InterestRateUpdated(string symbol, uint256 newRate);

    // Structs
    struct Asset {
        address tokenAddress;
        address priceFeed;
        uint256 decimals;
        uint256 baseInterestRate; // in basis points (1/100 of a percent)
        uint256 collateralFactor; // in basis points
        uint256 currentInterestRate; // in basis points
        uint256 totalDeposited;
        uint256 totalBorrowed;
        bool isActive;
    }

    struct UserPosition {
        uint256 deposited;
        uint256 borrowed;
        uint256 lastInterestUpdate;
        uint256 interestIndex;
    }

    // State variables
    mapping(string => Asset) public assets;
    string[] public assetSymbols;
    mapping(address => mapping(string => UserPosition)) public userPositions;

    // Interest rate related
    uint256 public constant INTEREST_RATE_PRECISION = 1e18;
    uint256 public constant YEAR_IN_SECONDS = 31536000; // 365 days

    /**
     * @dev Constructor
     */
    constructor() {
        // Initialize contract
    }

    /**
     * @dev Add a new asset to the lending pool
     * @param symbol Asset symbol (e.g. "ETH")
     * @param tokenAddress ERC20 token address
     * @param priceFeed Chainlink price feed address
     * @param baseInterestRate Base interest rate in basis points
     * @param collateralFactor Collateral factor in basis points (e.g. 7500 = 75%)
     * @param decimals Token decimals
     */
    function addAsset(
        string memory symbol,
        address tokenAddress,
        address priceFeed,
        uint256 baseInterestRate,
        uint256 collateralFactor,
        uint8 decimals
    ) external onlyOwner {
        require(
            assets[symbol].tokenAddress == address(0),
            "Asset already exists"
        );
        require(tokenAddress != address(0), "Invalid token address");
        require(priceFeed != address(0), "Invalid price feed address");
        require(collateralFactor <= 9000, "Collateral factor too high"); // Max 90%

        assets[symbol] = Asset({
            tokenAddress: tokenAddress,
            priceFeed: priceFeed,
            decimals: decimals,
            baseInterestRate: baseInterestRate,
            collateralFactor: collateralFactor,
            currentInterestRate: baseInterestRate,
            totalDeposited: 0,
            totalBorrowed: 0,
            isActive: true
        });

        assetSymbols.push(symbol);

        emit AssetAdded(
            symbol,
            tokenAddress,
            priceFeed,
            baseInterestRate,
            collateralFactor
        );
    }

    /**
     * @dev Update asset parameters
     * @param symbol Asset symbol
     * @param baseInterestRate New base interest rate in basis points
     * @param collateralFactor New collateral factor in basis points
     */
    function updateAsset(
        string memory symbol,
        uint256 baseInterestRate,
        uint256 collateralFactor
    ) external onlyOwner {
        require(
            assets[symbol].tokenAddress != address(0),
            "Asset does not exist"
        );
        require(collateralFactor <= 9000, "Collateral factor too high"); // Max 90%

        assets[symbol].baseInterestRate = baseInterestRate;
        assets[symbol].collateralFactor = collateralFactor;

        emit AssetUpdated(symbol, baseInterestRate, collateralFactor);
    }

    /**
     * @dev Update asset interest rate
     * @param symbol Asset symbol
     * @param newInterestRate New interest rate in basis points
     */
    function updateInterestRate(
        string memory symbol,
        uint256 newInterestRate
    ) external onlyOwner {
        require(
            assets[symbol].tokenAddress != address(0),
            "Asset does not exist"
        );

        assets[symbol].currentInterestRate = newInterestRate;

        emit InterestRateUpdated(symbol, newInterestRate);
    }

    /**
     * @dev Deposit tokens into the lending pool
     * @param symbol Asset symbol
     * @param amount Amount to deposit
     */
    function deposit(
        string memory symbol,
        uint256 amount
    ) external nonReentrant {
        require(assets[symbol].isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");

        // Update interest for user
        _updateInterest(msg.sender, symbol);

        // Transfer tokens from user
        IERC20 token = IERC20(assets[symbol].tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Update user position
        userPositions[msg.sender][symbol].deposited += amount;

        // Update asset total
        assets[symbol].totalDeposited += amount;

        emit Deposit(msg.sender, symbol, amount);
    }

    /**
     * @dev Withdraw tokens from the lending pool
     * @param symbol Asset symbol
     * @param amount Amount to withdraw
     */
    function withdraw(
        string memory symbol,
        uint256 amount
    ) external nonReentrant {
        require(assets[symbol].isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");

        // Update interest for user
        _updateInterest(msg.sender, symbol);

        UserPosition storage position = userPositions[msg.sender][symbol];
        require(position.deposited >= amount, "Insufficient balance");

        // Check if withdrawal would make position unhealthy
        if (position.borrowed > 0) {
            uint256 newDeposited = position.deposited - amount;
            require(
                _isHealthyPosition(
                    msg.sender,
                    symbol,
                    newDeposited,
                    position.borrowed
                ),
                "Withdrawal would cause unhealthy position"
            );
        }

        // Update user position
        position.deposited -= amount;

        // Update asset total
        assets[symbol].totalDeposited -= amount;

        // Transfer tokens to user
        IERC20 token = IERC20(assets[symbol].tokenAddress);
        token.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, symbol, amount);
    }

    /**
     * @dev Borrow tokens from the lending pool
     * @param symbol Asset symbol
     * @param amount Amount to borrow
     */
    function borrow(
        string memory symbol,
        uint256 amount
    ) external nonReentrant {
        require(assets[symbol].isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");

        // Update interest for user
        _updateInterest(msg.sender, symbol);

        UserPosition storage position = userPositions[msg.sender][symbol];
        uint256 newBorrowed = position.borrowed + amount;

        // Check if position would be healthy after borrow
        require(
            _isHealthyPosition(
                msg.sender,
                symbol,
                position.deposited,
                newBorrowed
            ),
            "Borrow would cause unhealthy position"
        );

        // Check if pool has enough liquidity
        require(
            assets[symbol].totalDeposited - assets[symbol].totalBorrowed >=
                amount,
            "Insufficient liquidity in pool"
        );

        // Update user position
        position.borrowed = newBorrowed;

        // Update asset total
        assets[symbol].totalBorrowed += amount;

        // Transfer tokens to user
        IERC20 token = IERC20(assets[symbol].tokenAddress);
        token.safeTransfer(msg.sender, amount);

        emit Borrow(msg.sender, symbol, amount);
    }

    /**
     * @dev Repay borrowed tokens
     * @param symbol Asset symbol
     * @param amount Amount to repay
     */
    function repay(string memory symbol, uint256 amount) external nonReentrant {
        require(assets[symbol].isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");

        // Calculate interest due
        _updateInterest(msg.sender, symbol);

        UserPosition storage position = userPositions[msg.sender][symbol];
        require(position.borrowed > 0, "No outstanding borrow");

        // Cap repayment at the borrowed amount
        uint256 actualRepayAmount = amount;
        if (amount > position.borrowed) {
            actualRepayAmount = position.borrowed;
        }

        // Transfer tokens from user
        IERC20 token = IERC20(assets[symbol].tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), actualRepayAmount);

        // Update user position
        position.borrowed -= actualRepayAmount;

        // Update asset total
        assets[symbol].totalBorrowed -= actualRepayAmount;

        emit Repay(msg.sender, symbol, actualRepayAmount, 0); // Interest handled in _updateInterest
    }

    /**
     * @dev Liquidate an unhealthy position
     * @param user Address of user to liquidate
     * @param symbol Asset symbol
     * @param amount Amount to liquidate (repay)
     */
    function liquidate(
        address user,
        string memory symbol,
        uint256 amount
    ) external nonReentrant {
        require(assets[symbol].isActive, "Asset not active");
        require(user != msg.sender, "Cannot liquidate self");
        require(amount > 0, "Amount must be greater than 0");

        // Update interest for the user
        _updateInterest(user, symbol);

        UserPosition storage position = userPositions[user][symbol];
        require(position.borrowed > 0, "No outstanding borrow");

        // Check if position is unhealthy
        require(
            !_isHealthyPosition(
                user,
                symbol,
                position.deposited,
                position.borrowed
            ),
            "Position is still healthy"
        );

        // Cap liquidation at the borrowed amount
        uint256 actualRepayAmount = amount;
        if (amount > position.borrowed) {
            actualRepayAmount = position.borrowed;
        }

        // Calculate collateral to seize (repayment plus liquidation bonus)
        uint256 liquidationBonus = 500; // 5% bonus in basis points
        uint256 seizeAmount = (actualRepayAmount * (10000 + liquidationBonus)) /
            10000;

        // Cap seize amount to available collateral
        if (seizeAmount > position.deposited) {
            seizeAmount = position.deposited;
        }

        // Transfer repayment tokens from liquidator
        IERC20 token = IERC20(assets[symbol].tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), actualRepayAmount);

        // Update user position
        position.borrowed -= actualRepayAmount;
        position.deposited -= seizeAmount;

        // Update asset totals
        assets[symbol].totalBorrowed -= actualRepayAmount;
        assets[symbol].totalDeposited -= seizeAmount;

        // Transfer seized collateral to liquidator
        token.safeTransfer(msg.sender, seizeAmount);

        emit Liquidated(user, symbol, actualRepayAmount, msg.sender);
    }

    /**
     * @dev Get asset details
     * @param symbol Asset symbol
     * @return tokenAddress Token address
     * @return totalDeposited Total deposited amount
     * @return totalBorrowed Total borrowed amount
     */
    function getAssetDetails(
        string memory symbol
    )
        external
        view
        returns (
            address tokenAddress,
            uint256 totalDeposited,
            uint256 totalBorrowed
        )
    {
        Asset storage asset = assets[symbol];
        return (asset.tokenAddress, asset.totalDeposited, asset.totalBorrowed);
    }

    /**
     * @dev Get user position for an asset
     * @param user User address
     * @param symbol Asset symbol
     * @return deposited Amount deposited
     * @return borrowed Amount borrowed
     * @return interestDue Interest due
     */
    function getUserPosition(
        address user,
        string memory symbol
    )
        external
        view
        returns (uint256 deposited, uint256 borrowed, uint256 interestDue)
    {
        UserPosition storage position = userPositions[user][symbol];
        interestDue = _calculateInterestDue(user, symbol);
        return (position.deposited, position.borrowed, interestDue);
    }

    /**
     * @dev Get current interest rate for an asset
     * @param symbol Asset symbol
     * @return Current interest rate in basis points
     */
    function getCurrentInterestRate(
        string memory symbol
    ) external view returns (uint256) {
        return assets[symbol].currentInterestRate;
    }

    /**
     * @dev Get asset price from Chainlink
     * @param symbol Asset symbol
     * @return Latest price (with 8 decimals)
     */
    function getAssetPrice(
        string memory symbol
    ) external view returns (uint256) {
        Asset storage asset = assets[symbol];
        require(asset.tokenAddress != address(0), "Asset does not exist");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            asset.priceFeed
        );
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        return uint256(price);
    }

    /**
     * @dev Get all asset symbols
     * @return Array of asset symbols
     */
    function getAllAssetSymbols() external view returns (string[] memory) {
        return assetSymbols;
    }

    // Internal functions

    /**
     * @dev Update interest for a user position
     * @param user User address
     * @param symbol Asset symbol
     */
    function _updateInterest(address user, string memory symbol) internal {
        UserPosition storage position = userPositions[user][symbol];

        // Skip if no borrowed amount or first interaction
        if (position.borrowed == 0 || position.lastInterestUpdate == 0) {
            position.lastInterestUpdate = block.timestamp;
            return;
        }

        // Calculate interest
        uint256 interestDue = _calculateInterestDue(user, symbol);

        if (interestDue > 0) {
            // Add interest to borrowed amount
            position.borrowed += interestDue;

            // Update asset total borrowed
            assets[symbol].totalBorrowed += interestDue;
        }

        // Update last interest calculation timestamp
        position.lastInterestUpdate = block.timestamp;
    }

    /**
     * @dev Calculate interest due for a user position
     * @param user User address
     * @param symbol Asset symbol
     * @return Interest amount due
     */
    function _calculateInterestDue(
        address user,
        string memory symbol
    ) internal view returns (uint256) {
        UserPosition storage position = userPositions[user][symbol];

        if (position.borrowed == 0 || position.lastInterestUpdate == 0) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - position.lastInterestUpdate;
        uint256 interestRate = assets[symbol].currentInterestRate;

        // Calculate interest: principal * rate * time / (year_in_seconds * 10000)
        // Rate is in basis points, so divide by 10000 to get actual rate
        uint256 interestDue = (position.borrowed * interestRate * timeElapsed) /
            (YEAR_IN_SECONDS * 10000);

        return interestDue;
    }

    /**
     * @dev Check if a position would be healthy
     * @param user User address
     * @param symbol Asset symbol
     * @param deposited Amount deposited
     * @param borrowed Amount borrowed
     * @return True if position is healthy, false otherwise
     */
    function _isHealthyPosition(
        address user,
        string memory symbol,
        uint256 deposited,
        uint256 borrowed
    ) internal view returns (bool) {
        if (borrowed == 0) {
            return true;
        }

        // Calculate maximum borrow amount based on collateral factor
        uint256 collateralFactor = assets[symbol].collateralFactor;
        uint256 maxBorrow = (deposited * collateralFactor) / 10000;

        return borrowed <= maxBorrow;
    }
}
