import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });
import express from 'express';
import cors from 'cors';
import { JSONFilePreset } from 'lowdb/node';
import type { Transaction } from '@web3nz/shared';

const app = express();
app.use(cors());

const DATA_FILE = resolve(__dirname, '../../..', 'data', 'transactions.json');

async function getDb() {
  return JSONFilePreset<{ transactions: Transaction[] }>(DATA_FILE, {
    transactions: [],
  });
}

app.get('/api/transactions', async (req, res) => {
  const db = await getDb();
  res.json({ transactions: db.data.transactions });
});

app.get('/api/stats', async (req, res) => {
  const db = await getDb();
  const { transactions } = db.data;
  const totalRevenue = (
    transactions.reduce((sum, tx) => sum + Number(tx.amount), 0) / 1_000_000
  ).toFixed(6);
  res.json({ totalRevenue, count: transactions.length });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dashboard backend running on http://localhost:${PORT}`);
});
