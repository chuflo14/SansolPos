'use client';

import { useState } from 'react';
import { X, CheckCircle, Printer, MessageCircle } from 'lucide-react';
import { Receipt, ReceiptData } from '@/components/shared/Receipt';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

export function CheckoutModal({
    cart,
    total,
    onClose,
    onConfirm
}: {
    cart: any[],
    total: number,
    onClose: () => void,
    onConfirm: () => void
}) {
    const [step, setStep] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [phone, setPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [saleId, setSaleId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { storeId, user } = useAuth();
    const supabase = createClient();

    const handleConfirm = async () => {
        if (!storeId || !user) {
            setError('Sesión no válida o no hay tienda seleccionada.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // 1. Create Sale
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

            if (saleError) throw new Error(`Error al crear la venta: ${saleError.message}`);
            const newSaleId = saleData.id;
            setSaleId(newSaleId);

            // 2. Prepare Items and Stock Movements
            const saleItems = cart.map(c => ({
                sale_id: newSaleId,
                product_id: c.product.id,
                name: c.product.name,
                quantity: c.quantity,
                unit_price: c.product.sale_price,
                subtotal: c.product.sale_price * c.quantity
            }));

            const stockMovements = cart.map(c => ({
                store_id: storeId,
                product_id: c.product.id,
                quantity: -c.quantity, // Negative for sales
                type: 'SALE',
                description: `Venta #${newSaleId.split('-')[0]}`
            }));

            // 3. Insert Sale Items
            const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
            if (itemsError) throw new Error(`Error al guardar los items: ${itemsError.message}`);

            // 4. Insert Stock Movements
            const { error: stockMovError } = await supabase.from('stock_movements').insert(stockMovements);
            if (stockMovError) throw new Error(`Error al registrar el movimiento de stock: ${stockMovError.message}`);

            // 5. Update Product Stock (We have to do it iteratively since Supabase JS doesn't have bulk UPDATE from an array out of the box easily, but we can do it via individual updates or an RPC. Let's do individual promises for simplicity here given it's a POS cart)
            await Promise.all(cart.map(async (c) => {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ current_stock: c.product.current_stock - c.quantity })
                    .eq('id', c.product.id)
                    .eq('store_id', storeId);

                if (updateError) console.error(`Failed to update stock for product ${c.product.id}:`, updateError);
            }));

            setStep(2);
            onConfirm();
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'Error inesperado al procesar la venta.');
        } finally {
            setIsProcessing(false);
        }
    };

    const receiptData: ReceiptData = {
        storeName: "SANSOL",
        businessName: "SANSOL S.A.",
        cuit: "30-12345678-9",
        address: "Calle Falsa 123",
        date: new Date().toISOString(),
        receiptNumber: saleId ? saleId.split('-')[0].toUpperCase() : "0000-00000000",
        items: cart.map(c => ({
            name: c.product.name,
            quantity: c.quantity,
            unit_price: c.product.sale_price,
            subtotal: c.product.sale_price * c.quantity
        })),
        total,
        paymentMethod,
        customerPhone: phone || undefined,
        qrUrl: "https://afip.gob.ar/qr", // Will be replaced by real AFIP URL
        legalFooter: "COMPROBANTE NO VÁLIDO COMO FACTURA (En esta etapa)"
    };

    const shareWhatsApp = () => {
        if (!phone) return;
        const text = `Hola! Gracias por tu compra en SANSOL. Total: $${total}. Medio de pago: ${paymentMethod}.`;
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 lg:p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm">
                    <h2 className="text-2xl font-black text-white">
                        {step === 1 ? 'Completar Venta' : 'Venta Exitosa'}
                    </h2>
                    {step === 1 && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-6 lg:p-8 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">1. Método de Pago <span className="text-rose-500">*</span></h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {['Efectivo', 'Transferencia', 'QR', 'Tarjeta'].map(method => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            className={`py-4 rounded-xl font-bold border-2 transition-all ${paymentMethod === method
                                                ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                                : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">2. Teléfono del Cliente <span className="text-slate-500 font-medium text-sm ml-2">(Opcional)</span></h3>
                                <input
                                    type="tel"
                                    placeholder="Ej: 1123456789"
                                    className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-white font-medium placeholder-slate-600 transition-all shadow-inner"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                />
                                <p className="text-sm text-slate-500 mt-3 font-medium flex items-center gap-2">
                                    Requerido si desea enviar el comprobante por WhatsApp.
                                </p>
                            </div>

                            <div className="bg-slate-800/50 p-6 lg:p-8 rounded-2xl border border-slate-700/50 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                                <div className="relative z-10">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Total a Cobrar</span>
                                    <div className="text-6xl font-black text-white mt-3 drop-shadow-md">${total.toLocaleString('es-AR')}</div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold rounded-xl text-center shadow-inner">
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                                <CheckCircle size={88} className="text-emerald-400 relative z-10 mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-3">¡Cobro Registrado!</h3>
                            <p className="text-slate-400 font-medium mb-10 text-center">El stock ha sido descontado automáticamente del sistema.</p>

                            <div className="w-full max-w-sm border border-slate-800 rounded-2xl p-4 bg-slate-950 mb-10 flex justify-center shadow-inner relative overflow-hidden">
                                {/* Previsualización del Ticket - se mantiene fondo blanco original del receipt por ser termico */}
                                <div className="scale-[0.85] origin-top bg-white p-2 rounded relative z-10 shadow-lg">
                                    <Receipt data={receiptData} format="thermal" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                                <button className="flex items-center justify-center gap-3 py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 hover:shadow-lg transition-all border border-slate-700">
                                    <Printer size={20} />
                                    Imprimir
                                </button>
                                <button
                                    disabled={!phone}
                                    onClick={shareWhatsApp}
                                    className={`flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all border
                                        ${phone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed'}
                                    `}
                                >
                                    <MessageCircle size={20} />
                                    WhatsApp
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {step === 1 && (
                    <div className="p-6 lg:p-8 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl flex justify-end gap-4">
                        <button onClick={onClose} className="px-8 py-4 font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button
                            disabled={!paymentMethod || isProcessing}
                            onClick={handleConfirm}
                            className={`px-10 py-4 font-black text-white rounded-xl shadow-lg transition-all flex items-center gap-2 border
                                ${paymentMethod && !isProcessing
                                    ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-0.5'
                                    : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'}
                            `}
                        >
                            {isProcessing ? 'Procesando...' : 'Confirmar Venta'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="p-6 lg:p-8 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl flex justify-center">
                        <button onClick={onClose} className="w-full max-w-md py-4 font-black bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] rounded-xl transition-all border border-blue-500">
                            Nueva Venta
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
