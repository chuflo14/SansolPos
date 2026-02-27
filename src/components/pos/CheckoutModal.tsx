'use client';

import { useEffect, useState } from 'react';
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
    const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
    const [shareNotice, setShareNotice] = useState<string | null>(null);
    const [saleId, setSaleId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { storeId, user } = useAuth();
    const supabase = createClient();

    useEffect(() => {
        if (!isSharingWhatsApp) return;

        const watchdog = setTimeout(() => {
            setIsSharingWhatsApp(false);
            setError((prev) => prev || 'El envío por WhatsApp tardó demasiado. Intenta nuevamente.');
        }, 45000);

        return () => clearTimeout(watchdog);
    }, [isSharingWhatsApp]);

    const withTimeout = async <T,>(
        task: () => PromiseLike<T>,
        step: string,
        timeoutMs = 20000,
        timeoutHint = 'Verifica la conexión con Supabase.'
    ): Promise<T> => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        try {
            return await Promise.race<T>([
                Promise.resolve().then(task),
                new Promise<T>((_, reject) => {
                    timer = setTimeout(() => {
                        reject(new Error(`Timeout al ${step}. ${timeoutHint}`));
                    }, timeoutMs);
                })
            ]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    };

    const normalizePhoneForWhatsApp = (value: string) => {
        let digits = value.replace(/[^0-9]/g, '');
        if (!digits) return '';

        if (digits.startsWith('00')) {
            digits = digits.slice(2);
        }

        // Canonicaliza formatos argentinos a E.164 móvil: 549 + area + número.
        if (digits.startsWith('549')) {
            return digits;
        }

        if (digits.startsWith('54')) {
            let national = digits.slice(2);
            if (national.startsWith('9')) {
                return `54${national}`;
            }

            national = national.replace(/^0/, '').replace(/^(\d{2,4})15/, '$1');
            return `549${national}`;
        }

        if (digits.startsWith('0')) {
            const national = digits.slice(1).replace(/^(\d{2,4})15/, '$1');
            return `549${national}`;
        }

        if (digits.length === 10) {
            return `549${digits}`;
        }

        return digits;
    };

    const handleConfirm = async () => {
        if (!storeId || !user) {
            setError('Sesión no válida o no hay tienda seleccionada.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const response = await withTimeout(
                () => fetch('/api/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        storeId,
                        total,
                        paymentMethod,
                        phone,
                        cart
                    })
                }),
                'crear la venta',
                30000
            );

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error || 'No se pudo procesar la venta.');
            }

            const createdSaleId = payload?.saleId as string | undefined;
            if (!createdSaleId) {
                throw new Error('La venta se creó sin identificador.');
            }

            setSaleId(createdSaleId);

            setStep(2);
            onConfirm();
        } catch (err: any) {
            console.error('Checkout error:', err);
            if (err?.message?.includes('Timeout')) {
                setError(`${err.message} Reintenta en unos segundos.`);
            } else if (err?.message?.includes('Failed to fetch')) {
                setError('No se pudo conectar al servidor. Revisa internet y la URL de Supabase.');
            } else {
                setError(err.message || 'Error inesperado al procesar la venta.');
            }
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

    const buildWhatsAppReceiptText = (receiptUrl?: string) => {
        const lines = [
            '*COMPROBANTE DE VENTA*',
            `${receiptData.storeName}`,
            `Nro: ${receiptData.receiptNumber}`,
            `Fecha: ${new Date(receiptData.date).toLocaleString('es-AR')}`,
            '------------------------',
        ];

        receiptData.items.forEach((item) => {
            lines.push(`${item.quantity}x ${item.name} - $${item.subtotal.toLocaleString('es-AR')}`);
        });

        lines.push('------------------------');
        lines.push(`*Total: $${receiptData.total.toLocaleString('es-AR')}*`);
        lines.push(`Medio de pago: ${receiptData.paymentMethod}`);

        if (receiptData.customerPhone) {
            lines.push(`Cliente: ${receiptData.customerPhone}`);
        }

        if (receiptUrl) {
            lines.push('');
            lines.push(`Comprobante: ${receiptUrl}`);
        }

        lines.push('');
        lines.push('Gracias por tu compra.');

        return lines.join('\n');
    };

    const generateReceiptImageBlob = async (): Promise<Blob> => {
        const canvas = document.createElement('canvas');
        const width = 900;
        const headerHeight = 230;
        const itemsHeight = receiptData.items.length * 42;
        const footerHeight = 240;
        const height = headerHeight + itemsHeight + footerHeight;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('No se pudo generar la imagen del comprobante.');
        }

        const margin = 36;
        let y = margin;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;

        ctx.font = 'bold 34px Arial';
        ctx.fillText(receiptData.storeName, margin, y);
        y += 44;

        ctx.font = '22px Arial';
        ctx.fillText(receiptData.businessName, margin, y);
        y += 34;
        ctx.fillText(`CUIT: ${receiptData.cuit}`, margin, y);
        y += 34;
        ctx.fillText(`Fecha: ${new Date(receiptData.date).toLocaleString('es-AR')}`, margin, y);
        y += 34;
        ctx.fillText(`Comprobante: ${receiptData.receiptNumber}`, margin, y);
        y += 24;

        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
        y += 30;

        ctx.font = 'bold 20px Arial';
        ctx.fillText('Detalle', margin, y);
        y += 30;

        ctx.font = '18px Arial';
        receiptData.items.forEach((item) => {
            const subtotal = `$${item.subtotal.toLocaleString('es-AR')}`;
            const itemText = `${item.quantity}x ${item.name}`;
            const maxItemText = itemText.length > 48 ? `${itemText.slice(0, 45)}...` : itemText;

            ctx.fillText(maxItemText, margin, y);
            ctx.textAlign = 'right';
            ctx.fillText(subtotal, width - margin, y);
            ctx.textAlign = 'left';
            y += 36;
        });

        y += 4;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
        y += 44;

        ctx.font = 'bold 30px Arial';
        ctx.fillText(`TOTAL: $${receiptData.total.toLocaleString('es-AR')}`, margin, y);
        y += 42;

        ctx.font = '20px Arial';
        ctx.fillText(`Pago: ${receiptData.paymentMethod}`, margin, y);
        y += 34;

        if (receiptData.customerPhone) {
            ctx.fillText(`Cliente: ${receiptData.customerPhone}`, margin, y);
            y += 34;
        }

        ctx.font = '18px Arial';
        ctx.fillStyle = '#374151';
        ctx.fillText(receiptData.legalFooter, margin, y);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((generatedBlob) => resolve(generatedBlob), 'image/png');
        });

        if (!blob) {
            throw new Error('No se pudo exportar el comprobante.');
        }

        return blob;
    };

    const blobToBase64 = async (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                if (typeof result !== 'string') {
                    reject(new Error('No se pudo codificar el comprobante.'));
                    return;
                }

                const base64 = result.split(',')[1];
                if (!base64) {
                    reject(new Error('No se pudo codificar el comprobante.'));
                    return;
                }

                resolve(base64);
            };
            reader.onerror = () => reject(new Error('No se pudo codificar el comprobante.'));
            reader.readAsDataURL(blob);
        });
    };

    const sendReceiptViaCloud = async ({
        to,
        message,
        receiptUrl,
        receiptBase64,
        receiptMimeType
    }: {
        to: string;
        message: string;
        receiptUrl?: string;
        receiptBase64: string;
        receiptMimeType: string;
    }) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        try {
            const response = await fetch('/api/whatsapp/send-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal,
                body: JSON.stringify({
                    to,
                    message,
                    receiptUrl,
                    receiptBase64,
                    receiptMimeType
                })
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw payload;
            }

            return payload;
        } finally {
            clearTimeout(timeout);
        }
    };

    const uploadReceiptImageAndGetUrl = async (receiptBlob: Blob): Promise<string | undefined> => {
        if (!storeId) return undefined;

        const filePath = `${storeId}/receipts/${Date.now()}_${saleId ?? 'ticket'}.png`;
        const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(filePath, receiptBlob, { contentType: 'image/png' });

        if (uploadError) {
            console.warn('No se pudo subir el comprobante a storage:', uploadError.message);
            return undefined;
        }

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        const receiptUrl = data.publicUrl;

        if (saleId) {
            const { error: updateError } = await supabase
                .from('sales')
                .update({ receipt_url: receiptUrl })
                .eq('id', saleId)
                .eq('store_id', storeId);
            if (updateError) {
                console.warn('No se pudo guardar receipt_url en sale:', updateError.message);
            }
        }

        return receiptUrl;
    };

    const shareWhatsApp = async () => {
        if (!phone) return;

        const sanitizedPhone = normalizePhoneForWhatsApp(phone);
        if (!sanitizedPhone) {
            setError('Número de teléfono inválido para enviar por WhatsApp.');
            return;
        }

        setIsSharingWhatsApp(true);
        setError(null);
        setShareNotice(null);

        try {
            const receiptBlob = await withTimeout(
                () => generateReceiptImageBlob(),
                'generar el comprobante',
                10000,
                'Reintenta la operación.'
            );

            const receiptBase64 = await withTimeout(
                () => blobToBase64(receiptBlob),
                'preparar el comprobante',
                10000,
                'Reintenta la operación.'
            );

            let receiptUrl: string | undefined;
            try {
                receiptUrl = await withTimeout(
                    () => uploadReceiptImageAndGetUrl(receiptBlob),
                    'subir el comprobante a storage',
                    12000,
                    'Se continuará sin URL pública.'
                );
            } catch (storageError: any) {
                console.warn('Storage upload skipped:', storageError?.message || storageError);
            }

            const text = buildWhatsAppReceiptText(receiptUrl);
            await withTimeout(
                () =>
                    sendReceiptViaCloud({
                        to: sanitizedPhone,
                        message: text,
                        receiptUrl,
                        receiptBase64,
                        receiptMimeType: 'image/png'
                    }),
                'enviar el comprobante por WhatsApp',
                25000,
                'WhatsApp Cloud tardó demasiado en responder.'
            );
            setShareNotice('Comprobante enviado por WhatsApp.');
        } catch (shareError: any) {
            if (shareError?.name === 'AbortError') {
                setError('Tiempo de espera agotado al enviar por WhatsApp Cloud.');
                return;
            }

            if (shareError?.code === 'WHATSAPP_TIMEOUT' || /Timeout al enviar el comprobante por WhatsApp/i.test(shareError?.message || '')) {
                const fallbackText = buildWhatsAppReceiptText();
                window.open(`https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(fallbackText)}`, '_blank');
                setError('WhatsApp Cloud tardó demasiado en responder. Se abrió WhatsApp Web como alternativa.');
                return;
            }

            if (shareError?.code === 'WHATSAPP_CLOUD_NOT_CONFIGURED') {
                const fallbackText = buildWhatsAppReceiptText();
                window.open(`https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(fallbackText)}`, '_blank');
                setShareNotice('WhatsApp Cloud no está configurado. Se abrió WhatsApp Web como fallback.');
                return;
            }

            if (shareError?.code === 'WHATSAPP_AUTH_ERROR') {
                setError('Meta devolvió Authentication Error. El token de WhatsApp Cloud está inválido o vencido. Genera uno nuevo y reinicia el servidor.');
                return;
            }

            const rawShareMessage = `${shareError?.error || shareError?.message || ''}`;

            if (
                shareError?.code === 'WHATSAPP_RECIPIENT_NOT_ALLOWED' ||
                /131030/.test(rawShareMessage) ||
                /allowed list/i.test(rawShareMessage)
            ) {
                setError('Meta rechaza el destinatario: no está permitido en la lista de prueba. Usa formato 549... y vuelve a verificarlo en Prueba de API.');
                return;
            }

            const fallbackText = buildWhatsAppReceiptText();
            window.open(`https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(fallbackText)}`, '_blank');
            setError(shareError?.error || shareError?.message || 'No se pudo compartir por Cloud. Se abrió WhatsApp Web como alternativa.');
        } finally {
            setIsSharingWhatsApp(false);
        }
    };

    const handlePrint = () => {
        window.print();
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
                                    placeholder="Ej: 5491123456789"
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
                                <div id="receipt-print-area" className="scale-[0.85] origin-top bg-white p-2 rounded relative z-10 shadow-lg">
                                    <Receipt data={receiptData} format="thermal" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center justify-center gap-3 py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 hover:shadow-lg transition-all border border-slate-700"
                                >
                                    <Printer size={20} />
                                    Imprimir / PDF
                                </button>
                                <button
                                    disabled={!phone || isSharingWhatsApp}
                                    onClick={shareWhatsApp}
                                    className={`flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all border
                                        ${phone && !isSharingWhatsApp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed'}
                                    `}
                                >
                                    <MessageCircle size={20} />
                                    {isSharingWhatsApp ? 'Enviando...' : 'WhatsApp'}
                                </button>
                            </div>
                            {(error || shareNotice) && (
                                <div className={`mt-4 w-full max-w-md p-3 rounded-xl text-sm font-semibold text-center border ${error ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}>
                                    {error || shareNotice}
                                </div>
                            )}
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
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }

                    #receipt-print-area,
                    #receipt-print-area * {
                        visibility: visible !important;
                    }

                    #receipt-print-area {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        margin: 0;
                        padding: 0;
                        transform: none !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
