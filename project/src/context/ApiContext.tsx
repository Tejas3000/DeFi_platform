import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService, { Asset, UserData } from '../services/api';

interface ApiContextType {
  assets: Asset[];
  userData: UserData | null;
  loadingAssets: boolean;
  loadingUserData: boolean;
  error: string | null;
  refreshUserData: (address: string) => Promise<void>;
  refreshAssets: () => Promise<void>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAssets = async () => {
    setLoadingAssets(true);
    setError(null);
    try {
      const response = await apiService.getAssets();
      setAssets(response.data);
    } catch (err) {
      setError('Failed to load assets');
      console.error(err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const refreshUserData = async (address: string) => {
    if (!address) return;
    setLoadingUserData(true);
    setError(null);
    try {
      const response = await apiService.getUserData(address);
      setUserData(response.data);
    } catch (err) {
      setError('Failed to load user data');
      console.error(err);
    } finally {
      setLoadingUserData(false);
    }
  };

  useEffect(() => {
    refreshAssets();
  }, []);

  return (
    <ApiContext.Provider
      value={{
        assets,
        userData,
        loadingAssets,
        loadingUserData,
        error,
        refreshUserData,
        refreshAssets,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};