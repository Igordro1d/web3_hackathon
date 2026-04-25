import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });

import cors from 'cors';
import express from 'express';
import { randomUUID } from 'crypto';
import { JSONFilePreset } from 'lowdb/node';

interface Transaction {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  resource: string;
  timestamp: number;
}

interface MerchantAccount {
  id: string;
  email: string;
  password: string;
  walletAddress: string;
  twoFactorEnabled: boolean;
  passkeysEnabled: boolean;
  createdAt: number;
}

type ProductStatus = 'active' | 'inactive';

interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: string;
  status: ProductStatus;
  resource: string;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
}

interface DashboardDb {
  accounts: MerchantAccount[];
  products: Product[];
}

interface AuthenticatedRequest extends express.Request {
  accountId?: string;
}

const app = express();
app.use(cors());
app.use(express.json());

const TRANSACTIONS_FILE = resolve(__dirname, '../../..', 'data', 'transactions.json');
const DASHBOARD_FILE = resolve(__dirname, '../../..', 'data', 'dashboard.json');
const sessions = new Map<string, string>();

async function getTransactionsDb() {
  return JSONFilePreset<{ transactions: Transaction[] }>(TRANSACTIONS_FILE, {
    transactions: [],
  });
}

async function getDashboardDb() {
  return JSONFilePreset<DashboardDb>(DASHBOARD_FILE, {
    accounts: [],
    products: [],
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateRequiredString(value: unknown, label: string) {
  return cleanString(value) ? null : `${label} is required`;
}

function validatePrice(value: unknown) {
  const price = cleanString(value);
  if (!price) return 'price is required';
  if (!/^\d+$/.test(price)) return 'price must be numeric USDC base units';
  if (BigInt(price) <= 0n) return 'price must be greater than 0';
  return null;
}

function generateApiKey() {
  return `pk_live_${randomUUID().replace(/-/g, '')}`;
}

function getBearerToken(req: express.Request) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

function authMiddleware(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  const accountId = sessions.get(token);
  if (!accountId) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  req.accountId = accountId;
  next();
}

function publicAccount(account: MerchantAccount) {
  return {
    email: account.email,
    walletAddress: account.walletAddress,
    twoFactorEnabled: account.twoFactorEnabled,
    passkeysEnabled: account.passkeysEnabled,
  };
}

function formatBaseUnits(baseUnits: bigint | string) {
  const value = typeof baseUnits === 'bigint' ? baseUnits : BigInt(baseUnits || '0');
  const whole = value / 1_000_000n;
  const decimal = (value % 1_000_000n).toString().padStart(6, '0');
  return `${whole}.${decimal}`;
}

function getProductPayments(product: Product, transactions: Transaction[]) {
  return transactions
    .filter((tx) => tx.resource === product.resource)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function summarizePayments(transactions: Transaction[]) {
  const totalBaseUnits = transactions.reduce((sum, tx) => sum + BigInt(tx.amount || '0'), 0n);
  const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30DaysBaseUnits = transactions
    .filter((tx) => tx.timestamp >= last30Days)
    .reduce((sum, tx) => sum + BigInt(tx.amount || '0'), 0n);

  return {
    totalRevenue: formatBaseUnits(totalBaseUnits),
    revenue30d: formatBaseUnits(last30DaysBaseUnits),
    paymentCount: transactions.length,
  };
}

async function findAccount(accountId: string | undefined) {
  if (!accountId) return null;
  const db = await getDashboardDb();
  const account = db.data.accounts.find((candidate) => candidate.id === accountId);
  return { db, account };
}

function findOwnedProduct(db: DashboardDb, accountId: string | undefined, productId: string) {
  return db.products.find((product) => product.id === productId && product.merchantId === accountId);
}

function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

app.post('/api/auth/register', async (req, res) => {
  const emailError = validateRequiredString(req.body?.email, 'email');
  const passwordError = validateRequiredString(req.body?.password, 'password');
  if (emailError || passwordError) {
    res.status(400).json({ error: emailError ?? passwordError });
    return;
  }

  const db = await getDashboardDb();
  const email = normalizeEmail(req.body.email);
  const duplicate = db.data.accounts.some((account) => account.email === email);
  if (duplicate) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const account: MerchantAccount = {
    id: randomUUID(),
    email,
    password: cleanString(req.body.password),
    walletAddress: cleanString(req.body.walletAddress),
    twoFactorEnabled: false,
    passkeysEnabled: false,
    createdAt: Date.now(),
  };

  db.data.accounts.push(account);
  await db.write();

  const token = randomUUID();
  sessions.set(token, account.id);

  res.status(201).json({ token, user: publicAccount(account) });
});

app.post('/api/auth/login', async (req, res) => {
  const emailError = validateRequiredString(req.body?.email, 'email');
  const passwordError = validateRequiredString(req.body?.password, 'password');
  if (emailError || passwordError) {
    res.status(400).json({ error: emailError ?? passwordError });
    return;
  }

  const db = await getDashboardDb();
  const email = normalizeEmail(req.body.email);
  const account = db.data.accounts.find((candidate) => candidate.email === email);
  if (!account || account.password !== cleanString(req.body.password)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = randomUUID();
  sessions.set(token, account.id);

  res.json({ token, user: publicAccount(account) });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const emailError = validateRequiredString(req.body?.email, 'email');
  if (emailError) {
    res.status(400).json({ error: emailError });
    return;
  }

  res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
});

app.get('/api/auth/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const result = await findAccount(req.accountId);
  if (!result?.account) {
    res.status(401).json({ error: 'Session account not found' });
    return;
  }

  res.json({ user: publicAccount(result.account) });
});

app.get('/api/settings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const result = await findAccount(req.accountId);
  if (!result?.account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.json(publicAccount(result.account));
});

app.put('/api/settings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const result = await findAccount(req.accountId);
  if (!result?.account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  const { db, account } = result;
  if (typeof req.body?.email === 'string') {
    const email = normalizeEmail(req.body.email);
    const duplicate = db.data.accounts.some((candidate) => candidate.email === email && candidate.id !== account.id);
    if (duplicate) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    account.email = email;
  }

  if (typeof req.body?.walletAddress === 'string') {
    account.walletAddress = cleanString(req.body.walletAddress);
  }
  if (typeof req.body?.twoFactorEnabled === 'boolean') {
    account.twoFactorEnabled = req.body.twoFactorEnabled;
  }
  if (typeof req.body?.passkeysEnabled === 'boolean') {
    account.passkeysEnabled = req.body.passkeysEnabled;
  }

  await db.write();
  res.json(publicAccount(account));
});

app.post('/api/account/delete', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const result = await findAccount(req.accountId);
  if (!result?.account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  const { db, account } = result;
  db.data.accounts = db.data.accounts.filter((candidate) => candidate.id !== account.id);
  db.data.products = db.data.products.filter((product) => product.merchantId !== account.id);
  await db.write();

  for (const [token, accountId] of sessions.entries()) {
    if (accountId === account.id) sessions.delete(token);
  }

  res.json({ deleted: true });
});

app.get('/api/products', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const [dashboardDb, transactionsDb] = await Promise.all([getDashboardDb(), getTransactionsDb()]);
  const products = dashboardDb.data.products.filter((product) => product.merchantId === req.accountId);
  const productsWithStats = products.map((product) => {
    const payments = getProductPayments(product, transactionsDb.data.transactions);
    const summary = summarizePayments(payments);
    return {
      ...product,
      paymentCount: summary.paymentCount,
      revenue: summary.totalRevenue,
    };
  });

  res.json({ products: productsWithStats });
});

app.post('/api/products', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const nameError = validateRequiredString(req.body?.name, 'product name');
  const descriptionError = validateRequiredString(req.body?.description, 'description');
  const priceError = validatePrice(req.body?.price);
  if (nameError || descriptionError || priceError) {
    res.status(400).json({ error: nameError ?? descriptionError ?? priceError });
    return;
  }

  const db = await getDashboardDb();
  const now = Date.now();
  const id = randomUUID();
  const product: Product = {
    id,
    merchantId: req.accountId!,
    name: cleanString(req.body.name),
    description: cleanString(req.body.description),
    price: cleanString(req.body.price),
    status: req.body?.status === 'inactive' ? 'inactive' : 'active',
    resource: `/products/${id}/access`,
    apiKey: generateApiKey(),
    createdAt: now,
    updatedAt: now,
  };

  db.data.products.push(product);
  await db.write();

  res.status(201).json({ product });
});

app.get('/api/products/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const [dashboardDb, transactionsDb] = await Promise.all([getDashboardDb(), getTransactionsDb()]);
  const productId = routeParam(req.params.id);
  const product = productId ? findOwnedProduct(dashboardDb.data, req.accountId, productId) : null;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const payments = getProductPayments(product, transactionsDb.data.transactions);
  res.json({
    product,
    analytics: summarizePayments(payments),
    payments,
    integrationSteps: [
      'Add this API key to your paywall middleware configuration.',
      `Configure the protected resource path as ${product.resource}.`,
      `Set maxAmountRequired to ${product.price} USDC base units.`,
    ],
  });
});

app.put('/api/products/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const db = await getDashboardDb();
  const productId = routeParam(req.params.id);
  const product = productId ? findOwnedProduct(db.data, req.accountId, productId) : null;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  if (typeof req.body?.name === 'string') {
    const error = validateRequiredString(req.body.name, 'product name');
    if (error) {
      res.status(400).json({ error });
      return;
    }
    product.name = cleanString(req.body.name);
  }

  if (typeof req.body?.description === 'string') {
    const error = validateRequiredString(req.body.description, 'description');
    if (error) {
      res.status(400).json({ error });
      return;
    }
    product.description = cleanString(req.body.description);
  }

  if (typeof req.body?.price === 'string') {
    const error = validatePrice(req.body.price);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    product.price = cleanString(req.body.price);
  }

  if (req.body?.status === 'active' || req.body?.status === 'inactive') {
    product.status = req.body.status;
  }

  product.updatedAt = Date.now();
  await db.write();

  res.json({ product });
});

