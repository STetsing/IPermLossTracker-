import { ethers } from 'ethers';

export async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      return { provider, signer, address };
    } catch (error) {
      throw new Error('User rejected wallet connection');
    }
  } else {
    throw new Error('No crypto wallet found. Please install MetaMask or another wallet.');
  }
}

export async function getEthBalance(address: string, provider: ethers.BrowserProvider) {
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

export async function getERC20Balance(address: string, tokenAddress: string, provider: ethers.BrowserProvider) {
  const ERC20_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
  ];
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [rawBalance, decimals, symbol] = await Promise.all([
    contract.balanceOf(address),
    contract.decimals(),
    contract.symbol()
  ]);
  return {
    symbol,
    balance: Number(rawBalance) / Math.pow(10, decimals)
  };
}

export async function discoverUserAssets(address: string, provider: ethers.BrowserProvider, tokens: {address: string, symbol: string}[]) {
  const balances = [];
  // ETH balance
  const ethBalance = await getEthBalance(address, provider);
  balances.push({ symbol: 'ETH', balance: ethBalance });
  // ERC20 balances
  for (const token of tokens) {
    try {
      const bal = await getERC20Balance(address, token.address, provider);
      balances.push(bal);
    } catch (e) {
      // Ignore tokens that fail (not on this network, etc.)
    }
  }
  return balances;
}
