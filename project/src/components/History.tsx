import React from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

const transactions = [
  {
    id: 1,
    type: 'deposit',
    asset: 'ETH',
    amount: '1.5',
    value: '$2,550',
    timestamp: '2024-03-10 14:30',
    status: 'completed',
  },
  {
    id: 2,
    type: 'borrow',
    asset: 'USDC',
    amount: '3000',
    value: '$3,000',
    timestamp: '2024-03-09 09:15',
    status: 'completed',
  },
  {
    id: 3,
    type: 'repay',
    asset: 'USDC',
    amount: '1000',
    value: '$1,000',
    timestamp: '2024-03-08 16:45',
    status: 'completed',
  },
];

const History = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Transaction History</h3>
          <button className="flex items-center text-blue-400 hover:text-blue-300">
            <RefreshCw className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${
                  tx.type === 'deposit' ? 'bg-green-500/20' :
                  tx.type === 'borrow' ? 'bg-blue-500/20' : 'bg-red-500/20'
                }`}>
                  {tx.type === 'deposit' && <ArrowUpRight className="h-6 w-6 text-green-400" />}
                  {tx.type === 'borrow' && <ArrowDownRight className="h-6 w-6 text-blue-400" />}
                  {tx.type === 'repay' && <ArrowUpRight className="h-6 w-6 text-red-400" />}
                </div>
                <div>
                  <p className="font-medium capitalize">{tx.type}</p>
                  <p className="text-sm text-gray-400">{tx.timestamp}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{tx.amount} {tx.asset}</p>
                <p className="text-sm text-gray-400">{tx.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Gas Usage Analytics</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Average Gas Used (Last 7 days)</p>
              <p className="text-2xl font-bold">0.05 ETH</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Highest Gas Fee Paid</p>
              <p className="text-2xl font-bold">0.012 ETH</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold">24</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Transaction Summary</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Total Value Deposited</p>
              <p className="text-2xl font-bold">$12,550</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Value Borrowed</p>
              <p className="text-2xl font-bold">$8,000</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Value Repaid</p>
              <p className="text-2xl font-bold">$3,000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;