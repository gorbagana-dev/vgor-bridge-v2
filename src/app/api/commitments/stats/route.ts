import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/commitments/stats
 * Returns global commitment statistics
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('commitment_stats')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching commitment stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch commitment stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      totalCommitments: data?.total_commitments || 0,
      uniqueWallets: data?.unique_wallets || 0,
      totalCommitted: parseFloat(data?.total_committed || '0'),
    });
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

