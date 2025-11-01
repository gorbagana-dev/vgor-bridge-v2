import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are not set. Please check your .env.local file.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our database
export interface Commitment {
  id: string;
  wallet_address: string;
  amount: number;
  transaction_signature: string;
  created_at: string;
}

export interface CommitmentStats {
  total_commitments: number;
  unique_wallets: number;
  total_committed: number;
}

export interface UserStats {
  user_total: number;
  user_count: number;
  global_total: number;
  boost_pool_share: number;
  expected_ggor: number;
}

