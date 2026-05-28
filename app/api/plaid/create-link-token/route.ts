import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createClient } from '@/lib/supabase/server';
import { CountryCode, Products } from 'plaid';

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: user.id,
      },
      client_name: 'Minti',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
