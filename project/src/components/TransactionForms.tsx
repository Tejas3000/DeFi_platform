import React, { useState, useMemo } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Asset, Position } from '../services/api';
import apiService from '../services/api';
import { useApi } from '../context/ApiContext';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)'
];

interface TransactionFormsProps {
  provider: BrowserProvider | null;
  address: string;
  assets: Asset[];
  userPositions: Position[];
}

const TransactionForms: React.FC<TransactionFormsProps> = ({ 
  provider, 
  address,
  assets,
  userPositions 
}) => {
  const [activeForm, setActiveForm] = useState<'deposit' | 'borrow' | 'repay'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const { refreshUserData, refreshAssets } = useApi();

  const selectedAsset = useMemo(() => 
    assets.find(a => a.symbol === selectedToken), 
    [assets, selectedToken]
  );

  const selectedPosition = useMemo(() => 
    userPositions.find(p => p.asset === selectedToken),
    [userPositions, selectedToken]
  );

  // Set initial selected token when assets are loaded
  React.useEffect(() => {
    if (assets.length > 0 && !selectedToken) {
      setSelectedToken(assets[0].symbol);
    }
  }, [assets, selectedToken]);

  const getAvailableToBorrow = (asset: Asset) => {
    const totalDeposited = parseFloat(asset.totalDeposited);
    const totalBorrowed = parseFloat(asset.totalBorrowed);
    return Math.max(0, totalDeposited - totalBorrowed);
  };

  const handleTransaction = async (
    type: 'deposit' | 'borrow' | 'repay',
    prepareFn: typeof apiService.prepareDeposit
  ) => {
    if (!provider || !amount || !selectedToken) return;

    setLoading(true);
    try {
      // Prepare transaction data
      const response = await prepareFn(address, selectedToken, amount);
      const txData = response.data;

      // Get signer and send transaction
      const signer = await provider.getSigner();
      
      // If not ETH, we need to approve first
      if (selectedAsset && selectedAsset.symbol !== 'ETH') {
        const tokenContract = new Contract(selectedAsset.tokenAddress, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(address, txData.to);
        
        if (allowance < BigInt(amount)) {
          const approveTx = await tokenContract.approve(txData.to, parseUnits(amount, 18));
          await toast.promise(approveTx.wait(), {
            loading: 'Approving token...',
            success: 'Token approved!',
            error: 'Failed to approve token'
          });
        }
      }

      // Send the actual transaction
      const tx = await signer.sendTransaction({
        to: txData.to,
        data: txData.data,
        value: txData.value || '0'
      });
      
      await toast.promise(tx.wait(), {
        loading: `${type.charAt(0).toUpperCase() + type.slice(1)}ing...`,
        success: `${type.charAt(0).toUpperCase() + type.slice(1)} successful!`,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} failed`
      });

      // Record the transaction
      await apiService.recordTransaction(
        tx.hash,
        type,
        address,
        selectedToken,
        amount
      );

      // Refresh data
      await refreshUserData(address);
      await refreshAssets();
      
      // Reset form
      setAmount('');
    } catch (error) {
      console.error(`${type} error:`, error);
      toast.error(`Failed to ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTransaction('deposit', apiService.prepareDeposit);
  };

  const handleBorrow = (e: React.FormEvent) => {
    e.preventDefault();
    handleTransaction('borrow', apiService.prepareBorrow);
  };

  const handleRepay = (e: React.FormEvent) => {
    e.preventDefault();
    handleTransaction('repay', apiService.prepareRepay);
  };

  const renderForm = () => {
    const commonInputs = (
      <>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Select Token
          </label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {assets.map(asset => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                if (selectedAsset && selectedPosition) {
                  switch (activeForm) {
                    case 'deposit':
                      // Set max to asset balance (to be implemented)
                      break;
                    case 'borrow':
                      // Set max to available borrow amount based on collateral
                      const availableToBorrow = getAvailableToBorrow(selectedAsset);
                      setAmount(availableToBorrow.toString());
                      break;
                    case 'repay':
                      // Set max to borrowed amount
                      setAmount(selectedPosition.borrowed);
                      break;
                  }
                }
              }}
              className="absolute right-2 top-2 text-sm text-blue-400 hover:text-blue-300"
            >
              MAX
            </button>
          </div>
        </div>
      </>
    );

    switch (activeForm) {
      case 'deposit':
        return (
          <form onSubmit={handleDeposit}>
            {commonInputs}
            {selectedAsset && (
              <div className="mb-4">
                <p className="text-sm text-gray-400">
                  Supply APY: <span className="text-white">{selectedAsset.effectiveInterestRate}%</span>
                </p>
                <p className="text-sm text-gray-400">
                  Total Supplied: <span className="text-white">{selectedAsset.totalDeposited}</span>
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white py-3 rounded-lg flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Deposit'
              )}
            </button>
          </form>
        );
      case 'borrow':
        return (
          <form onSubmit={handleBorrow}>
            {commonInputs}
            {selectedAsset && (
              <div className="mb-4">
                <p className="text-sm text-gray-400">
                  Borrow APY: <span className="text-white">{selectedAsset.effectiveInterestRate}%</span>
                </p>
                <p className="text-sm text-gray-400">
                  Available to Borrow: <span className="text-white">
                    {getAvailableToBorrow(selectedAsset).toString()}
                  </span>
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 disabled:cursor-not-allowed text-white py-3 rounded-lg flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Borrow'
              )}
            </button>
          </form>
        );
      case 'repay':
        return (
          <form onSubmit={handleRepay}>
            {commonInputs}
            {selectedPosition && (
              <div className="mb-4">
                <p className="text-sm text-gray-400">
                  Outstanding Debt: <span className="text-white">{selectedPosition.borrowed}</span>
                </p>
                <p className="text-sm text-gray-400">
                  Interest Due: <span className="text-white">{selectedPosition.interestDue}</span>
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-white py-3 rounded-lg flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Repay'
              )}
            </button>
          </form>
        );
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveForm('deposit')}
          className={`flex-1 py-2 rounded-lg ${
            activeForm === 'deposit' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveForm('borrow')}
          className={`flex-1 py-2 rounded-lg ${
            activeForm === 'borrow' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Borrow
        </button>
        <button
          onClick={() => setActiveForm('repay')}
          className={`flex-1 py-2 rounded-lg ${
            activeForm === 'repay' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Repay
        </button>
      </div>
      {renderForm()}
    </div>
  );
};

export default TransactionForms;