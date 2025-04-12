import React from 'react';
import { Search, TrendingUp, DollarSign } from 'lucide-react';

const protocols = [
  {
    name: 'Aave',
    tvl: '$5.2B',
    apy: '4.2%',
    risk: 'Low',
    description: 'Leading DeFi lending protocol with multiple asset support',
  },
  {
    name: 'Compound',
    tvl: '$3.1B',
    apy: '3.8%',
    risk: 'Low',
    description: 'Algorithmic money market protocol with automated interest rates',
  },
  {
    name: 'MakerDAO',
    tvl: '$7.8B',
    apy: '2.5%',
    risk: 'Medium',
    description: 'Decentralized stablecoin lending platform',
  },
];

const Explore = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search protocols..."
              className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <select className="bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Assets</option>
            <option>ETH</option>
            <option>USDC</option>
            <option>WBTC</option>
          </select>
        </div>

        <div className="space-y-4">
          {protocols.map((protocol) => (
            <div key={protocol.name} className="bg-gray-700/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{protocol.name}</h3>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                  View Details
                </button>
              </div>
              <p className="text-gray-400 mb-4">{protocol.description}</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-400 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    TVL
                  </p>
                  <p className="text-lg font-semibold">{protocol.tvl}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    APY
                  </p>
                  <p className="text-lg font-semibold text-green-400">{protocol.apy}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Risk Level</p>
                  <p className="text-lg font-semibold">{protocol.risk}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Market Trends</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-400">Total Value Locked (All Protocols)</p>
              <p className="font-semibold">$45.8B</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-400">24h Volume</p>
              <p className="font-semibold">$2.1B</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-400">Active Users</p>
              <p className="font-semibold">125.4K</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Top Opportunities</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">ETH-USDC LP</p>
                <p className="text-sm text-gray-400">Uniswap V3</p>
              </div>
              <p className="text-lg font-semibold text-green-400">12.5% APY</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">WBTC Lending</p>
                <p className="text-sm text-gray-400">Aave</p>
              </div>
              <p className="text-lg font-semibold text-green-400">8.2% APY</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">USDC Vault</p>
                <p className="text-sm text-gray-400">Yearn Finance</p>
              </div>
              <p className="text-lg font-semibold text-green-400">6.8% APY</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;