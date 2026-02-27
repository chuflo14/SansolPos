import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v22.0';

    const config = {
        WHATSAPP_ACCESS_TOKEN: token ? `✅ Presente (${token.slice(0, 8)}...)` : '❌ No configurada',
        WHATSAPP_PHONE_NUMBER_ID: phoneNumberId ? `✅ ${phoneNumberId}` : '❌ No configurada',
        WHATSAPP_GRAPH_API_VERSION: apiVersion,
    };

    if (!token || !phoneNumberId) {
        return NextResponse.json({
            status: 'misconfigured',
            config,
            meta: null,
        });
    }

    try {
        const res = await fetch(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,status`,
            {
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(8000),
            }
        );

        const meta = await res.json();

        return NextResponse.json({
            status: res.ok ? 'ok' : 'meta_error',
            config,
            meta,
        });
    } catch (err: any) {
        return NextResponse.json({
            status: 'fetch_error',
            config,
            meta: null,
            error: err?.message ?? 'Timeout o error de red',
        });
    }
}
