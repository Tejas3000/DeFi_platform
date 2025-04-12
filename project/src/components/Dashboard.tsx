import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Activity } from 'lucide-react';
import TransactionForms from './TransactionForms';
import { BrowserProvider } from 'ethers';
import { useApi } from '../context/ApiContext';

interface DashboardProps {
  provider?: BrowserProvider | null;
  address?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ provider, address }) => {
  const { assets, userData, loadingAssets, loadingUserData, error } = useApi();

  const stats = useMemo(() => {
    if (!userData || !assets) {
      return {
        tvl: 0,
        apy: 0,
        collateralRatio: 0,
        liquidationRisk: { level: 'N/A', buffer: 0 }
      };
    }

    // Calculate total value locked
    const tvl = userData.positions.reduce((total, position) => {
      const asset = assets.find(a => a.symbol === position.asset);
      if (asset) {
        const depositedValue = parseFloat(position.deposited) * asset.price;
        return total + depositedValue;
      }
      return total;
    }, 0);

    // Calculate weighted average APY
    const totalDeposited = userData.positions.reduce((total, position) => 
      total + parseFloat(position.deposited), 0);
    
    const avgApy = userData.positions.reduce((total, position) => {
      const asset = assets.find(a => a.symbol === position.asset);
      if (asset) {
        return total + (parseFloat(position.deposited) / totalDeposited) * asset.effectiveInterestRate;
      }
      return total;
    }, 0);

    // Calculate average collateral ratio and liquidation risk
    const totalBorrowed = userData.positions.reduce((total, position) => 
      total + parseFloat(position.borrowed), 0);
    
    const collateralRatio = totalBorrowed === 0 ? 0 : 
      (tvl / totalBorrowed) * 100;

    const lowestHealthFactor = Math.min(
      ...userData.positions
        .filter(p => parseFloat(p.borrowed) > 0)
        .map(p => p.healthFactor)
    );

    const getLiquidationRisk = (healthFactor: number) => {
      if (healthFactor === Infinity || healthFactor === 0) return { level: 'None', buffer: 100 };
      if (healthFactor >= 2) return { level: 'Low', buffer: ((healthFactor - 1) * 100).toFixed(0) };
      if (healthFactor >= 1.5) return { level: 'Moderate', buffer: ((healthFactor - 1) * 100).toFixed(0) };
      return { level: 'High', buffer: ((healthFactor - 1) * 100).toFixed(0) };
    };

    return {
      tvl,
      apy: avgApy,
      collateralRatio,
      liquidationRisk: getLiquidationRisk(lowestHealthFactor)
    };
  }, [userData, assets]);

  if (loadingAssets || loadingUserData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current APY</h3>
            <TrendingUp className="h-6 w-6 text-green-400" />
          </div>
          <p className="text-3xl font-bold mt-2">{stats.apy.toFixed(2)}%</p>
          <p className="text-sm text-gray-400 mt-1">Average lending APY</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Collateral Ratio</h3>
            <Activity className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-3xl font-bold mt-2">{stats.collateralRatio.toFixed(0)}%</p>
          <p className="text-sm text-gray-400 mt-1">
            {stats.collateralRatio >= 150 ? 'Safe zone (>150%)' : 'Warning: Low collateral'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Total Value Locked</h3>
            <DollarSign className="h-6 w-6 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold mt-2">${stats.tvl.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">Across all positions</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Liquidation Risk</h3>
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-3xl font-bold mt-2">{stats.liquidationRisk.level}</p>
          <p className="text-sm text-gray-400 mt-1">{stats.liquidationRisk.buffer}% buffer to liquidation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Asset Performance</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={assets?.map(asset => ({
                name: asset.symbol,
                apy: asset.effectiveInterestRate
              })) || []}>
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

        <TransactionForms 
          provider={provider || null} 
          address={address || ''} 
          assets={assets || []}
          userPositions={userData?.positions || []}
        />
      </div>
    </div>
  );
};

export default Dashboard;