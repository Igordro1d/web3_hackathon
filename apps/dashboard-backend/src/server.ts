import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

app.get('/api/transactions', (req, res) => {
  // TODO: read from data/transactions.json via lowdb
  res.json({ transactions: [] });
});

app.get('/api/stats', (req, res) => {
  // TODO: aggregate revenue, count, etc.
  res.json({ totalRevenue: '0', count: 0 });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dashboard backend running on http://localhost:${PORT}`);
});