app.post('/api/products/:id/rotate-key', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const db = await getDashboardDb();
  const productId = routeParam(req.params.id);
  const product = productId ? findOwnedProduct(db.data, req.accountId, productId) : null;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  product.apiKey = generateApiKey();
  product.updatedAt = Date.now();
  await db.write();

  res.json({ product });
});

app.get('/api/products/:id/payments', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const [dashboardDb, transactionsDb] = await Promise.all([getDashboardDb(), getTransactionsDb()]);
  const productId = routeParam(req.params.id);
  const product = productId ? findOwnedProduct(dashboardDb.data, req.accountId, productId) : null;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({ payments: getProductPayments(product, transactionsDb.data.transactions) });
});

app.get('/api/dashboard/summary', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const [dashboardDb, transactionsDb] = await Promise.all([getDashboardDb(), getTransactionsDb()]);
  const products = dashboardDb.data.products.filter((product) => product.merchantId === req.accountId);
  const productsByResource = new Map(products.map((product) => [product.resource, product]));
  const payments = transactionsDb.data.transactions
    .filter((tx) => productsByResource.has(tx.resource))
    .sort((a, b) => b.timestamp - a.timestamp);
  const summary = summarizePayments(payments);

  res.json({
    totalRevenue: summary.totalRevenue,
    revenue30d: summary.revenue30d,
    totalPayments: summary.paymentCount,
    activeProducts: products.filter((product) => product.status === 'active').length,
    recentPayments: payments.slice(0, 10).map((payment) => ({
      ...payment,
      productName: productsByResource.get(payment.resource)?.name ?? 'Unknown product',
    })),
  });
});

app.get('/api/gateway/products/by-key/:apiKey', async (req, res) => {
  const db = await getDashboardDb();
  const product = db.data.products.find((candidate) => candidate.apiKey === req.params.apiKey);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const account = db.data.accounts.find((candidate) => candidate.id === product.merchantId);
  if (!account) {
    res.status(404).json({ error: 'Merchant account not found' });
    return;
  }

  res.json({
    productId: product.id,
    resource: product.resource,
    price: product.price,
    payTo: account.walletAddress,
    status: product.status,
  });
});

// Compatibility endpoints for the original dashboard scaffold.
app.get('/api/transactions', async (req, res) => {
  const db = await getTransactionsDb();
  res.json({ transactions: db.data.transactions });
});

app.get('/api/stats', async (req, res) => {
  const db = await getTransactionsDb();
  const summary = summarizePayments(db.data.transactions);
  res.json({ totalRevenue: summary.totalRevenue, count: summary.paymentCount });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Dashboard backend running on http://localhost:${PORT}`);
});
