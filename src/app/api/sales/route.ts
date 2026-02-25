import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized. API Key required.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (token !== 'sk_test_1234567890abcdef') {
        return NextResponse.json({ error: 'Invalid API Key.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    const supabase = await createClient();

    let query = supabase.from('sales').select('*, sale_items(*)');

    if (phone) {
        query = query.eq('customer_phone', phone);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sales: data, total: data?.reduce((acc, sale) => acc + sale.total, 0) || 0 }, { status: 200 });
}
