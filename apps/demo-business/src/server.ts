import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });
import express from 'express';
import { createPaywall } from '@web3nz/paywall-middleware';

const app = express();

const paywall = createPaywall({
  network: 'avalanche-fuji',
  recipientAddress: (process.env.BUSINESS_WALLET_ADDRESS ||
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
  facilitatorPrivateKey: (process.env.PAYWALL_PRIVATE_KEY || '0x0') as `0x${string}`,
});

app.get('/free', (req, res) => {
  res.json({ message: 'This is free content' });
});

app.get('/premium', paywall.protect({ price: '0.01' }), async (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTCUSDT';
  const binanceRes = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
  );
  const data = await binanceRes.json();
  res.json({ source: 'binance', ...data });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Demo business running on http://localhost:${PORT}`);
});
