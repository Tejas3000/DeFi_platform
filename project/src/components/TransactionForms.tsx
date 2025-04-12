import React, { useState } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)'
];

interface TransactionFormsProps {
  provider: BrowserProvider | null;
  address: string;
}

const TransactionForms: React.FC<TransactionFormsProps> = ({ provider, address }) => {
  const [activeForm, setActiveForm] = useState<'deposit' | 'borrow' | 'repay'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState('ETH');

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !amount) return;

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: "YOUR_CONTRACT_ADDRESS",
        value: parseEther(amount)
      });
      
      await toast.promise(tx.wait(), {
        loading: 'Depositing...',
        success: 'Deposit successful!',
        error: 'Deposit failed'
      });
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Failed to deposit');
    } finally {
      setLoading(false);
      setAmount('');
    }
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !amount) return;

    setLoading(true);
    try {
      // Add your borrow contract interaction here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
      toast.success('Borrow successful!');
    } catch (error) {
      console.error('Borrow error:', error);
      toast.error('Failed to borrow');
    } finally {
      setLoading(false);
      setAmount('');
    }
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !amount) return;

    setLoading(true);
    try {
      // Add your repay contract interaction here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
      toast.success('Repay successful!');
    } catch (error) {
      console.error('Repay error:', error);
      toast.error('Failed to repay');
    } finally {
      setLoading(false);
      setAmount('');
    }
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
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
            <option value="WBTC">WBTC</option>
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
              onClick={() => setAmount('max')}
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
            <div className="mb-4">
              <p className="text-sm text-gray-400">
                Available to Borrow: <span className="text-white">1000 USDC</span>
              </p>
              <p className="text-sm text-gray-400">
                Borrow APY: <span className="text-white">3.5%</span>
              </p>
            </div>
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
            <div className="mb-4">
              <p className="text-sm text-gray-400">
                Outstanding Debt: <span className="text-white">500 USDC</span>
              </p>
            </div>
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