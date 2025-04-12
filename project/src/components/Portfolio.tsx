import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const data = [
  { name: 'ETH', value: 45 },
  { name: 'USDC', value: 30 },
  { name: 'WBTC', value: 15 },
  { name: 'Other', value: 10 },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

const Portfolio = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Asset Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {data.map((item, index) => (
              <div key={item.name} className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  ></div>
                  <span className="font-medium">{item.name}</span>
                </div>
                <p className="text-sm text-gray-400">{item.value}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-4">
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center">
              <Wallet className="mr-2 h-5 w-5" />
              Deposit
            </button>
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="mr-2 h-5 w-5" />
              Borrow
            </button>
            <button className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="mr-2 h-5 w-5" />
              Repay
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">Active Positions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 text-gray-400">Asset</th>
                <th className="text-left py-3 px-4 text-gray-400">Amount</th>
                <th className="text-left py-3 px-4 text-gray-400">Value</th>
                <th className="text-left py-3 px-4 text-gray-400">APY</th>
                <th className="text-left py-3 px-4 text-gray-400">Profit/Loss</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-700">
                <td className="py-4 px-4">ETH</td>
                <td className="py-4 px-4">2.5</td>
                <td className="py-4 px-4">$4,250</td>
                <td className="py-4 px-4 text-green-400">6.2%</td>
                <td className="py-4 px-4 text-green-400">+$320</td>
              </tr>
              <tr className="border-t border-gray-700">
                <td className="py-4 px-4">USDC</td>
                <td className="py-4 px-4">5000</td>
                <td className="py-4 px-4">$5,000</td>
                <td className="py-4 px-4 text-green-400">4.8%</td>
                <td className="py-4 px-4 text-red-400">-$50</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;