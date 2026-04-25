import { createClient } from '@supabase/supabase-js';

/**
 * Database row shapes matching the Postgres schema. These are NOT the same as
 * the API/wire types in `./types` — these use snake_case and Postgres types.
 * Keep them aligned with the migration when the schema changes.
 */
export interface AccountRow {
  id: string;
  wallet_address: string;
  network: 'avalanche-fuji' | 'avalanche';
  two_factor_enabled: boolean;
  passkeys_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  merchant_id: string;
  name: string;
  description: string;
  price: string; // numeric is returned as a string by supabase-js
  status: 'active' | 'inactive';
  resource: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: string;
  resource: string;
  timestamp: string;
}

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: AccountRow;
        Insert: Partial<AccountRow> & { id: string };
        Update: Partial<AccountRow>;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: Omit<ProductRow, 'id' | 'created_at' | 'updated_at'> &
          Partial<Pick<ProductRow, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<ProductRow>;
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        Insert: Omit<TransactionRow, 'id' | 'timestamp'> &
          Partial<Pick<TransactionRow, 'id' | 'timestamp'>>;
        Update: Partial<TransactionRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

// supabase-js v2.104 tightened some schema generics in a way that makes small,
// hand-written Database types infer `never` for inserts/selects. We still keep
// the explicit row interfaces above for our application code, but relax the
// client alias so the workspace compiles reliably without generated types.
export type TypedSupabaseClient = any;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/**
 * Service-role client. Bypasses RLS — use ONLY on the server, NEVER ship to
 * a browser bundle. Used by:
 *   - dashboard-backend, for writes that span merchants (gateway lookup,
 *     auth helpers) and for trusted server-side reads
 *   - paywall-middleware, for inserting settled transactions
 */
export function createSupabaseAdmin(): TypedSupabaseClient {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Anon-key client used only to verify a user's JWT. Calling
 * `client.auth.getUser(jwt)` returns the user if the token is valid. We don't
 * use this client for table reads — those go through the service-role client
 * with an explicit `merchant_id` filter.
 */
export function createSupabaseAnon(): TypedSupabaseClient {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_ANON_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
