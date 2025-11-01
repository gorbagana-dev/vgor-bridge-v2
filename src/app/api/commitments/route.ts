import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/commitments
 * Records a new commitment to the database
 * 
 * Request body:
 * {
 *   wallet_address: string,
 *   amount: number,
 *   transaction_signature: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, amount, transaction_signature }: any = body;

    // Validation
    if (!wallet_address || !amount || !transaction_signature) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet_address, amount, transaction_signature' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if transaction signature already exists
    const { data: existing } = await supabase
      .from('commitments')
      .select('id')
      .eq('transaction_signature', transaction_signature)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Transaction already recorded' },
        { status: 409 }
      );
    }

    // Insert the new commitment
    const { data, error } = await supabase
      .from('commitments')
      .insert([
        {
          wallet_address,
          amount,
          transaction_signature,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting commitment:', error);
      return NextResponse.json(
        { error: 'Failed to record commitment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commitment: data,
    });
  } catch (error) {
    console.error('Error in commitments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/commitments
 * Returns all commitments (paginated)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('commitments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching commitments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch commitments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      commitments: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in commitments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

