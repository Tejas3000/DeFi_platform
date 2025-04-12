import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Activity } from 'lucide-react';
import TransactionForms from './TransactionForms';
import { BrowserProvider } from 'ethers';

const data = [
  { name: 'Jan', apy: 4.5 },
  { name: 'Feb', apy: 5.2 },
  { name: 'Mar', apy: 4.8 },
  { name: 'Apr', apy: 5.5 },
  { name: 'May', apy: 6.0 },
];

interface DashboardProps {
  provider?: BrowserProvider | null;
  address?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ provider, address }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current APY</h3>
            <TrendingUp className="h-6 w-6 text-green-400" />
          </div>
          <p className="text-3xl font-bold mt-2">6.2%</p>
          <p className="text-sm text-gray-400 mt-1">+0.5% from last week</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Collateral Ratio</h3>
            <Activity className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-3xl font-bold mt-2">185%</p>
          <p className="text-sm text-gray-400 mt-1">Safe zone (&gt;150%)</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Total Value Locked</h3>
            <DollarSign className="h-6 w-6 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold mt-2">$24,856</p>
          <p className="text-sm text-gray-400 mt-1">Across all positions</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Liquidation Risk</h3>
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-3xl font-bold mt-2">Low</p>
          <p className="text-sm text-gray-400 mt-1">35% buffer to liquidation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">APY Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="apy"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <TransactionForms provider={provider} address={address || ''} />
      </div>
    </div>
  );
};

export default Dashboard;