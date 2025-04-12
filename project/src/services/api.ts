import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface Asset {
  id: number;
  symbol: string;
  name: string;
  tokenAddress: string;
  baseInterestRate: number;
  effectiveInterestRate: number;
  volatility: number;
  collateralFactor: number;
  totalDeposited: string;
  totalBorrowed: string;
  price: number;
}

export interface Position {
  asset: string;
  deposited: string;
  borrowed: string;
  interestDue: string;
  healthFactor: number;
}

export interface UserData {
  address: string;
  positions: Position[];
}

export interface TransactionData {
  to: string;
  data: string;
  value?: string;
}

export const apiService = {
  // Asset related endpoints
  getAssets: () => api.get<Asset[]>('/assets'),
  getAsset: (symbol: string) => api.get<Asset>(`/assets/${symbol}`),
  
  // User related endpoints
  getUserData: (address: string) => api.get<UserData>(`/users/${address}`),
  
  // Transaction related endpoints
  prepareDeposit: (address: string, symbol: string, amount: string) => 
    api.post<TransactionData>('/transactions/deposit', { address, symbol, amount }),
    
  prepareWithdraw: (address: string, symbol: string, amount: string) =>
    api.post<TransactionData>('/transactions/withdraw', { address, symbol, amount }),
    
  prepareBorrow: (address: string, symbol: string, amount: string) =>
    api.post<TransactionData>('/transactions/borrow', { address, symbol, amount }),
    
  prepareRepay: (address: string, symbol: string, amount: string) =>
    api.post<TransactionData>('/transactions/repay', { address, symbol, amount }),
    
  recordTransaction: (txHash: string, txType: string, address: string, symbol: string, amount: string) =>
    api.post('/transactions/record', { txHash, txType, address, symbol, amount }),
    
  // Volatility related endpoints
  getVolatilityHistory: (symbol: string) => 
    api.get(`/volatility/${symbol}`),
};

export default apiService;