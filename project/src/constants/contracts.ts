export const CONTRACTS = {
  DYNAMIC_LENDING_POOL: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  MOCK_TOKEN: '0x0000000000000000000000000000000000000000', // Will be updated after deployment
  MOCK_PRICE_FEED: '0x0000000000000000000000000000000000000000' // Will be updated after deployment
};

export const CONTRACT_ABIS = {
  DYNAMIC_LENDING_POOL: require('../../../contracts/abi/DynamicLendingPool.json'),
  MOCK_TOKEN: require('../../../contracts/mocks/MockERC20.sol/MockERC20.json').abi,
  MOCK_PRICE_FEED: require('../../../contracts/mocks/MockPriceFeed.sol/MockPriceFeed.json').abi
};