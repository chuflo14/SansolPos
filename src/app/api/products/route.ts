import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    // Authentication header check block
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized. API Key required.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    // Validating the API Key (mock logic for Phase 5 MVP)
    if (token !== 'sk_test_1234567890abcdef') {
        return NextResponse.json({ error: 'Invalid API Key.' }, { status: 403 });
    }

    // Fetch from Supabase (bypassing RLS with service role, or using RLS if we store the API key securely)
    // For MVP: Return mock or direct DB access
    const supabase = await createClient();
    const { data, error } = await supabase.from('products').select('*');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data }, { status: 200 });
}
