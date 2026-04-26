import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../..', '.env') });

import cors from 'cors';
import express from 'express';
import { randomUUID } from 'crypto';
import {
  createSupabaseAdmin,
  createSupabaseAnon,
  type AccountRow,
  type GatewayProductConfig,
  type NetworkName,
  type ProductRow,
  type TransactionRow,
  type TypedSupabaseClient,
} from '@web3nz/shared';

const DEFAULT_NETWORK: NetworkName = 'avalanche-fuji';
const SUPPORTED_NETWORKS = new Set<NetworkName>(['avalanche-fuji', 'avalanche']);

const admin: TypedSupabaseClient = createSupabaseAdmin();
const anon: TypedSupabaseClient = createSupabaseAnon();

interface AuthenticatedRequest extends express.Request {
  accountId?: string;
  email?: string;
}

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------------
// Validation helpers
// ----------------------------------------------------------------------------

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateRequiredString(value: unknown, label: string): string | null {
  return cleanString(value) ? null : `${label} is required`;
}

function validatePrice(value: unknown): string | null {
  const price = cleanString(value);
  if (!price) return 'price is required';
  if (!/^\d+$/.test(price)) return 'price must be numeric USDC base units';
  if (BigInt(price) <= 0n) return 'price must be greater than 0';
  return null;
}

function isSupportedNetwork(value: unknown): value is NetworkName {
  return typeof value === 'string' && SUPPORTED_NETWORKS.has(value as NetworkName);
}

function validateNetwork(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return isSupportedNetwork(value) ? null : 'network must be avalanche-fuji or avalanche';
}

function isWalletAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function generateApiKey(): string {
  return `pk_live_${randomUUID().replace(/-/g, '')}`;
}

