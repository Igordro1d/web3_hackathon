export interface UserProfile {
  email: string;
  walletAddress: string;
  twoFactorEnabled: boolean;
  passkeysEnabled: boolean;
}

export interface Transaction {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  resource: string;
  timestamp: number;
  productName?: string;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: string;
  status: 'active' | 'inactive';
  resource: string;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
  paymentCount?: number;
  revenue?: string;
}

export interface DashboardSummary {
  totalRevenue: string;
  revenue30d: string;
  totalPayments: number;
  activeProducts: number;
  recentPayments: Transaction[];
}

export interface ProductAnalytics {
  totalRevenue: string;
  revenue30d: string;
  paymentCount: number;
}

export interface ProductDetails {
  product: Product;
  analytics: ProductAnalytics;
  payments: Transaction[];
  integrationSteps: string[];
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
