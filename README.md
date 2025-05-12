# Impermanent Loss Tracker

A modern web application to track and visualize impermanent loss for liquidity positions on decentralized exchanges like Uniswap.

![Impermanent Loss Tracker](https://i.imgur.com/example.png)

## Features

- **Cryptocurrency Price Tracking**: Real-time price tracking via CoinGecko API
- **Impermanent Loss Calculation**: Precise calculations of impermanent loss based on token pair prices
- **Network Selection**: Choose between popular cryptocurrency networks (Ethereum, Bitcoin, Solana)
- **Live Tracking**: Automatic updates and live tracking with customizable intervals
- **Wallet Connection**: Connect to multiple wallet providers via Web3Modal
- **Mobile Support**: QR code for wallet connection on mobile devices
- **Visual Dashboard**: Interactive charts to visualize impermanent loss over time

## What is Impermanent Loss?

Impermanent loss is the temporary loss of funds experienced by liquidity providers in AMMs (Automated Market Makers) due to price volatility of token pairs. This app helps you:

- Calculate potential IL before providing liquidity
- Track IL for your active positions in real-time
- Visualize how price changes affect your liquidity position

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/IPermLossTracker.git
cd IPermLossTracker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your API keys:
```
VITE_COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:5173`

3. Select a network, token pair, and enter token amounts

4. Click "Calculate Impermanent Loss" or enable "Live Tracking"

5. Connect your wallet to import your liquidity positions (optional)

## Technical Stack

- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS with responsive design
- **Charts**: Chart.js with react-chartjs-2
- **Web3 Integration**: ethers.js, Web3Modal
- **API Integration**: Axios for API requests

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [CoinGecko API](https://www.coingecko.com/en/api) for cryptocurrency price data
- [Web3Modal](https://github.com/Web3Modal/web3modal) for wallet connection
- [Chart.js](https://www.chartjs.org/) for data visualization

