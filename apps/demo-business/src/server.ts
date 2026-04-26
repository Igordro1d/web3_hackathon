import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });
import express from 'express';
import { createPaywall } from '@web3nz/glyde';

const app = express();

const productApiKey = process.env.PRODUCT_API_KEY;
if (!productApiKey) {
  throw new Error('PRODUCT_API_KEY is required');
}

const paywall = createPaywall(productApiKey);

app.get('/premium', paywall.protect(), async (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTCUSDT';
  const binanceRes = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
  );
  const data = await binanceRes.json();
  res.json({ source: 'binance', ...data });
});

// 24-hour rolling statistics: price change %, volume, high, low, open, close
app.get('/premium/stats', paywall.protect(), async (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTCUSDT';
  const binanceRes = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
  );
  const data = await binanceRes.json();
  res.json({ source: 'binance', ...data });
});

// Candlestick (OHLCV) data — fields mapped to named keys for readability
app.get('/premium/klines', paywall.protect(), async (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTCUSDT';
  const interval = (req.query.interval as string) || '1h';
  const limit = Math.min(Number(req.query.limit) || 24, 100);
  const binanceRes = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  const raw = await binanceRes.json() as unknown[][];
  const klines = raw.map((k) => ({
    openTime: k[0],
    open: k[1],
    high: k[2],
    low: k[3],
    close: k[4],
    volume: k[5],
    trades: k[8],
  }));
  res.json({ source: 'binance', symbol, interval, klines });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Demo business running on http://localhost:${PORT}`);
});