function getBearerToken(req: express.Request): string | null {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

function routeParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// ----------------------------------------------------------------------------
// Wire format helpers
// ----------------------------------------------------------------------------

function publicAccount(account: AccountRow, email: string) {
  return {
    email,
    walletAddress: account.wallet_address,
    network: account.network,
    twoFactorEnabled: account.two_factor_enabled,
    passkeysEnabled: account.passkeys_enabled,
  };
}

function publicProduct(product: ProductRow) {
  return {
    id: product.id,
    merchantId: product.merchant_id,
    name: product.name,
    description: product.description,
    price: product.price,
    status: product.status,
    resource: product.resource,
    apiKey: product.api_key,
    createdAt: new Date(product.created_at).getTime(),
    updatedAt: new Date(product.updated_at).getTime(),
  };
}

function publicTransaction(tx: TransactionRow, productName?: string) {
  return {
    id: tx.id,
    txHash: tx.tx_hash,
    from: tx.from_address,
    to: tx.to_address,
    amount: tx.amount,
    resource: tx.resource,
    timestamp: new Date(tx.timestamp).getTime(),
    ...(productName !== undefined ? { productName } : {}),
  };
}

function formatBaseUnits(baseUnits: bigint | string): string {
  const value = typeof baseUnits === 'bigint' ? baseUnits : BigInt(baseUnits || '0');
  const whole = value / 1_000_000n;
  const decimal = (value % 1_000_000n).toString().padStart(6, '0');
  return `${whole}.${decimal}`;
}

function summarizePayments(transactions: TransactionRow[]) {
  const totalBaseUnits = transactions.reduce((sum, tx) => sum + BigInt(tx.amount || '0'), 0n);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30DaysBaseUnits = transactions
    .filter((tx) => new Date(tx.timestamp).getTime() >= cutoff)
    .reduce((sum, tx) => sum + BigInt(tx.amount || '0'), 0n);

  return {
    totalRevenue: formatBaseUnits(totalBaseUnits),
    revenue30d: formatBaseUnits(last30DaysBaseUnits),
    paymentCount: transactions.length,
  };
}

async function getProductPayments(resource: string): Promise<TransactionRow[]> {
  const { data, error } = await admin
    .from('transactions')
    .select('*')
    .eq('resource', resource)
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ----------------------------------------------------------------------------
// Auth middleware — verifies a Supabase JWT and attaches user info
// ----------------------------------------------------------------------------

async function authMiddleware(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  req.accountId = data.user.id;
  req.email = data.user.email ?? '';
  next();
}

async function loadAccount(accountId: string): Promise<AccountRow | null> {
  const { data, error } = await admin
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findOwnedProduct(
  accountId: string,
  productId: string,
): Promise<ProductRow | null> {
  const { data, error } = await admin
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('merchant_id', accountId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// Auth routes
// ----------------------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  const emailError = validateRequiredString(req.body?.email, 'email');
  const passwordError = validateRequiredString(req.body?.password, 'password');
  const networkError = validateNetwork(req.body?.network);
  if (emailError || passwordError || networkError) {
    res.status(400).json({ error: emailError ?? passwordError ?? networkError });
    return;
  }

  const network = isSupportedNetwork(req.body?.network) ? req.body.network : DEFAULT_NETWORK;
  const walletAddress = cleanString(req.body?.walletAddress);

  // Use the admin client so we can both create a confirmed user (no email
  // verification flow needed for the demo) AND pass user_metadata that the
  // handle_new_user trigger reads to seed the accounts row.
  const { data, error } = await admin.auth.admin.createUser({
    email: cleanString(req.body.email),
    password: cleanString(req.body.password),
    email_confirm: true,
    user_metadata: { wallet_address: walletAddress, network },
  });

  if (error || !data.user) {
    const status = error?.status === 422 ? 409 : 400;
    res.status(status).json({ error: error?.message ?? 'Registration failed' });
    return;
  }

  // Issue a session immediately so the dashboard can use the new account
  // without a separate login round-trip.
  const { data: session, error: signInError } = await anon.auth.signInWithPassword({
    email: cleanString(req.body.email),
    password: cleanString(req.body.password),
  });
  if (signInError || !session.session) {
    res.status(500).json({ error: signInError?.message ?? 'Could not start session' });
    return;
  }

  const account = await loadAccount(data.user.id);
  if (!account) {
    res.status(500).json({ error: 'Account row was not created' });
    return;
  }

  res.status(201).json({
    token: session.session.access_token,
    user: publicAccount(account, data.user.email ?? ''),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const emailError = validateRequiredString(req.body?.email, 'email');
  const passwordError = validateRequiredString(req.body?.password, 'password');
  if (emailError || passwordError) {
    res.status(400).json({ error: emailError ?? passwordError });
    return;
  }

  const { data, error } = await anon.auth.signInWithPassword({
    email: cleanString(req.body.email),
    password: cleanString(req.body.password),
  });

  if (error || !data.session || !data.user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const account = await loadAccount(data.user.id);
  if (!account) {
    res.status(500).json({ error: 'Account not found' });
    return;
  }

  res.json({
    token: data.session.access_token,
    user: publicAccount(account, data.user.email ?? ''),
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const emailError = validateRequiredString(req.body?.email, 'email');
  if (emailError) {
    res.status(400).json({ error: emailError });
    return;
  }

  // Fire and forget — Supabase swallows errors for unknown emails which is
  // exactly the privacy-preserving behavior we want.
  await anon.auth.resetPasswordForEmail(cleanString(req.body.email));
  res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
});

app.get('/api/auth/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const account = await loadAccount(req.accountId!);
  if (!account) {
    res.status(401).json({ error: 'Session account not found' });
    return;
  }
  res.json({ user: publicAccount(account, req.email ?? '') });
});

// ----------------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------------

app.get('/api/settings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const account = await loadAccount(req.accountId!);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json(publicAccount(account, req.email ?? ''));
});

app.put('/api/settings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const accountId = req.accountId!;

  // Email change goes through Supabase Auth's admin updateUserById.
  let nextEmail = req.email ?? '';
  if (typeof req.body?.email === 'string') {
    const newEmail = cleanString(req.body.email).toLowerCase();
    if (newEmail && newEmail !== nextEmail) {
      const { error } = await admin.auth.admin.updateUserById(accountId, { email: newEmail });
      if (error) {
        const status = error.status === 422 ? 409 : 400;
        res.status(status).json({ error: error.message });
        return;
      }
      nextEmail = newEmail;
    }
  }

  // Build the accounts patch only with fields the user actually sent.
  const patch: Record<string, unknown> = {};
  if (typeof req.body?.walletAddress === 'string') {
    patch.wallet_address = cleanString(req.body.walletAddress);
  }
  if (req.body?.network !== undefined) {
    const error = validateNetwork(req.body.network);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    if (isSupportedNetwork(req.body.network)) patch.network = req.body.network;
  }
  if (typeof req.body?.twoFactorEnabled === 'boolean') {
    patch.two_factor_enabled = req.body.twoFactorEnabled;
  }
  if (typeof req.body?.passkeysEnabled === 'boolean') {
    patch.passkeys_enabled = req.body.passkeysEnabled;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from('accounts').update(patch).eq('id', accountId);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  const account = await loadAccount(accountId);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json(publicAccount(account, nextEmail));
});

app.post('/api/account/delete', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const accountId = req.accountId!;

  // ON DELETE CASCADE on accounts.id will drop products + accounts row
  // automatically once the auth user is deleted.
  const { error } = await admin.auth.admin.deleteUser(accountId);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ deleted: true });
});

// ----------------------------------------------------------------------------
// Products
// ----------------------------------------------------------------------------

app.get('/api/products', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const accountId = req.accountId!;

  const { data: products, error } = await admin
    .from('products')
    .select('*')
    .eq('merchant_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const productRows = (products ?? []) as ProductRow[];

  // Pull all transactions for this merchant's product resources in one round-trip.
  const resources = productRows.map((p: ProductRow) => p.resource);
  let txByResource = new Map<string, TransactionRow[]>();
  if (resources.length > 0) {
    const { data: txs, error: txError } = await admin
      .from('transactions')
      .select('*')
      .in('resource', resources);
    if (txError) {
      res.status(500).json({ error: txError.message });
      return;
    }
    txByResource = ((txs ?? []) as TransactionRow[]).reduce((map, tx: TransactionRow) => {
      const list = map.get(tx.resource) ?? [];
      list.push(tx);
      map.set(tx.resource, list);
      return map;
    }, new Map<string, TransactionRow[]>());
  }

  const productsWithStats = productRows.map((product: ProductRow) => {
    const summary = summarizePayments(txByResource.get(product.resource) ?? []);
    return {
      ...publicProduct(product),
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

  const id = randomUUID();
  const { data, error } = await admin
    .from('products')
    .insert({
      id,
      merchant_id: req.accountId!,
      name: cleanString(req.body.name),
      description: cleanString(req.body.description),
      price: cleanString(req.body.price),
      status: req.body?.status === 'inactive' ? 'inactive' : 'active',
      resource: `/products/${id}/access`,
      api_key: generateApiKey(),
    })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? 'Could not create product' });
    return;
  }

  res.status(201).json({ product: publicProduct(data) });
});

app.get('/api/products/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const productId = routeParam(req.params.id);
  if (!productId) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const product = await findOwnedProduct(req.accountId!, productId);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const payments = await getProductPayments(product.resource);
  res.json({
    product: publicProduct(product),
    analytics: summarizePayments(payments),
    payments: payments.map((tx) => publicTransaction(tx)),
    integrationSteps: [
      'Add this API key to your paywall middleware configuration.',
      `Configure the protected resource path as ${product.resource}.`,
      `Set maxAmountRequired to ${product.price} USDC base units.`,
    ],
  });
});

app.put('/api/products/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const productId = routeParam(req.params.id);
  if (!productId) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const existing = await findOwnedProduct(req.accountId!, productId);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const patch: Record<string, unknown> = {};
  if (typeof req.body?.name === 'string') {
    const error = validateRequiredString(req.body.name, 'product name');
    if (error) {
      res.status(400).json({ error });
      return;
    }
    patch.name = cleanString(req.body.name);
  }
  if (typeof req.body?.description === 'string') {
    const error = validateRequiredString(req.body.description, 'description');
    if (error) {
      res.status(400).json({ error });
      return;
    }
    patch.description = cleanString(req.body.description);
  }
  if (typeof req.body?.price === 'string') {
    const error = validatePrice(req.body.price);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    patch.price = cleanString(req.body.price);
  }
  if (req.body?.status === 'active' || req.body?.status === 'inactive') {
    patch.status = req.body.status;
  }

  const { data, error } = await admin
    .from('products')
    .update(patch)
    .eq('id', productId)
    .eq('merchant_id', req.accountId!)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? 'Could not update product' });
    return;
  }

  res.json({ product: publicProduct(data) });
});

