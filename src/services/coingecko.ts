import axios from 'axios';

const COINGECKO_API_URL = process.env.VITE_COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';

export async function getTokenList() {
  const url = `${COINGECKO_API_URL}/coins/list`;
  const response = await axios.get(url);
  return response.data;
}

export async function getTokenPrices(ids: string[], vsCurrency = 'usd') {
  const url = `${COINGECKO_API_URL}/simple/price?ids=${ids.join(',')}&vs_currencies=${vsCurrency}`;
  const response = await axios.get(url);
  return response.data;
}
