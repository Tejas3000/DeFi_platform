import { useState, useEffect } from "react";

// Extend the Window interface to include the ethereum property
declare global {
  interface Window {
    ethereum?: any;
  }
}
import { BrowserProvider } from "ethers";
import {
  Wallet,
  LineChart,
  BarChart3,
  History as HistoryIcon,
  Briefcase,
  Search,
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import Portfolio from "./components/Portfolio";
import History from "./components/History";
import Explore from "./components/Explore";
import { ThemeProvider } from "./context/ThemeContext";
import { ApiProvider, useApi } from "./context/ApiContext";
import { Toaster } from "react-hot-toast";

function AppContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const { refreshUserData } = useApi();

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAddress(accounts[0]);
        setProvider(provider);
        setIsConnected(true);
        await refreshUserData(accounts[0]);
      } else {
        alert("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          await refreshUserData(accounts[0]);
        } else {
          setAddress("");
          setIsConnected(false);
          setProvider(null);
        }
      });
    }
  }, [refreshUserData]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard provider={provider} address={address} />;
      case "portfolio":
        return <Portfolio />;
      case "history":
        return <History />;
      case "explore":
        return <Explore />;
      default:
        return <Dashboard provider={provider} address={address} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <Toaster position="top-right" />
      <nav className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <LineChart className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-xl font-bold">DeFi Dashboard</span>
            </div>

            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-300">
                  {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </span>
                <div className="h-3 w-3 bg-green-400 rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center px-4 py-2 rounded-lg ${
              activeTab === "dashboard"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <BarChart3 className="mr-2 h-5 w-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`flex items-center px-4 py-2 rounded-lg ${
              activeTab === "portfolio"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <Briefcase className="mr-2 h-5 w-5" />
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center px-4 py-2 rounded-lg ${
              activeTab === "history"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <HistoryIcon className="mr-2 h-5 w-5" />
            History
          </button>
          <button
            onClick={() => setActiveTab("explore")}
            className={`flex items-center px-4 py-2 rounded-lg ${
              activeTab === "explore"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <Search className="mr-2 h-5 w-5" />
            Explore
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ApiProvider>
        <AppContent />
      </ApiProvider>
    </ThemeProvider>
  );
}

export default App;
