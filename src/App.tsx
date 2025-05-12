import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import './App.css';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Popular networks and their tokens
const NETWORKS = [
  {
    name: 'Ethereum',
    id: 'ethereum',
    tokens: [
      { id: 'ethereum', name: 'Ethereum (ETH)' },
      { id: 'weth', name: 'Wrapped Ether (WETH)' },
      { id: 'usdt', name: 'Tether (USDT)' },
      { id: 'usdc', name: 'USD Coin (USDC)' },
      { id: 'dai', name: 'Dai (DAI)' },
      { id: 'uni', name: 'Uniswap (UNI)' },
      { id: 'link', name: 'Chainlink (LINK)' },
    ],
  },
  {
    name: 'Bitcoin',
    id: 'bitcoin',
    tokens: [
      { id: 'bitcoin', name: 'Bitcoin (BTC)' },
      { id: 'wbtc', name: 'Wrapped Bitcoin (WBTC)' },
    ],
  },
  {
    name: 'Solana',
    id: 'solana',
    tokens: [
      { id: 'solana', name: 'Solana (SOL)' },
      { id: 'usdt', name: 'Tether (USDT)' },
      { id: 'usdc', name: 'USD Coin (USDC)' },
      { id: 'bonk', name: 'Bonk (BONK)' },
    ],
  },
];