app.post(
  '/api/products/:id/rotate-key',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    const productId = routeParam(req.params.id);
    if (!productId) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const { data, error } = await admin
      .from('products')
      .update({ api_key: generateApiKey() })
      .eq('id', productId)
      .eq('merchant_id', req.accountId!)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ product: publicProduct(data) });
  },
);

app.get(
  '/api/products/:id/payments',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    const productId = routeParam(req.params.id);
    if (!productId) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = await findOwnedProduct(req.accountId!, productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const payments = await getProductPayments(product.resource);
    res.json({ payments: payments.map((tx) => publicTransaction(tx)) });
  },
);

// ----------------------------------------------------------------------------
// Dashboard summary
// ----------------------------------------------------------------------------

app.get('/api/dashboard/summary', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const accountId = req.accountId!;

  const { data: products, error: productsError } = await admin
    .from('products')
    .select('*')
    .eq('merchant_id', accountId);
  if (productsError) {
    res.status(500).json({ error: productsError.message });
    return;
  }

  const productRows = (products ?? []) as ProductRow[];
  const productsByResource = new Map<string, ProductRow>(
    productRows.map((p: ProductRow) => [p.resource, p]),
  );
  const resources = Array.from(productsByResource.keys());

  let payments: TransactionRow[] = [];
  if (resources.length > 0) {
    const { data, error } = await admin
      .from('transactions')
      .select('*')
      .in('resource', resources)
      .order('timestamp', { ascending: false });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    payments = (data ?? []) as TransactionRow[];
  }

  const summary = summarizePayments(payments);
  res.json({
    totalRevenue: summary.totalRevenue,
    revenue30d: summary.revenue30d,
    totalPayments: summary.paymentCount,
    activeProducts: productRows.filter((p: ProductRow) => p.status === 'active').length,
    recentPayments: payments
      .slice(0, 10)
      .map((tx: TransactionRow) =>
        publicTransaction(tx, productsByResource.get(tx.resource)?.name ?? 'Unknown product'),
      ),
  });
});

