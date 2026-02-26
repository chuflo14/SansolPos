import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    cart?: CheckoutItem[];
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

        const body = await request.json() as CheckoutBody;
        const storeId = body.storeId?.trim();
        const paymentMethod = body.paymentMethod?.trim();
        const total = Number(body.total ?? 0);
        const phone = body.phone?.trim();
        const cart = Array.isArray(body.cart) ? body.cart : [];

        if (!storeId || !paymentMethod || !cart.length || !Number.isFinite(total) || total <= 0) {
            return NextResponse.json(
                { code: 'BAD_REQUEST', error: 'Datos inválidos para procesar checkout.' },
                { status: 400 }
            );
        }

        const { data: saleData, error: saleError } = await supabase
            .from('sales')
            .insert([{
                store_id: storeId,
                cashier_id: user.id,
                total,
                payment_method: paymentMethod,
                customer_phone: phone || null,
                status: 'COMPLETED'
            }])
            .select('id')
            .single();

        if (saleError || !saleData?.id) {
            return NextResponse.json(
                { code: 'SALE_CREATE_FAILED', error: saleError?.message || 'No se pudo crear la venta.' },
                { status: 500 }
            );
        }

        const saleId = saleData.id;

        const saleItems = cart.map((c) => ({
            sale_id: saleId,
            product_id: c.product.id,
            name: c.product.name,
            quantity: c.quantity,
            unit_price: c.product.sale_price,
            subtotal: c.product.sale_price * c.quantity
        }));

        const stockMovements = cart.map((c) => ({
            store_id: storeId,
            product_id: c.product.id,
            quantity: -c.quantity,
            type: 'SALE',
            description: `Venta #${saleId.split('-')[0]}`
        }));

        const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
        if (itemsError) {
            return NextResponse.json(
                { code: 'SALE_ITEMS_FAILED', error: itemsError.message },
                { status: 500 }
            );
        }

        const { error: stockMovError } = await supabase.from('stock_movements').insert(stockMovements);
        if (stockMovError) {
            return NextResponse.json(
                { code: 'STOCK_MOVEMENTS_FAILED', error: stockMovError.message },
                { status: 500 }
            );
        }

        for (const c of cart) {
            const { error: updateError } = await supabase
                .from('products')
                .update({ current_stock: c.product.current_stock - c.quantity })
                .eq('id', c.product.id)
                .eq('store_id', storeId);

            if (updateError) {
                return NextResponse.json(
                    { code: 'PRODUCT_STOCK_UPDATE_FAILED', error: updateError.message, productId: c.product.id },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            { ok: true, saleId },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { code: 'CHECKOUT_UNEXPECTED_ERROR', error: error?.message || 'Error inesperado al procesar checkout.' },
            { status: 500 }
        );
    }
}
