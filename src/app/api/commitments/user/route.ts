import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/commitments/user?wallet=<wallet_address>
 * Returns user-specific commitment statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Call the database function to get user stats
    const { data, error } = await supabase.rpc('get_user_stats', {
      user_wallet: wallet,
    });

    if (error) {
      console.error('Error fetching user stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user stats' },
        { status: 500 }
      );
    }

    // Extract the first row (function returns an array)
    const stats = Array.isArray(data) && data.length > 0 ? data[0] : null;

    return NextResponse.json({
      userTotal: parseFloat(stats?.user_total || '0'),
      userCount: parseInt(stats?.user_count || '0'),
      globalTotal: parseFloat(stats?.global_total || '0'),
      boostPoolShare: parseFloat(stats?.boost_pool_share || '0'),
      expectedGGor: parseFloat(stats?.expected_ggor || '0'),
    });
  } catch (error) {
    console.error('Error in user stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

