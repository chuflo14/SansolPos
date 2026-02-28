import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// FASE3: Rate limiter sencillo — máx 5 requests por user en 10 segundos
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(userId: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(userId);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + 10_000 });
        return false;
    }
    if (entry.count >= 5) return true;
    entry.count++;
    return false;
}

type CheckoutItem = {
    product: {
        id: string;
        name: string;
        sale_price: number;
        current_stock: number;
    };
    quantity: number;
};

type CheckoutBody = {
    storeId?: string;
    total?: number;
    paymentMethod?: string;
    phone?: string;
    customerName?: string;
    cart?: CheckoutItem[];
    cashSessionId?: string | null;
    idempotencyKey?: string | null;   // FASE2: UUID para evitar doble venta
};

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { code: 'UNAUTHORIZED', error: 'No autenticado.' },
                { status: 401 }
            );
        }

        // FASE3: rate limit — máx 5 checkouts por user en 10s
        if (isRateLimited(user.id)) {
            return NextResponse.json(
                { code: 'RATE_LIMITED', error: 'Demasiadas solicitudes. Esperá unos segundos.' },
                { status: 429 }
            );
        }


        const body = await request.json() as CheckoutBody;
        const storeId = body.storeId?.trim();
        const paymentMethod = body.paymentMethod?.trim();
        const total = Number(body.total ?? 0);
        const phone = body.phone?.trim() ?? '';
        const customerName = body.customerName?.trim() ?? '';
        const cart = Array.isArray(body.cart) ? body.cart : [];
        const cashSessionId = body.cashSessionId ?? null;
        const idempotencyKey = body.idempotencyKey ?? null;  // FASE2

        if (!storeId || !paymentMethod || !cart.length || !Number.isFinite(total) || total <= 0) {
            return NextResponse.json(
                { code: 'BAD_REQUEST', error: 'Datos inválidos para procesar checkout.' },
                { status: 400 }
            );
        }

        // Build cart payload for the RPC
        const cartPayload = cart.map((c) => ({
            product_id: c.product.id,
            name: c.product.name,
            quantity: c.quantity,
            unit_price: c.product.sale_price,
            subtotal: c.product.sale_price * c.quantity,
        }));

        const { data, error } = await supabase.rpc('process_checkout', {
            p_store_id: storeId,
            p_cashier_id: user.id,
            p_total: total,
            p_payment_method: paymentMethod,
            p_phone: phone,
            p_cart: cartPayload,
            p_customer_name: customerName,
            p_cash_session_id: cashSessionId,
            p_idempotency_key: idempotencyKey,  // FASE2
        });


        if (error) {
            return NextResponse.json(
                { code: 'RPC_ERROR', error: error.message },
                { status: 500 }
            );
        }

        if (!data?.ok) {
            return NextResponse.json(
                { code: 'CHECKOUT_FAILED', error: data?.error || 'No se pudo procesar el checkout.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { ok: true, saleId: data.sale_id },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { code: 'CHECKOUT_UNEXPECTED_ERROR', error: error?.message || 'Error inesperado al procesar checkout.' },
            { status: 500 }
        );
    }
}