function App() {
  const [prices, setPrices] = useState({});
  const [historicalPrices, setHistoricalPrices] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [tokenPair, setTokenPair] = useState({
    token1: NETWORKS[0].tokens[0].id,
    token2: NETWORKS[0].tokens.length > 1 ? NETWORKS[0].tokens[1].id : NETWORKS[0].tokens[0].id,
  });
  const [impermanentLoss, setImpermanentLoss] = useState(null);
  const [timeTick, setTimeTick] = useState(1); // Default time tick in minutes
  const [tokenAmounts, setTokenAmounts] = useState({ token1: 1, token2: 1 });
  const [liquidityDate, setLiquidityDate] = useState(() => {
    // Default to today's date
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [currentValue, setCurrentValue] = useState(0);
  const [holdValue, setHoldValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const liveTrackingIntervalRef = useRef(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [web3Modal, setWeb3Modal] = useState<Web3Modal | null>(null);
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    const web3ModalInstance = new Web3Modal({
      cacheProvider: true,
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            infuraId: '1c209b6e0e2e4e7e8e6e8e8e8e8e8e8e', // Replace with your Infura ID
          },
        },
      },
    });
    setWeb3Modal(web3ModalInstance);
  }, []);

  const handleConnectWallet = async () => {
    if (!web3Modal) return;
    try {
      const instance = await web3Modal.connect();
      const ethersProvider = new ethers.BrowserProvider(instance);
      setProvider(ethersProvider);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleDisconnectWallet = async () => {
    setWalletAddress(null);
    setProvider(null);
    if (web3Modal) {
      await web3Modal.clearCachedProvider();
    }
  };

  const fetchPrices = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `/api/simple/price?ids=${tokenPair.token1},${tokenPair.token2}&vs_currencies=usd`
      );
      setPrices(response.data);

      // Calculate current values
      const price1 = response.data[tokenPair.token1]?.usd || 0;
      const price2 = response.data[tokenPair.token2]?.usd || 0;
      
      if (price1 && price2 && tokenAmounts.token1 && tokenAmounts.token2) {
        // Initial 50/50 value allocation
        const initialValue = 
          (tokenAmounts.token1 * price1) + 
          (tokenAmounts.token2 * price2);
        
        // Holding value if tokens were just held
        const holdingValue = 
          (tokenAmounts.token1 * price1) + 
          (tokenAmounts.token2 * price2);
        setHoldValue(holdingValue);
        
        // Calculate the constant product k
        const k = tokenAmounts.token1 * tokenAmounts.token2;
        
        // Calculate new amounts based on price change
        const priceRatio = price1 / price2;
        const newAmount1 = Math.sqrt(k / priceRatio);
        const newAmount2 = k / newAmount1;
        
        // Calculate LP value
        const lpValue = (newAmount1 * price1) + (newAmount2 * price2);
        setCurrentValue(lpValue);
        
        // Calculate impermanent loss
        const loss = (lpValue / holdingValue) - 1;
        setImpermanentLoss(loss);
        
        // Add to historical prices
        setHistoricalPrices(prev => [
          ...prev,
          {
            date: new Date(),
            price1,
            price2,
            lpValue,
            holdValue: holdingValue,
            impLoss: loss
          }
        ]);
      }

      // Update chart data
      if (historicalPrices.length > 0) {
        setChartData({
          labels: historicalPrices.map(entry => 
            entry.date.toLocaleTimeString()
          ),
          datasets: [
            {
              label: 'Impermanent Loss (%)',
              data: historicalPrices.map(entry => entry.impLoss * 100),
              borderColor: 'rgba(220, 53, 69, 1)',
              backgroundColor: 'rgba(220, 53, 69, 0.2)',
              yAxisID: 'percentage'
            },
            {
              label: 'LP Value (USD)',
              data: historicalPrices.map(entry => entry.lpValue),
              borderColor: 'rgba(32, 201, 151, 1)',
              backgroundColor: 'rgba(32, 201, 151, 0.2)',
              yAxisID: 'value'
            },
            {
              label: 'HODL Value (USD)',
              data: historicalPrices.map(entry => entry.holdValue),
              borderColor: 'rgba(13, 110, 253, 1)',
              backgroundColor: 'rgba(13, 110, 253, 0.2)',
              yAxisID: 'value'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPrices();
    
    // Set up interval based on timeTick (convert minutes to milliseconds)
    const interval = setInterval(fetchPrices, timeTick * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [tokenPair, timeTick, tokenAmounts, liquidityDate]);

  // Handle live tracking
  useEffect(() => {
    if (isLiveTracking) {
      // Clear any existing interval
      if (liveTrackingIntervalRef.current) {
        clearInterval(liveTrackingIntervalRef.current);
      }
      
      // Set up new 1-minute interval for live updates
      liveTrackingIntervalRef.current = setInterval(fetchPrices, 60000);
      
      // Fetch immediately when starting live tracking
      fetchPrices();
    } else {
      // Clear interval when live tracking is turned off
      if (liveTrackingIntervalRef.current) {
        clearInterval(liveTrackingIntervalRef.current);
        liveTrackingIntervalRef.current = null;
      }
    }
    
    // Cleanup on component unmount
    return () => {
      if (liveTrackingIntervalRef.current) {
        clearInterval(liveTrackingIntervalRef.current);
      }
    };
  }, [isLiveTracking]);

  const toggleLiveTracking = () => {
    setIsLiveTracking(prev => !prev);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    scales: {
      percentage: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Impermanent Loss (%)'
        }
      },
      value: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Value (USD)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.yAxisID === 'percentage') {
                label += context.parsed.y.toFixed(2) + '%';
              } else {
                label += formatCurrency(context.parsed.y);
              }
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <div className="App">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Impermanent Loss Tracker</h1>
          <p>Track and visualize impermanent loss for your liquidity positions</p>
        </div>
        <div>
          {walletAddress ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontWeight: 500, fontSize: '1rem', background: '#f1f3f5', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
              <button className="secondary-button" onClick={handleDisconnectWallet}>Log out</button>
            </div>
          ) : (
            <button className="primary-button" onClick={handleConnectWallet}>Connect Wallet</button>
          )}
        </div>
      </header>

      <div className="card">
        <h2>Liquidity Position Details</h2>
        <div style={{ display: 'flex', gap: '2rem', width: '100%' }}>
          {/* Network Selection */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="form-field">
              <label htmlFor="network">Network</label>
              <select
                id="network"
                value={selectedNetwork.id}
                onChange={e => {
                  const net = NETWORKS.find(n => n.id === e.target.value);
                  setSelectedNetwork(net);
                  // Reset tokens to default for the network
                  setTokenPair({
                    token1: net.tokens[0].id,
                    token2: net.tokens.length > 1 ? net.tokens[1].id : net.tokens[0].id,
                  });
                }}
              >
                {NETWORKS.map(net => (
                  <option key={net.id} value={net.id}>{net.name}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Token 1 Section */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="form-field">
              <label htmlFor="token1">Token 1</label>
              <select
                id="token1"
                value={tokenPair.token1}
                onChange={e => setTokenPair({ ...tokenPair, token1: e.target.value })}
              >
                {selectedNetwork.tokens.map(token => (
                  <option key={token.id} value={token.id}>{token.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="amount1">Amount of {tokenPair.token1.toUpperCase()}</label>
              <input
                id="amount1"
                type="number"
                min="0.00000001"
                step="0.00000001"
                value={tokenAmounts.token1}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setTokenAmounts({ ...tokenAmounts, token1: val });
                  } else if (e.target.value === "") {
                    setTokenAmounts({ ...tokenAmounts, token1: 0 });
                  }
                }}
                inputMode="decimal"
                pattern="^[0-9]*\.?[0-9]+$"
              />
            </div>
          </div>
          {/* Token 2 Section */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="form-field">
              <label htmlFor="token2">Token 2</label>
              <select
                id="token2"
                value={tokenPair.token2}
                onChange={e => setTokenPair({ ...tokenPair, token2: e.target.value })}
              >
                {selectedNetwork.tokens.map(token => (
                  <option key={token.id} value={token.id}>{token.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="amount2">Amount of {tokenPair.token2.toUpperCase()}</label>
              <input
                id="amount2"
                type="number"
                min="0.00000001"
                step="0.00000001"
                value={tokenAmounts.token2}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setTokenAmounts({ ...tokenAmounts, token2: val });
                  } else if (e.target.value === "") {
                    setTokenAmounts({ ...tokenAmounts, token2: 0 });
                  }
                }}
                inputMode="decimal"
                pattern="^[0-9]*\.?[0-9]+$"
              />
            </div>
          </div>
        </div>
        <div className="form-group">
          <div className="form-field">
            <label htmlFor="date">Date Liquidity Provided</label>
            <input
              id="date"
              type="date"
              value={liquidityDate}
              onChange={(e) => setLiquidityDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="tick">Update Interval (minutes)</label>
            <input
              id="tick"
              type="number"
              min="1"
              value={timeTick}
              onChange={(e) => setTimeTick(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>
        <div className="action-buttons">
          <button onClick={fetchPrices} className="primary-button">
            Calculate Impermanent Loss
          </button>
          <button
            onClick={toggleLiveTracking}
            className={`${isLiveTracking ? 'active-button' : 'secondary-button'}`}
          >
            {isLiveTracking ? 'Stop Live Tracking' : 'Start Live Tracking (1 min)'}
          </button>
        </div>
        {isLiveTracking && (
          <div className="live-indicator">
            <span className="pulse"></span> Live tracking active - updating every 1 minute
          </div>
        )}
      </div>

      <div className="card">
        <h2>Real-time Metrics</h2>
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-label">Current LP Value</div>
            <div className="stat-value">{formatCurrency(currentValue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">HODL Value</div>
            <div className="stat-value">{formatCurrency(holdValue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Impermanent Loss</div>
            <div className={`stat-value ${impermanentLoss !== null && impermanentLoss < 0 ? 'negative' : 'positive'}`}>
              {impermanentLoss !== null ?
                `${(impermanentLoss * 100).toFixed(2)}%` :
                'Calculating...'}
            </div>
          </div>
        </div>
        {prices && tokenPair.token1 in prices && tokenPair.token2 in prices && (
          <div className="stats-container" style={{ marginTop: '1rem' }}>
            <div className="stat-card">
              <div className="stat-label">{tokenPair.token1.toUpperCase()} Price</div>
              <div className="stat-value">{prices[tokenPair.token1]?.usd ? formatCurrency(prices[tokenPair.token1].usd) : 'N/A'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{tokenPair.token2.toUpperCase()} Price</div>
              <div className="stat-value">{prices[tokenPair.token2]?.usd ? formatCurrency(prices[tokenPair.token2].usd) : 'N/A'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Impermanent Loss Chart</h2>
        <div className="chart-container">
          {isLoading && <p>Loading chart data...</p>}
          {!isLoading && chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            !isLoading && <p>Waiting for price data...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