// ----------------------------------------------------------------------------
// Gateway lookup — used by paywall middleware
// ----------------------------------------------------------------------------

app.get('/api/gateway/products/by-key/:apiKey', async (req, res) => {
  const apiKey = routeParam(req.params.apiKey);
  if (!apiKey) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // Service role bypasses RLS, which is intentional — this endpoint is gated
  // by knowledge of the API key, not by an authenticated session.
  const { data: product, error } = await admin
    .from('products')
    .select('*')
    .eq('api_key', apiKey)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const { data: account, error: accountError } = await admin
    .from('accounts')
    .select('*')
    .eq('id', product.merchant_id)
    .maybeSingle();
  if (accountError || !account) {
    res.status(404).json({ error: 'Merchant account not found' });
    return;
  }
  if (!isWalletAddress(account.wallet_address)) {
    res.status(422).json({ error: 'Merchant receiving wallet address is missing or invalid' });
    return;
  }

  res.json({
    productId: product.id,
    name: product.name,
    description: product.description,
    resource: product.resource,
    price: product.price,
    network: account.network,
    payTo: account.wallet_address,
    status: product.status,
  } satisfies GatewayProductConfig);
});

// ----------------------------------------------------------------------------
// Compatibility endpoints — read-only, returns global aggregates from old UI
// ----------------------------------------------------------------------------

app.get('/api/transactions', async (_req, res) => {
  const { data, error } = await admin
    .from('transactions')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({
    transactions: ((data ?? []) as TransactionRow[]).map((tx: TransactionRow) =>
      publicTransaction(tx),
    ),
  });
});

app.get('/api/stats', async (_req, res) => {
  const { data, error } = await admin.from('transactions').select('*');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const summary = summarizePayments(data ?? []);
  res.json({ totalRevenue: summary.totalRevenue, count: summary.paymentCount });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Dashboard backend running on http://localhost:${PORT}`);
});
