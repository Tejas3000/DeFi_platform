
export const CONTRACTS = {
  DYNAMIC_LENDING_POOL: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  MOCK_TOKEN: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  MOCK_PRICE_FEED: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};

export const CONTRACT_ABIS = {
  DYNAMIC_LENDING_POOL: require('../../../artifacts/contracts/DynamicLendingPool.sol/DynamicLendingPool.json').abi,
  MOCK_TOKEN: require('../../../artifacts/contracts/mocks/MockERC20.sol/MockERC20.json').abi,
  MOCK_PRICE_FEED: require('../../../artifacts/contracts/mocks/MockPriceFeed.sol/MockPriceFeed.json').abi
};